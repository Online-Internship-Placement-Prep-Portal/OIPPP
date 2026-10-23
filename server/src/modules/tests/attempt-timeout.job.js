const service = require('./aptitude.service');
const logger = require('../../utils/logger');

// Catch up after restarts; no browser timer is trusted. Concurrent API/worker
// submissions serialize through transactions and return the same canonical Result.
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
