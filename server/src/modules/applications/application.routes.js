const express = require('express');
const Joi = require('joi');
const { authenticate, allow } = require('../../middleware/auth');
const { validate } = require('../../middleware/validate');
const { STATUSES, REJECT_REASONS } = require('./application.constants');
const service = require('./application.service');

const router = express.Router();
const objectId = Joi.string().hex().length(24);
const idParam = Joi.object({ id: objectId.required() });

const wrap = (fn) => (req, res, next) => fn(req, res).catch(next);

router.post('/applications', authenticate, allow('STUDENT'),
  validate(Joi.object({ listingId: objectId.required(), coverNote: Joi.string().trim().max(1000).allow('') })),
  wrap(async (req, res) => {
    const app = await service.apply(req.user.id, req.body);
    res.status(201).json({ applicationId: app.id, status: app.status });
  }));

router.get('/applications/mine', authenticate, allow('STUDENT'),
  wrap(async (req, res) => res.json({ items: await service.listMine(req.user.id) })));

router.get('/listings/:id/applications', authenticate, allow('RECRUITER'),
  validate(idParam, 'params'),
  validate(Joi.object({
    status: Joi.string().valid(...STATUSES),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(50).default(20),
  }), 'query'),
  wrap(async (req, res) => res.json(await service.listForListing(req.user.id, req.params.id, req.query))));

router.patch('/applications/:id/status', authenticate, allow('RECRUITER'),
  validate(idParam, 'params'),
  validate(Joi.object({
    status: Joi.string().valid(...STATUSES).required(),
    reasonCode: Joi.string().valid(...Object.keys(REJECT_REASONS)),
  })),
  wrap(async (req, res) => {
    const app = await service.updateStatus(req.user.id, req.params.id, req.body);
    res.json({ status: app.status });
  }));

// lets the client build the rejection dropdown (REV-3)
router.get('/applications/reject-reasons', authenticate, allow('RECRUITER'),
  (req, res) => res.json({ items: Object.entries(REJECT_REASONS).map(([code, label]) => ({ code, label })) }));

module.exports = router;
