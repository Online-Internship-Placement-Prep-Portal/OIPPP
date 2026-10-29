const mongoose = require('mongoose');
const request = require('supertest');

jest.mock('../../src/middleware/auth', () => require('../helpers/fakeAuth'));

const db = require('../helpers/db');
const { as } = require('../helpers/fakeAuth');
const { User, Profile, Listing } = require('../helpers/fixtures');
const app = require('../../src/app');
const Application = require('../../src/modules/applications/application.model');
const Result = require('../../src/modules/tests/result.model');

const STUDENTS = 2000;
const BRANCHES = ['CSE', 'ECE', 'EEE', 'ME', 'CV'];
let admin;

beforeAll(async () => {
  await db.connect();
  admin = await User.create({ name: 'Admin', email: 'admin@pes.edu', role: 'ADMIN' });
  const students = Array.from({ length: STUDENTS }, (_, i) => ({ _id: new mongoose.Types.ObjectId(),
    name: `Student ${i}`, email: `s${i}@pes.edu`, role: 'STUDENT' }));
  await User.collection.insertMany(students);
  await Profile.collection.insertMany(students.map((u, i) => ({ userId: u._id,
    branch: BRANCHES[i % BRANCHES.length], gradYear: 2026 + (i % 3) })));
  const listings = Array.from({ length: 50 }, (_, i) => ({ _id: new mongoose.Types.ObjectId(),
    recruiterId: admin._id, title: `Role ${i}`, company: `Company ${i % 10}`, status: 'OPEN' }));
  await Listing.collection.insertMany(listings);
  const statuses = ['APPLIED', 'SHORTLISTED', 'INTERVIEW', 'OFFER', 'REJECTED'];
  await Application.collection.insertMany(students.flatMap((u, i) => [0, 1, 2].map((k) => ({
    studentId: u._id, listingId: listings[(i + k * 7) % listings.length]._id, status: statuses[(i + k) % 5] }))));
  await Result.collection.insertMany(students.flatMap((u, i) => [0, 1].map((k) => ({
    attemptId: new mongoose.Types.ObjectId(), studentId: u._id, testId: new mongoose.Types.ObjectId(),
    totalQuestions: 10, correctAnswers: (i + k) % 11, score: ((i + k) % 11) * 10, submittedAt: new Date(),
    topicBreakdown: [{ topic: 'Quantitative', totalQuestions: 10, correctAnswers: (i + k) % 11,
      percentage: ((i + k) % 11) * 10 }] }))));
}, 120000);
afterAll(db.disconnect);

// PERF-3 covers the full dashboard render; this checks the API share of that 3 s budget.
test.each(['', '?branch=CSE&gradYear=2027'])('placement statistics for 2,000 students in under 3 s (%s)', async (q) => {
  const startedAt = Date.now();
  const res = await request(app).get(`/api/analytics/placements${q}`).set(as(admin));
  const elapsed = Date.now() - startedAt;
  expect(res.status).toBe(200);
  // branch = BRANCHES[i % 5], gradYear = 2026 + i % 3, so CSE/2027 is i % 15 === 10
  expect(res.body.students).toBe(q ? Math.ceil((STUDENTS - 10) / 15) : STUDENTS);
  expect(elapsed).toBeLessThan(3000);
});
