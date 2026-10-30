const Joi = require('joi');

const email = Joi.string().trim().lowercase().email().max(254).required();

// AUTH-3: at least 8 characters with a letter and a digit. 72 is bcrypt's input limit.
const password = Joi.string().min(8).max(72)
  .pattern(/[A-Za-z]/, 'letter')
  .pattern(/\d/, 'digit')
  .messages({ 'string.pattern.name': 'Password must contain at least one {#name}' })
  .required();

// AUTH-1: students only, e.g. PES1UG24CS177.
const srn = Joi.string().trim().uppercase().pattern(/^PES[12]UG\d{2}[A-Z]{2}\d{3}$/)
  .messages({ 'string.pattern.base': 'SRN must look like PES1UG24CS177' });

const registerSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).required(),
  email,
  password,
  role: Joi.string().valid('STUDENT', 'RECRUITER').default('STUDENT'),
  srn: srn.when('role', { is: 'RECRUITER', then: Joi.forbidden(), otherwise: Joi.required() }),
});

const loginSchema = Joi.object({
  email,
  password: Joi.string().min(1).max(72).required(),
});

module.exports = { registerSchema, loginSchema, password };
