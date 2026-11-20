const router = require('express').Router();
const { requireAuth } = require('../middleware/auth');
const controller = require('../controllers/messageController');
<<<<<<< HEAD
=======
const { idempotency } = require('../middleware/idempotency');
>>>>>>> master
router.use(requireAuth);
router.get('/contacts', controller.contacts);
router.get('/conversations', controller.conversations);
router.get('/unread-count', controller.unreadCount);
router.get('/:userId', controller.history);
<<<<<<< HEAD
router.post('/', controller.send);
=======
router.post('/', idempotency, controller.send);
>>>>>>> master
module.exports = router;
