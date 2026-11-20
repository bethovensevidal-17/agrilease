const router = require('express').Router();
const { requireAuth } = require('../middleware/auth');
const controller = require('../controllers/notificationController');
router.use(requireAuth);
router.get('/', controller.list);
router.patch('/read-all', controller.markAllRead);
router.patch('/:id/read', controller.markRead);
module.exports = router;
