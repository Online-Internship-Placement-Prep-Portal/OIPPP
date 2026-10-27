
const request = require('supertest');

jest.mock('../../src/middleware/auth', () => require('../helpers/fakeAuth'));

const db = require('../helpers/db');
const { as } = require('../helpers/fakeAuth');
const { seed } = require('../helpers/seed');
const app = require('../../src/app');
const Profile = require('../../src/modules/users/profile.model');

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

describe('Student profile API', () => {
  test('student can view their profile', async () => {
    const response = await request(app)
      .get('/api/profile/me')
      .set(as(s.student));

    expect(response.status).toBe(200);
    expect(response.body.profile).toBeDefined();
    expect(response.body.profile.branch).toBe('CSE');
    expect(response.body.profile.cgpa).toBe(7.4);
  });

  test('student can update academic details and skills', async () => {
    const response = await request(app)
      .put('/api/profile/me')
      .set(as(s.student))
      .send({
        cgpa: 8.5,
        branch: 'CSE',
        gradYear: 2027,
        skills: ['JavaScript', 'Node.js', 'MongoDB'],
      });

    expect(response.status).toBe(200);
    expect(response.body.profile.cgpa).toBe(8.5);
    expect(response.body.profile.branch).toBe('CSE');
    expect(response.body.profile.gradYear).toBe(2027);
    expect(response.body.profile.skills).toEqual([
      'JavaScript',
      'Node.js',
      'MongoDB',
    ]);
  });

  test('rejects CGPA greater than 10', async () => {
    const response = await request(app)
      .put('/api/profile/me')
      .set(as(s.student))
      .send({ cgpa: 10.1 });

    expect(response.status).toBe(400);
  });

  test('rejects negative CGPA', async () => {
    const response = await request(app)
      .put('/api/profile/me')
      .set(as(s.student))
      .send({ cgpa: -0.1 });

    expect(response.status).toBe(400);
  });

  test('rejects graduation year below 2000', async () => {
    const response = await request(app)
      .put('/api/profile/me')
      .set(as(s.student))
      .send({ gradYear: 1999 });

    expect(response.status).toBe(400);
  });

  test('rejects graduation year above 2100', async () => {
    const response = await request(app)
      .put('/api/profile/me')
      .set(as(s.student))
      .send({ gradYear: 2101 });

    expect(response.status).toBe(400);
  });

  test('rejects a non-integer graduation year', async () => {
    const response = await request(app)
      .put('/api/profile/me')
      .set(as(s.student))
      .send({ gradYear: 2027.5 });

    expect(response.status).toBe(400);
  });

  test('accepts 20 skills', async () => {
    const skills = Array.from({ length: 20 }, (_, i) => `Skill${i + 1}`);

    const response = await request(app)
      .put('/api/profile/me')
      .set(as(s.student))
      .send({ skills });

    expect(response.status).toBe(200);
    expect(response.body.profile.skills).toHaveLength(20);
  });

  test('rejects more than 20 skills', async () => {
    const skills = Array.from({ length: 21 }, (_, i) => `Skill${i + 1}`);

    const response = await request(app)
      .put('/api/profile/me')
      .set(as(s.student))
      .send({ skills });

    expect(response.status).toBe(400);
  });

  test('rejects an empty skill name', async () => {
    const response = await request(app)
      .put('/api/profile/me')
      .set(as(s.student))
      .send({ skills: ['JavaScript', ''] });

    expect(response.status).toBe(400);
  });

  test('rejects profile updates from a recruiter', async () => {
    const response = await request(app)
      .put('/api/profile/me')
      .set(as(s.recruiter))
      .send({ cgpa: 8.5 });

    expect(response.status).toBe(403);
  });

  test('persists a valid profile update in the database', async () => {
    const response = await request(app)
      .put('/api/profile/me')
      .set(as(s.student))
      .send({ cgpa: 9.0, skills: ['Python', 'SQL'] });

    expect(response.status).toBe(200);

    const profile = await Profile.findOne({
      userId: s.student._id,
    }).lean();

    expect(profile.cgpa).toBe(9);
    expect(profile.skills).toEqual(['Python', 'SQL']);
  });
});
