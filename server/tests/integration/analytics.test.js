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

let s;
// topics: [[topic, totalQuestions, correctAnswers], ...]
async function result(student, title, topics, submittedAt) {
  const test = await Test.create({ title, durationMin: 10, createdBy: s.admin._id, status: 'PUBLISHED',
    questionIds: Array.from({ length: 5 }, () => new mongoose.Types.ObjectId()) });
  const topicBreakdown = topics.map(([topic, totalQuestions, correctAnswers]) => ({
    topic, totalQuestions, correctAnswers, percentage: (100 * correctAnswers) / totalQuestions }));
  const totalQuestions = topics.reduce((n, t) => n + t[1], 0);
  const correctAnswers = topics.reduce((n, t) => n + t[2], 0);
  return Result.create({ attemptId: new mongoose.Types.ObjectId(), studentId: student._id, testId: test._id,
    totalQuestions, correctAnswers, score: (100 * correctAnswers) / totalQuestions, topicBreakdown, submittedAt });
}
const get = (path, user) => {
  const call = request(app).get(`/api${path}`);
  return user ? call.set(as(user)) : call;
};

beforeAll(db.connect);
afterAll(db.disconnect);
beforeEach(async () => {
  await db.clear();
  s = await seed();
  [s.admin, s.meera, s.kiran] = await User.create([
    { name: 'Admin', email: 'admin@pes.edu', role: 'ADMIN' },
    { name: 'Meera', email: 'meera@pes.edu', role: 'STUDENT' },
    { name: 'Kiran', email: 'kiran@pes.edu', role: 'STUDENT' },
  ]);
  await Profile.create({ userId: s.meera._id, branch: 'CSE', gradYear: 2028 });
  s.G1 = await Listing.create({ recruiterId: s.recruiter2._id, title: 'Data Intern', company: 'Globex',
    deadline: new Date(Date.now() + 7 * day) });
});

describe('student readiness GET /analytics/me (ANL-1)', () => {
  test('a student with no data gets empty states, not invented scores', async () => {
    const res = await get('/analytics/me', s.student);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ testsTaken: 0, averageScore: null, trend: [], topics: [], weakestTopics: [] });
    expect(res.body.applications).toEqual({ total: 0,
      byStatus: { APPLIED: 0, SHORTLISTED: 0, INTERVIEW: 0, OFFER: 0, REJECTED: 0 } });
  });

  test('trend, pooled weakest topics and application counts use only the caller\'s records', async () => {
    await result(s.student, 'Mock 2', [['Quantitative', 5, 4], ['Logical', 5, 1]], new Date('2026-02-01'));
    await result(s.student, 'Mock 1', [['Quantitative', 5, 2], ['Technical', 5, 5]], new Date('2026-01-01'));
    await result(s.other, 'Mock 3', [['Verbal', 5, 0]], new Date('2026-01-15'));
    await Application.create([
      { studentId: s.student._id, listingId: s.L1._id },
      { studentId: s.student._id, listingId: s.G1._id, status: 'OFFER' },
      { studentId: s.other._id, listingId: s.L1._id, status: 'REJECTED' },
    ]);
    const { body } = await get('/analytics/me', s.student);
    expect(body.testsTaken).toBe(2);
    expect(body.averageScore).toBe(60);
    expect(body.trend.map((t) => [t.testTitle, t.score])).toEqual([['Mock 1', 70], ['Mock 2', 50]]);
    expect(body.weakestTopics).toEqual([
      { topic: 'Logical', totalQuestions: 5, correctAnswers: 1, percentage: 20 },
      { topic: 'Quantitative', totalQuestions: 10, correctAnswers: 6, percentage: 60 },
    ]);
    expect(body.topics.map((t) => t.topic)).toEqual(['Logical', 'Quantitative', 'Technical']);
    expect(body.applications.total).toBe(2);
    expect(body.applications.byStatus).toMatchObject({ APPLIED: 1, OFFER: 1, REJECTED: 0 });
  });

  test('one assessed topic yields one weak topic; ties prefer the topic with more questions', async () => {
    await result(s.student, 'Only', [['Verbal', 5, 3]], new Date());
    expect((await get('/analytics/me', s.student)).body.weakestTopics.map((t) => t.topic)).toEqual(['Verbal']);
    await result(s.student, 'Tie', [['Verbal', 5, 3], ['Logical', 20, 12]], new Date());
    expect((await get('/analytics/me', s.student)).body.weakestTopics.map((t) => t.topic))
      .toEqual(['Logical', 'Verbal']);
  });

  test.each([['ADMIN', 403], ['RECRUITER', 403], [null, 401]])('denies %s', async (role, status) => {
    const user = role === 'ADMIN' ? s.admin : role === 'RECRUITER' ? s.recruiter : null;
    expect((await get('/analytics/me', user)).status).toBe(status);
  });
});

describe('placement statistics GET /analytics/placements (ANL-2)', () => {
  beforeEach(async () => {
    await Application.create([
      { studentId: s.student._id, listingId: s.L1._id, status: 'OFFER' },
      { studentId: s.student._id, listingId: s.G1._id, status: 'OFFER' },
      { studentId: s.other._id, listingId: s.L1._id, status: 'REJECTED' },
      { studentId: s.other._id, listingId: s.G1._id, status: 'OFFER' },
      { studentId: s.meera._id, listingId: s.L1._id },
      { studentId: s.kiran._id, listingId: s.G1._id },
    ]);
    await result(s.student, 'A', [['Quantitative', 10, 7]], new Date());
    await result(s.other, 'B', [['Quantitative', 10, 5]], new Date());
    await result(s.meera, 'C', [['Quantitative', 10, 9]], new Date());
    await result(s.kiran, 'D', [['Quantitative', 10, 4]], new Date());
  });

  test('whole batch: distinct placed students, offers per company, applications per listing, branch averages', async () => {
    const { status, body } = await get('/analytics/placements', s.admin);
    expect(status).toBe(200);
    expect(body.filters).toEqual({ branch: null, gradYear: null });
    expect(body.students).toBe(4);
    expect(body.placedStudents).toBe(2);
    expect(body.offersPerCompany).toEqual([{ company: 'Globex', offers: 2 }, { company: 'Acme', offers: 1 }]);
    expect(body.applicationsPerListing.map((l) => [l.title, l.company, l.applications, l.offers])).toEqual([
      ['Backend Intern', 'Acme', 3, 1], ['Data Intern', 'Globex', 3, 2]]);
    expect(body.averageScoreByBranch).toEqual([
      { branch: 'CSE', results: 2, students: 2, averageScore: 80 },
      { branch: 'ECE', results: 1, students: 1, averageScore: 50 },
      { branch: null, results: 1, students: 1, averageScore: 40 },
    ]);
  });

  test('branch (case-insensitive) and gradYear filters apply to every metric', async () => {
    const { body } = await get('/analytics/placements?branch=cse&gradYear=2027', s.admin);
    expect(body.filters).toEqual({ branch: 'cse', gradYear: 2027 });
    expect(body).toMatchObject({ students: 1, placedStudents: 1 });
    expect(body.offersPerCompany).toEqual([{ company: 'Acme', offers: 1 }, { company: 'Globex', offers: 1 }]);
    expect(body.applicationsPerListing.map((l) => l.applications)).toEqual([1, 1]);
    expect(body.averageScoreByBranch).toEqual([{ branch: 'CSE', results: 1, students: 1, averageScore: 70 }]);
  });

  test('an empty cohort returns zero students and empty lists', async () => {
    const { body } = await get('/analytics/placements?branch=MECH', s.admin);
    expect(body).toMatchObject({ students: 0, placedStudents: 0, offersPerCompany: [],
      applicationsPerListing: [], averageScoreByBranch: [] });
  });

  test.each(['gradYear=abc', 'gradYear=1999', 'branch[$ne]=x'])('rejects query %s', async (q) => {
    expect((await get(`/analytics/placements?${q}`, s.admin)).status).toBe(400);
  });

  test.each([['STUDENT', 403], ['RECRUITER', 403], [null, 401]])('denies %s', async (role, status) => {
    const user = role === 'STUDENT' ? s.student : role === 'RECRUITER' ? s.recruiter : null;
    expect((await get('/analytics/placements', user)).status).toBe(status);
    expect((await get('/analytics/placements/export', user)).status).toBe(status);
  });
});

describe('placement CSV export (ANL-3)', () => {
  test('matches the dashboard cohort and escapes unsafe cells', async () => {
    const risky = await Listing.create({ recruiterId: s.recruiter._id, title: '=HYPERLINK("x")',
      company: 'Acme, "Labs"', deadline: new Date(Date.now() + day) });
    await Application.create({ studentId: s.student._id, listingId: risky._id, status: 'OFFER' });
    const res = await get('/analytics/placements/export?branch=CSE', s.admin);
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/^text\/csv/);
    expect(res.headers['content-disposition']).toMatch(/attachment; filename="placement-report.csv"/);
    const lines = res.text.trim().split('\r\n');
    expect(lines).toEqual([
      'section,group,detail,value',
      'filter,branch,,CSE',
      'filter,gradYear,,ALL',
      'summary,students,,2',
      'summary,placedStudents,,1',
      'offersPerCompany,"Acme, ""Labs""",,1',
      'applicationsPerListing,"\'=HYPERLINK(""x"")","Acme, ""Labs""",1',
    ]);
  });

  test('an empty cohort says so instead of showing bare zeroes', async () => {
    const res = await get('/analytics/placements/export?gradYear=2040', s.admin);
    expect(res.text).toContain('note,No students match the selected cohort');
  });
});

describe('placement statistics cache (SAD 3.4)', () => {
  const { CACHE_MS } = require('../../src/modules/analytics/analytics.service');

  afterEach(() => jest.useRealTimers());

  test('reuses a cohort\'s figures for 5 minutes, per filter, then recomputes', async () => {
    jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate', 'setTimeout', 'setInterval', 'queueMicrotask'] });
    const before = (await get('/analytics/placements', s.admin)).body.students;

    await User.create({ name: 'Late', email: 'late@pes.edu', role: 'STUDENT' });
    expect((await get('/analytics/placements', s.admin)).body.students).toBe(before);
    expect((await get('/analytics/placements?gradYear=2028', s.admin)).body.students).toBe(1);

    jest.setSystemTime(Date.now() + CACHE_MS + 1);
    expect((await get('/analytics/placements', s.admin)).body.students).toBe(before + 1);
  });

  test('student readiness is never cached', async () => {
    expect((await get('/analytics/me', s.student)).body.testsTaken).toBe(0);
    await result(s.student, 'Mock 9', [['Verbal', 5, 3]], new Date('2026-03-01'));
    expect((await get('/analytics/me', s.student)).body.testsTaken).toBe(1);
  });
});
