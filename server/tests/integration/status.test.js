const request = require('supertest');

jest.mock('../../src/middleware/auth', () => require('../helpers/fakeAuth'));

const db = require('../helpers/db');
const { as } = require('../helpers/fakeAuth');
const { seed } = require('../helpers/seed');
const app = require('../../src/app');
const Application = require('../../src/modules/applications/application.model');
const mailer = require('../../src/modules/notifications/mailer');
const AuditLog = require('../../src/modules/audit/auditLog.model');
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

describe('TC-REV-01: status lifecycle (REV-2, REV-4, APP-4)', () => {
  let a1;
  beforeEach(async () => {
    a1 = (await applyTo(s.L1)).body.applicationId;
    sent.length = 0;
  });
  const move = (body, user = s.recruiter) => request(app).patch(`/api/applications/${a1}/status`).set(as(user)).send(body);

  test('shortlist 200, back to APPLIED 422 INVALID_TRANSITION, one notification + one email', async () => {
    expect((await move({ status: 'SHORTLISTED' })).status).toBe(200);
    const back = await move({ status: 'APPLIED' });
    expect(back.status).toBe(422);
    expect(back.body.error.code).toBe('INVALID_TRANSITION');

    const n = await Notification.find({ userId: s.student._id });
    expect(n).toHaveLength(1);
    expect(n[0].email.status).toBe('SENT');
    expect(sent).toHaveLength(1);
    expect(sent[0].to).toBe('asha@pes.edu');
  });

  test('skipping a stage is refused', async () => {
    expect((await move({ status: 'OFFER' })).status).toBe(422);
  });

  test('full path to OFFER is in history and the audit log; OFFER is final', async () => {
    for (const status of ['SHORTLISTED', 'INTERVIEW', 'OFFER']) expect((await move({ status })).status).toBe(200);
    const saved = await Application.findById(a1);
    expect(saved.history.map((h) => h.to)).toEqual(['APPLIED', 'SHORTLISTED', 'INTERVIEW', 'OFFER']);
    expect(String(saved.history[3].by)).toBe(String(s.recruiter._id));
    const log = await AuditLog.find({ entityId: a1 }).sort({ at: 1 });
    expect(log.map((l) => l.after.status)).toEqual(['APPLIED', 'SHORTLISTED', 'INTERVIEW', 'OFFER']);
    expect((await move({ status: 'INTERVIEW' })).status).toBe(422);
  });

  test('BR-2: another recruiter gets 403 NOT_LISTING_OWNER', async () => {
    const res = await move({ status: 'SHORTLISTED' }, s.recruiter2);
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('NOT_LISTING_OWNER');
  });

  test('unknown application is 404', async () => {
    const res = await request(app).patch('/api/applications/000000000000000000000000/status')
      .set(as(s.recruiter)).send({ status: 'SHORTLISTED' });
    expect(res.status).toBe(404);
  });
});
