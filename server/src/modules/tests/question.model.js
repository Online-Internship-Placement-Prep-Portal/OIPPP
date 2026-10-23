const mongoose = require('mongoose');
const { TOPICS, DIFFICULTIES, integer } = require('./schema.helpers');

// Reused in the attempt snapshot so edits to the bank cannot alter a live test.
const questionFields = {
  text: { type: String, required: true, trim: true, maxlength: 4000 },
  topic: { type: String, required: true, enum: TOPICS },
  difficulty: { type: String, required: true, enum: DIFFICULTIES },
  options: {
    type: [{ type: String, required: true, trim: true, maxlength: 1000 }],
    required: true,
    validate: {
      validator: (values) => values.length >= 2 && values.length <= 6
        && new Set(values).size === values.length,
      message: 'Provide 2–6 distinct, nonempty options',
    },
  },
  answerIdx: { type: Number, required: true, select: false, validate: integer(0, 5) },
};
const questionSchema = new mongoose.Schema({
  ...questionFields,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  archived: { type: Boolean, default: false },
}, { timestamps: true, optimisticConcurrency: true });
questionSchema.pre('validate', function validateAnswerIndex() {
  if (this.answerIdx != null && this.options && this.answerIdx >= this.options.length) {
    this.invalidate('answerIdx', 'answerIdx must refer to an existing option');
  }
});
questionSchema.index({ topic: 1, difficulty: 1, archived: 1 });
questionSchema.set('toJSON', { transform: (_doc, value) => { delete value.answerIdx; return value; } });

module.exports = mongoose.models.Question || mongoose.model('Question', questionSchema);
module.exports.questionFields = questionFields;
