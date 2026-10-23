const mongoose = require('mongoose');
const request = require('supertest');

// stand-in for the identity module's JWT check: the test names the caller in a header
jest.mock('../../src/middleware/auth', () => {
  const AppError = jest.requireActual('../../src/utils/AppError');
  return {
    authenticate: (req, res, next) => {
      const raw = req.headers['x-test-user'];
      if (!raw) return next(new AppError(401, 'UNAUTHENTICATED', 'Please log in'));
      req.user = JSON.parse(raw);
      return next();
    },
    allow: (...roles) => (req, res, next) => (roles.includes(req.user.role)
      ? next() : next(new AppError(403, 'FORBIDDEN', 'No access'))),
  };
});

const db = require('../helpers/db');
const { User, Profile, Listing } = require('../helpers/fixtures');
const app = require('../../src/app');
const Application = require('../../src/modules/applications/application.model');
const AuditLog = require('../../src/modules/audit/auditLog.model');
const Notification = require('../../src/modules/notifications/notification.model');
const mailer = require('../../src/modules/notifications/mailer');
const notificationService = require('../../src/modules/notifications/notification.service');

const sent = [];
let failMail = false;
mailer.setTransport({ sendMail: async (m) => { if (failMail) throw new Error('smtp down'); sent.push(m); } });

let student; let other; let recruiter; let recruiter2; let L1; let L2; let L3;
const as = (u) => ({ 'x-test-user': JSON.stringify({ id: String(u._id), role: u.role }) });
const day = 24 * 3600 * 1000;

beforeAll(async () => {
  await db.connect();
  await Promise.all([Application.init(), Notification.init()]);
});
afterAll(db.disconnect);

beforeEach(async () => {
  await db.clear();
  sent.length = 0;
  failMail = false;
  [student, other, recruiter, recruiter2] = await User.create([
    { name: 'Asha', email: 'asha@pes.edu', role: 'STUDENT' },
    { name: 'Ravi', email: 'ravi@pes.edu', role: 'STUDENT' },
    { name: 'Rec One', email: 'r1@acme.io', role: 'RECRUITER' },
    { name: 'Rec Two', email: 'r2@acme.io', role: 'RECRUITER' },
  ]);
  await Profile.create([
    { userId: student._id, cgpa: 7.4, branch: 'CSE', gradYear: 2027, skills: ['node'], resumeFileId: new mongoose.Types.ObjectId() },
    { userId: other._id, cgpa: 9.1, branch: 'ECE', gradYear: 2027 },
  ]);
  const deadline = new Date(Date.now() + 7 * day);
  [L1, L2, L3] = await Listing.create([
    { recruiterId: recruiter._id, title: 'Backend Intern', company: 'Acme', deadline },
    { recruiterId: recruiter._id, title: 'Closed Intern', company: 'Acme', status: 'CLOSED', deadline },
    { recruiterId: recruiter._id, title: 'ML Intern', company: 'Acme', minCgpa: 8, deadline },
  ]);
});

function applyTo(listing, user = student) {
  return request(app).post('/api/applications').set(as(user)).send({ listingId: String(listing._id), coverNote: 'Keen to join' });
}

describe('TC-APP-01: apply once and record history (APP-1, APP-4, APP-5)', () => {
  test('first apply is 201 APPLIED, second is 409, list shows one entry', async () => {
    const first = await applyTo(L1);
    expect(first.status).toBe(201);
    expect(first.body.status).toBe('APPLIED');

    const second = await applyTo(L1);
    expect(second.status).toBe(409);
    expect(second.body.error.code).toBe('ALREADY_APPLIED');
    expect(second.body.error.details[0].applicationId).toBe(first.body.applicationId);

    const mine = await request(app).get('/api/applications/mine').set(as(student));
    expect(mine.status).toBe(200);
    expect(mine.body.items).toHaveLength(1);
    expect(mine.body.items[0].history).toHaveLength(1);
    expect(mine.body.items[0].listing.title).toBe('Backend Intern');
  });

  test('stores the current resume and notifies the recruiter in-app', async () => {
    const res = await applyTo(L1);
    const saved = await Application.findById(res.body.applicationId);
    expect(saved.resumeFileId).toBeTruthy();
    const n = await Notification.find({ userId: recruiter._id });
    expect(n).toHaveLength(1);
    expect(n[0].type).toBe('APPLICATION_RECEIVED');
  });

  test('concurrent submits create exactly one application (SAFE-1)', async () => {
    const results = await Promise.all([applyTo(L1), applyTo(L1), applyTo(L1)]);
    expect(results.filter((r) => r.status === 201)).toHaveLength(1);
    expect(results.filter((r) => r.status === 409)).toHaveLength(2);
    expect(await Application.countDocuments()).toBe(1);
  });

  test('cover note over 1000 characters is rejected', async () => {
    const res = await request(app).post('/api/applications').set(as(student))
      .send({ listingId: String(L1._id), coverNote: 'x'.repeat(1001) });
    expect(res.status).toBe(400);
  });

  test('my applications are newest first', async () => {
    await applyTo(L1, other);
    await applyTo(L3, other);
    const mine = await request(app).get('/api/applications/mine').set(as(other));
    expect(mine.body.items.map((a) => a.listing.title)).toEqual(['ML Intern', 'Backend Intern']);
  });

  test('recruiters cannot apply', async () => {
    expect((await applyTo(L1, recruiter)).status).toBe(403);
  });
});

describe('TC-APP-02: closed listing or not eligible (APP-2, APP-3)', () => {
  test('closed listing is 409 LISTING_CLOSED with the SRS message', async () => {
    const res = await applyTo(L2);
    expect(res.status).toBe(409);
    expect(res.body.error).toMatchObject({ code: 'LISTING_CLOSED', message: 'Applications for this internship are closed' });
  });

  test('past deadline counts as closed', async () => {
    await Listing.updateOne({ _id: L1._id }, { deadline: new Date(Date.now() - day) });
    expect((await applyTo(L1)).body.error.code).toBe('LISTING_CLOSED');
  });

  test('CGPA below minimum is 422 naming 8.0', async () => {
    const res = await applyTo(L3);
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('NOT_ELIGIBLE');
    expect(res.body.error.message).toContain('8.0');
    expect(await Application.countDocuments()).toBe(0);
  });

  test('eligible student can apply to the CGPA-gated listing', async () => {
    expect((await applyTo(L3, other)).status).toBe(201);
  });
});

describe('TC-REV-01: transitions and notification (REV-2, REV-3, REV-4)', () => {
  let a1;
  beforeEach(async () => {
    a1 = (await applyTo(L1)).body.applicationId;
    sent.length = 0;
  });
  const move = (body, user = recruiter) => request(app).patch(`/api/applications/${a1}/status`).set(as(user)).send(body);

  test('shortlist 200, back to APPLIED 422, reject without reason 400, one notification + one email', async () => {
    expect((await move({ status: 'SHORTLISTED' })).status).toBe(200);

    const back = await move({ status: 'APPLIED' });
    expect(back.status).toBe(422);
    expect(back.body.error.code).toBe('INVALID_TRANSITION');

    const noReason = await move({ status: 'REJECTED' });
    expect(noReason.status).toBe(400);
    expect(noReason.body.error.code).toBe('REASON_REQUIRED');

    const n = await Notification.find({ userId: student._id });
    expect(n).toHaveLength(1);
    expect(n[0].email.status).toBe('SENT');
    expect(sent).toHaveLength(1);
    expect(sent[0].to).toBe('asha@pes.edu');
  });

  test('full path to OFFER is recorded in history and the audit log (APP-4, SEC-6)', async () => {
    for (const status of ['SHORTLISTED', 'INTERVIEW', 'OFFER']) expect((await move({ status })).status).toBe(200);
    const saved = await Application.findById(a1);
    expect(saved.history.map((h) => h.to)).toEqual(['APPLIED', 'SHORTLISTED', 'INTERVIEW', 'OFFER']);
    expect(String(saved.history[3].by)).toBe(String(recruiter._id));
    const log = await AuditLog.find({ entityId: a1 }).sort({ at: 1 });
    expect(log.map((l) => l.after.status)).toEqual(['APPLIED', 'SHORTLISTED', 'INTERVIEW', 'OFFER']);
    expect((await move({ status: 'REJECTED', reasonCode: 'OTHER' })).status).toBe(422);
  });

  test('reject with a reason stores it and tells the student why', async () => {
    const res = await move({ status: 'REJECTED', reasonCode: 'SKILLS_MISMATCH' });
    expect(res.status).toBe(200);
    expect((await Application.findById(a1)).rejectReason).toBe('SKILLS_MISMATCH');
    expect(sent[0].text).toContain('Skills do not match the role');
  });

  test('a reason outside the fixed list is refused', async () => {
    expect((await move({ status: 'REJECTED', reasonCode: 'TOO_SHORT' })).status).toBe(400);
  });

  test('BR-2: another recruiter gets 403 NOT_LISTING_OWNER', async () => {
    const res = await move({ status: 'SHORTLISTED' }, recruiter2);
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('NOT_LISTING_OWNER');
  });

  test('a student cannot change their own status (STRIDE tampering)', async () => {
    expect((await move({ status: 'OFFER' }, student)).status).toBe(403);
  });

  test('$-operator keys are rejected (SEC-4)', async () => {
    expect((await move({ status: { $ne: 'x' } })).status).toBe(400);
  });

  test('two recruiter clicks racing on the same move: one wins', async () => {
    const [r1, r2] = await Promise.all([move({ status: 'SHORTLISTED' }), move({ status: 'SHORTLISTED' })]);
    const codes = [r1.status, r2.status].sort();
    expect(codes[0]).toBe(200);
    // loser either lost the conditional write (409) or saw SHORTLISTED already (422)
    expect([409, 422]).toContain(codes[1]);
    expect((await Application.findById(a1)).history).toHaveLength(2);
  });
});

describe('REV-1: recruiter applicant list', () => {
  test('owner sees applicants with profile summary and resume link, filterable by status', async () => {
    await applyTo(L1);
    await applyTo(L1, other);
    const res = await request(app).get(`/api/listings/${L1._id}/applications`).set(as(recruiter));
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(2);
    const asha = res.body.items.find((i) => i.student.name === 'Asha');
    expect(asha.student).toMatchObject({ branch: 'CSE', cgpa: 7.4 });
    expect(asha.resumeUrl).toBe(`/api/users/${student._id}/resume`);

    const filtered = await request(app).get(`/api/listings/${L1._id}/applications?status=OFFER`).set(as(recruiter));
    expect(filtered.body.items).toHaveLength(0);
  });

  test('another recruiter is refused', async () => {
    const res = await request(app).get(`/api/listings/${L1._id}/applications`).set(as(recruiter2));
    expect(res.status).toBe(403);
  });
});

describe('notifications and email retry (REV-4)', () => {
  test('failed email keeps the in-app row and retries up to 3 times, then FAILED', async () => {
    const a1 = (await applyTo(L1)).body.applicationId;
    failMail = true;
    await request(app).patch(`/api/applications/${a1}/status`).set(as(recruiter)).send({ status: 'SHORTLISTED' }).expect(200);

    let n = await Notification.findOne({ userId: student._id });
    expect(n.email).toMatchObject({ status: 'PENDING', attempts: 1 });

    const later = (min) => new Date(Date.now() + min * 60000 + 1000);
    expect(await notificationService.retryDueEmails(later(1))).toBe(1);
    expect(await notificationService.retryDueEmails(later(6))).toBe(1);
    expect(await notificationService.retryDueEmails(later(21))).toBe(1);
    n = await Notification.findById(n._id);
    expect(n.email).toMatchObject({ status: 'FAILED', attempts: 4 });
    expect(await notificationService.retryDueEmails(later(60))).toBe(0);
  });

  test('a retry succeeds once mail is back', async () => {
    const a1 = (await applyTo(L1)).body.applicationId;
    failMail = true;
    await request(app).patch(`/api/applications/${a1}/status`).set(as(recruiter)).send({ status: 'SHORTLISTED' });
    failMail = false;
    await notificationService.retryDueEmails(new Date(Date.now() + 2 * 60000));
    expect((await Notification.findOne({ userId: student._id })).email.status).toBe('SENT');
    expect(sent).toHaveLength(1);
  });

  test('GET /notifications lists only my own, unread filter and mark read', async () => {
    await applyTo(L1);
    const list = await request(app).get('/api/notifications?unread=true').set(as(recruiter));
    expect(list.body.items).toHaveLength(1);
    expect(list.body.items[0].email).toBeUndefined();
    expect((await request(app).get('/api/notifications').set(as(student))).body.items).toHaveLength(0);

    const id = list.body.items[0]._id;
    expect((await request(app).patch(`/api/notifications/${id}/read`).set(as(student))).status).toBe(404);
    await request(app).patch(`/api/notifications/${id}/read`).set(as(recruiter)).expect(200);
    expect((await request(app).get('/api/notifications?unread=true').set(as(recruiter))).body.items).toHaveLength(0);
  });
});

describe('audit log is append-only (SEC-6)', () => {
  test('updates and deletes are refused', async () => {
    await applyTo(L1);
    const entry = await AuditLog.findOne();
    await expect(AuditLog.updateOne({ _id: entry._id }, { action: 'X' })).rejects.toThrow('cannot be changed');
    await expect(AuditLog.deleteMany({})).rejects.toThrow('cannot be changed');
    entry.action = 'X';
    await expect(entry.save()).rejects.toThrow('cannot be changed');
  });
});
