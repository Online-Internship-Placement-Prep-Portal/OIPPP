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
    // Driver 6 reports a missing file as a MongoRuntimeError without a codeName.
    if (!/^File not found/.test(error.message)) throw error;
  }
}

function getResumeStream(fileId) {
  return getBucket().openDownloadStream(parseFileId(fileId));
}

function sendResume(res, fileId, disposition = 'attachment') {
  const stream = getResumeStream(fileId);

  res.set({
    'Content-Type': 'application/pdf',
    'Content-Disposition': `${disposition}; filename="resume.pdf"`,
  });

  stream.on('error', (err) => {
    if (res.headersSent) {
      res.destroy(err);
      return;
    }
    // Drop the PDF headers so the client can read the JSON error.
    res.removeHeader('Content-Disposition');
    res.status(404).type('json').json({
      error: { code: 'RESUME_NOT_FOUND', message: 'Resume file not found' },
    });
  });

  stream.pipe(res);
}

module.exports = {
  getBucket,
  parseFileId,
  deleteResume,
  getResumeStream,
  sendResume,
};
