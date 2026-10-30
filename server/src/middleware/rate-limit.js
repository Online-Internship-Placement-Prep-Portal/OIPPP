const rateLimit = require('express-rate-limit');
const AppError = require('../utils/AppError');

function limiter(limit, { skip } = {}) {
  return rateLimit({
    windowMs: 60 * 1000,
    limit,
    skip,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res, next) => next(new AppError(429, 'RATE_LIMITED', 'Too many requests, please try again later')),
  });
}

module.exports = {
  apiLimiter: limiter(300),
  // SEC-5. Off under Jest, where every suite logs in from the same address.
  authLimiter: limiter(10, { skip: () => process.env.NODE_ENV === 'test' }),
};
