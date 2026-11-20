const router = require('express').Router();
const { listCategories } = require('../controllers/equipmentController');

router.get('/', listCategories);

module.exports = router;
