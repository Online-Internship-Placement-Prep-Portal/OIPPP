// Branch coverage (#98): real paths in analytics, applications and notifications that the
// feature suites did not reach.
const mongoose = require('mongoose');
const request = require('supertest');

jest.mock('../../src/middleware/auth', () => require('../helpers/fakeAuth'));

const db = require('../helpers/db');
const { as } = require('../helpers/fakeAuth');
const { seed, day } = require('../helpers/seed');
const { User, Profile, Listing } = require('../helpers/fixtures');
const app = require('../../src/app');
const Application = require('../../src/modules/applications/application.model');
const Test = require('../../src/modules/tests/test.model');
const Result = require('../../src/modules/tests/result.model');
const Notification = require('../../src/modules/notifications/notification.model');
const mailer = require('../../src/modules/notifications/mailer');
const notifications = require('../../src/modules/notifications/notification.service');

let s;
async function result(student, topics, { title = 'Mock', submittedAt = new Date(), testId } = {}) {
  const id = testId || (await Test.create({ title, durationMin: 10, createdBy: s.admin._id, status: 'PUBLISHED',
    questionIds: Array.from({ length: 5 }, () => new mongoose.Types.ObjectId()) }))._id;
  const topicBreakdown = topics.map(([topic, totalQuestions, correctAnswers]) => ({
    topic, totalQuestions, correctAnswers, percentage: (100 * correctAnswers) / totalQuestions }));
  const totalQuestions = topics.reduce((n, t) => n + t[1], 0);
  const correctAnswers = topics.reduce((n, t) => n + t[2], 0);
  return Result.create({ attemptId: new mongoose.Types.ObjectId(), studentId: student._id, testId: id,
    totalQuestions, correctAnswers, score: (100 * correctAnswers) / totalQuestions, topicBreakdown, submittedAt });
}
const get = (path, user) => request(app).get(`/api${path}`).set(as(user));

beforeAll(db.connect);
afterAll(db.disconnect);
beforeEach(async () => {
  await db.clear();
  s = await seed();
  s.admin = await User.create({ name: 'Admin', email: 'admin@pes.edu', role: 'ADMIN' });
});
afterEach(() => jest.restoreAllMocks());

describe('analytics edge paths (ANL-1, ANL-2, ANL-3)', () => {
  test('weak-topic ties on percentage and size fall back to the fixed topic order', async () => {
    await result(s.student, [['Technical', 4, 2], ['Logical', 4, 2]]);
    const { body } = await get('/analytics/me', s.student);
    expect(body.topics.map((t) => t.topic)).toEqual(['Logical', 'Technical']);
  });

  test('a result whose test record is gone shows testTitle null, not a crash', async () => {
    await result(s.student, [['Verbal', 5, 3]], { testId: new mongoose.Types.ObjectId() });
    const { status, body } = await get('/analytics/me', s.student);
    expect(status).toBe(200);
    expect(body.trend).toEqual([expect.objectContaining({ testTitle: null, score: 60 })]);
  });

  test('profiles without a branch are reported as branch null, also under a year-only filter', async () => {
    const nb = await User.create({ name: 'No Branch', email: 'nb@pes.edu', role: 'STUDENT' });
    await Profile.create({ userId: nb._id, gradYear: 2027 });
    await result(nb, [['Quantitative', 10, 6]]);
    const all = await get('/analytics/placements', s.admin);
    expect(all.body.averageScoreByBranch).toContainEqual({ branch: null, results: 1, students: 1, averageScore: 60 });
    const year = await get('/analytics/placements?gradYear=2027', s.admin);
    expect(year.body.averageScoreByBranch).toContainEqual({ branch: null, results: 1, students: 1, averageScore: 60 });
  });

  test('offers on a deleted listing are kept as "Unknown listing", in JSON and CSV, with branch rows', async () => {
    const gone = await Listing.create({ recruiterId: s.recruiter._id, title: 'Gone Intern', company: 'Gone Co',
      deadline: new Date(Date.now() + day) });
    await Application.create({ studentId: s.student._id, listingId: gone._id, status: 'OFFER' });
    await Listing.deleteOne({ _id: gone._id });
    await result(s.student, [['Quantitative', 10, 7]]);
    const lone = await User.create({ name: 'No Profile', email: 'np@pes.edu', role: 'STUDENT' });
    await result(lone, [['Logical', 10, 5]]);

    const json = await get('/analytics/placements', s.admin);
    expect(json.body.offersPerCompany).toEqual([{ company: null, offers: 1 }]);
    expect(json.body.applicationsPerListing).toEqual([expect.objectContaining({ title: null, company: null, applications: 1, offers: 1 })]);

    const csv = await get('/analytics/placements/export', s.admin);
    const lines = csv.text.trim().split('\r\n');
    expect(lines).toContain('offersPerCompany,Unknown listing,,1');
    expect(lines).toContain('applicationsPerListing,Unknown listing,,1');
    expect(lines).toContain('averageScoreByBranch,CSE,1 results,70');
    expect(lines).toContain('averageScoreByBranch,No branch,1 results,50');
  });
});

describe('application edge paths (APP, REV)', () => {
  test('applicants of a listing that does not exist is 404', async () => {
    const res = await get(`/listings/${new mongoose.Types.ObjectId()}/applications`, s.recruiter);
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  test('an applicant without a profile is listed with empty profile fields', async () => {
    const lone = await User.create({ name: 'No Profile', email: 'np@pes.edu', role: 'STUDENT' });
    await Application.create({ studentId: lone._id, listingId: s.L1._id });
    const res = await get(`/listings/${s.L1._id}/applications`, s.recruiter);
    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0].student).toMatchObject({ name: 'No Profile' });
    expect(res.body.items[0].student.branch).toBeUndefined();
  });

  test("a student's application whose listing was deleted still lists, with listing null", async () => {
    const app1 = await Application.create({ studentId: s.student._id, listingId: new mongoose.Types.ObjectId() });
    const res = await get('/applications/mine', s.student);
    expect(res.status).toBe(200);
    expect(res.body.items.find((a) => String(a._id) === String(app1._id)).listing).toBeNull();
  });

  test('resume of an unknown application is 404', async () => {
    const res = await get(`/applications/${new mongoose.Types.ObjectId()}/resume`, s.recruiter);
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  test('the student owner and an admin pass the access check for an application resume', async () => {
    const application = await Application.create({ studentId: s.student._id, listingId: s.L1._id });
    for (const user of [s.student, s.admin]) {
      // eslint-disable-next-line no-await-in-loop
      const res = await get(`/applications/${application._id}/resume`, user);
      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('RESUME_NOT_FOUND');
    }
  });
});

describe('notification edge paths (REV-4)', () => {
  test('a recipient with no email is marked for retry, not sent', async () => {
    const sendMail = jest.fn();
    mailer.setTransport({ sendMail });
    const n = await notifications.notify(new mongoose.Types.ObjectId(), { type: 'APPLICATION_STATUS', title: 't', message: 'm' }, { email: true });
    expect(sendMail).not.toHaveBeenCalled();
    const stored = await Notification.findById(n._id).lean();
    expect(stored.email.status).toBe('PENDING');
    expect(stored.email.attempts).toBe(1);
  });

  test('defaults: retry uses the current time, list works without options, the job uses 60 s', async () => {
    expect(await notifications.retryDueEmails()).toBe(0);
    expect(await notifications.list(s.student._id)).toEqual([]);
    const spy = jest.spyOn(global, 'setInterval');
    const timer = notifications.startEmailRetryJob();
    expect(spy).toHaveBeenCalledWith(expect.any(Function), 60000);
    clearInterval(timer);
  });
});
