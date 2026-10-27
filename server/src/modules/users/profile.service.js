
const Profile = require('./profile.model');
const AppError = require('../../utils/AppError');
const { Readable } = require('stream');
const { getBucket, parseFileId, getResumeStream } = require('./resume.storage');

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
    {
      new: true,
      runValidators: true,
    },
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

    Readable.from(file.buffer).pipe(uploadStream);
  });

  try {
    profile.resumeFileId = fileId;
    await profile.save();
  } catch (error) {
    try {
      await bucket.delete(fileId);
    } catch {
      // Preserve the original profile-saving error.
    }

    throw error;
  }

  return {
    message: 'Resume uploaded successfully',
    resumeFileId: fileId,
  };
}

function getMyResumeStream(fileId) {
  const id = parseFileId(fileId);
  return getResumeStream(id);
}

module.exports = {
  getMyProfile,
  updateMyProfile,
  uploadMyResume,
  getMyResumeStream,
};
