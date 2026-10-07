const crypto = require('crypto');
const AppError = require('../utils/AppError');
const logger = require('../utils/logger');

function notFound(req, res, next) {
  next(new AppError(404, 'NOT_FOUND', 'Route not found'));
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  if (err.code === 11000) {
    err = new AppError(409, 'DUPLICATE', 'Record already exists');
  }
  if (err instanceof AppError) {
    return res.status(err.status).json({
      error: { code: err.code, message: err.message, details: err.details },
    });
  }
  const requestId = crypto.randomUUID();
  logger.error({ requestId, route: req.originalUrl, err: err.message }, 'unhandled error');
  return res.status(500).json({ error: { code: 'INTERNAL', message: 'Something went wrong', requestId } });
}

module.exports = { notFound, errorHandler };
