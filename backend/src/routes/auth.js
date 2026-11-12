const express = require('express');
const router = express.Router();

const {
  register,
  login
} = require('../controllers/authController');

const {
  ownerDocumentUpload
} = require('../middleware/ownerDocuments');

// POST /api/auth/register
router.post('/register', (req, res, next) => {
  ownerDocumentUpload(req, res, (error) => {
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    next();
  });
}, register);

// POST /api/auth/login
router.post('/login', login);

module.exports = router;
