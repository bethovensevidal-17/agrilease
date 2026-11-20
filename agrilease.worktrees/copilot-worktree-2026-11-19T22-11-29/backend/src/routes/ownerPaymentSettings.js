const router = require('express').Router();
const { requireAuth, requireRole } = require('../middleware/auth');
const { handleProviderPaymentQr } = require('../middleware/providerPaymentQr');
const controller = require('../controllers/ownerPaymentSettingsController');

router.use(requireAuth, requireRole('owner'));
router.get('/', controller.getPaymentSettings);
router.put('/', handleProviderPaymentQr, controller.updatePaymentSettings);

module.exports = router;
