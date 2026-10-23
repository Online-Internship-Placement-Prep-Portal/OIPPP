const express = require('express');
const Joi = require('joi');
const { authenticate, allow } = require('../../middleware/auth');
const { validate } = require('../../middleware/validate');
const service = require('./profile.service');

const router = express.Router();

const profileSchema = Joi.object({
cgpa: Joi.number().min(0).max(10),
branch: Joi.string().trim().max(100).allow(''),
gradYear: Joi.number().integer().min(2000).max(2100),
skills: Joi.array().items(Joi.string().trim().min(1).max(100)).max(100),
}).min(1);

const wrap = (fn) => (req, res, next) => fn(req, res).catch(next);

router.get('/profile/me', authenticate, allow('STUDENT'),
wrap(async (req, res) => {
const profile = await service.getMyProfile(req.user.id);
res.json({ profile });
}));

router.put('/profile/me', authenticate, allow('STUDENT'),
validate(profileSchema),
wrap(async (req, res) => {
const profile = await service.updateMyProfile(req.user.id, req.body);
res.json({ profile });
}));

module.exports = router;
