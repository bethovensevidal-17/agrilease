const router = require('express').Router();
const { requireAuth } = require('../middleware/auth');
const controller = require('../controllers/activityController');

router.get('/', requireAuth, controller.list);

module.exports = router;
