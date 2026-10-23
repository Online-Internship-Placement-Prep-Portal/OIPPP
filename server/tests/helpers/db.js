const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongo;

async function connect() {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
}

// AuditLog blocks deleteMany by design, so drop collections at the driver level
async function clear() {
  await Promise.all(Object.values(mongoose.connection.collections).map((c) => c.collection.deleteMany({})));
}

async function disconnect() {
  await mongoose.disconnect();
  if (mongo) await mongo.stop();
}

module.exports = { connect, clear, disconnect };
