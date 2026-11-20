const router = require('express').Router();
const controller = require('../controllers/subscriptionController');
const { requireAuth, requireRole, requireVerifiedOwner } = require('../middleware/auth');
const { handlePaymentProof } = require('../middleware/paymentProof');

router.get('/plans', controller.listPlans);
router.get('/mine', requireAuth, requireRole('owner'), requireVerifiedOwner, controller.mySubscription);
router.post('/request', requireAuth, requireRole('owner'), requireVerifiedOwner, handlePaymentProof, controller.requestPlan);
router.get(
  '/payments',
  requireAuth,
  requireRole('owner'),
  requireVerifiedOwner,
  controller.myPayments
);
module.exports = router;
