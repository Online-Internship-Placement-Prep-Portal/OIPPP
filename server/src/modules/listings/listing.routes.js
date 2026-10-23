const express = require('express');
const Joi = require('joi');
const { authenticate, allow } = require('../../middleware/auth');
const { validate } = require('../../middleware/validate');
const AppError = require('../../utils/AppError');
const service = require('./listing.service');

const router = express.Router();
const wrap = fn => (req, res, next) => fn(req, res).catch(next);

const objectId = Joi.string().hex().length(24);
const idParam = Joi.object({ id: objectId.required() });

const fields = {
  company: Joi.string().trim().min(1).max(80),
  title: Joi.string().trim().min(1).max(80),
  location: Joi.string().trim().min(1).max(60),
  mode: Joi.string().valid('ONSITE', 'REMOTE', 'HYBRID'),
  stipend: Joi.number().min(0).max(9999999),
  skills: Joi.array().items(Joi.string().trim().min(1).max(30)).min(1).max(10),
  minCgpa: Joi.number().min(0).max(10).allow(null),
  deadline: Joi.date().iso(),
};

const createSchema = Joi.object({
  ...fields,
  company: fields.company.required(),
  title: fields.title.required(),
  location: fields.location.required(),
  mode: fields.mode.required(),
  stipend: fields.stipend.required(),
  skills: fields.skills.required(),
  deadline: fields.deadline.required(),
});

const updateSchema = Joi.object({
  ...fields,
  status: Joi.string().valid('CLOSED'),
}).min(1);

function requireApprovedRecruiter(req, res, next) {
  if (req.user.status !== 'ACTIVE') {
    return next(new AppError(403, 'NOT_APPROVED', 'Only approved recruiters can publish listings'));
  }
  return next();
}

router.post(
  '/listings',
  authenticate,
  allow('RECRUITER'),
  requireApprovedRecruiter,
  validate(createSchema),
  wrap(async (req, res) => {
    const listing = await service.createListing(req.user.id, req.body);
    res.status(201).json({ listing });
  })
);

router.patch(
  '/listings/:id',
  authenticate,
  allow('RECRUITER'),
  requireApprovedRecruiter,
  validate(idParam, 'params'),
  validate(updateSchema),
  wrap(async (req, res) => {
    const listing = await service.updateListing(req.user.id, req.params.id, req.body);
    res.json({ listing });
  })
);

module.exports = router;
