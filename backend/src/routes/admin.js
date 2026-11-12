const express = require('express');
const router = express.Router();

const {
  requireAuth,
  requireRole
} = require('../middleware/auth');

const {
  getOwners,
  verifyOwner,
  viewOwnerDocument,
  getDashboardSummary,
  getMonthlyAnalytics,
  getUsers,
  updateUserStatus
} = require('../controllers/adminController');

// All admin routes require authentication and admin role.
router.use(requireAuth, requireRole('admin'));

// Dashboard summary
router.get('/dashboard', getDashboardSummary);
router.get('/analytics/monthly', getMonthlyAnalytics);

// Owner verification
router.get('/owners', getOwners);
router.patch('/owners/:id/verify', verifyOwner);
router.get('/owners/:id/documents/:type', viewOwnerDocument);

// User Management
router.get('/users', getUsers);
router.patch('/users/:id/status', updateUserStatus);

module.exports = router;
