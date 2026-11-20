const router = require('express').Router();
const { requireAuth } = require('../middleware/auth');
const controller = require('../controllers/messageController');
router.use(requireAuth);
router.get('/contacts', controller.contacts);
router.get('/conversations', controller.conversations);
router.get('/:userId', controller.history);
router.post('/', controller.send);
module.exports = router;
