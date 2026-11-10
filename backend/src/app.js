require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');

const app = express();

app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173' }));
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));
app.use('/api/rentals', require('./routes/rentals'));
app.get('/api/health', (req, res) => res.json({ ok: true, service: 'agrilease-api' }));
app.use('/api/rentals', require('./routes/rentals'));
// Idagdag dito ang routes ng ibang miyembro, isang line bawat route:
app.use('/api/categories', require('./routes/categories'));
app.use('/api/equipment', require('./routes/equipment'));
// app.use('/api/auth', require('./routes/auth'));       // Jenalyn
// app.use('/api/rentals', require('./routes/rentals')); // Gemalyn

app.use((req, res) => res.status(404).json({ error: 'Hindi nahanap ang route.' }));

// Huling error handler: huwag ilabas ang detalye ng error sa user.
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'May nangyaring error sa server.' });
});

module.exports = app;
