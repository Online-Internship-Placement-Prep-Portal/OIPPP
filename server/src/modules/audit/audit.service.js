const AuditLog = require('./auditLog.model');

function record(actorId, action, entity, entityId, before, after) {
  return AuditLog.create({ actorId, action, entity, entityId, before, after });
}

function history(entity, entityId) {
  return AuditLog.find({ entity, entityId }).sort({ at: 1 }).lean();
}

module.exports = { record, history };
