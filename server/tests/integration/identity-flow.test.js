const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../../src/app');
const User = require('../../src/modules/users/user.model');
const { jwtSecret } = require('../../src/config/env');
const { connect, clear, disconnect } = require('../helpers/db');

beforeAll(async () => {
  await connect();
  await User.init();
});

beforeEach(async () => {
  await clear();
});

afterAll(async () => {
  await disconnect();
});

const student = { name: 'Test Student', email: 'student@example.com', password: 'StrongPass123' };
const recruiter = { name: 'Test Recruiter', email: 'recruiter@example.com', password: 'StrongPass123', role: 'RECRUITER' };

const register = (body) => request(app).post('/api/auth/register').send(body);
const login = (body) => request(app).post('/api/auth/login').send(body);

describe('Identity flow', () => {
  test('a registered student can log in and reach their own profile', async () => {
    await register(student);
    const { body } = await login(student);

    const response = await request(app)
      .get('/api/profile/me')
      .set('Authorization', `Bearer ${body.token}`);

    expect(response.status).toBe(200);
    expect(response.body.profile).toBeDefined();
  });

  test('emails are case-insensitive for registration and login', async () => {
    await register({ ...student, email: 'Student@Example.com' });

    const duplicate = await register(student);
    const response = await login({ ...student, email: 'STUDENT@example.COM' });

    expect(duplicate.status).toBe(409);
    expect(response.status).toBe(200);
    expect(response.body.user.email).toBe('student@example.com');
  });

  test('disabling an account revokes an already-issued token', async () => {
    await register(student);
    const { body } = await login(student);
    await User.updateOne({ email: student.email }, { status: 'DISABLED' });

    const response = await request(app)
      .get('/api/profile/me')
      .set('Authorization', `Bearer ${body.token}`);

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('UNAUTHENTICATED');
  });

  test('an expired token is rejected', async () => {
    const created = await register(student);
    const token = jwt.sign(
      { sub: created.body.user.id, role: 'STUDENT', exp: Math.floor(Date.now() / 1000) - 1 },
      jwtSecret,
    );

    const response = await request(app)
      .get('/api/profile/me')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(401);
  });

  test('a student token cannot reach admin routes', async () => {
    await register(student);
    const pending = await register(recruiter);
    const { body } = await login(student);

    const response = await request(app)
      .patch(`/api/admin/recruiters/${pending.body.user.id}/approve`)
      .set('Authorization', `Bearer ${body.token}`);

    expect(response.status).toBe(403);
  });

  test('operator injection in login credentials is rejected', async () => {
    await register(student);

    const response = await login({ email: student.email, password: { $ne: null } });

    expect(response.status).toBe(400);
    expect(response.body).not.toHaveProperty('token');
  });

  test('registration returns field-level validation errors', async () => {
    const response = await register({ name: 'A', email: 'bad', password: 'short' });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION');
    expect(response.body.error.details.map((d) => d.field).sort()).toEqual(['email', 'name', 'password']);
  });

  test('clients cannot self-assign an ACTIVE status as a recruiter', async () => {
    const response = await register({ ...recruiter, status: 'ACTIVE' });

    expect(response.status).toBe(201);
    expect(response.body.user.status).toBe('PENDING');
  });
});
