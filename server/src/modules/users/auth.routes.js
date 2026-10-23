const express = require('express');
const { validate } = require('../../middleware/validate');
const { registerSchema, loginSchema } = require('./auth.validation');
const authService = require('./auth.service');

const router = express.Router();

router.post('/auth/register', validate(registerSchema), async (req, res, next) => {
  try {
    const user = await authService.register(req.body);
    return res.status(201).json({ user });
  } catch (err) {
    return next(err);
  }
});

router.post('/auth/login', validate(loginSchema), async (req, res, next) => {
  try {
    const result = await authService.login(req.body);
    return res.status(200).json(result);
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
