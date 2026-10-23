const mongoose = require('mongoose');
const { TOPICS, integer, percentage, sameNumber } = require('./schema.helpers');
const topicSchema = new mongoose.Schema({
  topic: { type: String, enum: TOPICS, required: true },
  totalQuestions: { type: Number, required: true, validate: integer(1, 60) },
  correctAnswers: { type: Number, required: true, validate: integer(0, 60) },
  percentage: { type: Number, required: true, min: 0, max: 100 },
}, { _id: false });
const resultSchema = new mongoose.Schema({
  attemptId: { type: mongoose.Schema.Types.ObjectId, ref: 'Attempt', required: true, immutable: true },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, immutable: true },
  testId: { type: mongoose.Schema.Types.ObjectId, ref: 'Test', required: true, immutable: true },
  totalQuestions: { type: Number, required: true, validate: integer(5, 60), immutable: true },
  correctAnswers: { type: Number, required: true, validate: integer(0, 60), immutable: true },
  score: { type: Number, required: true, min: 0, max: 100, immutable: true },
  topicBreakdown: { type: [topicSchema], required: true, immutable: true },
  submittedAt: { type: Date, required: true, immutable: true },
}, { timestamps: true, optimisticConcurrency: true });
resultSchema.pre('validate', function validateScore() {
  const topics = this.topicBreakdown || [];
  if (topics.length < 1 || topics.length > 4
      || new Set(topics.map((t) => t.topic)).size !== topics.length) {
    this.invalidate('topicBreakdown', 'Include each assessed topic exactly once (1–4 topics)');
  }
  if (this.correctAnswers > this.totalQuestions
      || !sameNumber(this.score, percentage(this.correctAnswers, this.totalQuestions))) {
    this.invalidate('score', 'Score must be 100 × correctAnswers / totalQuestions');
  }
  for (const topic of topics) {
    if (topic.correctAnswers > topic.totalQuestions
        || !sameNumber(topic.percentage, percentage(topic.correctAnswers, topic.totalQuestions))) {
      this.invalidate('topicBreakdown', 'Topic percentage must match its counts');
    }
  }
  if (topics.reduce((n, t) => n + t.totalQuestions, 0) !== this.totalQuestions
      || topics.reduce((n, t) => n + t.correctAnswers, 0) !== this.correctAnswers) {
    this.invalidate('topicBreakdown', 'Topic counts must add up to the overall counts');
  }
});
resultSchema.index({ attemptId: 1 }, { unique: true });
resultSchema.index({ studentId: 1, testId: 1 }, { unique: true });
resultSchema.index({ studentId: 1, submittedAt: -1 });
resultSchema.index({ testId: 1, submittedAt: -1 });
module.exports = mongoose.models.Result || mongoose.model('Result', resultSchema);
