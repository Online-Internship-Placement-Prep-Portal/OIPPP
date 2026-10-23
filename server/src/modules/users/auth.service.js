const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('./user.model');
const Profile = require('./profile.model');
const { jwtSecret, jwtExpiresIn } = require('../../config/env');
const AppError = require('../../utils/AppError');

async function register({ name, email, password, role = 'STUDENT' }) {
  const existing = await User.findOne({ email });

  if (existing) {
    throw new AppError(409, 'DUPLICATE', 'An account with this email already exists');
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const userRole = role === 'RECRUITER' ? 'RECRUITER' : 'STUDENT';
  const status = userRole === 'RECRUITER' ? 'PENDING' : 'ACTIVE';

  const user = await User.create({
    name,
    email,
    passwordHash,
    role: userRole,
    status,
  });

  if (userRole === 'STUDENT') {
    await Profile.create({ userId: user._id });
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status,
  };
}

async function login({ email, password }) {
  const user = await User.findOne({ email }).select('+passwordHash');

  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    throw new AppError(401, 'UNAUTHENTICATED', 'Invalid email or password');
  }

  if (user.status !== 'ACTIVE') {
    throw new AppError(403, 'FORBIDDEN', 'Your account is not active');
  }

  const token = jwt.sign(
    { sub: user.id, role: user.role },
    jwtSecret,
    { expiresIn: jwtExpiresIn },
  );

  return {
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
    },
  };
}

module.exports = { register, login };
