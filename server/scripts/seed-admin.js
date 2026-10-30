// Creates the first admin from the ADMIN_* env vars; admins can't self-register.
const bcrypt = require('bcrypt');
const Joi = require('joi');
const mongoose = require('mongoose');
const { mongoUri } = require('../src/config/env');
const User = require('../src/modules/users/user.model');
const { password } = require('../src/modules/users/auth.validation');

const schema = Joi.object({
  name: Joi.string().trim().min(2).max(100).required(),
  email: Joi.string().trim().lowercase().email().max(254).required(),
  password,
});

async function main() {
  const { error, value } = schema.validate({
    name: process.env.ADMIN_NAME || 'Placement Admin',
    email: process.env.ADMIN_EMAIL,
    password: process.env.ADMIN_PASSWORD,
  });
  if (error) throw new Error(`Invalid admin settings: ${error.message}`);

  await mongoose.connect(mongoUri);
  try {
    if (await User.exists({ email: value.email })) {
      console.log(`An account for ${value.email} already exists; nothing to do.`);
      return;
    }

    await User.create({
      name: value.name,
      email: value.email,
      passwordHash: await bcrypt.hash(value.password, 12),
      role: 'ADMIN',
      status: 'ACTIVE',
    });
    console.log(`Created admin ${value.email}.`);
  } finally {
    await mongoose.disconnect();
  }
}

main().catch((err) => {
  console.error(err.message);
  process.exitCode = 1;
});
