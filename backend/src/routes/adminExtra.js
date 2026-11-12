const router = require('express').Router();
const { requireAuth, requireRole } = require('../middleware/auth');
const controller = require('../controllers/adminExtraController');

router.use(requireAuth, requireRole('admin'));

router.get('/rentals', controller.getRentals);
router.get('/activity', controller.getActivity);
router.get('/report-rental-payments', controller.getReportRentalPayments);
router.get('/subscriptions', controller.getSubscriptions);
router.get('/profile', controller.getProfile);
router.patch('/profile', controller.updateProfile);
router.get('/notifications', controller.getNotifications);
router.patch('/notifications/read-all', controller.markAllNotificationsRead);
router.patch('/notifications/:id/read', controller.markNotificationRead);

module.exports = router;
