const mongoose = require('mongoose');
const { GridFSBucket, ObjectId } = require('mongodb');
const AppError = require('../../utils/AppError');

const BUCKET_NAME = 'resumes';

function getBucket() {
  const db = mongoose.connection.db;

  if (!db) {
    throw new AppError(503, 'DATABASE_UNAVAILABLE', 'Database connection is not ready');
  }

  return new GridFSBucket(db, { bucketName: BUCKET_NAME });
}

function parseFileId(fileId) {
  if (!ObjectId.isValid(String(fileId))) {
    throw new AppError(400, 'INVALID_RESUME_ID', 'Invalid resume ID');
  }

  return new ObjectId(String(fileId));
}

async function deleteResume(fileId) {
  if (!fileId) return;

  const bucket = getBucket();
  const id = parseFileId(fileId);

  try {
    await bucket.delete(id);
  } catch (error) {
    if (error.codeName !== 'FileNotFound') throw error;
  }
}

function getResumeStream(fileId) {
  const bucket = getBucket();
  const id = parseFileId(fileId);

  return bucket.openDownloadStream(id);
}

module.exports = {
  getBucket,
  parseFileId,
  deleteResume,
  getResumeStream,
};