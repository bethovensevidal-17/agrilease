const router = require('express').Router();
const c = require('../controllers/equipmentController');
const {
  requireAuth,
  requireRole,
  requireVerifiedOwner
} = require('../middleware/auth');
const { handleUpload } = require('../middleware/upload');
const { idempotency } = require('../middleware/idempotency');

// PUBLIC: Browse approved equipment
router.get('/', c.listPublic);

// OWNER: View own equipment
router.get(
  '/mine',
  requireAuth,
  requireRole('owner'),
  requireVerifiedOwner,
  c.listMine
);

// ADMIN: View all equipment
router.get(
  '/admin',
  requireAuth,
  requireRole('admin'),
  c.listAdmin
);

// OWNER: Add equipment
router.post(
  '/',
  requireAuth,
  requireRole('owner'),
  requireVerifiedOwner,
  idempotency,
  handleUpload,
  c.create
);

// OWNER: Edit equipment
router.put(
  '/:id',
  requireAuth,
  requireRole('owner'),
  requireVerifiedOwner,
  handleUpload,
  c.update
);

// OWNER: Archive equipment
router.patch(
  '/:id/archive',
  requireAuth,
  requireRole('owner'),
  requireVerifiedOwner,
  c.archive
);

// OWNER: Restore equipment
router.patch(
  '/:id/restore',
  requireAuth,
  requireRole('owner'),
  requireVerifiedOwner,
  c.restore
);

// ADMIN: Approve or reject equipment
router.patch(
  '/:id/approval',
  requireAuth,
  requireRole('admin'),
  c.setApproval
);

// FARMER: View payment instructions for this equipment's owner
router.get('/:id/payment-details', requireAuth, requireRole('farmer'), c.getPaymentDetails);

// PUBLIC: View one equipment
router.get('/:id', c.getOne);

module.exports = router;
