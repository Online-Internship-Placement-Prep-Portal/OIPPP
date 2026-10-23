const express = require('express');
const Joi = require('joi');
const { authenticate } = require('../../middleware/auth');
const { validate } = require('../../middleware/validate');
const service = require('./notification.service');

const router = express.Router();
const objectId = Joi.string().hex().length(24);

router.use(authenticate);

router.get('/', validate(Joi.object({ unread: Joi.boolean() }), 'query'), async (req, res, next) => {
  try {
    res.json({ items: await service.list(req.user.id, req.query) });
  } catch (err) { next(err); }
});

router.patch('/:id/read', validate(Joi.object({ id: objectId.required() }), 'params'), async (req, res, next) => {
  try {
    res.json({ notification: await service.markRead(req.user.id, req.params.id) });
  } catch (err) { next(err); }
});

module.exports = router;
