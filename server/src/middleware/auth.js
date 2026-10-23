const jwt = require('jsonwebtoken');
const { jwtSecret } = require('../config/env');
const AppError = require('../utils/AppError');

async function authenticate(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const [scheme, token] = header.split(' ');
    if (scheme !== 'Bearer' || !token) throw new AppError(401, 'UNAUTHENTICATED', 'Please log in');

    let payload;
    try {
      payload = jwt.verify(token, jwtSecret);
    } catch (e) {
      throw new AppError(401, 'UNAUTHENTICATED', 'Session expired, please log in again');
    }

    // read the account each time so a disabled user is cut off at once (PROF-4)
    // required lazily: the User model belongs to the identity module (#6)
    const User = require('../modules/users/user.model');
    const user = await User.findById(payload.sub).select('role status');
    if (!user || user.status === 'DISABLED') throw new AppError(401, 'UNAUTHENTICATED', 'Account is not active');

    req.user = { id: user.id, role: user.role, status: user.status };
    next();
  } catch (err) {
    next(err);
  }
}

// AUTH-6
function allow(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(new AppError(403, 'FORBIDDEN', 'You do not have access to this page'));
    }
    return next();
  };
}

module.exports = { authenticate, allow };
