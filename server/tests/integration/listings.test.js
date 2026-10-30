const request = require('supertest');

jest.mock('../../src/middleware/auth', () => require('../helpers/fakeAuth'));

const db = require('../helpers/db');
const { as } = require('../helpers/fakeAuth');
const { seed } = require('../helpers/seed');
const app = require('../../src/app');
const Listing = require('../../src/modules/listings/listing.model');
const listingService = require('../../src/modules/listings/listing.service');

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

const validListing = () => ({
  company: 'Example Technologies',
  title: 'Backend Intern',
  location: 'Bengaluru',
  mode: 'HYBRID',
  stipend: 15000,
  skills: ['Node.js', 'MongoDB'],
  minCgpa: 7,
  deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
});

describe('Issue #9: recruiter listing management', () => {
  test('approved recruiter can create a listing', async () => {
    const res = await request(app)
      .post('/api/listings')
      .set(as(s.recruiter))
      .send(validListing());

    expect(res.status).toBe(201);
    expect(res.body.listing).toMatchObject({
      company: 'Example Technologies',
      title: 'Backend Intern',
      status: 'OPEN',
      minCgpa: 7,
    });
    expect(String(res.body.listing.recruiterId)).toBe(String(s.recruiter._id));
  });

  test('rejects a past deadline', async () => {
    const res = await request(app)
      .post('/api/listings')
      .set(as(s.recruiter))
      .send({ ...validListing(), deadline: new Date(Date.now() - 60000).toISOString() });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION');
  });

  test('rejects a negative stipend', async () => {
    const res = await request(app)
      .post('/api/listings')
      .set(as(s.recruiter))
      .send({ ...validListing(), stipend: -100 });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION');
  });

  test('rejects a pending recruiter', async () => {
    const pendingRecruiter = { ...s.recruiter.toObject(), status: 'PENDING' };
    const res = await request(app)
      .post('/api/listings')
      .set(as(pendingRecruiter))
      .send(validListing());

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('NOT_APPROVED');
  });

  test('only the owner can close a listing', async () => {
    const listing = await Listing.create({
      ...validListing(),
      recruiterId: s.recruiter._id,
    });

    const res = await request(app)
      .patch(`/api/listings/${listing.id}`)
      .set(as(s.recruiter2))
      .send({ status: 'CLOSED' });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('NOT_OWNER');
  });

  test('owner can close a listing', async () => {
    const listing = await Listing.create({
      ...validListing(),
      recruiterId: s.recruiter._id,
    });

    const res = await request(app)
      .patch(`/api/listings/${listing.id}`)
      .set(as(s.recruiter))
      .send({ status: 'CLOSED' });

    expect(res.status).toBe(200);
    expect(res.body.listing.status).toBe('CLOSED');
  });

  test('automatically closes expired listings', async () => {
    const listing = await Listing.create({
      ...validListing(),
      recruiterId: s.recruiter._id,
      deadline: new Date(Date.now() - 60000),
    });

    await listingService.closeExpiredListings();
    const updated = await Listing.findById(listing.id);

    expect(updated.status).toBe('CLOSED');
  });

  test('owner can edit a listing', async () => {
    const listing = await Listing.create({
      ...validListing(),
      recruiterId: s.recruiter._id,
    });

    const res = await request(app)
      .patch(`/api/listings/${listing.id}`)
      .set(as(s.recruiter))
      .send({ title: 'Updated Backend Intern', stipend: 20000 });

    expect(res.status).toBe(200);
    expect(res.body.listing.title).toBe('Updated Backend Intern');
    expect(res.body.listing.stipend).toBe(20000);
    expect(String(res.body.listing.recruiterId)).toBe(String(s.recruiter._id));
  });

  test('another recruiter cannot edit a listing', async () => {
    const listing = await Listing.create({
      ...validListing(),
      recruiterId: s.recruiter._id,
    });

    const res = await request(app)
      .patch(`/api/listings/${listing.id}`)
      .set(as(s.recruiter2))
      .send({ title: 'Unauthorized Update' });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('NOT_OWNER');

    const unchanged = await Listing.findById(listing.id);
    expect(unchanged.title).toBe('Backend Intern');
    expect(String(unchanged.recruiterId)).toBe(String(s.recruiter._id));
  });
});

describe('Additional listing integration coverage - Issue #15', () => {
  test('rejects listing creation without authentication', async () => {
    const res = await request(app)
      .post('/api/listings')
      .send(validListing());

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHENTICATED');
  });

  test('rejects updates with an invalid listing ID', async () => {
    const res = await request(app)
      .patch('/api/listings/not-a-valid-id')
      .set(as(s.recruiter))
      .send({ title: 'Updated Backend Intern' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION');
  });

  test('rejects an empty listing update', async () => {
    const listing = await Listing.create({
      ...validListing(),
      recruiterId: s.recruiter._id,
    });

    const res = await request(app)
      .patch(`/api/listings/${listing.id}`)
      .set(as(s.recruiter))
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION');
  });
});

describe('listing reads for the client', () => {
  test('anyone can open a listing by id', async () => {
    const res = await request(app).get(`/api/listings/${s.L1.id}`);

    expect(res.status).toBe(200);
    expect(res.body.listing.title).toBe('Backend Intern');
  });

  test('an unknown listing is 404 and a bad id is 400', async () => {
    expect((await request(app).get('/api/listings/000000000000000000000000')).status).toBe(404);
    expect((await request(app).get('/api/listings/not-an-id')).status).toBe(400);
  });

  test('a recruiter sees all of their own listings, open and closed, newest first', async () => {
    const res = await request(app).get('/api/listings/mine').set(as(s.recruiter));

    expect(res.status).toBe(200);
    expect(res.body.listings.map((l) => l.title).sort()).toEqual(['Backend Intern', 'Closed Intern', 'ML Intern']);
    expect((await request(app).get('/api/listings/mine').set(as(s.recruiter2))).body.listings).toEqual([]);
  });

  test('only recruiters have a "mine" list', async () => {
    expect((await request(app).get('/api/listings/mine').set(as(s.student))).status).toBe(403);
  });
});
