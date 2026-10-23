const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: ['APPLICATION_RECEIVED', 'APPLICATION_STATUS'], required: true },
  title: { type: String, required: true, maxlength: 200 },
  message: { type: String, required: true, maxlength: 1000 },
  applicationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Application' },
  read: { type: Boolean, default: false },
  // SAD 4.4: the in-app row is written first; email delivery state rides along as a retry queue
  email: {
    status: { type: String, enum: ['NONE', 'PENDING', 'SENT', 'FAILED'], default: 'NONE' },
    attempts: { type: Number, default: 0 },
    nextAttemptAt: { type: Date },
    lastError: { type: String },
  },
}, { timestamps: true });

notificationSchema.index({ userId: 1, read: 1, createdAt: -1 });
notificationSchema.index({ 'email.status': 1, 'email.nextAttemptAt': 1 });

module.exports = mongoose.models.Notification || mongoose.model('Notification', notificationSchema);
