const express = require('express');
const router = express.Router();

const {
  requireAuth,
  requireRole
} = require('../middleware/auth');

const {
  getOwners,
  verifyOwner,
  getDashboardSummary
} = require('../controllers/adminController');

// All admin routes require authentication and admin role.
router.use(requireAuth, requireRole('admin'));

// Dashboard summary
router.get('/dashboard', getDashboardSummary);

// Owner verification
router.get('/owners', getOwners);
router.patch('/owners/:id/verify', verifyOwner);

module.exports = router;
