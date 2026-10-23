const request = require('supertest');

jest.mock('../../src/middleware/auth', () => require('../helpers/fakeAuth'));

const db = require('../helpers/db');
const { as } = require('../helpers/fakeAuth');
const { seed } = require('../helpers/seed');
const app = require('../../src/app');
const Application = require('../../src/modules/applications/application.model');
const mailer = require('../../src/modules/notifications/mailer');

const sent = [];
mailer.setTransport({ sendMail: async (m) => { sent.push(m); } });

let s;
beforeAll(async () => {
  await db.connect();
  await Application.init();
});
afterAll(db.disconnect);
beforeEach(async () => {
  await db.clear();
  sent.length = 0;
  s = await seed();
});

function applyTo(listing, user = s.student) {
  return request(app).post('/api/applications').set(as(user)).send({ listingId: String(listing._id), coverNote: 'Keen to join' });
}

describe('reliability and tampering (SAFE-1, SO-2, SEC-4)', () => {
  test('concurrent submits create exactly one application', async () => {
    const results = await Promise.all([applyTo(s.L1), applyTo(s.L1), applyTo(s.L1)]);
    expect(results.filter((r) => r.status === 201)).toHaveLength(1);
    expect(results.filter((r) => r.status === 409)).toHaveLength(2);
    expect(await Application.countDocuments()).toBe(1);
  });

  test('two recruiter clicks racing on the same move: one wins, history has one entry for it', async () => {
    const a1 = (await applyTo(s.L1)).body.applicationId;
    const move = () => request(app).patch(`/api/applications/${a1}/status`).set(as(s.recruiter)).send({ status: 'SHORTLISTED' });
    const codes = (await Promise.all([move(), move()])).map((r) => r.status).sort();
    expect(codes[0]).toBe(200);
    // the loser either lost the conditional write (409) or saw SHORTLISTED already (422)
    expect([409, 422]).toContain(codes[1]);
    expect((await Application.findById(a1)).history).toHaveLength(2);
  });

  test('a student cannot change their own status (STRIDE tampering)', async () => {
    const a1 = (await applyTo(s.L1)).body.applicationId;
    const res = await request(app).patch(`/api/applications/${a1}/status`).set(as(s.student)).send({ status: 'OFFER' });
    expect(res.status).toBe(403);
  });

  test('$-operator keys are rejected', async () => {
    const res = await request(app).post('/api/applications').set(as(s.student)).send({ listingId: { $ne: null } });
    expect(res.status).toBe(400);
  });

  test('cover note over 1000 characters is rejected', async () => {
    const res = await request(app).post('/api/applications').set(as(s.student))
      .send({ listingId: String(s.L1._id), coverNote: 'x'.repeat(1001) });
    expect(res.status).toBe(400);
  });

  test('a malformed id is a validation error, not a crash', async () => {
    const res = await request(app).patch('/api/applications/not-an-id/status').set(as(s.recruiter)).send({ status: 'SHORTLISTED' });
    expect(res.status).toBe(400);
  });
});
