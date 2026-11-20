const router = require('express').Router();
const { requireAuth, requireRole } = require('../middleware/auth');
const rentalController = require('../controllers/rentalController');
const paymentController = require('../controllers/paymentController');
router.get('/bookings', requireAuth, requireRole('admin'), rentalController.list);
router.get('/payments', requireAuth, requireRole('admin'), paymentController.listBookingPayments);
router.get('/payments/:id/proof', requireAuth, requireRole('admin'), paymentController.downloadBookingProof);
router.patch('/payments/:id/verify', requireAuth, requireRole('admin'), paymentController.verifyBookingPayment);
module.exports = router;
