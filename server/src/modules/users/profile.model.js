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
    validate: {
      validator: Number.isInteger,
      message: 'Graduation year must be an integer',
    },
  },
  skills: {
    type: [{ type: String, trim: true, maxlength: 30 }],
    default: [],
    validate: {
      validator: (skills) => skills.length <= 20,
      message: 'A maximum of 20 skills is allowed',
    },
  },
  resumeFileId: {
    type: mongoose.Schema.Types.ObjectId,
  },
}, { timestamps: true });

module.exports = mongoose.models.Profile || mongoose.model('Profile', profileSchema);
