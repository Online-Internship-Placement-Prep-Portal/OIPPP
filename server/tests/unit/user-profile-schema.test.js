const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const User = require('../../src/modules/users/user.model');
const Profile = require('../../src/modules/users/profile.model');

let mongo;

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
});

beforeEach(async () => {
  await Promise.all(
    Object.values(mongoose.connection.collections).map((collection) =>
      collection.deleteMany({ }),
    ),
  );
});

afterAll(async () => {
  await mongoose.disconnect();

  if (mongo) {
    await mongo.stop();
  }
});

async function createUser(overrides = {}) {
  return User.create({
    name: 'Test Student',
    email: 'student@example.com',
    passwordHash: 'hashed-password-value',
    role: 'STUDENT',
    status: 'ACTIVE',
    ...overrides,
  });
}

describe('User schema', () => {
  test('creates a user with valid fields and timestamps', async () => {
    const user = await createUser();

    expect(user._id).toBeDefined();
    expect(user.createdAt).toBeInstanceOf(Date);
    expect(user.updatedAt).toBeInstanceOf(Date);
    expect(user.role).toBe('STUDENT');
    expect(user.status).toBe('ACTIVE');
  });

  test('requires name, email, password hash, role and status', async () => {
    await expect(User.create({})).rejects.toThrow();
  });

  test('rejects an unsupported role', async () => {
    await expect(
      createUser({ role: 'SUPERUSER' }),
    ).rejects.toThrow();
  });

  test('rejects an unsupported account status', async () => {
    await expect(
      createUser({ status: 'SUSPENDED' }),
    ).rejects.toThrow();
  });

  test('normalizes email to lowercase and trims whitespace', async () => {
    const user = await createUser({
      email: '  STUDENT@EXAMPLE.COM  ',
    });

    expect(user.email).toBe('student@example.com');
  });

  test('rejects duplicate email addresses', async () => {
    await createUser();

    await expect(
      createUser(),
    ).rejects.toMatchObject({
      code: 11000,
    });
  });

  test('does not return passwordHash in normal queries', async () => {
    await createUser();

    const user = await User.findOne({
      email: 'student@example.com',
    });

    expect(user.passwordHash).toBeUndefined();
  });

  test('allows passwordHash to be explicitly selected', async () => {
    await createUser();

    const user = await User.findOne({
      email: 'student@example.com',
    }).select('+passwordHash');

    expect(user.passwordHash).toBe('hashed-password-value');
  });

  test('defaults role and status when omitted', async () => {
    const user = await User.create({
      name: 'Default User',
      email: 'default@example.com',
      passwordHash: 'hashed-password-value',
    });

    expect(user.role).toBe('STUDENT');
    expect(user.status).toBe('ACTIVE');
  });
});

describe('Profile schema', () => {
  test('creates a profile linked to a user', async () => {
    const user = await createUser();

    const profile = await Profile.create({
      userId: user._id,
      cgpa: 8.5,
      branch: 'CSE',
      gradYear: 2027,
      skills: ['Node.js', 'MongoDB'],
    });

    expect(profile.userId.toString()).toBe(user._id.toString());
    expect(profile.cgpa).toBe(8.5);
    expect(profile.skills).toEqual(['Node.js', 'MongoDB']);
    expect(profile.createdAt).toBeInstanceOf(Date);
    expect(profile.updatedAt).toBeInstanceOf(Date);
  });

  test('requires userId', async () => {
    await expect(
      Profile.create({}),
    ).rejects.toThrow();
  });

  test('rejects a duplicate profile for the same user', async () => {
    const user = await createUser();

    await Profile.create({ userId: user._id });

    await expect(
      Profile.create({ userId: user._id }),
    ).rejects.toMatchObject({
      code: 11000,
    });
  });

  test('rejects a CGPA below zero', async () => {
    const user = await createUser();

    await expect(
      Profile.create({
        userId: user._id,
        cgpa: -1,
      }),
    ).rejects.toThrow();
  });

  test('rejects a CGPA above ten', async () => {
    const user = await createUser();

    await expect(
      Profile.create({
        userId: user._id,
        cgpa: 10.5,
      }),
    ).rejects.toThrow();
  });

  test('rejects an invalid graduation year', async () => {
    const user = await createUser();

    await expect(
      Profile.create({
        userId: user._id,
        gradYear: 2200,
      }),
    ).rejects.toThrow();
  });

  test('defaults skills to an empty array', async () => {
    const user = await createUser();

    const profile = await Profile.create({
      userId: user._id,
    });

    expect(profile.skills).toEqual([]);
  });

  test('makes userId immutable after profile creation', async () => {
    const user = await createUser();
    const otherUser = await createUser({
      email: 'other@example.com',
    });

    const profile = await Profile.create({
      userId: user._id,
    });

    profile.userId = otherUser._id;

    await profile.save();

    expect(profile.userId.toString()).toBe(user._id.toString());
  });
});