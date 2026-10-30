jest.mock('../../src/modules/users/user.model', () => ({
  findOne: jest.fn(), create: jest.fn(), findOneAndUpdate: jest.fn(), updateOne: jest.fn(),
}));
jest.mock('../../src/modules/users/profile.model', () => ({ create: jest.fn() }));

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../../src/modules/users/user.model');
const Profile = require('../../src/modules/users/profile.model');
const authService = require('../../src/modules/users/auth.service');
const { jwtSecret } = require('../../src/config/env');

beforeEach(() => jest.clearAllMocks());

const input = { name: 'Asha Rao', email: 'asha@example.com', password: 'StrongPass123', srn: 'PES1UG24CS177' };

function mockCreatedUser() {
  User.create.mockImplementation(async (doc) => ({ _id: 'oid-1', id: 'user-1', ...doc }));
}

describe('register', () => {
  test('creates an ACTIVE student with a hashed password and an empty profile', async () => {
    User.findOne.mockResolvedValue(null);
    mockCreatedUser();

    const user = await authService.register(input);

    const saved = User.create.mock.calls[0][0];
    expect(saved.role).toBe('STUDENT');
    expect(saved.status).toBe('ACTIVE');
    expect(saved.passwordHash).not.toBe(input.password);
    expect(await bcrypt.compare(input.password, saved.passwordHash)).toBe(true);
    expect(Profile.create).toHaveBeenCalledWith({ userId: 'oid-1' });
    expect(user).toEqual({
      id: 'user-1', name: input.name, email: input.email, role: 'STUDENT', status: 'ACTIVE', srn: input.srn,
    });
  });

  test('creates a PENDING recruiter without a student profile', async () => {
    User.findOne.mockResolvedValue(null);
    mockCreatedUser();

    const user = await authService.register({ ...input, role: 'RECRUITER' });

    expect(user.role).toBe('RECRUITER');
    expect(user.status).toBe('PENDING');
    expect(user).not.toHaveProperty('srn');
    expect(Profile.create).not.toHaveBeenCalled();
  });

  test('falls back to STUDENT for any role other than RECRUITER', async () => {
    User.findOne.mockResolvedValue(null);
    mockCreatedUser();

    const user = await authService.register({ ...input, role: 'ADMIN' });

    expect(user.role).toBe('STUDENT');
  });

  test('rejects a duplicate email with 409 before hashing or creating', async () => {
    User.findOne.mockResolvedValue({ id: 'existing' });

    await expect(authService.register(input)).rejects.toMatchObject({
      status: 409, code: 'DUPLICATE', message: 'An account with this email already exists',
    });
    expect(User.create).not.toHaveBeenCalled();
  });

  test('rejects a duplicate SRN with 409', async () => {
    User.findOne.mockImplementation(async (query) => (query.srn ? { id: 'existing' } : null));

    await expect(authService.register(input)).rejects.toMatchObject({
      status: 409, code: 'DUPLICATE', message: 'An account with this SRN already exists',
    });
    expect(User.create).not.toHaveBeenCalled();
  });
});

describe('login', () => {
  let passwordHash;

  beforeAll(async () => {
    // Low cost keeps the test fast.
    passwordHash = await bcrypt.hash(input.password, 4);
  });

  function mockStoredUser(overrides = {}) {
    const user = {
      id: 'user-1', name: input.name, email: input.email, role: 'STUDENT', status: 'ACTIVE', passwordHash, ...overrides,
    };
    User.findOne.mockReturnValue({ select: jest.fn().mockResolvedValue(user) });
  }

  test('returns a signed JWT carrying the user id and role', async () => {
    mockStoredUser();

    const result = await authService.login(input);

    const payload = jwt.verify(result.token, jwtSecret);
    expect(payload.sub).toBe('user-1');
    expect(payload.role).toBe('STUDENT');
    expect(payload.exp).toBeGreaterThan(payload.iat);
    expect(result.user).not.toHaveProperty('passwordHash');
  });

  test('explicitly selects the hidden password hash', async () => {
    mockStoredUser();

    await authService.login(input);

    expect(User.findOne.mock.results[0].value.select).toHaveBeenCalledWith('+passwordHash');
  });

  test('rejects an unknown email with the same 401 as a wrong password', async () => {
    User.findOne.mockReturnValue({ select: jest.fn().mockResolvedValue(null) });
    const unknown = await authService.login(input).catch((e) => e);

    mockStoredUser();
    const wrong = await authService.login({ ...input, password: 'WrongPass123' }).catch((e) => e);

    expect(unknown).toMatchObject({ status: 401, code: 'UNAUTHENTICATED' });
    expect(wrong.message).toBe(unknown.message);
  });

  test.each(['PENDING', 'DISABLED', 'REJECTED'])('refuses a %s account with 403', async (status) => {
    mockStoredUser({ status });

    await expect(authService.login(input)).rejects.toMatchObject({ status: 403, code: 'FORBIDDEN' });
  });

  test('counts a wrong password against the account', async () => {
    mockStoredUser({ _id: 'oid-1' });
    User.findOneAndUpdate.mockResolvedValue({ failedLogins: 1 });

    await expect(authService.login({ ...input, password: 'WrongPass123' })).rejects.toMatchObject({ status: 401 });

    expect(User.findOneAndUpdate).toHaveBeenCalledWith({ _id: 'oid-1' }, { $inc: { failedLogins: 1 } }, expect.anything());
    expect(User.updateOne).not.toHaveBeenCalled();
  });

  test(`locks the account on the ${authService.MAX_FAILED_LOGINS}th consecutive failure`, async () => {
    mockStoredUser({ _id: 'oid-1' });
    User.findOneAndUpdate.mockResolvedValue({ failedLogins: authService.MAX_FAILED_LOGINS });

    await authService.login({ ...input, password: 'WrongPass123' }).catch(() => {});

    const [, update] = User.updateOne.mock.calls[0];
    expect(update.$set.failedLogins).toBe(0);
    expect(update.$set.lockedUntil.getTime() - Date.now()).toBeGreaterThan(authService.LOCK_MS - 1000);
  });

  test('refuses a locked account before checking the password', async () => {
    const lockedUntil = new Date(Date.now() + 60000);
    mockStoredUser({ lockedUntil });
    const compare = jest.spyOn(bcrypt, 'compare');

    await expect(authService.login(input)).rejects.toMatchObject({ status: 423, code: 'ACCOUNT_LOCKED' });
    expect(compare).not.toHaveBeenCalled();
    compare.mockRestore();
  });
});
