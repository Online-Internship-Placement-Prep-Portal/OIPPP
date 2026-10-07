require('dotenv').config();

module.exports = {
  port: process.env.PORT || 5000,
  mongoUri: process.env.MONGO_URI || 'mongodb://localhost:27017/oippp',
  jwtSecret: process.env.JWT_SECRET || 'dev-only-secret',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '60m',
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  analyticsUrl: process.env.ANALYTICS_URL || 'http://localhost:5001',
  smtp: {
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    from: process.env.MAIL_FROM || 'OIPPP <no-reply@oippp.local>',
  },
};
