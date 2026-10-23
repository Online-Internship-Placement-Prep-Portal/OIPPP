const mongoose = require('mongoose');
const app = require('./app');
const { port, mongoUri } = require('./config/env');
const logger = require('./utils/logger');
const { startEmailRetryJob } = require('./modules/notifications/notification.service');

async function main() {
  await mongoose.connect(mongoUri);
  logger.info('connected to MongoDB');
  startEmailRetryJob();
  app.listen(port, () => logger.info({ port }, 'OIPPP API listening'));
}

main().catch((err) => {
  logger.error({ err: err.message }, 'failed to start');
  process.exit(1);
});
