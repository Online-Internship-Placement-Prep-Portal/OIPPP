const mongoose = require('mongoose');

const listingSchema = new mongoose.Schema({
  recruiterId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    immutable: true,
    index: true,
  },
  company: { type: String, required: true, trim: true, maxlength: 80 },
  title: { type: String, required: true, trim: true, maxlength: 80 },
  location: { type: String, required: true, trim: true, maxlength: 60 },
  mode: { type: String, enum: ['ONSITE', 'REMOTE', 'HYBRID'], required: true },
  stipend: { type: Number, required: true, min: 0, max: 9999999 },
  skills: {
    type: [{ type: String, trim: true, maxlength: 30 }],
    required: true,
    validate: {
      validator(items) {
        return items.length >= 1 && items.length <= 10 && items.every(skill => skill.length > 0);
      },
      message: 'Provide between 1 and 10 non-empty skills',
    },
  },
  minCgpa: { type: Number, min: 0, max: 10, default: null },
  deadline: { type: Date, required: true },
  status: { type: String, enum: ['OPEN', 'CLOSED'], default: 'OPEN', required: true },
}, { timestamps: true });

listingSchema.index({ title: 'text', company: 'text', skills: 'text' });
listingSchema.index({ status: 1, deadline: 1 });

module.exports = mongoose.models.Listing || mongoose.model('Listing', listingSchema);
