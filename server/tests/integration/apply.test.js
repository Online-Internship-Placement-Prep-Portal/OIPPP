const request = require('supertest');

jest.mock('../../src/middleware/auth', () => require('../helpers/fakeAuth'));

const db = require('../helpers/db');
const { as } = require('../helpers/fakeAuth');
const { seed, day } = require('../helpers/seed');
const app = require('../../src/app');
const Application = require('../../src/modules/applications/application.model');
const mailer = require('../../src/modules/notifications/mailer');
const { Listing } = require('../helpers/fixtures');
const Notification = require('../../src/modules/notifications/notification.model');

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

describe('TC-APP-01: apply once and record history (APP-1, APP-4, APP-5)', () => {
  test('first apply is 201 APPLIED, second is 409, list shows one entry', async () => {
    const first = await applyTo(s.L1);
    expect(first.status).toBe(201);
    expect(first.body.status).toBe('APPLIED');

    const second = await applyTo(s.L1);
    expect(second.status).toBe(409);
    expect(second.body.error.code).toBe('ALREADY_APPLIED');
    expect(second.body.error.details[0].applicationId).toBe(first.body.applicationId);

    const mine = await request(app).get('/api/applications/mine').set(as(s.student));
    expect(mine.status).toBe(200);
    expect(mine.body.items).toHaveLength(1);
    expect(mine.body.items[0].history).toHaveLength(1);
    expect(mine.body.items[0].listing.title).toBe('Backend Intern');
  });

  test('stores the current resume and notifies the recruiter in-app', async () => {
    const res = await applyTo(s.L1);
    expect((await Application.findById(res.body.applicationId)).resumeFileId).toBeTruthy();
    const n = await Notification.find({ userId: s.recruiter._id });
    expect(n).toHaveLength(1);
    expect(n[0].type).toBe('APPLICATION_RECEIVED');
  });

  test('my applications are newest first', async () => {
    await applyTo(s.L1, s.other);
    await applyTo(s.L3, s.other);
    const mine = await request(app).get('/api/applications/mine').set(as(s.other));
    expect(mine.body.items.map((a) => a.listing.title)).toEqual(['ML Intern', 'Backend Intern']);
  });

  test('recruiters cannot apply', async () => {
    expect((await applyTo(s.L1, s.recruiter)).status).toBe(403);
  });
});

describe('TC-APP-02: closed listing or not eligible (APP-2, APP-3)', () => {
  test('closed listing is 409 LISTING_CLOSED with the SRS message', async () => {
    const res = await applyTo(s.L2);
    expect(res.status).toBe(409);
    expect(res.body.error).toMatchObject({ code: 'LISTING_CLOSED', message: 'Applications for this internship are closed' });
  });

  test('past deadline counts as closed', async () => {
    await Listing.updateOne({ _id: s.L1._id }, { deadline: new Date(Date.now() - day) });
    expect((await applyTo(s.L1)).body.error.code).toBe('LISTING_CLOSED');
  });

  test('CGPA below minimum is 422 naming 8.0', async () => {
    const res = await applyTo(s.L3);
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('NOT_ELIGIBLE');
    expect(res.body.error.message).toContain('8.0');
    expect(await Application.countDocuments()).toBe(0);
  });

  test('eligible student can apply to the CGPA-gated listing', async () => {
    expect((await applyTo(s.L3, s.other)).status).toBe(201);
  });
});
describe('Confidentiality: cross-user application isolation', () => {
  test('a student can see only their own applications', async () => {
    await applyTo(s.L1, s.student);
    await applyTo(s.L3, s.other);

    const response = await request(app)
      .get('/api/applications/mine')
      .set(as(s.student));

    expect(response.status).toBe(200);
    expect(response.body.items).toHaveLength(1);
    expect(String(response.body.items[0].studentId))
      .toBe(String(s.student._id));
  });

  test('a recruiter cannot view applications for another recruiter listing', async () => {
    const response = await request(app)
      .get(`/api/listings/${s.L2._id}/applications`)
      .set(as(s.recruiter2));

    expect(response.status).toBe(403);
  });
});
