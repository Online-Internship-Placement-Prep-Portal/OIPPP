const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { clientOrigin } = require('./config/env');
const { notFound, errorHandler } = require('./middleware/error');
const applicationRoutes = require('./modules/applications/application.routes');
const notificationRoutes = require('./modules/notifications/notification.routes');

const app = express();

app.use(helmet());
app.use(cors({ origin: clientOrigin }));
app.use(express.json({ limit: '100kb' }));
app.use('/api', rateLimit({ windowMs: 60 * 1000, limit: 300, standardHeaders: true, legacyHeaders: false }));

// SAD 4.4: health check for UptimeRobot during the demo
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

app.use('/api', applicationRoutes);
app.use('/api/notifications', notificationRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
