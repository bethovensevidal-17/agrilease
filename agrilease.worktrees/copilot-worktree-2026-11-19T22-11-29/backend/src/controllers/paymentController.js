const path = require('path');
const fs = require('fs');
const db = require('../db');
const { notifyUser } = require('../services/notifications');

async function verifyBookingPayment(req, res) {
  const status = String(req.body.payment_status || req.body.status || '').toLowerCase();
  if (!['verified', 'rejected'].includes(status)) {
    return res.status(400).json({ success: false, error: 'Payment status must be verified or rejected.' });
  }
  try {
    const [paymentRows] = await db.query(
      `SELECT r.farmer_id, e.owner_id, r.id AS booking_id FROM booking_payments p JOIN rental_requests r ON r.id = p.booking_id JOIN equipment e ON e.id = r.equipment_id WHERE p.id = ?`, [req.params.id]);
    if (!paymentRows.length) return res.status(404).json({ success: false, error: 'Payment record not found.' });
    const [result] = await db.query(
      `UPDATE booking_payments SET payment_status = ?, verified_by = ?, payment_date = NOW()
       WHERE id = ? AND payment_status = 'pending'`, [status, req.user.id, req.params.id]);
    if (!result.affectedRows) return res.status(409).json({ success: false, error: 'Payment record not found or has already been reviewed.' });
    try { await notifyUser(paymentRows[0].farmer_id, `Payment ${status}`, `Your payment for booking #${paymentRows[0].booking_id} has been ${status}.`); } catch (notificationError) { console.error('Payment notification failed:', notificationError); }
    res.json({ success: true, message: `Payment ${status}.` });
  } catch (error) {
    console.error('Verify booking payment:', error);
    res.status(500).json({ success: false, error: 'Unable to update payment verification.' });
  }
}

async function listBookingPayments(req, res) {
  try {
    const [rows] = await db.query(
      `SELECT p.*, p.reference_number AS payment_reference, p.proof_image AS payment_proof, r.farmer_id, r.equipment_id, r.total_amount, r.status AS booking_status,
              e.equipment_name, u.full_name AS farmer_name
       FROM booking_payments p JOIN rental_requests r ON r.id = p.booking_id
       JOIN equipment e ON e.id = r.equipment_id JOIN users u ON u.id = r.farmer_id
       ORDER BY p.created_at DESC`);
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('List booking payments:', error);
    res.status(500).json({ success: false, error: 'Unable to retrieve booking payments.' });
  }
}


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
    const filePath = path.resolve(__dirname, '..', '..', 'uploads', record.proof_image);
    if (!filePath.startsWith(path.resolve(__dirname, '..', '..', 'uploads', 'payment-proofs') + path.sep) || !fs.existsSync(filePath)) {
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
    const uploadsRoot = path.resolve(__dirname, '..', '..', 'uploads');
    const proofRoot = path.join(uploadsRoot, 'payment-proofs') + path.sep;
    const filePath = path.resolve(uploadsRoot, record.proof_image);
    if (!filePath.startsWith(proofRoot) || !fs.existsSync(filePath)) return res.status(404).json({ success: false, error: 'Payment proof file is unavailable.' });
    return res.sendFile(filePath);
  } catch (error) {
    console.error('Download owner booking proof:', error);
    return res.status(500).json({ success: false, error: 'Unable to open payment proof.' });
  }
}

module.exports = { verifyBookingPayment, listBookingPayments, downloadBookingProof, downloadBookingProofForOwner };
