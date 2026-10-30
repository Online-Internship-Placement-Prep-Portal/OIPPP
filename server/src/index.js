const mongoose = require('mongoose');
const app = require('./app');
const { port, mongoUri } = require('./config/env');
const logger = require('./utils/logger');
const aptitudeService = require('./modules/tests/aptitude.service');
const { startAttemptTimeoutJob } = require('./modules/tests/attempt-timeout.job');
const { startEmailRetryJob } = require('./modules/notifications/notification.service');
const listingService = require('./modules/listings/listing.service');

function closeExpiredListings() {
  listingService.closeExpiredListings()
    .catch((err) => logger.error({ err: err.message }, 'failed to close expired listings'));
}

async function main() {
  await mongoose.connect(mongoUri);
  logger.info('connected to MongoDB');
  await aptitudeService.initialize();

  const stopAttemptTimeouts = startAttemptTimeoutJob();
  startEmailRetryJob();
  closeExpiredListings();
  setInterval(closeExpiredListings, 60 * 1000).unref();

  const server = app.listen(port, () => logger.info({ port }, 'OIPPP API listening'));

  const shutdown = (signal) => {
    logger.info({ signal }, 'shutting down');
    stopAttemptTimeouts();
    server.close(() => mongoose.disconnect().finally(() => process.exit(0)));
  };
  process.once('SIGTERM', shutdown);
  process.once('SIGINT', shutdown);
}

main().catch((err) => {
  logger.error({ err: err.message }, 'failed to start');
  process.exit(1);
});
