const User = require('./user.model');
const Profile = require('./profile.model');
const publicUser = require('./public-user');
const AppError = require('../../utils/AppError');
const escapeRegex = require('../../utils/escape-regex');
const audit = require('../audit/audit.service');
const notifications = require('../notifications/notification.service');

const RECRUITER_REJECT_REASONS = Object.freeze(['INCOMPLETE_PROFILE', 'INVALID_COMPANY', 'OTHER']);

async function findPendingRecruiter(recruiterId) {
  const recruiter = await User.findOne({ _id: recruiterId, role: 'RECRUITER' });

  if (!recruiter) {
    throw new AppError(404, 'NOT_FOUND', 'Recruiter not found');
  }

  if (recruiter.status !== 'PENDING') {
    throw new AppError(409, 'CONFLICT', 'Recruiter is not awaiting approval');
  }

  return recruiter;
}

async function approveRecruiter(adminId, recruiterId) {
  const recruiter = await findPendingRecruiter(recruiterId);

  recruiter.status = 'ACTIVE';
  await recruiter.save();

  await audit.record(adminId, 'RECRUITER_APPROVED', 'User', recruiter._id,
    { status: 'PENDING' }, { status: 'ACTIVE' });

  await notifications.notify(recruiter._id, {
    type: 'RECRUITER_DECISION',
    title: 'Recruiter account approved',
    message: 'Your recruiter account was approved. You can now log in and post listings.',
  }, { email: true });

  return publicUser(recruiter);
}

async function rejectRecruiter(adminId, recruiterId, reasonCode) {
  if (!RECRUITER_REJECT_REASONS.includes(reasonCode)) {
    throw new AppError(400, 'REASON_REQUIRED', 'A valid rejection reason code is required');
  }

  const recruiter = await findPendingRecruiter(recruiterId);

  recruiter.status = 'REJECTED';
  await recruiter.save();

  await audit.record(adminId, 'RECRUITER_REJECTED', 'User', recruiter._id,
    { status: 'PENDING' }, { status: 'REJECTED', reasonCode });

  await notifications.notify(recruiter._id, {
    type: 'RECRUITER_DECISION',
    title: 'Recruiter application rejected',
    message: `Your recruiter application was rejected. Reason: ${reasonCode}`,
  }, { email: true });

  return publicUser(recruiter);
}

async function deactivateUser(adminId, userId) {
  const user = await User.findById(userId);

  if (!user) {
    throw new AppError(404, 'NOT_FOUND', 'User not found');
  }

  if (user.role === 'ADMIN' && user.id === adminId) {
    throw new AppError(403, 'FORBIDDEN', 'You cannot deactivate your own admin account');
  }

  if (user.status === 'DISABLED') {
    throw new AppError(409, 'CONFLICT', 'User is already deactivated');
  }

  const previousStatus = user.status;
  user.status = 'DISABLED';
  await user.save();

  await audit.record(adminId, 'USER_DEACTIVATED', 'User', user._id,
    { status: previousStatus }, { status: 'DISABLED' });

  return { id: user.id, role: user.role, status: user.status };
}

async function listUsers({ role, status, search, page = 1, limit = 20 }) {
  const filter = {};
  if (role) filter.role = role;
  if (status) filter.status = status;
  if (search) {
    const pattern = new RegExp(escapeRegex(search), 'i');
    filter.$or = [{ name: pattern }, { email: pattern }, { srn: pattern }];
  }

  const [users, total] = await Promise.all([
    User.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
    User.countDocuments(filter),
  ]);
  return { items: users.map(publicUser), total, page };
}

async function getStudentResumeId(studentId) {
  const student = await User.findOne({ _id: studentId, role: 'STUDENT' }).select('_id');

  if (!student) {
    throw new AppError(404, 'NOT_FOUND', 'Student not found');
  }

  const profile = await Profile.findOne({ userId: student._id }).lean();

  if (!profile || !profile.resumeFileId) {
    throw new AppError(404, 'RESUME_NOT_FOUND', 'The student has not uploaded a resume');
  }

  return profile.resumeFileId;
}

module.exports = {
  RECRUITER_REJECT_REASONS,
  approveRecruiter,
  rejectRecruiter,
  deactivateUser,
  listUsers,
  getStudentResumeId,
};
