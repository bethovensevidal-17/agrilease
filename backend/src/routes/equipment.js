const router = require('express').Router();
const c = require('../controllers/equipmentController');
const { requireAuth, requireRole } = require('../middleware/auth');
const { handleUpload } = require('../middleware/upload');

// Dapat nasa itaas ang /mine at /admin bago ang /:id.
router.get('/', c.listPublic);
router.get('/mine', requireAuth, requireRole('owner'), c.listMine);
router.get('/admin', requireAuth, requireRole('admin'), c.listAdmin);

router.post('/', requireAuth, requireRole('owner'), handleUpload, c.create);
router.put('/:id', requireAuth, requireRole('owner'), handleUpload, c.update);
router.patch('/:id/archive', requireAuth, requireRole('owner'), c.archive);
router.patch('/:id/restore', requireAuth, requireRole('owner'), c.restore);
router.patch('/:id/approval', requireAuth, requireRole('admin'), c.setApproval);

router.get('/:id', c.getOne);

module.exports = router;
