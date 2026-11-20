const router = require('express').Router();
const controller = require('../controllers/rentalController');
const { requireAuth, requireRole } = require('../middleware/auth');
const { handlePaymentProof } = require('../middleware/paymentProof');
const paymentController = require('../controllers/paymentController');
const { idempotency } = require('../middleware/idempotency');

router.get('/payments/:id/proof', requireAuth, paymentController.downloadBookingProof);
router.post('/', requireAuth, requireRole('farmer'), idempotency, handlePaymentProof, controller.create);
router.get('/mine', requireAuth, requireRole('farmer'), controller.listMine);
router.get('/', requireAuth, controller.list);
router.get('/:id', requireAuth, controller.getOne);
router.patch('/:id/cancel', requireAuth, requireRole('farmer'), controller.cancel);
router.patch('/:id/archive', requireAuth, requireRole('farmer'), controller.archive);
router.patch('/:id/restore', requireAuth, requireRole('farmer'), controller.restore);
router.patch('/:id/status', requireAuth, requireRole('owner'), controller.updateStatus);
module.exports = router;
