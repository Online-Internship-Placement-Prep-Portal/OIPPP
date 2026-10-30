const multer = require('multer');
const AppError = require('../../utils/AppError');

const MAX_RESUME_SIZE = 2 * 1024 * 1024;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_RESUME_SIZE,
    files: 1,
  },
  fileFilter(req, file, callback) {
    if (file.mimetype !== 'application/pdf') {
      return callback(new AppError(400, 'INVALID_FILE_TYPE', 'Only PDF resumes are allowed'));
    }

    return callback(null, true);
  },
});

function handleResumeUpload(req, res, next) {
  upload.single('resume')(req, res, (err) => {
    if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
      return next(new AppError(413, 'FILE_TOO_LARGE', 'Resume must not exceed 2 MB'));
    }

    if (err) return next(err);

    if (!req.file) {
      return next(new AppError(400, 'RESUME_REQUIRED', 'Please upload a PDF resume'));
    }

    // The MIME type comes from the client, so also check the file signature.
    if (req.file.buffer.subarray(0, 5).toString() !== '%PDF-') {
      return next(new AppError(400, 'INVALID_FILE_CONTENT', 'The uploaded file is not a valid PDF'));
    }

    return next();
  });
}

module.exports = {
  handleResumeUpload,
  MAX_RESUME_SIZE,
};
