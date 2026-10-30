const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    minlength: 2,
    maxlength: 100,
  },
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
    maxlength: 254,
  },
  srn: {
    type: String,
    uppercase: true,
    trim: true,
  },
  passwordHash: {
    type: String,
    required: true,
    select: false,
  },
  role: {
    type: String,
    enum: ['STUDENT', 'RECRUITER', 'ADMIN'],
    required: true,
    default: 'STUDENT',
  },
  status: {
    type: String,
    enum: ['ACTIVE', 'PENDING', 'DISABLED', 'REJECTED'],
    required: true,
    default: 'ACTIVE',
  },
  failedLogins: {
    type: Number,
    default: 0,
    min: 0,
  },
  lockedUntil: {
    type: Date,
  },
}, { timestamps: true });

userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ srn: 1 }, { unique: true, sparse: true });

module.exports = mongoose.models.User || mongoose.model('User', userSchema);
