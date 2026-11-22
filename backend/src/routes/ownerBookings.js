const router = require('express').Router();
const { requireAuth, requireRole } = require('../middleware/auth');
const rentalController = require('../controllers/rentalController');
router.get('/', requireAuth, requireRole('owner'), rentalController.list);
router.patch('/:id/status', requireAuth, requireRole('owner'), rentalController.updateStatus);
router.get('/:id/proof', requireAuth, requireRole('owner'), require('../controllers/paymentController').downloadBookingProofForOwner);
router.patch('/:id/payment', requireAuth, requireRole('owner'), require('../controllers/paymentController').updateOwnerPayment);
module.exports = router;
