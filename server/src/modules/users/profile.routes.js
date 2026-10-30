const express = require('express');
const Joi = require('joi');
const { authenticate, allow } = require('../../middleware/auth');
const { validate } = require('../../middleware/validate');
const AppError = require('../../utils/AppError');
const wrap = require('../../utils/wrap');
const service = require('./profile.service');
const { handleResumeUpload } = require('./resume.upload');
const { sendResume } = require('./resume.storage');

const router = express.Router();

const profileSchema = Joi.object({
  cgpa: Joi.number().min(0).max(10),
  branch: Joi.string().trim().max(100).allow(''),
  gradYear: Joi.number().integer().min(2000).max(2100),
  skills: Joi.array().items(Joi.string().trim().min(1).max(30)).max(20),
}).min(1);

router.use('/profile', authenticate, allow('STUDENT'));

router.get('/profile/me', wrap(async (req, res) => {
  res.json({ profile: await service.getMyProfile(req.user.id) });
}));

router.put('/profile/me', validate(profileSchema), wrap(async (req, res) => {
  res.json({ profile: await service.updateMyProfile(req.user.id, req.body) });
}));

router.post('/profile/me/resume', handleResumeUpload, wrap(async (req, res) => {
  res.json(await service.uploadMyResume(req.user.id, req.file));
}));

router.get('/profile/me/resume', wrap(async (req, res) => {
  const profile = await service.getMyProfile(req.user.id);

  if (!profile.resumeFileId) {
    throw new AppError(404, 'RESUME_NOT_FOUND', 'No resume has been uploaded');
  }

  sendResume(res, profile.resumeFileId);
}));

module.exports = router;
