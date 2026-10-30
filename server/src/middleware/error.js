const crypto = require('crypto');
const multer = require('multer');
const AppError = require('../utils/AppError');
const logger = require('../utils/logger');

function notFound(req, res, next) {
  next(new AppError(404, 'NOT_FOUND', 'Route not found'));
}

// Maps known library errors to client errors; anything else is a 500.
function toAppError(err) {
  if (err instanceof AppError) return err;
  if (err.code === 11000) return new AppError(409, 'DUPLICATE', 'Record already exists');
  if (err.type === 'entity.parse.failed') return new AppError(400, 'VALIDATION', 'Request body is not valid JSON');
  if (err.type === 'entity.too.large') return new AppError(413, 'PAYLOAD_TOO_LARGE', 'Request body is too large');
  if (err instanceof multer.MulterError) return new AppError(400, 'VALIDATION', err.message);
  if (err.name === 'ValidationError') return new AppError(400, 'VALIDATION', err.message);
  if (err.name === 'CastError') return new AppError(400, 'VALIDATION', `Invalid ${err.path}`);
  if (err.name === 'VersionError') return new AppError(409, 'STALE_VERSION', 'Reload before retrying');
  return null;
}

function errorHandler(err, req, res, next) {
  const appError = toAppError(err);
  if (appError) {
    return res.status(appError.status).json({
      error: { code: appError.code, message: appError.message, details: appError.details },
    });
  }
  const requestId = req.id || crypto.randomUUID();
  logger.error({ requestId, route: req.originalUrl.split('?')[0], err: err.message }, 'unhandled error');
  return res.status(500).json({ error: { code: 'INTERNAL', message: 'Something went wrong', requestId } });
}

module.exports = { notFound, errorHandler };
