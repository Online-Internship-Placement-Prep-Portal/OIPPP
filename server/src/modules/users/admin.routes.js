const express = require('express');
const Joi = require('joi');
const { authenticate, allow } = require('../../middleware/auth');
const { validate } = require('../../middleware/validate');
const service = require('./admin.service');

const router = express.Router();

const idParam = Joi.object({
id: Joi.string().hex().length(24).required(),
});

const wrap = (fn) => (req, res, next) => fn(req, res).catch(next);

router.patch(
'/admin/recruiters/:id/approve',
authenticate,
allow('ADMIN'),
validate(idParam, 'params'),
wrap(async (req, res) => {
const recruiter = await service.approveRecruiter(req.user.id, req.params.id);
res.json({ user: recruiter });
}),
);

router.patch(
'/admin/users/:id/deactivate',
authenticate,
allow('ADMIN'),
validate(idParam, 'params'),
wrap(async (req, res) => {
const user = await service.deactivateUser(req.user.id, req.params.id);
res.json({ user });
}),
);

module.exports = router;
