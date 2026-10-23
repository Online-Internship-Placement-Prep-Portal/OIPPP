const AppError = require('../../src/utils/AppError');

function authenticate(req, res, next) {
  const raw = req.headers['x-test-user'];
  if (!raw) return next(new AppError(401, 'UNAUTHENTICATED', 'Please log in'));
  req.user = JSON.parse(raw);
  return next();
}

function allow(...roles) {
  return (req, res, next) => (
    roles.includes(req.user.role)
      ? next()
      : next(new AppError(403, 'FORBIDDEN', 'No access'))
  );
}

const as = u => ({
  'x-test-user': JSON.stringify({
    id: String(u._id),
    role: u.role,
    status: u.status || 'ACTIVE',
  }),
});

module.exports = { authenticate, allow, as };
