const path = require('path');
const fs = require('fs');
const db = require('../db');
const { notifyUser } = require('../services/notifications');

async function downloadBookingProof(req, res) {
  try {
    const [rows] = await db.query(
      `SELECT p.proof_image, r.farmer_id, e.owner_id
       FROM booking_payments p JOIN rental_requests r ON r.id = p.booking_id
       JOIN equipment e ON e.id = r.equipment_id WHERE p.id = ?`, [req.params.id]);
    if (!rows.length || !rows[0].proof_image) return res.status(404).json({ success: false, error: 'Payment proof not found.' });
    const record = rows[0];
    const allowed = req.user.role === 'admin' ||
      (req.user.role === 'farmer' && Number(record.farmer_id) === Number(req.user.id)) ||
      (req.user.role === 'owner' && Number(record.owner_id) === Number(req.user.id));
    if (!allowed) return res.status(403).json({ success: false, error: 'You cannot access this payment proof.' });
    const proofRoot = process.env.PAYMENT_PROOF_DIR
      ? path.resolve(process.env.PAYMENT_PROOF_DIR)
      : path.resolve(__dirname, '..', '..', 'uploads', 'payment-proofs');
    const uploadsRoot = path.dirname(proofRoot);
    const filePath = path.resolve(uploadsRoot, record.proof_image);
    if (!filePath.startsWith(proofRoot + path.sep) || !fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, error: 'Payment proof file is unavailable.' });
    }
    return res.sendFile(filePath);
  } catch (error) {
    console.error('Download payment proof:', error);
    return res.status(500).json({ success: false, error: 'Unable to open payment proof.' });
  }
}


// Owner UI identifies a booking by rental_requests.id, not booking_payments.id.
async function downloadBookingProofForOwner(req, res) {
  try {
    const [rows] = await db.query(
      `SELECT p.proof_image, r.farmer_id, e.owner_id
       FROM booking_payments p
       JOIN rental_requests r ON r.id = p.booking_id
       JOIN equipment e ON e.id = r.equipment_id
       WHERE p.booking_id = ? ORDER BY p.id DESC LIMIT 1`, [req.params.id]);
    if (!rows.length || !rows[0].proof_image) return res.status(404).json({ success: false, error: 'Payment proof not found.' });
    const record = rows[0];
    if (Number(record.owner_id) !== Number(req.user.id)) return res.status(403).json({ success: false, error: 'You cannot access this payment proof.' });
    const proofRoot = process.env.PAYMENT_PROOF_DIR
      ? path.resolve(process.env.PAYMENT_PROOF_DIR)
      : path.resolve(__dirname, '..', '..', 'uploads', 'payment-proofs');
    const uploadsRoot = path.dirname(proofRoot);
    const filePath = path.resolve(uploadsRoot, record.proof_image);
    if (!filePath.startsWith(proofRoot + path.sep) || !fs.existsSync(filePath)) return res.status(404).json({ success: false, error: 'Payment proof file is unavailable.' });
    return res.sendFile(filePath);
  } catch (error) {
    console.error('Download owner booking proof:', error);
    return res.status(500).json({ success: false, error: 'Unable to open payment proof.' });
  }
}

// PATCH /api/owner/bookings/:id/payment - ang owner ang nagkukumpirma na natanggap na ang CASH.
// Sa cash, sa owner ibinibigay ang bayad (hindi dumadaan sa admin), kaya ang owner ang may alam kung bayad na.
// Ang GCash/bank/other ay nire-review din ng owner (tingnan ang reviewOnlinePayment).
async function confirmCashReceived(req, res) {
  try {
    const [rows] = await db.query(
      `SELECT p.id AS payment_id, p.payment_method, p.payment_status,
              r.id AS booking_id, r.status AS booking_status, r.farmer_id, e.owner_id
       FROM booking_payments p
       JOIN rental_requests r ON r.id = p.booking_id
       JOIN equipment e ON e.id = r.equipment_id
       WHERE p.booking_id = ? ORDER BY p.id DESC LIMIT 1`, [req.params.id]);
    if (!rows.length || Number(rows[0].owner_id) !== Number(req.user.id)) {
      return res.status(404).json({ success: false, error: 'Booking payment not found.' });
    }
    const record = rows[0];
    if (record.payment_method !== 'cash') {
      return res.status(400).json({ success: false, error: 'Mark cash received only applies to cash payments. Verify or reject the proof for GCash, bank, and other payments.' });
    }
    if (!['approved', 'ongoing', 'completed'].includes(record.booking_status)) {
      return res.status(409).json({ success: false, error: 'Approve the booking first, then confirm the cash you received.' });
    }
    const [result] = await db.query(
      `UPDATE booking_payments SET payment_status = 'verified', verified_by = ?, payment_date = NOW()
       WHERE id = ? AND payment_method = 'cash' AND payment_status = 'pending'`, [req.user.id, record.payment_id]);
    if (!result.affectedRows) {
      return res.status(409).json({ success: false, error: 'This cash payment was already confirmed.' });
    }
    try { await notifyUser(record.farmer_id, 'Cash payment received', `The owner confirmed your cash payment for booking #${record.booking_id}.`, '/farmer/transactions'); } catch (notificationError) { console.error('Cash payment notification failed:', notificationError); }
    res.json({ success: true, message: 'Cash payment marked as received.' });
  } catch (error) {
    console.error('Confirm cash payment:', error);
    res.status(500).json({ success: false, error: 'Unable to confirm the cash payment.' });
  }
}


// PATCH /api/owner/bookings/:id/payment { action }
// - cash_received: owner confirms the cash he received
// - verify | reject: owner reviews the GCash/bank/other proof the farmer uploaded
// Ang owner ang tumatanggap ng pera, kaya siya rin ang nagve-verify. Wala nang admin sa booking payments.
async function updateOwnerPayment(req, res) {
  const action = String(req.body?.action || '').toLowerCase();
  if (action === 'verify' || action === 'reject') return reviewOnlinePayment(req, res, action);
  return confirmCashReceived(req, res);
}

async function reviewOnlinePayment(req, res, action) {
  try {
    const [rows] = await db.query(
      `SELECT p.id AS payment_id, p.payment_method, p.payment_status, p.proof_image, p.reference_number,
              r.id AS booking_id, r.status AS booking_status, r.farmer_id, e.owner_id
       FROM booking_payments p
       JOIN rental_requests r ON r.id = p.booking_id
       JOIN equipment e ON e.id = r.equipment_id
       WHERE p.booking_id = ? ORDER BY p.id DESC LIMIT 1`, [req.params.id]);
    if (!rows.length || Number(rows[0].owner_id) !== Number(req.user.id)) {
      return res.status(404).json({ success: false, error: 'Booking payment not found.' });
    }
    const record = rows[0];
    if (record.payment_method === 'cash') {
      return res.status(400).json({ success: false, error: 'Cash payments are confirmed with Mark cash received, not with proof review.' });
    }
    if (['rejected', 'cancelled'].includes(record.booking_status)) {
      return res.status(409).json({ success: false, error: 'This booking is no longer active, so there is no payment to review.' });
    }
    if (action === 'verify' && !record.proof_image && !record.reference_number) {
      return res.status(409).json({ success: false, error: 'The farmer has not uploaded a proof of payment yet.' });
    }
    const status = action === 'verify' ? 'verified' : 'rejected';
    const [result] = await db.query(
      `UPDATE booking_payments SET payment_status = ?, verified_by = ?, payment_date = NOW()
       WHERE id = ? AND payment_method <> 'cash' AND payment_status = 'pending'`, [status, req.user.id, record.payment_id]);
    if (!result.affectedRows) {
      return res.status(409).json({ success: false, error: 'This payment was already reviewed.' });
    }
    const title = status === 'verified' ? 'Payment verified' : 'Payment proof rejected';
    const message = status === 'verified'
      ? `The owner verified your payment for booking #${record.booking_id}.`
      : `The owner rejected your payment proof for booking #${record.booking_id}. Please contact the owner.`;
    try { await notifyUser(record.farmer_id, title, message, '/farmer/transactions'); } catch (notificationError) { console.error('Payment notification failed:', notificationError); }
    res.json({ success: true, message: status === 'verified' ? 'Payment verified.' : 'Payment proof rejected.' });
  } catch (error) {
    console.error('Review online payment:', error);
    res.status(500).json({ success: false, error: 'Unable to review the payment.' });
  }
}

module.exports = { downloadBookingProof, downloadBookingProofForOwner, confirmCashReceived, reviewOnlinePayment, updateOwnerPayment };
