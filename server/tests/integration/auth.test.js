const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../../src/app');
const { connect, clear, disconnect } = require('../helpers/db');

beforeAll(async () => {
  await connect();
});

beforeEach(async () => {
  await clear();
});

afterAll(async () => {
  await disconnect();
});

describe('Authentication API', () => {
  const student = {
    name: 'Test Student',
    email: 'student@example.com',
    password: 'StrongPass123',
  };

  test('registers a student and creates a profile', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send(student);

    expect(response.status).toBe(201);
    expect(response.body.user.email).toBe(student.email);
    expect(response.body.user.role).toBe('STUDENT');

    const User = mongoose.model('User');
    const Profile = mongoose.model('Profile');

    const savedUser = await User.findOne({ email: student.email }).select('+passwordHash');
    expect(savedUser).not.toBeNull();
    expect(savedUser.passwordHash).not.toBe(student.password);
    expect(await Profile.findOne({ userId: savedUser._id })).not.toBeNull();
  });

  test('rejects registering the same email twice', async () => {
    await request(app).post('/api/auth/register').send(student);

    const response = await request(app)
      .post('/api/auth/register')
      .send(student);

    expect(response.status).toBe(409);
  });

  test('logs in with correct credentials and returns a JWT', async () => {
    await request(app).post('/api/auth/register').send(student);

    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: student.email, password: student.password });

    expect(response.status).toBe(200);
    expect(typeof response.body.token).toBe('string');
    expect(response.body.user.role).toBe('STUDENT');
  });

  test('rejects incorrect login credentials', async () => {
    await request(app).post('/api/auth/register').send(student);

    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: student.email, password: 'WrongPassword123' });

    expect(response.status).toBe(401);
  });

  test('does not allow public registration as ADMIN', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({ ...student, role: 'ADMIN' });

    expect(response.status).toBe(400);
  });
});
