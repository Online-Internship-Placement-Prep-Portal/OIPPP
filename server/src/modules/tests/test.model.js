const mongoose = require('mongoose');
const { integer, questionCount, uniqueIds } = require('./schema.helpers');
const testSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, maxlength: 200 },
  durationMin: { type: Number, required: true, validate: integer(10, 120) },
  questionIds: {
    type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Question', required: true }],
    required: true,
    validate: [
      { validator: questionCount, message: 'A test needs 5–60 questions' },
      { validator: uniqueIds, message: 'A question may appear only once' },
    ],
  },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status: { type: String, enum: ['DRAFT', 'PUBLISHED', 'ARCHIVED'], default: 'DRAFT' },
}, { timestamps: true, optimisticConcurrency: true });
testSchema.index({ status: 1, createdAt: -1 });
module.exports = mongoose.models.Test || mongoose.model('Test', testSchema);
