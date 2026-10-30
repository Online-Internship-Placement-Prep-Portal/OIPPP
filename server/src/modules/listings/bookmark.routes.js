const express = require('express');
const { authenticate, allow } = require('../../middleware/auth');
const { validate, idParam } = require('../../middleware/validate');
const wrap = require('../../utils/wrap');
const service = require('./bookmark.service');

const router = express.Router();

router.post('/listings/:id/bookmark', authenticate, allow('STUDENT'), validate(idParam, 'params'),
  wrap(async (req, res) => {
    res.status(201).json({ bookmark: await service.addBookmark(req.user.id, req.params.id) });
  }));

router.delete('/listings/:id/bookmark', authenticate, allow('STUDENT'), validate(idParam, 'params'),
  wrap(async (req, res) => {
    await service.removeBookmark(req.user.id, req.params.id);
    res.status(204).end();
  }));

router.get('/bookmarks/mine', authenticate, allow('STUDENT'), wrap(async (req, res) => {
  res.json({ items: await service.listBookmarks(req.user.id) });
}));

module.exports = router;
