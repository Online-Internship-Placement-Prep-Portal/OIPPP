const express = require('express');
const Joi = require('joi');
const { authenticate, allow } = require('../../middleware/auth');
const { validate, idParam } = require('../../middleware/validate');
const wrap = require('../../utils/wrap');
const service = require('./admin.service');
const settingsService = require('../settings/settings.service');
const { sendResume } = require('./resume.storage');

const router = express.Router();

const rejectSchema = Joi.object({
  reasonCode: Joi.string().valid(...service.RECRUITER_REJECT_REASONS).required(),
});

const usersQuery = Joi.object({
  role: Joi.string().valid('STUDENT', 'RECRUITER', 'ADMIN'),
  status: Joi.string().valid('ACTIVE', 'PENDING', 'DISABLED', 'REJECTED'),
  search: Joi.string().trim().max(100),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(50).default(20),
});

const settingsSchema = Joi.object({
  oneOfferPolicy: Joi.boolean().required(),
});

router.use('/admin', authenticate, allow('ADMIN'));

router.get('/admin/settings', wrap(async (req, res) => {
  res.json({ settings: await settingsService.getSettings() });
}));

router.patch('/admin/settings', validate(settingsSchema), wrap(async (req, res) => {
  res.json({ settings: await settingsService.updateSettings(req.user.id, req.body) });
}));

router.get('/admin/users', validate(usersQuery, 'query'), wrap(async (req, res) => {
  res.json(await service.listUsers(req.query));
}));

router.patch('/admin/recruiters/:id/approve', validate(idParam, 'params'), wrap(async (req, res) => {
  res.json({ user: await service.approveRecruiter(req.user.id, req.params.id) });
}));

router.patch('/admin/recruiters/:id/reject', validate(idParam, 'params'), validate(rejectSchema),
  wrap(async (req, res) => {
    res.json({ user: await service.rejectRecruiter(req.user.id, req.params.id, req.body.reasonCode) });
  }));

router.patch('/admin/users/:id/deactivate', validate(idParam, 'params'), wrap(async (req, res) => {
  res.json({ user: await service.deactivateUser(req.user.id, req.params.id) });
}));

router.get('/admin/users/:id/resume', validate(idParam, 'params'), wrap(async (req, res) => {
  sendResume(res, await service.getStudentResumeId(req.params.id));
}));

module.exports = router;
