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

const {
  getFarmers,
  verifyFarmer,
  viewFarmerDocument
} = require('../controllers/farmerVerificationController');

// All admin routes require authentication and admin role.
router.use(requireAuth, requireRole('admin'));

// Dashboard summary
router.get('/dashboard', getDashboardSummary);
router.get('/analytics/monthly', getMonthlyAnalytics);

// Owner verification
router.get('/owners', getOwners);
router.patch('/owners/:id/verify', verifyOwner);
router.get('/owners/:id/documents/:type', viewOwnerDocument);

// Farmer verification (RSBSA / Farmer ID)
router.get('/farmers', getFarmers);
router.patch('/farmers/:id/verify', verifyFarmer);
router.get('/farmers/:id/documents/farmer_id', viewFarmerDocument);

// User Management
router.get('/users', getUsers);
router.patch('/users/:id/status', updateUserStatus);

module.exports = router;
