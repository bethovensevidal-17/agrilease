const router = require('express').Router();
const { requireAuth, requireRole } = require('../middleware/auth');
const { create, list } = require('../controllers/rentalController');

router.post('/', requireAuth, requireRole('farmer'), create);
router.get('/', requireAuth, list);

module.exports = router;