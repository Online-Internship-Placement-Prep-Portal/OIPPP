const pino = require('pino');

// never log bodies here: they can carry passwords, tokens or CGPA (SAD 4.4)
module.exports = pino({ level: process.env.NODE_ENV === 'test' ? 'silent' : 'info' });
