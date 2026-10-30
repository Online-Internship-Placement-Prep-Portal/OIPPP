const Profile = require('./profile.model');
const Application = require('../applications/application.model');
const AppError = require('../../utils/AppError');
const logger = require('../../utils/logger');
const { getBucket, deleteResume } = require('./resume.storage');

async function getMyProfile(userId) {
  const profile = await Profile.findOne({ userId }).lean();

  if (!profile) {
    throw new AppError(404, 'NOT_FOUND', 'Profile not found');
  }

  return profile;
}

async function updateMyProfile(userId, updates) {
  const profile = await Profile.findOneAndUpdate(
    { userId },
    { $set: updates },
    { new: true, runValidators: true },
  ).lean();

  if (!profile) {
    throw new AppError(404, 'NOT_FOUND', 'Profile not found');
  }

  return profile;
}

async function uploadMyResume(userId, file) {
  if (!file || !file.buffer) {
    throw new AppError(400, 'RESUME_REQUIRED', 'Please upload a PDF resume');
  }

  const profile = await Profile.findOne({ userId });

  if (!profile) {
    throw new AppError(404, 'NOT_FOUND', 'Profile not found');
  }

  const bucket = getBucket();
  const uploadStream = bucket.openUploadStream('resume.pdf', {
    contentType: 'application/pdf',
    metadata: { userId: String(userId) },
  });

  const fileId = await new Promise((resolve, reject) => {
    uploadStream.once('finish', () => resolve(uploadStream.id));
    uploadStream.once('error', reject);
    uploadStream.end(file.buffer);
  });

  const previousFileId = profile.resumeFileId;

  try {
    profile.resumeFileId = fileId;
    await profile.save();
  } catch (error) {
    await bucket.delete(fileId).catch(() => {});
    throw error;
  }

  // Applications keep the resume they were sent with, so only an unreferenced one is removed.
  if (previousFileId && !(await Application.exists({ resumeFileId: previousFileId }))) {
    await deleteResume(previousFileId).catch((err) => {
      logger.warn({ fileId: String(previousFileId), err: err.message }, 'failed to delete replaced resume');
    });
  }

  return {
    message: 'Resume uploaded successfully',
    resumeFileId: fileId,
  };
}

module.exports = {
  getMyProfile,
  updateMyProfile,
  uploadMyResume,
};
