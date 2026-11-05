// Branch coverage (#98): real paths in bookmarks, recommendations and search that the
// feature suites did not reach.
const request = require('supertest');
const mongoose = require('mongoose');

jest.mock('../../src/middleware/auth', () => require('../helpers/fakeAuth'));

const db = require('../helpers/db');
const { as } = require('../helpers/fakeAuth');
const { seed, day } = require('../helpers/seed');
const { User, Profile, Listing } = require('../helpers/fixtures');
const app = require('../../src/app');
const Bookmark = require('../../src/modules/listings/bookmark.model');

let s;

beforeAll(db.connect);
afterAll(db.disconnect);
beforeEach(async () => {
  await db.clear();
  s = await seed();
});
afterEach(() => jest.restoreAllMocks());

describe('bookmarks (SRCH-4)', () => {
  test('bookmarking a listing that does not exist is 404', async () => {
    const res = await request(app).post(`/api/listings/${new mongoose.Types.ObjectId()}/bookmark`).set(as(s.student));
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  test('a concurrent duplicate save (unique index 11000) returns the existing bookmark', async () => {
    const existing = await Bookmark.create({ studentId: s.student._id, listingId: s.L1._id });
    // The other request's findOne ran before this insert, so create() hits the unique index.
    jest.spyOn(Bookmark, 'findOne').mockResolvedValueOnce(null);
    const res = await request(app).post(`/api/listings/${s.L1.id}/bookmark`).set(as(s.student));
    expect(res.status).toBe(201);
    expect(String(res.body.bookmark._id)).toBe(String(existing._id));
    expect(await Bookmark.countDocuments({ studentId: s.student._id })).toBe(1);
  });

  test('any other database error on save is not swallowed', async () => {
    jest.spyOn(Bookmark, 'create').mockRejectedValueOnce(Object.assign(new Error('disk full'), { code: 8 }));
    const res = await request(app).post(`/api/listings/${s.L1.id}/bookmark`).set(as(s.student));
    expect(res.status).toBe(500);
    expect(await Bookmark.countDocuments({})).toBe(0);
  });
});

describe('recommendations (SRCH-5)', () => {
  const rec = (user) => request(app).get('/api/listings/recommendations').set(as(user));

  test('a student without a profile gets 404', async () => {
    const lone = await User.create({ name: 'No Profile', email: 'np@pes.edu', role: 'STUDENT' });
    const res = await rec(lone);
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  test('a profile without CGPA only sees listings with no CGPA minimum', async () => {
    await Profile.updateOne({ userId: s.other._id }, { $set: { skills: ['node'] }, $unset: { cgpa: 1 } });
    await Listing.updateMany({}, { $set: { skills: ['Node'] } });
    const res = await rec(s.other);
    expect(res.status).toBe(200);
    expect(res.body.listings.map((l) => l.title)).toEqual(['Backend Intern']);
  });

  test('equal match count and deadline fall back to listing id order', async () => {
    const deadline = new Date(Date.now() + 3 * day);
    const ids = [new mongoose.Types.ObjectId(), new mongoose.Types.ObjectId()].sort((a, b) => String(a).localeCompare(String(b)));
    await Listing.create([
      { _id: ids[1], recruiterId: s.recruiter._id, title: 'Second by id', company: 'Acme', deadline, skills: ['node'] },
      { _id: ids[0], recruiterId: s.recruiter._id, title: 'First by id', company: 'Acme', deadline, skills: ['node'] },
    ]);
    const res = await rec(s.student);
    const tied = res.body.listings.filter((l) => l.title.endsWith('by id')).map((l) => l.title);
    expect(tied).toEqual(['First by id', 'Second by id']);
  });
});

describe('search deadline filter (SRCH-2)', () => {
  test('a deadlineAfter in the past still hides expired listings', async () => {
    await Listing.collection.insertOne({ recruiterId: s.recruiter._id, title: 'Expired Intern', company: 'Acme',
      status: 'OPEN', deadline: new Date(Date.now() - day), skills: [], mode: 'REMOTE', createdAt: new Date(), updatedAt: new Date() });
    const res = await request(app).get(`/api/listings?deadlineAfter=${new Date(Date.now() - 30 * day).toISOString()}`);
    expect(res.status).toBe(200);
    const titles = res.body.listings.map((l) => l.title);
    expect(titles).toContain('Backend Intern');
    expect(titles).not.toContain('Expired Intern');
  });
});
