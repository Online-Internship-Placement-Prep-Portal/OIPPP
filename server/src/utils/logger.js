const pino = require('pino');

// Never log request bodies: they carry passwords, tokens and CGPA.
module.exports = pino({ level: process.env.NODE_ENV === 'test' ? 'silent' : 'info' });
