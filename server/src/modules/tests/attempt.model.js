const mongoose = require('mongoose');
const { questionFields } = require('./question.model');
const { integer, questionCount, uniqueIds } = require('./schema.helpers');
const snapshotSchema = new mongoose.Schema({
  questionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Question', required: true },
  ...questionFields,
}, { _id: false });
snapshotSchema.pre('validate', function validateSnapshotAnswer() {
  if (this.answerIdx != null && this.options && this.answerIdx >= this.options.length) {
    this.invalidate('answerIdx', 'answerIdx must refer to an existing option');
  }
});
const attemptSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, immutable: true },
  testId: { type: mongoose.Schema.Types.ObjectId, ref: 'Test', required: true, immutable: true },
  durationMin: { type: Number, required: true, immutable: true, validate: integer(10, 120) },
  startedAt: { type: Date, required: true, immutable: true, default: Date.now },
  endsAt: { type: Date, required: true, immutable: true },
  questions: {
    type: [snapshotSchema], required: true, immutable: true,
    validate: [
      { validator: questionCount, message: 'Snapshot needs 5–60 questions' },
      { validator: (items) => uniqueIds(items.map((q) => q.questionId)), message: 'Duplicate snapshot question' },
    ],
  },
  // Keyed by questionId so one answer can be saved atomically with $set.
  answers: { type: Map, of: { type: Number, validate: integer(0, 5) }, default: () => ({}) },
  lastSavedAt: { type: Date },
  status: { type: String, enum: ['IN_PROGRESS', 'SUBMITTED'], default: 'IN_PROGRESS', required: true },
  submittedAt: { type: Date },
  submissionReason: { type: String, enum: ['MANUAL', 'TIMEOUT'] },
}, { timestamps: true, optimisticConcurrency: true });
attemptSchema.pre('validate', function validateAttempt() {
  if (this.startedAt && this.endsAt && this.durationMin
      && this.endsAt.getTime() !== this.startedAt.getTime() + this.durationMin * 60000) {
    this.invalidate('endsAt', 'endsAt must equal server start time plus the snapshotted duration');
  }
  for (const [id, optionIdx] of this.answers || []) {
    const question = this.questions.find((q) => String(q.questionId) === id);
    if (!question || !Number.isInteger(optionIdx) || optionIdx < 0 || optionIdx >= question.options.length) {
      this.invalidate('answers', 'Every answer must refer to a snapshot question and one of its options');
    }
  }
  if (this.status === 'SUBMITTED' && (!this.submittedAt || !this.submissionReason)) {
    this.invalidate('submittedAt', 'Submitted attempts require a timestamp and reason');
  }
  if (this.status === 'IN_PROGRESS' && (this.submittedAt || this.submissionReason)) {
    this.invalidate('status', 'An in-progress attempt cannot have submission metadata');
  }
  for (const field of ['lastSavedAt', 'submittedAt']) {
    if (this[field] && this.startedAt && this[field] < this.startedAt) {
      this.invalidate(field, `${field} cannot precede startedAt`);
    }
  }
});
attemptSchema.index({ studentId: 1, testId: 1 }, { unique: true });
attemptSchema.index({ status: 1, endsAt: 1 });
attemptSchema.methods.toStudentView = function toStudentView() {
  return {
    attemptId: this.id, testId: this.testId, status: this.status,
    startedAt: this.startedAt, endsAt: this.endsAt,
    answers: Object.fromEntries(this.answers || []),
    questions: this.questions.map((q) => ({
      questionId: q.questionId, text: q.text, topic: q.topic,
      difficulty: q.difficulty, options: [...q.options],
    })),
  };
};
attemptSchema.set('toJSON', { flattenMaps: true, transform: (_doc, value) => {
  for (const question of value.questions || []) delete question.answerIdx;
  return value;
} });
module.exports = mongoose.models.Attempt || mongoose.model('Attempt', attemptSchema);
