
const request = require('supertest');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const app = require('../../src/app');
const User = require('../../src/modules/users/user.model');
const AuditLog = require('../../src/modules/audit/auditLog.model');
const Notification = require('../../src/modules/notifications/notification.model');
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

    const notice = await Notification.findOne({ userId: recruiter._id }).lean();
    expect(notice).toMatchObject({ type: 'RECRUITER_DECISION', title: 'Recruiter account approved' });
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


  test('allows an admin to reject a pending recruiter with a reason', async () => {
    const admin = await createUser({
      role: 'ADMIN',
      email: 'reject-admin@example.com',
    });

    const recruiter = await createUser({
      role: 'RECRUITER',
      status: 'PENDING',
      email: 'reject-recruiter@example.com',
    });

    const response = await request(app)
      .patch('/api/admin/recruiters/' + recruiter.id + '/reject')
      .set('Authorization', 'Bearer ' + tokenFor(admin))
      .send({ reasonCode: 'INVALID_COMPANY' });

    expect(response.status).toBe(200);
    expect(response.body.user.status).toBe('REJECTED');

    const savedRecruiter = await User.findById(recruiter.id);
    expect(savedRecruiter.status).toBe('REJECTED');

    const auditEntry = await AuditLog.findOne({
      action: 'RECRUITER_REJECTED',
      entityId: recruiter._id,
    });

    expect(auditEntry).not.toBeNull();
    expect(auditEntry.after.reasonCode).toBe('INVALID_COMPANY');
  });

  test('returns 400 when recruiter rejection reason is missing', async () => {
    const admin = await createUser({
      role: 'ADMIN',
      email: 'missing-reason-admin@example.com',
    });

    const recruiter = await createUser({
      role: 'RECRUITER',
      status: 'PENDING',
      email: 'missing-reason-recruiter@example.com',
    });

    const response = await request(app)
      .patch('/api/admin/recruiters/' + recruiter.id + '/reject')
      .set('Authorization', 'Bearer ' + tokenFor(admin))
      .send({});

    expect(response.status).toBe(400);

    const savedRecruiter = await User.findById(recruiter.id);
    expect(savedRecruiter.status).toBe('PENDING');
  });

  test('rejects recruiter rejection requests from a student', async () => {
    const student = await createUser({
      role: 'STUDENT',
      email: 'reject-student@example.com',
    });

    const recruiter = await createUser({
      role: 'RECRUITER',
      status: 'PENDING',
      email: 'student-reject-target@example.com',
    });

    const response = await request(app)
      .patch('/api/admin/recruiters/' + recruiter.id + '/reject')
      .set('Authorization', 'Bearer ' + tokenFor(student))
      .send({ reasonCode: 'INVALID_COMPANY' });

    expect(response.status).toBe(403);

    const savedRecruiter = await User.findById(recruiter.id);
    expect(savedRecruiter.status).toBe('PENDING');
  });

  test('does not reject a recruiter who is no longer pending', async () => {
    const admin = await createUser({
      role: 'ADMIN',
      email: 'approved-recruiter-admin@example.com',
    });

    const recruiter = await createUser({
      role: 'RECRUITER',
      status: 'ACTIVE',
      email: 'already-approved@example.com',
    });

    const response = await request(app)
      .patch('/api/admin/recruiters/' + recruiter.id + '/reject')
      .set('Authorization', 'Bearer ' + tokenFor(admin))
      .send({ reasonCode: 'INVALID_COMPANY' });

    expect(response.status).toBe(409);

    const savedRecruiter = await User.findById(recruiter.id);
    expect(savedRecruiter.status).toBe('ACTIVE');
  });


});



describe('GET /api/admin/users', () => {
  let admin;

  beforeEach(async () => {
    admin = await createUser({ role: 'ADMIN', email: 'admin@example.com' });
    await createUser({ role: 'RECRUITER', status: 'PENDING', email: 'pending@acme.io' });
    await createUser({ role: 'RECRUITER', email: 'active@acme.io' });
    await createUser({ role: 'STUDENT', email: 'asha@pes.edu' });
  });

  const list = (query = '', user = admin) => request(app)
    .get(`/api/admin/users${query}`)
    .set('Authorization', `Bearer ${tokenFor(user)}`);

  test('lists pending recruiters for the approval queue', async () => {
    const res = await list('?role=RECRUITER&status=PENDING');

    expect(res.status).toBe(200);
    expect(res.body.total).toBe(1);
    expect(res.body.items[0]).toMatchObject({ email: 'pending@acme.io', status: 'PENDING' });
    expect(res.body.items[0]).not.toHaveProperty('passwordHash');
  });

  test('searches by name or email and pages the result', async () => {
    const res = await list('?search=acme.io&limit=1&page=2');

    expect(res.body.total).toBe(2);
    expect(res.body.page).toBe(2);
    expect(res.body.items).toHaveLength(1);
  });

  test('is admin only and validates its query', async () => {
    const student = await User.findOne({ role: 'STUDENT' });

    expect((await list('', student)).status).toBe(403);
    expect((await list('?role=ROOT')).status).toBe(400);
  });
});

describe('GET /api/auth/me', () => {
  test('returns the caller\'s public profile', async () => {
    const student = await createUser({ role: 'STUDENT', email: 'me@pes.edu' });

    const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${tokenFor(student)}`);

    expect(res.status).toBe(200);
    expect(res.body.user).toEqual({ id: student.id, name: 'STUDENT Test', email: 'me@pes.edu', role: 'STUDENT', status: 'ACTIVE' });
  });

  test('needs a token', async () => {
    expect((await request(app).get('/api/auth/me')).status).toBe(401);
  });
});
