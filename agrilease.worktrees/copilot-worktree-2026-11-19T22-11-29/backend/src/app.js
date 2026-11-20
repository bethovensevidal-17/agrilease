require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173' }));
app.use(express.json({ limit: '2mb' }));
app.use('/uploads/equipment', express.static(path.join(__dirname, '..', 'uploads', 'equipment')));
app.use('/uploads/provider-payment', express.static(path.join(__dirname, '..', 'uploads', 'provider-payment')));

app.get('/api/health', (_req, res) => res.json({ ok: true, service: 'agrilease-api' }));

// Separate database readiness check so deployment diagnostics can distinguish
// an available Express process from an unavailable MySQL connection.
app.get('/api/health/db', async (_req, res) => {
  try {
    const db = require('./db');
    await db.query('SELECT 1 AS db_ok');
    res.json({ ok: true, database: 'connected' });
  } catch (error) {
    console.error('Database health check failed:', error.message);
    res.status(503).json({ ok: false, database: 'unavailable' });
  }
});
app.use('/api/categories', require('./routes/categories'));
app.use('/api/equipment', require('./routes/equipment'));
app.use('/api/rentals', require('./routes/rental'));
app.use('/api/owner/bookings', require('./routes/ownerBookings'));
app.use('/api/admin', require('./routes/adminBookings'));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/profile', require('./routes/profile'));
app.use('/api/content', require('./routes/content'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/messages', require('./routes/messages'));
app.use('/api/subscriptions', require('./routes/subscriptions'));
app.use('/api/owner/payment-settings', require('./routes/ownerPaymentSettings'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/admin', require('./routes/adminExtra'));

app.use((req, res) => res.status(404).json({ error: 'Hindi nahanap ang route.' }));
app.use((err, req, res, next) => {
  console.error(err);
  if (res.headersSent) return next(err);
  res.status(500).json({ error: 'May nangyaring error sa server.' });
});
module.exports = app;
