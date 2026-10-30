jest.mock('../../src/modules/users/user.model', () => ({ findById: jest.fn() }));

const jwt = require('jsonwebtoken');
const { authenticate, allow } = require('../../src/middleware/auth');
const User = require('../../src/modules/users/user.model');
const { jwtSecret } = require('../../src/config/env');

beforeEach(() => jest.clearAllMocks());

async function run(authorization) {
  const req = { headers: authorization === undefined ? {} : { authorization } };
  const next = jest.fn();
  await authenticate(req, {}, next);
  return { req, err: next.mock.calls[0][0] };
}

describe('authenticate', () => {
  test.each([
    ['no header', undefined],
    ['an empty header', ''],
    ['a non-Bearer scheme', `Basic ${jwt.sign({ sub: 'u1' }, jwtSecret)}`],
    ['a lowercase bearer scheme', `bearer ${jwt.sign({ sub: 'u1' }, jwtSecret)}`],
    ['a Bearer scheme with no token', 'Bearer '],
  ])('rejects %s with 401', async (_label, header) => {
    const { err } = await run(header);

    expect(err).toMatchObject({ status: 401, code: 'UNAUTHENTICATED', message: 'Please log in' });
    expect(User.findById).not.toHaveBeenCalled();
  });

  test('rejects an expired token as a session expiry', async () => {
    const token = jwt.sign({ sub: 'u1', exp: Math.floor(Date.now() / 1000) - 60 }, jwtSecret);

    const { err } = await run(`Bearer ${token}`);

    expect(err).toMatchObject({ status: 401, message: 'Session expired, please log in again' });
  });

  test('rejects a token signed with a different secret', async () => {
    const { err } = await run(`Bearer ${jwt.sign({ sub: 'u1' }, 'someone-elses-secret')}`);

    expect(err.status).toBe(401);
    expect(User.findById).not.toHaveBeenCalled();
  });

  test('uses the role stored in the database, not the role in the token', async () => {
    User.findById.mockReturnValue({ select: jest.fn().mockResolvedValue({ id: 'u1', role: 'STUDENT', status: 'ACTIVE' }) });

    const { req, err } = await run(`Bearer ${jwt.sign({ sub: 'u1', role: 'ADMIN' }, jwtSecret)}`);

    expect(err).toBeUndefined();
    expect(req.user).toEqual({ id: 'u1', role: 'STUDENT', status: 'ACTIVE' });
  });

  test('passes database errors on to the error handler', async () => {
    const failure = new Error('db down');
    User.findById.mockReturnValue({ select: jest.fn().mockRejectedValue(failure) });

    const { err } = await run(`Bearer ${jwt.sign({ sub: 'u1' }, jwtSecret)}`);

    expect(err).toBe(failure);
  });
});

describe('allow', () => {
  test('lets through any of the listed roles', () => {
    const guard = allow('RECRUITER', 'ADMIN');

    ['RECRUITER', 'ADMIN'].forEach((role) => {
      const next = jest.fn();
      guard({ user: { role } }, {}, next);
      expect(next).toHaveBeenCalledWith();
    });
  });

  test('rejects a request that was never authenticated', () => {
    const next = jest.fn();

    allow('STUDENT')({}, {}, next);

    expect(next.mock.calls[0][0]).toMatchObject({ status: 403, code: 'FORBIDDEN' });
  });
});
