const request = require('supertest');

jest.mock('../../src/middleware/auth', () => require('../helpers/fakeAuth'));

const db = require('../helpers/db');
const { seed } = require('../helpers/seed');
const app = require('../../src/app');
const Profile = require('../../src/modules/users/profile.model');
const Listing = require('../../src/modules/listings/listing.model');
const { as } = require('../helpers/fakeAuth');

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

  await Profile.updateOne(
    { userId: s.student._id },
    { $set: { skills: ['Node.js', 'MongoDB'], cgpa: 7.4 } },
  );
});

function listing(overrides = {}) {
  return {
    recruiterId: s.recruiter._id,
    company: 'Recommendation Test Company',
    title: 'Recommendation Test Internship',
    location: 'Bengaluru',
    mode: 'HYBRID',
    stipend: 15000,
    skills: ['Node.js'],
    status: 'OPEN',
    deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    ...overrides,
  };
}

describe('Issue #12: skill-match listing recommendations', () => {
  test('returns eligible listings with matching skills, ranked by match count', async () => {
    await Listing.create(listing({
      title: 'One Skill Match',
      skills: ['node.JS', 'Python'],
    }));

    await Listing.create(listing({
      title: 'Two Skill Matches',
      skills: ['Node.js', 'MongoDB'],
    }));

    await Listing.create(listing({
      title: 'No Skill Match',
      skills: ['Python', 'Java'],
    }));

    const res = await request(app)
      .get('/api/listings/recommendations')
      .set(as(s.student));

    expect(res.status).toBe(200);
    expect(res.body.listings.map(item => item.title)).toEqual([
      'Two Skill Matches',
      'One Skill Match',
    ]);
    expect(res.body.listings[0].matchCount).toBe(2);
    expect(res.body.listings[0].matchedSkills).toEqual(['Node.js', 'MongoDB']);
    expect(res.body.listings[1].matchCount).toBe(1);
  });

  test('excludes closed, expired, and above-CGPA listings', async () => {
    await Listing.create(listing({ title: 'Eligible Match' }));

    await Listing.create(listing({
      title: 'Closed Match',
      status: 'CLOSED',
    }));

    await Listing.create(listing({
      title: 'Expired Match',
      deadline: new Date(Date.now() - 60000),
    }));

    await Listing.create(listing({
      title: 'High CGPA Match',
      minCgpa: 8.0,
    }));

    const res = await request(app)
      .get('/api/listings/recommendations')
      .set(as(s.student));

    expect(res.status).toBe(200);
    expect(res.body.listings.map(item => item.title)).toEqual(['Eligible Match']);
  });

  test('returns an empty list when the student has no skills', async () => {
    await Profile.updateOne(
      { userId: s.student._id },
      { $set: { skills: [] } },
    );

    await Listing.create(listing());

    const res = await request(app)
      .get('/api/listings/recommendations')
      .set(as(s.student));

    expect(res.status).toBe(200);
    expect(res.body.listings).toEqual([]);
  });

  test('rejects unauthenticated requests', async () => {
    const res = await request(app).get('/api/listings/recommendations');

    expect(res.status).toBe(401);
  });

  test('rejects recruiters', async () => {
    const res = await request(app)
      .get('/api/listings/recommendations')
      .set(as(s.recruiter));

    expect(res.status).toBe(403);
  });
});
