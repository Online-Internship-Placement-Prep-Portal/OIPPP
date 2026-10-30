const request = require('supertest');
const mongoose = require('mongoose');

jest.mock('../../src/middleware/auth', () => require('../helpers/fakeAuth'));

const db = require('../helpers/db');
const { as } = require('../helpers/fakeAuth');
const { seed } = require('../helpers/seed');
const app = require('../../src/app');
const Application = require('../../src/modules/applications/application.model');
const AuditLog = require('../../src/modules/audit/auditLog.model');

const admin = { _id: new mongoose.Types.ObjectId(), role: 'ADMIN' };
let s;

beforeAll(async () => {
  await db.connect();
  await Application.init();
});
afterAll(db.disconnect);
beforeEach(async () => {
  await db.clear();
  s = await seed();
});

const setPolicy = (on) => request(app).patch('/api/admin/settings').set(as(admin)).send({ oneOfferPolicy: on });
const applyTo = (listing) => request(app).post('/api/applications').set(as(s.student))
  .send({ listingId: String(listing._id) });

function holdOffer() {
  return Application.create({
    studentId: s.student._id,
    listingId: new mongoose.Types.ObjectId(),
    status: 'OFFER',
    history: [{ from: null, to: 'APPLIED', by: s.student._id }],
  });
}

describe('Admin settings', () => {
  test('the one-offer policy is off by default', async () => {
    const res = await request(app).get('/api/admin/settings').set(as(admin));

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ settings: { oneOfferPolicy: false } });
  });

  test('an admin turns the policy on, and the change is audit-logged', async () => {
    const res = await setPolicy(true);

    expect(res.status).toBe(200);
    expect(res.body.settings.oneOfferPolicy).toBe(true);
    expect((await request(app).get('/api/admin/settings').set(as(admin))).body.settings.oneOfferPolicy).toBe(true);

    const entry = await AuditLog.findOne({ action: 'SETTINGS_UPDATED' }).lean();
    expect(String(entry.actorId)).toBe(String(admin._id));
    expect(entry.before).toEqual({ oneOfferPolicy: false });
    expect(entry.after).toEqual({ oneOfferPolicy: true });
  });

  test.each([
    [{}],
    [{ oneOfferPolicy: 'maybe' }],
  ])('rejects an invalid body %#', async (body) => {
    const res = await request(app).patch('/api/admin/settings').set(as(admin)).send(body);

    expect(res.status).toBe(400);
  });

  test('only admins reach the settings', async () => {
    expect((await request(app).get('/api/admin/settings').set(as(s.student))).status).toBe(403);
    expect((await request(app).patch('/api/admin/settings').set(as(s.recruiter)).send({ oneOfferPolicy: true }))
      .status).toBe(403);
  });
});

describe('One-offer policy (DOM-2, BR-5)', () => {
  test('with the policy off, an offer holder can still apply', async () => {
    await holdOffer();

    expect((await applyTo(s.L1)).status).toBe(201);
  });

  test('with the policy on, an offer holder is refused', async () => {
    await holdOffer();
    await setPolicy(true);

    const res = await applyTo(s.L1);

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('OFFER_HELD');
    expect(res.body.error.message).toBe('You already hold an offer; the one-offer policy is on');
  });

  test('with the policy on, a student without an offer can apply', async () => {
    await setPolicy(true);

    expect((await applyTo(s.L1)).status).toBe(201);
  });
});
