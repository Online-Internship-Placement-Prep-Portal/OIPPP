const express = require('express');
const Joi = require('joi');
const { authenticate, allow } = require('../../middleware/auth');
const { validate, objectId, idParam } = require('../../middleware/validate');
const wrap = require('../../utils/wrap');
const { sendResume } = require('../users/resume.storage');
const { STATUSES, REJECT_REASONS } = require('./application.constants');
const service = require('./application.service');

const router = express.Router();

const applySchema = Joi.object({
  listingId: objectId.required(),
  coverNote: Joi.string().trim().max(1000).allow(''),
});

const applicantsQuery = Joi.object({
  status: Joi.string().valid(...STATUSES),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(50).default(20),
});

const statusSchema = Joi.object({
  status: Joi.string().valid(...STATUSES).required(),
  reasonCode: Joi.string().valid(...Object.keys(REJECT_REASONS)),
});

const rejectReasons = Object.entries(REJECT_REASONS).map(([code, label]) => ({ code, label }));

router.post('/applications', authenticate, allow('STUDENT'), validate(applySchema), wrap(async (req, res) => {
  const application = await service.apply(req.user.id, req.body);
  res.status(201).json({ applicationId: application.id, status: application.status });
}));

router.get('/applications/mine', authenticate, allow('STUDENT'), wrap(async (req, res) => {
  res.json({ items: await service.listMine(req.user.id) });
}));

router.get('/applications/reject-reasons', authenticate, allow('RECRUITER'), (req, res) => {
  res.json({ items: rejectReasons });
});

router.get('/listings/:id/applications', authenticate, allow('RECRUITER'),
  validate(idParam, 'params'), validate(applicantsQuery, 'query'),
  wrap(async (req, res) => {
    res.json(await service.listForListing(req.user.id, req.params.id, req.query));
  }));

router.patch('/applications/:id/status', authenticate, allow('RECRUITER'),
  validate(idParam, 'params'), validate(statusSchema),
  wrap(async (req, res) => {
    const application = await service.updateStatus(req.user.id, req.params.id, req.body);
    res.json({ status: application.status });
  }));

router.get('/applications/:id/resume', authenticate, allow('STUDENT', 'RECRUITER', 'ADMIN'),
  validate(idParam, 'params'),
  wrap(async (req, res) => {
    const fileId = await service.getResumeForApplication(req.user.id, req.user.role, req.params.id);
    sendResume(res, fileId, 'inline');
  }));

module.exports = router;
