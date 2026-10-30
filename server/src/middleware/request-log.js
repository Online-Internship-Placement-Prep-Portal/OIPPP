const crypto = require('crypto');
const logger = require('../utils/logger');

// SAD 4.4: one line per request. Only the path is logged; bodies and query strings can carry secrets.
function requestLog(req, res, next) {
  req.id = crypto.randomUUID();
  res.setHeader('X-Request-Id', req.id);
  const start = process.hrtime.bigint();

  res.on('finish', () => {
    logger.info({
      requestId: req.id,
      method: req.method,
      route: req.originalUrl.split('?')[0],
      status: res.statusCode,
      durationMs: Math.round(Number(process.hrtime.bigint() - start) / 1e4) / 100,
    }, 'request');
  });
  next();
}

module.exports = requestLog;
