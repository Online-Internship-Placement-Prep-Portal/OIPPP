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

describe('REV-1: recruiter applicant list', () => {
  test('owner sees applicants with profile summary and resume link, filterable by status', async () => {
    await applyTo(s.L1);
    await applyTo(s.L1, s.other);
    const res = await request(app).get(`/api/listings/${s.L1._id}/applications`).set(as(s.recruiter));
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(2);
    const asha = res.body.items.find((i) => i.student.name === 'Asha');
    expect(asha.student).toMatchObject({ branch: 'CSE', cgpa: 7.4 });
    expect(asha.resumeUrl).toBe(`/api/users/${s.student._id}/resume`);

    const filtered = await request(app).get(`/api/listings/${s.L1._id}/applications?status=OFFER`).set(as(s.recruiter));
    expect(filtered.body.items).toHaveLength(0);
  });

  test('another recruiter is refused', async () => {
    const res = await request(app).get(`/api/listings/${s.L1._id}/applications`).set(as(s.recruiter2));
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('NOT_LISTING_OWNER');
  });

  test('page size is capped at 50', async () => {
    const res = await request(app).get(`/api/listings/${s.L1._id}/applications?limit=500`).set(as(s.recruiter));
    expect(res.status).toBe(400);
  });
});

describe('REV-3: rejection needs a reason from the fixed list', () => {
  let a1;
  beforeEach(async () => {
    a1 = (await applyTo(s.L1)).body.applicationId;
    sent.length = 0;
  });
  const move = (body) => request(app).patch(`/api/applications/${a1}/status`).set(as(s.recruiter)).send(body);

  test('reject without a reason is 400 REASON_REQUIRED', async () => {
    const res = await move({ status: 'REJECTED' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('REASON_REQUIRED');
    expect((await Application.findById(a1)).status).toBe('APPLIED');
  });

  test('a reason outside the list is refused', async () => {
    expect((await move({ status: 'REJECTED', reasonCode: 'TOO_SHORT' })).status).toBe(400);
  });

  test('reject with a reason stores it and tells the student why', async () => {
    expect((await move({ status: 'REJECTED', reasonCode: 'SKILLS_MISMATCH' })).status).toBe(200);
    const saved = await Application.findById(a1);
    expect(saved.rejectReason).toBe('SKILLS_MISMATCH');
    expect(saved.history[1].reasonCode).toBe('SKILLS_MISMATCH');
    expect(sent[0].text).toContain('Skills do not match the role');
  });

  test('the reason list is served to the client', async () => {
    const res = await request(app).get('/api/applications/reject-reasons').set(as(s.recruiter));
    expect(res.body.items.map((r) => r.code)).toContain('POSITION_FILLED');
  });
});
