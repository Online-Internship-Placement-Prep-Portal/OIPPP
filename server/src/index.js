const mongoose = require('mongoose');
const app = require('./app');
const { port, mongoUri } = require('./config/env');
const logger = require('./utils/logger');

async function main() {
  await mongoose.connect(mongoUri);
  logger.info('connected to MongoDB');
  app.listen(port, () => logger.info({ port }, 'OIPPP API listening'));
}

main().catch((err) => {
  logger.error({ err: err.message }, 'failed to start');
  process.exit(1);
});
