const jwt = require('jsonwebtoken');
const { jwtSecret } = require('../config/env');
const AppError = require('../utils/AppError');
const User = require('../modules/users/user.model');

async function authenticate(req, res, next) {
  try {
    const [scheme, token] = (req.headers.authorization || '').split(' ');
    if (scheme !== 'Bearer' || !token) throw new AppError(401, 'UNAUTHENTICATED', 'Please log in');

    let payload;
    try {
      payload = jwt.verify(token, jwtSecret);
    } catch {
      throw new AppError(401, 'UNAUTHENTICATED', 'Session expired, please log in again');
    }

    // Read the account on every request so a disabled user is cut off at once (PROF-4).
    const user = await User.findById(payload.sub).select('role status');
    if (!user || user.status === 'DISABLED') throw new AppError(401, 'UNAUTHENTICATED', 'Account is not active');

    req.user = { id: user.id, role: user.role, status: user.status };
    next();
  } catch (err) {
    next(err);
  }
}

function allow(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(new AppError(403, 'FORBIDDEN', 'You do not have access to this page'));
    }
    return next();
  };
}

module.exports = { authenticate, allow };
