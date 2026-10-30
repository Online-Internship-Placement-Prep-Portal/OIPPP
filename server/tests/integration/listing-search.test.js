const request = require('supertest');

jest.mock('../../src/middleware/auth', () => require('../helpers/fakeAuth'));

const db = require('../helpers/db');
const { seed } = require('../helpers/seed');
const app = require('../../src/app');
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

function listing(overrides = {}) {
  return {
    recruiterId: s.recruiter._id,
    company: 'Example Technologies',
    title: 'Backend Intern',
    location: 'Bengaluru',
    mode: 'HYBRID',
    stipend: 15000,
    skills: ['Node.js', 'MongoDB'],
    status: 'OPEN',
    deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    ...overrides,
  };
}

describe('Issue #10: listing search, filters, sorting and pagination', () => {
  test('returns only open, unexpired listings', async () => {
    await Listing.updateMany({}, { $set: { status: 'CLOSED' } });
    await Listing.create(listing({ title: 'Fresh Test Internship' }));
    await Listing.create(listing({
      title: 'Expired Test Internship',
      deadline: new Date(Date.now() - 60000),
    }));

    const res = await request(app).get('/api/listings');

    expect(res.status).toBe(200);
    expect(res.body.listings.map(item => item.title)).toEqual(['Fresh Test Internship']);
    expect(res.body.pagination.total).toBe(1);
  });

  test('searches by role/title', async () => {
    await Listing.create(listing({ title: 'Unique Backend Role' }));
    await Listing.create(listing({ title: 'Unique Frontend Role' }));

    const res = await request(app).get('/api/listings?search=Unique%20Backend');

    expect(res.status).toBe(200);
    expect(res.body.listings).toHaveLength(1);
    expect(res.body.listings[0].title).toBe('Unique Backend Role');
  });

  test('filters by location, stipend and skill', async () => {
    await Listing.create(listing({ title: 'Target Filter Role' }));
    await Listing.create(listing({
      title: 'Other Filter Role',
      location: 'Chennai',
      stipend: 8000,
      skills: ['React'],
    }));

    const res = await request(app)
      .get('/api/listings?search=Target&location=Bengaluru&minStipend=10000&skill=MongoDB');

    expect(res.status).toBe(200);
    expect(res.body.listings).toHaveLength(1);
    expect(res.body.listings[0].title).toBe('Target Filter Role');
  });

  test('sorts matching listings by stipend descending', async () => {
    await Listing.create(listing({ title: 'Low Test Role', stipend: 5000 }));
    await Listing.create(listing({ title: 'High Test Role', stipend: 30000 }));
    await Listing.create(listing({ title: 'Middle Test Role', stipend: 15000 }));

    const res = await request(app)
      .get('/api/listings?search=Test%20Role&sortBy=stipend&order=desc');

    expect(res.status).toBe(200);
    expect(res.body.listings.map(item => item.stipend)).toEqual([30000, 15000, 5000]);
  });

  test('paginates matching listings and reports their total', async () => {
    await Listing.create(listing({ title: 'Page Test A' }));
    await Listing.create(listing({ title: 'Page Test B' }));
    await Listing.create(listing({ title: 'Page Test C' }));

    const res = await request(app)
      .get('/api/listings?search=Page%20Test&page=2&limit=2');

    expect(res.status).toBe(200);
    expect(res.body.listings).toHaveLength(1);
    expect(res.body.pagination).toMatchObject({
      page: 2,
      limit: 2,
      total: 3,
      totalPages: 2,
    });
  });

  test('rejects invalid sorting and stipend ranges', async () => {
    const badSort = await request(app).get('/api/listings?sortBy=password');
    expect(badSort.status).toBe(400);

    const badRange = await request(app)
      .get('/api/listings?minStipend=20000&maxStipend=10000');
    expect(badRange.status).toBe(400);
  });
});

  test('filters listings by deadlineBefore', async () => {
    await Listing.create(listing({
      title: 'Soon Deadline Role',
      deadline: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
    }));
    await Listing.create(listing({
      title: 'Later Deadline Role',
      deadline: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
    }));

    const cutoff = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString();
    const res = await request(app)
      .get(`/api/listings?search=Deadline%20Role&deadlineBefore=${encodeURIComponent(cutoff)}`);

    expect(res.status).toBe(200);
    expect(res.body.listings.map(item => item.title)).toEqual(['Soon Deadline Role']);
  });

  test('filters listings by deadlineAfter without returning expired listings', async () => {
    await Listing.create(listing({
      title: 'Earlier Deadline Role',
      deadline: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
    }));
    await Listing.create(listing({
      title: 'Later Deadline Role',
      deadline: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
    }));

    const cutoff = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString();
    const res = await request(app)
      .get(`/api/listings?search=Deadline%20Role&deadlineAfter=${encodeURIComponent(cutoff)}`);

    expect(res.status).toBe(200);
    expect(res.body.listings.map(item => item.title)).toEqual(['Later Deadline Role']);
  });

  test('keyword search also matches company and skills (SRCH-1)', async () => {
    await Listing.create(listing({ title: 'Plain Role', company: 'Zephyrsoft' }));
    await Listing.create(listing({ title: 'Other Role', skills: ['Kubernetes'] }));
    await Listing.create(listing({ title: 'Unrelated Role', company: 'Nobody', skills: ['Excel'] }));

    const byCompany = await request(app).get('/api/listings?search=zephyr');
    const bySkill = await request(app).get('/api/listings?search=kubern');

    expect(byCompany.body.listings.map(item => item.title)).toEqual(['Plain Role']);
    expect(bySkill.body.listings.map(item => item.title)).toEqual(['Other Role']);
  });

  test('treats regex characters in the keyword literally', async () => {
    await Listing.create(listing({ title: 'C++ Intern' }));

    const res = await request(app).get('/api/listings?search=c%2B%2B');

    expect(res.status).toBe(200);
    expect(res.body.listings.map(item => item.title)).toEqual(['C++ Intern']);
  });

  test('filters by mode, case-insensitively (SRCH-2)', async () => {
    await Listing.updateMany({}, { $set: { status: 'CLOSED' } });
    await Listing.create(listing({ title: 'Remote Role', mode: 'REMOTE' }));
    await Listing.create(listing({ title: 'Onsite Role', mode: 'ONSITE' }));

    const res = await request(app).get('/api/listings?mode=remote');

    expect(res.status).toBe(200);
    expect(res.body.listings.map(item => item.title)).toEqual(['Remote Role']);
  });

  test('rejects an unknown mode', async () => {
    const res = await request(app).get('/api/listings?mode=SPACE');

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION');
  });
