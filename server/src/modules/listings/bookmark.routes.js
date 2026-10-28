const express = require('express');
const Joi = require('joi');
const { authenticate, allow } = require('../../middleware/auth');
const { validate } = require('../../middleware/validate');
const service = require('./bookmark.service');

const router = express.Router();
const wrap = fn => (req, res, next) => fn(req, res).catch(next);
const idParam = Joi.object({
  id: Joi.string().hex().length(24).required(),
});

router.post('/listings/:id/bookmark', authenticate, allow('STUDENT'),
  validate(idParam, 'params'),
  wrap(async (req, res) => {
    const bookmark = await service.addBookmark(req.user.id, req.params.id);
    res.status(201).json({ bookmark });
  }));

router.delete('/listings/:id/bookmark', authenticate, allow('STUDENT'),
  validate(idParam, 'params'),
  wrap(async (req, res) => {
    await service.removeBookmark(req.user.id, req.params.id);
    res.status(204).end();
  }));

router.get('/bookmarks/mine', authenticate, allow('STUDENT'),
  wrap(async (req, res) => {
    res.json({ items: await service.listBookmarks(req.user.id) });
  }));

module.exports = router;
