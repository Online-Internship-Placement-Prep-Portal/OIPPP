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
    srn: 'PES1UG24CS101',
  };

  test('registers a student and creates a profile without exposing password data', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send(student);

    expect(response.status).toBe(201);
    expect(response.body.user.email).toBe(student.email);
    expect(response.body.user.role).toBe('STUDENT');

    expect(response.body.user).not.toHaveProperty('password');
    expect(response.body.user).not.toHaveProperty('passwordHash');
    expect(JSON.stringify(response.body)).not.toContain(student.password);

    const User = mongoose.model('User');
    const Profile = mongoose.model('Profile');

    const savedUser = await User.findOne({ email: student.email })
      .select('+passwordHash');

    expect(savedUser).not.toBeNull();
    expect(savedUser.passwordHash).not.toBe(student.password);

    expect(
      await Profile.findOne({ userId: savedUser._id }),
    ).not.toBeNull();
  });

  test('rejects registering the same email twice', async () => {
    await request(app)
      .post('/api/auth/register')
      .send(student);

    const response = await request(app)
      .post('/api/auth/register')
      .send(student);

    expect(response.status).toBe(409);
  });

  test('logs in with correct credentials without exposing password data', async () => {
    await request(app)
      .post('/api/auth/register')
      .send(student);

    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: student.email,
        password: student.password,
      });

    expect(response.status).toBe(200);
    expect(typeof response.body.token).toBe('string');
    expect(response.body.user.role).toBe('STUDENT');

    expect(response.body.user).not.toHaveProperty('password');
    expect(response.body.user).not.toHaveProperty('passwordHash');
    expect(JSON.stringify(response.body)).not.toContain(student.password);
  });

  test('rejects incorrect login credentials', async () => {
    await request(app)
      .post('/api/auth/register')
      .send(student);

    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: student.email,
        password: 'WrongPassword123',
      });

    expect(response.status).toBe(401);
  });

  test('does not allow public registration as ADMIN', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({
        ...student,
        role: 'ADMIN',
      });

    expect(response.status).toBe(400);
  });
});

describe('Student SRN (AUTH-1)', () => {
  const base = { name: 'Srn Check', email: 'srn@example.com', password: 'StrongPass123' };
  const register = (body) => request(app).post('/api/auth/register').send(body);

  test('stores a valid SRN in upper case and returns it', async () => {
    const res = await register({ ...base, srn: 'pes1ug24cs177' });

    expect(res.status).toBe(201);
    expect(res.body.user.srn).toBe('PES1UG24CS177');
  });

  test.each([
    ['missing', undefined],
    ['wrong campus digit', 'PES3UG24CS177'],
    ['too short', 'PES1UG24CS17'],
  ])('rejects a student with an SRN that is %s', async (_, srn) => {
    const res = await register({ ...base, srn });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION');
    expect(res.body.error.details.map((d) => d.field)).toContain('srn');
  });

  test('rejects a second account with the same SRN', async () => {
    await register({ ...base, srn: 'PES1UG24CS177' });
    const res = await register({ ...base, email: 'other@example.com', srn: 'pes1ug24cs177' });

    expect(res.status).toBe(409);
    expect(res.body.error.message).toBe('An account with this SRN already exists');
  });

  test('a recruiter registers without an SRN and may not send one', async () => {
    const ok = await register({ ...base, role: 'RECRUITER' });
    const bad = await register({ ...base, email: 'rec2@example.com', role: 'RECRUITER', srn: 'PES1UG24CS177' });

    expect(ok.status).toBe(201);
    expect(ok.body.user).not.toHaveProperty('srn');
    expect(bad.status).toBe(400);
  });
});

describe('Password rule (AUTH-3)', () => {
  const register = (password) => request(app).post('/api/auth/register')
    .send({ name: 'Rule Check', email: 'rule@example.com', password, srn: 'PES1UG24CS102' });

  test('accepts a password with a letter and a digit', async () => {
    expect((await register('password1')).status).toBe(201);
  });

  test.each([
    ['password', 'digit'],
    ['12345678', 'letter'],
  ])('rejects %p for missing a %s', async (password, missing) => {
    const res = await register(password);

    expect(res.status).toBe(400);
    expect(res.body.error.message).toBe(`Password must contain at least one ${missing}`);
  });
});

describe('Login lockout (AUTH-5)', () => {
  const account = { name: 'Lock Check', email: 'lock@example.com', password: 'StrongPass123', srn: 'PES1UG24CS103' };
  const login = (password) => request(app).post('/api/auth/login').send({ email: account.email, password });

  beforeEach(async () => {
    await request(app).post('/api/auth/register').send(account);
  });

  test('locks the account for 15 minutes after 5 failed logins', async () => {
    for (let i = 0; i < 5; i += 1) {
      expect((await login('WrongPass123')).status).toBe(401);
    }

    const locked = await login(account.password);
    expect(locked.status).toBe(423);
    expect(locked.body.error.code).toBe('ACCOUNT_LOCKED');

    const retryAt = new Date(locked.body.error.details[0].message).getTime();
    expect(retryAt - Date.now()).toBeGreaterThan(14 * 60 * 1000);
    expect(retryAt - Date.now()).toBeLessThanOrEqual(15 * 60 * 1000);
  });

  test('logs in again once the lock has expired', async () => {
    const User = mongoose.model('User');
    await User.updateOne({ email: account.email }, { lockedUntil: new Date(Date.now() - 1000) });

    expect((await login(account.password)).status).toBe(200);
  });

  test('a successful login resets the failure count', async () => {
    for (let i = 0; i < 4; i += 1) await login('WrongPass123');
    expect((await login(account.password)).status).toBe(200);

    expect((await login('WrongPass123')).status).toBe(401);
    expect((await login(account.password)).status).toBe(200);
  });
});

describe('Auth rate limit (SEC-5)', () => {
  const env = process.env.NODE_ENV;

  beforeAll(() => { process.env.NODE_ENV = 'development'; });
  afterAll(() => { process.env.NODE_ENV = env; });

  test('allows 10 login attempts per minute, then returns 429', async () => {
    const attempt = () => request(app).post('/api/auth/login')
      .send({ email: 'nobody@example.com', password: 'StrongPass123' });

    for (let i = 0; i < 10; i += 1) {
      expect((await attempt()).status).toBe(401);
    }

    const limited = await attempt();
    expect(limited.status).toBe(429);
    expect(limited.body.error.code).toBe('RATE_LIMITED');
  });
});

describe('Malformed requests', () => {
  test('invalid JSON is a 400, not a 500', async () => {
    const res = await request(app).post('/api/auth/login')
      .set('Content-Type', 'application/json')
      .send('{"email":');

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION');
  });

  test('a body over 100 kB is a 413', async () => {
    const res = await request(app).post('/api/auth/login')
      .send({ email: 'a@example.com', password: 'x'.repeat(110 * 1024) });

    expect(res.status).toBe(413);
    expect(res.body.error.code).toBe('PAYLOAD_TOO_LARGE');
  });
});
