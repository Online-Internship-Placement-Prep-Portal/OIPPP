const express = require('express');
const Joi = require('joi');
const { authenticate, allow } = require('../../middleware/auth');
const { validate } = require('../../middleware/validate');
const service = require('./application.service');

const router = express.Router();
const objectId = Joi.string().hex().length(24);

const wrap = (fn) => (req, res, next) => fn(req, res).catch(next);

router.post('/applications', authenticate, allow('STUDENT'),
  validate(Joi.object({ listingId: objectId.required(), coverNote: Joi.string().trim().max(1000).allow('') })),
  wrap(async (req, res) => {
    const app = await service.apply(req.user.id, req.body);
    res.status(201).json({ applicationId: app.id, status: app.status });
  }));

router.get('/applications/mine', authenticate, allow('STUDENT'),
  wrap(async (req, res) => res.json({ items: await service.listMine(req.user.id) })));

module.exports = router;
