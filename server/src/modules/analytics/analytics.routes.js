const express = require('express');
const Joi = require('joi');
const { authenticate, allow } = require('../../middleware/auth');
const { validate } = require('../../middleware/validate');
const service = require('./analytics.service');

const router = express.Router();
const cohortQuery = Joi.object({
  branch: Joi.string().trim().max(100),
  gradYear: Joi.number().integer().min(2000).max(2100),
});

const wrap = (fn) => (req, res, next) => fn(req, res).catch(next);

router.use('/analytics', authenticate);

router.get('/analytics/me', allow('STUDENT'),
  wrap(async (req, res) => res.json(await service.studentReadiness(req.user.id))));

router.get('/analytics/placements', allow('ADMIN'), validate(cohortQuery, 'query'),
  wrap(async (req, res) => res.json(await service.placementStats(req.query))));

router.get('/analytics/placements/export', allow('ADMIN'), validate(cohortQuery, 'query'),
  wrap(async (req, res) => {
    const csv = service.placementCsv(await service.placementStats(req.query));
    res.type('text/csv').attachment('placement-report.csv').send(csv);
  }));

module.exports = router;
