const mongoose = require('mongoose');
const { STATUSES, REJECT_REASONS } = require('./application.constants');

const historySchema = new mongoose.Schema({
  from: { type: String, enum: [...STATUSES, null], default: null },
  to: { type: String, enum: STATUSES, required: true },
  by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  reasonCode: { type: String, enum: Object.keys(REJECT_REASONS) },
  at: { type: Date, default: Date.now },
}, { _id: false });

const applicationSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, immutable: true },
  listingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Listing', required: true, immutable: true },
  // APP-1: the resume current at apply time, so later uploads do not change what the recruiter saw
  resumeFileId: { type: mongoose.Schema.Types.ObjectId, immutable: true },
  coverNote: { type: String, trim: true, maxlength: 1000, immutable: true },
  status: { type: String, enum: STATUSES, default: 'APPLIED', required: true },
  rejectReason: { type: String, enum: Object.keys(REJECT_REASONS) },
  history: { type: [historySchema], default: [] },
}, { timestamps: true });

// BR-3 / SAFE-1: one application per student per listing, even under concurrent submits
applicationSchema.index({ studentId: 1, listingId: 1 }, { unique: true });
applicationSchema.index({ studentId: 1, createdAt: -1 });
applicationSchema.index({ listingId: 1, status: 1, createdAt: -1 });

module.exports = mongoose.models.Application || mongoose.model('Application', applicationSchema);
