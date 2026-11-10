
const router = require('express').Router();

const rentalController = require('../controllers/rentalController');
const { requireAuth, requireRole } = require('../middleware/auth');

router.get(
  '/mine',
  requireAuth,
  requireRole('farmer'),
  rentalController.listMine
);

module.exports = router;
