const mongoose = require('mongoose');

// SEC-6 / APP-4: append-only. No route or service may edit or delete an entry.
const auditLogSchema = new mongoose.Schema({
  actorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, immutable: true },
  action: { type: String, required: true, immutable: true },
  entity: { type: String, required: true, immutable: true },
  entityId: { type: mongoose.Schema.Types.ObjectId, required: true, immutable: true },
  before: { type: mongoose.Schema.Types.Mixed, immutable: true },
  after: { type: mongoose.Schema.Types.Mixed, immutable: true },
  at: { type: Date, default: Date.now, immutable: true },
}, { versionKey: false });

auditLogSchema.index({ entity: 1, entityId: 1, at: 1 });

function refuse() {
  throw new Error('Audit log entries cannot be changed');
}
['updateOne', 'updateMany', 'findOneAndUpdate', 'replaceOne', 'deleteOne', 'deleteMany', 'findOneAndDelete']
  .forEach((op) => auditLogSchema.pre(op, refuse));
auditLogSchema.pre('save', function blockEdits() {
  if (!this.isNew) refuse();
});

module.exports = mongoose.models.AuditLog || mongoose.model('AuditLog', auditLogSchema);
