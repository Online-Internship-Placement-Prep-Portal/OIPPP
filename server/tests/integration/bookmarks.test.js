const request = require('supertest');

jest.mock('../../src/middleware/auth', () => require('../helpers/fakeAuth'));

const db = require('../helpers/db');
const { as } = require('../helpers/fakeAuth');
const { seed } = require('../helpers/seed');
const app = require('../../src/app');
const Bookmark = require('../../src/modules/listings/bookmark.model');
const Listing = require('../../src/modules/listings/listing.model');

let s;

beforeAll(async () => {
  await db.connect();
});

afterAll(async () => {
  await db.disconnect();
});

beforeEach(async () => {
  await db.clear();
  s = await seed();
});

describe('Issue #11: bookmarks', () => {
  test('student can bookmark an open listing', async () => {
    const res = await request(app)
      .post(`/api/listings/${s.L1.id}/bookmark`)
      .set(as(s.student));

    expect(res.status).toBe(201);
    expect(String(res.body.bookmark.studentId)).toBe(String(s.student._id));
    expect(String(res.body.bookmark.listingId)).toBe(String(s.L1._id));
  });

  test('bookmarking the same listing twice does not create duplicates', async () => {
    const first = await request(app)
      .post(`/api/listings/${s.L1.id}/bookmark`)
      .set(as(s.student));
    const second = await request(app)
      .post(`/api/listings/${s.L1.id}/bookmark`)
      .set(as(s.student));

    expect(first.status).toBe(201);
    expect(second.status).toBe(201);
    expect(await Bookmark.countDocuments({ studentId: s.student._id, listingId: s.L1._id })).toBe(1);
  });

  test('student can view their bookmarked listings', async () => {
    await request(app)
      .post(`/api/listings/${s.L1.id}/bookmark`)
      .set(as(s.student));

    const res = await request(app)
      .get('/api/bookmarks/mine')
      .set(as(s.student));

    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(1);
    expect(String(res.body.items[0].listingId._id)).toBe(String(s.L1._id));
  });

  test('student can remove a bookmark', async () => {
    await request(app)
      .post(`/api/listings/${s.L1.id}/bookmark`)
      .set(as(s.student));

    const res = await request(app)
      .delete(`/api/listings/${s.L1.id}/bookmark`)
      .set(as(s.student));

    expect(res.status).toBe(204);
    expect(await Bookmark.countDocuments({ studentId: s.student._id, listingId: s.L1._id })).toBe(0);
  });

  test('recruiter cannot use student bookmark endpoints', async () => {
    const res = await request(app)
      .post(`/api/listings/${s.L1.id}/bookmark`)
      .set(as(s.recruiter));

    expect(res.status).toBe(403);
  });

  test('closed listings cannot be bookmarked', async () => {
    const res = await request(app)
      .post(`/api/listings/${s.L2.id}/bookmark`)
      .set(as(s.student));

    expect(res.status).toBe(400);
  });

  test('expired listings cannot be bookmarked', async () => {
    const expired = await Listing.create({
      recruiterId: s.recruiter._id,
      title: 'Expired Intern',
      company: 'Example',
      status: 'OPEN',
      deadline: new Date(Date.now() - 60000),
    });

    const res = await request(app)
      .post(`/api/listings/${expired.id}/bookmark`)
      .set(as(s.student));

    expect(res.status).toBe(400);
  });

  test('unauthenticated users cannot bookmark listings', async () => {
    const res = await request(app)
      .post(`/api/listings/${s.L1.id}/bookmark`);

    expect(res.status).toBe(401);
  });
});
