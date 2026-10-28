
const User = require('./user.model');
const Profile = require('./profile.model');
const AppError = require('../../utils/AppError');
const audit = require('../audit/audit.service');
const { parseFileId, getResumeStream } = require('./resume.storage');
const notifications = require('../notifications/notification.service');

async function approveRecruiter(adminId, recruiterId) {
  const recruiter = await User.findOne({
    _id: recruiterId,
    role: 'RECRUITER',
  });

  if (!recruiter) {
    throw new AppError(404, 'NOT_FOUND', 'Recruiter not found');
  }

  if (recruiter.status !== 'PENDING') {
    throw new AppError(409, 'CONFLICT', 'Recruiter is not awaiting approval');
  }

  recruiter.status = 'ACTIVE';
  await recruiter.save();

  await audit.record(
    adminId,
    'RECRUITER_APPROVED',
    'User',
    recruiter._id,
    { status: 'PENDING' },
    { status: 'ACTIVE' },
  );

  return {
    id: recruiter.id,
    name: recruiter.name,
    email: recruiter.email,
    role: recruiter.role,
    status: recruiter.status,
  };
}

async function deactivateUser(adminId, userId) {
  const user = await User.findById(userId);

  if (!user) {
    throw new AppError(404, 'NOT_FOUND', 'User not found');
  }

  if (user.role === 'ADMIN' && user.id === adminId) {
    throw new AppError(
      403,
      'FORBIDDEN',
      'You cannot deactivate your own admin account',
    );
  }

  if (user.status === 'DISABLED') {
    throw new AppError(409, 'CONFLICT', 'User is already deactivated');
  }

  const previousStatus = user.status;
  user.status = 'DISABLED';
  await user.save();

  await audit.record(
    adminId,
    'USER_DEACTIVATED',
    'User',
    user._id,
    { status: previousStatus },
    { status: 'DISABLED' },
  );

  return {
    id: user.id,
    role: user.role,
    status: user.status,
  };
}

async function rejectRecruiter(adminId, recruiterId, reasonCode) {
  const allowedReasons = ['INCOMPLETE_PROFILE', 'INVALID_COMPANY', 'OTHER'];

  if (!allowedReasons.includes(reasonCode)) {
    throw new AppError(
      400,
      'REASON_REQUIRED',
      'A valid rejection reason code is required',
    );
  }

  const recruiter = await User.findOne({
    _id: recruiterId,
    role: 'RECRUITER',
  });

  if (!recruiter) {
    throw new AppError(404, 'NOT_FOUND', 'Recruiter not found');
  }

  if (recruiter.status !== 'PENDING') {
    throw new AppError(409, 'CONFLICT', 'Recruiter is not awaiting approval');
  }

  recruiter.status = 'REJECTED';
  await recruiter.save();

  await audit.record(
    adminId,
    'RECRUITER_REJECTED',
    'User',
    recruiter._id,
    { status: 'PENDING' },
    { status: 'REJECTED', reasonCode },
  );

  await notifications.notify(
    recruiter._id,
    {
      type: 'RECRUITER_DECISION',
      title: 'Recruiter application rejected',
      message: `Your recruiter application was rejected. Reason: ${reasonCode}`,
    },
    { email: true },
  );

  return {
    id: recruiter.id,
    name: recruiter.name,
    email: recruiter.email,
    role: recruiter.role,
    status: recruiter.status,
  };
}

// Get a student's current resume for an authorized admin.
async function getStudentResume(studentId) {
  const student = await User.findOne({
    _id: studentId,
    role: 'STUDENT',
  }).select('_id');

  if (!student) {
    throw new AppError(404, 'NOT_FOUND', 'Student not found');
  }

  const profile = await Profile.findOne({
    userId: student._id,
  }).lean();

  if (!profile || !profile.resumeFileId) {
    throw new AppError(
      404,
      'RESUME_NOT_FOUND',
      'The student has not uploaded a resume',
    );
  }

  const fileId = parseFileId(profile.resumeFileId);

  return getResumeStream(fileId);
}

module.exports = {
  approveRecruiter,
  rejectRecruiter,
  deactivateUser,
  getStudentResume,
};