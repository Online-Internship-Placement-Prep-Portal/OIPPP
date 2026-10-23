const mongoose = require('mongoose');
const app = require('./app');
const { port, mongoUri } = require('./config/env');
const logger = require('./utils/logger');
const { startEmailRetryJob } = require('./modules/notifications/notification.service');
const listingService = require('./modules/listings/listing.service');

async function main() {
  await mongoose.connect(mongoUri);
  logger.info('connected to MongoDB');
  startEmailRetryJob();
  listingService.closeExpiredListings().catch(err => logger.error({ err: err.message }, 'failed initial listing cleanup'));
  const listingCleanupTimer = setInterval(() => {
    listingService.closeExpiredListings().catch(err => logger.error({ err: err.message }, 'failed to close expired listings'));
  }, 60 * 1000);
  listingCleanupTimer.unref();
  app.listen(port, () => logger.info({ port }, 'OIPPP API listening'));
}

main().catch((err) => {
  logger.error({ err: err.message }, 'failed to start');
  process.exit(1);
});
