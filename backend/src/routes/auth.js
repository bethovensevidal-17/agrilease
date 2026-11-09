
const express = require('express');
const router = express.Router();

// POST /api/auth/register
router.post('/register', (req, res) => {
  res.json({
    success: true,
    message: 'Register route is working.'
  });
});

// POST /api/auth/login
router.post('/login', (req, res) => {
  res.json({
    success: true,
    message: 'Login route is working.'
  });
});

module.exports = router;
