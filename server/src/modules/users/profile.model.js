const mongoose = require('mongoose');

const profileSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
    immutable: true,
  },
  cgpa: {
    type: Number,
    min: 0,
    max: 10,
  },
  branch: {
    type: String,
    trim: true,
    maxlength: 100,
  },
  gradYear: {
    type: Number,
    min: 2000,
    max: 2100,
  },
  skills: {
    type: [String],
    default: [],
  },
  resumeFileId: {
    type: mongoose.Schema.Types.ObjectId,
  },
}, { timestamps: true });

module.exports = mongoose.models.Profile || mongoose.model('Profile', profileSchema);
