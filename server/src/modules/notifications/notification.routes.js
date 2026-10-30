const express = require('express');
const Joi = require('joi');
const { authenticate } = require('../../middleware/auth');
const { validate, idParam } = require('../../middleware/validate');
const wrap = require('../../utils/wrap');
const service = require('./notification.service');

const router = express.Router();

router.use(authenticate);

router.get('/', validate(Joi.object({ unread: Joi.boolean() }), 'query'), wrap(async (req, res) => {
  res.json({ items: await service.list(req.user.id, req.query) });
}));

router.patch('/:id/read', validate(idParam, 'params'), wrap(async (req, res) => {
  res.json({ notification: await service.markRead(req.user.id, req.params.id) });
}));

module.exports = router;
