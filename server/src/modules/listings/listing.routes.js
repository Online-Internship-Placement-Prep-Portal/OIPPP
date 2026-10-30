const express = require('express');
const Joi = require('joi');
const { authenticate, allow } = require('../../middleware/auth');
const { validate, idParam } = require('../../middleware/validate');
const AppError = require('../../utils/AppError');
const wrap = require('../../utils/wrap');
const service = require('./listing.service');
const searchService = require('./listing.search.service');
const recommendationService = require('./recommendation.service');

const router = express.Router();

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

const searchSchema = Joi.object({
  search: Joi.string().trim().max(80),
  location: Joi.string().trim().max(60),
  mode: Joi.string().uppercase().valid('ONSITE', 'REMOTE', 'HYBRID'),
  minStipend: Joi.number().min(0).max(9999999),
  maxStipend: Joi.number().min(0).max(9999999),
  skill: Joi.string().trim().min(1).max(30),
  deadlineBefore: Joi.date().iso(),
  deadlineAfter: Joi.date().iso(),
  sortBy: Joi.string().valid('deadline', 'stipend', 'postedAt', 'title').default('deadline'),
  order: Joi.string().valid('asc', 'desc').default('asc'),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
});

function requireApprovedRecruiter(req, res, next) {
  if (req.user.status !== 'ACTIVE') {
    return next(new AppError(403, 'NOT_APPROVED', 'Only approved recruiters can publish listings'));
  }
  return next();
}

router.get('/listings', validate(searchSchema, 'query'), wrap(async (req, res) => {
  const { minStipend, maxStipend } = req.query;
  if (minStipend !== undefined && maxStipend !== undefined && minStipend > maxStipend) {
    throw new AppError(400, 'VALIDATION', 'minStipend cannot exceed maxStipend');
  }

  res.json(await searchService.searchListings(req.query));
}));

router.get('/listings/recommendations', authenticate, allow('STUDENT'), wrap(async (req, res) => {
  res.json({ listings: await recommendationService.getRecommendations(req.user.id) });
}));

router.get('/listings/mine', authenticate, allow('RECRUITER'), wrap(async (req, res) => {
  res.json({ listings: await service.listMine(req.user.id) });
}));

router.get('/listings/:id', validate(idParam, 'params'), wrap(async (req, res) => {
  res.json({ listing: await service.getListing(req.params.id) });
}));

router.post('/listings', authenticate, allow('RECRUITER'), requireApprovedRecruiter, validate(createSchema),
  wrap(async (req, res) => {
    res.status(201).json({ listing: await service.createListing(req.user.id, req.body) });
  }));

router.patch('/listings/:id', authenticate, allow('RECRUITER'), requireApprovedRecruiter,
  validate(idParam, 'params'), validate(updateSchema),
  wrap(async (req, res) => {
    res.json({ listing: await service.updateListing(req.user.id, req.params.id, req.body) });
  }));

module.exports = router;
