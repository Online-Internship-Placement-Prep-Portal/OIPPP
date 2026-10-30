const Notification = require('./notification.model');
const mailer = require('./mailer');
const deps = require('../applications/application.deps');
const AppError = require('../../utils/AppError');
const logger = require('../../utils/logger');

// Minutes between retries after a failed send (REV-4); then the email is marked FAILED.
const RETRY_GAPS_MIN = [1, 5, 15];

async function deliverEmail(notification) {
  const user = await deps.User().findById(notification.userId).select('email').lean();
  const attempts = notification.email.attempts + 1;
  try {
    if (!user || !user.email) throw new Error('recipient has no email');
    await mailer.sendMail({ to: user.email, subject: notification.title, text: notification.message });
    notification.email = { status: 'SENT', attempts };
  } catch (err) {
    const gap = RETRY_GAPS_MIN[attempts - 1];
    notification.email = gap
      ? { status: 'PENDING', attempts, nextAttemptAt: new Date(Date.now() + gap * 60000), lastError: err.message }
      : { status: 'FAILED', attempts, lastError: err.message };
    logger.warn({ notificationId: notification.id, attempts }, 'email delivery failed');
  }
  await notification.save();
  return notification;
}

// Email failures never fail the caller's request.
async function notify(userId, { type, title, message, applicationId }, { email = false } = {}) {
  const notification = await Notification.create({
    userId, type, title, message, applicationId,
    email: { status: email ? 'PENDING' : 'NONE' },
  });
  if (email) await deliverEmail(notification);
  return notification;
}

async function retryDueEmails(now = new Date()) {
  const due = await Notification.find({ 'email.status': 'PENDING', 'email.nextAttemptAt': { $lte: now } }).limit(50);
  for (const notification of due) await deliverEmail(notification);
  return due.length;
}

function startEmailRetryJob(intervalMs = 60000) {
  const timer = setInterval(() => {
    retryDueEmails().catch((err) => logger.error({ err: err.message }, 'email retry job failed'));
  }, intervalMs);
  timer.unref();
  return timer;
}

function list(userId, { unread } = {}) {
  const filter = { userId };
  if (unread) filter.read = false;
  return Notification.find(filter).sort({ createdAt: -1 }).limit(50).select('-email').lean();
}

async function markRead(userId, id) {
  const n = await Notification.findOneAndUpdate({ _id: id, userId }, { read: true }, { new: true }).select('-email');
  if (!n) throw new AppError(404, 'NOT_FOUND', 'Notification not found');
  return n;
}

module.exports = { notify, deliverEmail, retryDueEmails, startEmailRetryJob, list, markRead, RETRY_GAPS_MIN };
