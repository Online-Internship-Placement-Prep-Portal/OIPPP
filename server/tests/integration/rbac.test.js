
const request = require('supertest');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

const app = require('../../src/app');
const User = require('../../src/modules/users/user.model');
const Profile = require('../../src/modules/users/profile.model');
const { jwtSecret } = require('../../src/config/env');
const db = require('../helpers/db');

beforeAll(async () => {
  await db.connect();
});

beforeEach(async () => {
  await db.clear();
});

afterAll(async () => {
  await db.disconnect();
});

async function createUser(role, status = 'ACTIVE') {
  const passwordHash = await bcrypt.hash('StrongPass123', 4);

  return User.create({
    name: `${role} Test`,
    email: `${role.toLowerCase()}-${new mongoose.Types.ObjectId()}@example.com`,
    passwordHash,
    role,
    status,
  });
}

function tokenFor(user, options = {}) {
  return jwt.sign(
    { sub: user.id, role: user.role },
    jwtSecret,
    { expiresIn: '10m', ...options },
  );
}

function bearer(token) {
  return { Authorization: `Bearer ${token}` };
}

describe('Role-based access control with real JWT authentication', () => {
  describe('Authentication', () => {
    test('rejects requests without a token', async () => {
      const response = await request(app).get('/api/profile/me');

      expect(response.status).toBe(401);
    });

    test('rejects an invalid token', async () => {
      const response = await request(app)
        .get('/api/profile/me')
        .set(bearer('not-a-valid-token'));

      expect(response.status).toBe(401);
    });

    test('rejects an expired token', async () => {
      const student = await createUser('STUDENT');

      const expiredToken = jwt.sign(
        { sub: student.id, role: student.role },
        jwtSecret,
        { expiresIn: -1 },
      );

      const response = await request(app)
        .get('/api/profile/me')
        .set(bearer(expiredToken));

      expect(response.status).toBe(401);
    });

    test('rejects a token when its account has been disabled', async () => {
      const student = await createUser('STUDENT');
      const token = tokenFor(student);

      await User.updateOne(
        { _id: student._id },
        { status: 'DISABLED' },
      );

      const response = await request(app)
        .get('/api/profile/me')
        .set(bearer(token));

      expect(response.status).toBe(401);
    });

    test('rejects a token for a user who no longer exists', async () => {
      const student = await createUser('STUDENT');
      const token = tokenFor(student);

      await User.deleteOne({ _id: student._id });

      const response = await request(app)
        .get('/api/profile/me')
        .set(bearer(token));

      expect(response.status).toBe(401);
    });
  });

  describe('Role restrictions', () => {
    test('allows a student to access their own profile', async () => {
      const student = await createUser('STUDENT');

      await Profile.create({
        userId: student._id,
        cgpa: 8.5,
        branch: 'CSE',
        gradYear: 2027,
        skills: ['Node.js'],
      });

      const response = await request(app)
        .get('/api/profile/me')
        .set(bearer(tokenFor(student)));

      expect(response.status).toBe(200);
      expect(response.body.profile.branch).toBe('CSE');
    });

    test('prevents a recruiter from accessing student profile routes', async () => {
      const recruiter = await createUser('RECRUITER');

      const response = await request(app)
        .get('/api/profile/me')
        .set(bearer(tokenFor(recruiter)));

      expect(response.status).toBe(403);
    });

    test('prevents a student from accessing admin routes', async () => {
      const student = await createUser('STUDENT');
      const targetId = new mongoose.Types.ObjectId().toString();

      const response = await request(app)
        .patch(`/api/admin/users/${targetId}/deactivate`)
        .set(bearer(tokenFor(student)));

      expect(response.status).toBe(403);
    });

    test('prevents a recruiter from accessing admin routes', async () => {
      const recruiter = await createUser('RECRUITER');
      const targetId = new mongoose.Types.ObjectId().toString();

      const response = await request(app)
        .patch(`/api/admin/users/${targetId}/deactivate`)
        .set(bearer(tokenFor(recruiter)));

      expect(response.status).toBe(403);
    });

    test('prevents a student from creating aptitude questions', async () => {
      const student = await createUser('STUDENT');

      const response = await request(app)
        .post('/api/questions')
        .set(bearer(tokenFor(student)))
        .send({
          text: 'Example question',
          topic: 'Technical',
          difficulty: 'Easy',
          options: ['Option A', 'Option B'],
          answerIdx: 0,
        });

      expect(response.status).toBe(403);
    });

    test('prevents a recruiter from creating aptitude questions', async () => {
      const recruiter = await createUser('RECRUITER');

      const response = await request(app)
        .post('/api/questions')
        .set(bearer(tokenFor(recruiter)))
        .send({
          text: 'Example question',
          topic: 'Technical',
          difficulty: 'Easy',
          options: ['Option A', 'Option B'],
          answerIdx: 0,
        });

      expect(response.status).toBe(403);
    });

    test('prevents an admin from starting a student aptitude attempt', async () => {
      const admin = await createUser('ADMIN');
      const testId = new mongoose.Types.ObjectId().toString();

      const response = await request(app)
        .post(`/api/tests/${testId}/attempts`)
        .set(bearer(tokenFor(admin)))
        .send({});

      expect(response.status).toBe(403);
    });
  });

  describe('Recruiter approval', () => {
    test('prevents a pending recruiter from creating a listing', async () => {
      const recruiter = await createUser('RECRUITER', 'PENDING');

      const response = await request(app)
        .post('/api/listings')
        .set(bearer(tokenFor(recruiter)))
        .send({
          title: 'Backend Intern',
          company: 'Example Company',
          location: 'Bengaluru',
          mode: 'HYBRID',
          stipend: 10000,
          skills: ['Node.js'],
          deadline: new Date(
            Date.now() + 7 * 24 * 60 * 60 * 1000,
          ).toISOString(),
        });

      expect(response.status).toBe(403);
      expect(response.body.error.code).toBe('NOT_APPROVED');
    });
  });
});

