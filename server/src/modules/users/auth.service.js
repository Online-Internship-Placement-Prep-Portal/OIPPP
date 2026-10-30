const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('./user.model');
const Profile = require('./profile.model');
const publicUser = require('./public-user');
const { jwtSecret, jwtExpiresIn } = require('../../config/env');
const AppError = require('../../utils/AppError');

const BCRYPT_COST = 12;
// AUTH-5: lock for 15 minutes after 5 consecutive failed logins.
const MAX_FAILED_LOGINS = 5;
const LOCK_MS = 15 * 60 * 1000;

async function register({ name, email, password, role = 'STUDENT', srn }) {
  const userRole = role === 'RECRUITER' ? 'RECRUITER' : 'STUDENT';
  const studentSrn = userRole === 'STUDENT' ? srn : undefined;

  if (await User.findOne({ email })) {
    throw new AppError(409, 'DUPLICATE', 'An account with this email already exists');
  }

  if (studentSrn && await User.findOne({ srn: studentSrn })) {
    throw new AppError(409, 'DUPLICATE', 'An account with this SRN already exists');
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_COST);
  const status = userRole === 'RECRUITER' ? 'PENDING' : 'ACTIVE';

  const user = await User.create({
    name,
    email,
    srn: studentSrn,
    passwordHash,
    role: userRole,
    status,
  });

  if (userRole === 'STUDENT') {
    await Profile.create({ userId: user._id });
  }

  return publicUser(user);
}

async function recordFailedLogin(user) {
  const updated = await User.findOneAndUpdate(
    { _id: user._id },
    { $inc: { failedLogins: 1 } },
    { new: true, projection: { failedLogins: 1 } },
  );

  if (updated && updated.failedLogins >= MAX_FAILED_LOGINS) {
    await User.updateOne(
      { _id: user._id },
      { $set: { failedLogins: 0, lockedUntil: new Date(Date.now() + LOCK_MS) } },
    );
  }
}

async function login({ email, password }) {
  const user = await User.findOne({ email }).select('+passwordHash');

  if (user && user.lockedUntil > new Date()) {
    throw new AppError(423, 'ACCOUNT_LOCKED', 'Too many failed logins, please try again later',
      [{ field: 'retryAt', message: user.lockedUntil.toISOString() }]);
  }

  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    if (user) await recordFailedLogin(user);
    throw new AppError(401, 'UNAUTHENTICATED', 'Invalid email or password');
  }

  if (user.failedLogins || user.lockedUntil) {
    await User.updateOne({ _id: user._id }, { $set: { failedLogins: 0 }, $unset: { lockedUntil: 1 } });
  }

  if (user.status !== 'ACTIVE') {
    throw new AppError(403, 'FORBIDDEN', 'Your account is not active');
  }

  const token = jwt.sign(
    { sub: user.id, role: user.role },
    jwtSecret,
    { expiresIn: jwtExpiresIn },
  );

  return { token, user: publicUser(user) };
}

async function me(userId) {
  const user = await User.findById(userId);
  if (!user) throw new AppError(404, 'NOT_FOUND', 'User not found');
  return publicUser(user);
}

module.exports = { register, login, me, MAX_FAILED_LOGINS, LOCK_MS };
