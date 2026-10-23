
const request = require('supertest');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const app = require('../../src/app');
const User = require('../../src/modules/users/user.model');
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

async function createUser(options) {
  const role = options.role;
  const status = options.status || 'ACTIVE';
  const email = options.email;

  const passwordHash = await bcrypt.hash('StrongPass123', 4);

  return User.create({
    name: role + ' Test',
    email: email,
    passwordHash: passwordHash,
    role: role,
    status: status,
  });
}

function tokenFor(user) {
  return jwt.sign(
    {
      sub: user.id,
      role: user.role,
    },
    jwtSecret,
    {
      expiresIn: '10m',
    }
  );
}

describe('Admin user management API', () => {
  test('allows an admin to approve a pending recruiter', async () => {
    const admin = await createUser({
      role: 'ADMIN',
      email: 'admin@example.com',
    });

    const recruiter = await createUser({
      role: 'RECRUITER',
      status: 'PENDING',
      email: 'recruiter@example.com',
    });

    const response = await request(app)
      .patch('/api/admin/recruiters/' + recruiter.id + '/approve')
      .set('Authorization', 'Bearer ' + tokenFor(admin));

    expect(response.status).toBe(200);
    expect(response.body.user.status).toBe('ACTIVE');

    const savedRecruiter = await User.findById(recruiter.id);

    expect(savedRecruiter).not.toBeNull();
    expect(savedRecruiter.status).toBe('ACTIVE');
  });

  test('rejects recruiter approval by a student', async () => {
    const student = await createUser({
      role: 'STUDENT',
      email: 'student@example.com',
    });

    const recruiter = await createUser({
      role: 'RECRUITER',
      status: 'PENDING',
      email: 'pending@example.com',
    });

    const response = await request(app)
      .patch('/api/admin/recruiters/' + recruiter.id + '/approve')
      .set('Authorization', 'Bearer ' + tokenFor(student));

    expect(response.status).toBe(403);

    const savedRecruiter = await User.findById(recruiter.id);

    expect(savedRecruiter.status).toBe('PENDING');
  });

  test('allows an admin to deactivate a user', async () => {
    const admin = await createUser({
      role: 'ADMIN',
      email: 'admin2@example.com',
    });

    const student = await createUser({
      role: 'STUDENT',
      email: 'student2@example.com',
    });

    const response = await request(app)
      .patch('/api/admin/users/' + student.id + '/deactivate')
      .set('Authorization', 'Bearer ' + tokenFor(admin));

    expect(response.status).toBe(200);
    expect(response.body.user.status).toBe('DISABLED');

    const savedStudent = await User.findById(student.id);

    expect(savedStudent).not.toBeNull();
    expect(savedStudent.status).toBe('DISABLED');
  });

  test('rejects admin operations without a token', async () => {
    const userId = new mongoose.Types.ObjectId().toString();

    const response = await request(app)
      .patch('/api/admin/users/' + userId + '/deactivate');

    expect(response.status).toBe(401);
  });

  test('returns 404 when the recruiter does not exist', async () => {
    const admin = await createUser({
      role: 'ADMIN',
      email: 'admin3@example.com',
    });

    const missingRecruiterId = new mongoose.Types.ObjectId().toString();

    const response = await request(app)
      .patch('/api/admin/recruiters/' + missingRecruiterId + '/approve')
      .set('Authorization', 'Bearer ' + tokenFor(admin));

    expect(response.status).toBe(404);
  });

  test('prevents an admin from deactivating their own account', async () => {
    const admin = await createUser({
      role: 'ADMIN',
      email: 'admin4@example.com',
    });

    const response = await request(app)
      .patch('/api/admin/users/' + admin.id + '/deactivate')
      .set('Authorization', 'Bearer ' + tokenFor(admin));

    expect(response.status).toBe(403);

    const savedAdmin = await User.findById(admin.id);

    expect(savedAdmin.status).toBe('ACTIVE');
  });
});


