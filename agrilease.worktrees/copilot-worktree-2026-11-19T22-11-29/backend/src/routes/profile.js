const express = require('express');
const router = express.Router();
const controller = require('../controllers/profileController');
const { requireAuth, requireRole } = require('../middleware/auth');
router.get('/farmer', requireAuth, requireRole('farmer'), controller.getFarmerProfile);
router.patch('/farmer', requireAuth, requireRole('farmer'), controller.updateFarmerProfile);
module.exports = router;
