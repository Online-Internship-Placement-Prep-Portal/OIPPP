jest.mock('../../src/modules/tests/aptitude.service', () => ({ expireOverdue: jest.fn() }));
jest.mock('../../src/utils/logger', () => ({ error: jest.fn() }));
const service = require('../../src/modules/tests/aptitude.service');
const logger = require('../../src/utils/logger');
const { startAttemptTimeoutJob } = require('../../src/modules/tests/attempt-timeout.job');
beforeEach(() => { jest.useFakeTimers(); jest.clearAllMocks(); });
afterEach(() => { jest.useRealTimers(); });
test('sweeps at startup, repeats, and stops', async () => {
  service.expireOverdue.mockResolvedValue(0);
  const stop = startAttemptTimeoutJob();
  expect(service.expireOverdue).toHaveBeenCalledTimes(1);
  await jest.advanceTimersByTimeAsync(1000);
  expect(service.expireOverdue).toHaveBeenCalledTimes(2);
  stop(); await jest.advanceTimersByTimeAsync(5000);
  expect(service.expireOverdue).toHaveBeenCalledTimes(2);
});
test('does not overlap sweeps', async () => {
  let release;
  service.expireOverdue.mockImplementation(() => new Promise((resolve) => { release = resolve; }));
  const stop = startAttemptTimeoutJob(); await jest.advanceTimersByTimeAsync(5000);
  expect(service.expireOverdue).toHaveBeenCalledTimes(1);
  release(0); stop();
});
test('logs a failure and retries instead of silently stopping', async () => {
  service.expireOverdue.mockRejectedValueOnce(new Error('database unavailable')).mockResolvedValue(0);
  const stop = startAttemptTimeoutJob(); await jest.advanceTimersByTimeAsync(1000);
  expect(logger.error).toHaveBeenCalledTimes(1); expect(service.expireOverdue).toHaveBeenCalledTimes(2); stop();
});
