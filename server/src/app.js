const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const { clientOrigin, trustProxy } = require('./config/env');
const { apiLimiter } = require('./middleware/rate-limit');
const { notFound, errorHandler } = require('./middleware/error');
const requestLog = require('./middleware/request-log');
const authRoutes = require('./modules/users/auth.routes');
const profileRoutes = require('./modules/users/profile.routes');
const adminRoutes = require('./modules/users/admin.routes');
const listingRoutes = require('./modules/listings/listing.routes');
const bookmarkRoutes = require('./modules/listings/bookmark.routes');
const applicationRoutes = require('./modules/applications/application.routes');
const notificationRoutes = require('./modules/notifications/notification.routes');
const aptitudeRoutes = require('./modules/tests/aptitude.routes');
const analyticsRoutes = require('./modules/analytics/analytics.routes');

const app = express();

app.set('trust proxy', trustProxy);
app.use(requestLog);
app.use(helmet());
app.use(cors({ origin: clientOrigin }));
app.use(express.json({ limit: '100kb' }));
app.use('/api', apiLimiter);

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

app.use('/api', aptitudeRoutes);
app.use('/api', authRoutes);
app.use('/api', profileRoutes);
app.use('/api', adminRoutes);
app.use('/api', applicationRoutes);
app.use('/api', listingRoutes);
app.use('/api', bookmarkRoutes);
app.use('/api', analyticsRoutes);
app.use('/api/notifications', notificationRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
