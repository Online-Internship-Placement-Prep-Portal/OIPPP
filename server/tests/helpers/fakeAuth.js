const AppError = require('../../src/utils/AppError');

// stand-in for the identity module's JWT check (#1): tests name the caller in a header
function authenticate(req, res, next) {
  const raw = req.headers['x-test-user'];
  if (!raw) return next(new AppError(401, 'UNAUTHENTICATED', 'Please log in'));
  req.user = JSON.parse(raw);
  return next();
}

function allow(...roles) {
  return (req, res, next) => (roles.includes(req.user.role)
    ? next() : next(new AppError(403, 'FORBIDDEN', 'No access')));
}

const as = (u) => ({ 'x-test-user': JSON.stringify({ id: String(u._id), role: u.role }) });

module.exports = { authenticate, allow, as };
