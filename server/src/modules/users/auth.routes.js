const express = require('express');
const { authenticate } = require('../../middleware/auth');
const { validate } = require('../../middleware/validate');
const { authLimiter } = require('../../middleware/rate-limit');
const wrap = require('../../utils/wrap');
const { registerSchema, loginSchema } = require('./auth.validation');
const authService = require('./auth.service');

const router = express.Router();

router.post('/auth/register', authLimiter, validate(registerSchema), wrap(async (req, res) => {
  const user = await authService.register(req.body);
  res.status(201).json({ user });
}));

router.post('/auth/login', authLimiter, validate(loginSchema), wrap(async (req, res) => {
  res.json(await authService.login(req.body));
}));

router.get('/auth/me', authenticate, wrap(async (req, res) => {
  res.json({ user: await authService.me(req.user.id) });
}));

module.exports = router;
