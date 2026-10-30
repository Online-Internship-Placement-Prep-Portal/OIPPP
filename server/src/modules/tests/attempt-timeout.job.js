const service = require('./aptitude.service');
const logger = require('../../utils/logger');

// Server-side sweep that submits overdue attempts, including ones missed while the API was down.
function startAttemptTimeoutJob({ intervalMs = 1000 } = {}) {
  let running = false;
  let stopped = false;
  const tick = async () => {
    if (running || stopped) return;
    running = true;
    try { await service.expireOverdue(); }
    catch (err) { logger.error({ err: err.message }, 'attempt timeout sweep failed; retrying next tick'); }
    finally { running = false; }
  };
  const timer = setInterval(tick, intervalMs);
  timer.unref();
  void tick();
  return () => { stopped = true; clearInterval(timer); };
}
module.exports = { startAttemptTimeoutJob };
