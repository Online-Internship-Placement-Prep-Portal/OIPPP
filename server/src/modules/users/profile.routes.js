
const express = require('express');
const Joi = require('joi');

const { authenticate, allow } = require('../../middleware/auth');
const { validate } = require('../../middleware/validate');
const AppError = require('../../utils/AppError');

const service = require('./profile.service');
const { handleResumeUpload } = require('./resume.upload');

const router = express.Router();

const profileSchema = Joi.object({
  cgpa: Joi.number().min(0).max(10),
  branch: Joi.string().trim().max(100).allow(''),
  gradYear: Joi.number().integer().min(2000).max(2100),
  skills: Joi.array()
    .items(Joi.string().trim().min(1).max(30))
    .max(20),
}).min(1);

const wrap = (fn) => (req, res, next) => fn(req, res).catch(next);

// Get the logged-in student's profile.
router.get(
  '/profile/me',
  authenticate,
  allow('STUDENT'),
  wrap(async (req, res) => {
    const profile = await service.getMyProfile(req.user.id);
    res.json({ profile });
  }),
);

// Update the logged-in student's profile.
router.put(
  '/profile/me',
  authenticate,
  allow('STUDENT'),
  validate(profileSchema),
  wrap(async (req, res) => {
    const profile = await service.updateMyProfile(req.user.id, req.body);
    res.json({ profile });
  }),
);

// Upload or replace the logged-in student's resume.
router.post(
  '/profile/me/resume',
  authenticate,
  allow('STUDENT'),
  handleResumeUpload,
  wrap(async (req, res) => {
    const result = await service.uploadMyResume(req.user.id, req.file);
    res.status(200).json(result);
  }),
);

// Download the logged-in student's current resume.
router.get(
  '/profile/me/resume',
  authenticate,
  allow('STUDENT'),
  wrap(async (req, res) => {
    const profile = await service.getMyProfile(req.user.id);

    if (!profile.resumeFileId) {
      throw new AppError(
        404,
        'RESUME_NOT_FOUND',
        'No resume has been uploaded',
      );
    }

    const stream = service.getMyResumeStream(profile.resumeFileId);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="resume.pdf"',
    );

    stream.on('error', (err) => {
      if (!res.headersSent) {
        // Undo the PDF headers so clients can read the JSON error.
        res.removeHeader('Content-Disposition');
        res.status(404).type('json').json({
          error: {
            code: 'RESUME_NOT_FOUND',
            message: 'Resume file not found',
          },
        });
      } else {
        res.destroy(err);
      }
    });

    stream.pipe(res);
  }),
);

module.exports = router;
