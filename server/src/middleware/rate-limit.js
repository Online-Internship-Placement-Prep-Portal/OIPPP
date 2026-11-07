const rateLimit = require('express-rate-limit');
const AppError = require('../utils/AppError');

function limiter(limit, { skip, keyGenerator } = {}) {
  return rateLimit({
    windowMs: 60 * 1000,
    limit,
    skip,
    keyGenerator,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res, next) => next(new AppError(429, 'RATE_LIMITED', 'Too many requests, please try again later')),
  });
}

// Behind Render's proxy chain req.ip changes between requests from one client, so the
// auth limit is keyed on the submitted email when there is one (#124). Falls back to IP.
function authKey(req) {
  const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  return email ? `email:${email}` : `ip:${req.ip}`;
}

module.exports = {
  apiLimiter: limiter(300),
  // SEC-5. Off under Jest, where every suite logs in from the same address.
  authLimiter: limiter(10, { skip: () => process.env.NODE_ENV === 'test', keyGenerator: authKey }),
  authKey,
};
