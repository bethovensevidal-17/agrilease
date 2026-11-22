const fs = require('fs/promises');
const db = require('../db');
const { calculateRentalTotal } = require('../utils/pricing');
const { notifyUser, notifyAdmins } = require('../services/notifications');
const { ownerHasCoverage } = require('../services/subscriptionAccess');

const PAYMENT_METHODS = ['cash', 'gcash', 'bank_transfer', 'other'];
const BOOKING_STATUSES = ['pending', 'approved', 'ongoing', 'completed', 'rejected', 'cancelled'];
const pad = (n) => String(n).padStart(2, '0');
function toSqlDateTime(value) {
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}
function parseDateTime(body, prefix) {
  const direct = body[`${prefix}_at`];
  if (direct) return new Date(direct);
  const date = body[`${prefix}_date`];
  const time = body[`${prefix}_time`];
  if (!date || !time) return null;
  return new Date(`${date}T${time}:00`);
}
function publicError(res, status, error) { return res.status(status).json({ success: false, error }); }

// GET /api/rentals/mine - Farmer's own bookings
async function listMine(req, res) {
  try {
    const [rows] = await db.query(
      `SELECT r.*, r.quantity AS rental_quantity, r.rental_rate_snapshot AS rate_snapshot,
              e.equipment_name, e.brand_model, e.location, e.image_path,
              e.rental_rate, e.rate_type, p.id AS payment_id, p.payment_method,
              p.reference_number AS payment_reference, p.proof_image AS payment_proof,
              p.payment_status
       FROM rental_requests r
       JOIN equipment e ON e.id = r.equipment_id
       LEFT JOIN booking_payments p ON p.booking_id = r.id
             WHERE r.farmer_id = ? AND r.is_archived_by_farmer = ? ORDER BY r.created_at DESC`,
      [req.user.id, req.query.archived === '1' ? 1 : 0]);
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('List farmer bookings:', error);
    publicError(res, 500, 'Unable to load booking records. Make sure the booking database migration has been applied.');
  }
}

// POST /api/rentals - server-authoritative booking creation
async function create(req, res) {
  let connection;
  let keepUploadedProof = false;
  try {
    const farmerId = req.user.id;
    const equipmentId = Number(req.body.equipment_id);
    const quantity = Number(req.body.quantity ?? req.body.rental_quantity ?? 1);
    const paymentMethod = String(req.body.payment_method || '').toLowerCase();
    const start = parseDateTime(req.body, 'start');
    const end = parseDateTime(req.body, 'end');
    const farmArea = req.body.farm_area ?? req.body.hectares ?? null;

    if (!Number.isInteger(equipmentId) || equipmentId < 1) return publicError(res, 400, 'Select valid equipment.');
    if (!start || !end || Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return publicError(res, 400, 'A valid start and end date/time are required.');
    if (start < new Date()) return publicError(res, 400, 'A rental cannot start in the past.');
    if (end <= start) return publicError(res, 400, 'The end date/time must be later than the start date/time.');
    if (!Number.isInteger(quantity) || quantity < 1) return publicError(res, 400, 'Quantity must be at least 1.');
    if (!PAYMENT_METHODS.includes(paymentMethod)) return publicError(res, 400, 'Select a valid payment method.');
    if (paymentMethod !== 'cash') {
      if (!String(req.body.payment_reference || '').trim()) return publicError(res, 400, 'A payment reference number is required.');
      if (!req.file) return publicError(res, 400, 'Proof of payment must be uploaded (JPG, PNG, WEBP; maximum 5 MB).');
    }

    connection = await db.getConnection();
    await connection.beginTransaction();

    const [equipmentRows] = await connection.query(
      `SELECT id, owner_id, rental_rate, rate_type, quantity, availability_status, approval_status, is_archived
       FROM equipment WHERE id = ? FOR UPDATE`, [equipmentId]);
    if (!equipmentRows.length) { await connection.rollback(); return publicError(res, 404, 'Equipment not found.'); }
    const equipment = equipmentRows[0];
    if (paymentMethod !== 'cash') {
      const [ownerPaymentRows] = await connection.query(
        `SELECT gcash_number, gcash_account_name, bank_name, bank_account_name,
                bank_account_number, other_payment_instructions
           FROM provider_profiles WHERE user_id = ? LIMIT 1`,
        [equipment.owner_id]
      );
      const ownerPayment = ownerPaymentRows[0] || {};
      const configured = paymentMethod === 'gcash'
        ? Boolean(ownerPayment.gcash_number && ownerPayment.gcash_account_name)
        : paymentMethod === 'bank_transfer'
          ? Boolean(ownerPayment.bank_name && ownerPayment.bank_account_name && ownerPayment.bank_account_number)
          : Boolean(ownerPayment.other_payment_instructions);
      if (!configured) {
        await connection.rollback();
        const labels = { gcash: 'GCash', bank_transfer: 'Bank Transfer', other: 'Other payment' };
        return publicError(res, 409, `The equipment owner has not set up ${labels[paymentMethod]} details yet. Choose another payment method or contact the owner.`);
      }
    }
    if (Number(equipment.owner_id) === farmerId) { await connection.rollback(); return publicError(res, 400, 'You cannot rent your own equipment.'); }
    if (equipment.approval_status !== 'approved' || equipment.availability_status !== 'available' || Number(equipment.is_archived) === 1) {
      await connection.rollback(); return publicError(res, 409, 'The equipment is unavailable or has not been approved yet.');
    }
    if (!await ownerHasCoverage(connection, equipment.owner_id)) {
      await connection.rollback();
      return publicError(res, 409, 'This equipment is temporarily unavailable for booking because the owner\'s subscription is inactive.');
    }
    const availableQuantity = Number(equipment.quantity);

    if (!Number.isInteger(availableQuantity) || availableQuantity < 1) {
      await connection.rollback();
      return publicError(res, 409, 'No equipment quantity is available.');
    }

    if (quantity > availableQuantity) {
      await connection.rollback();
      return publicError(res, 400, `The maximum available quantity is ${availableQuantity}.`);
    }

    // Check overlapping confirmed bookings and reserve only the remaining quantity.
    const startSql = toSqlDateTime(start);
    const endSql = toSqlDateTime(end);
    const [overlaps] = await connection.query(
      `SELECT COALESCE(SUM(quantity), 0) AS reserved
       FROM rental_requests WHERE equipment_id = ? AND status IN ('approved','ongoing')
       AND start_date < ? AND end_date > ?`, [equipmentId, endSql, startSql]);
    const remaining = availableQuantity - Number(overlaps[0].reserved || 0);
    if (quantity > remaining) { await connection.rollback(); return publicError(res, 409, `Not enough quantity is available for the selected schedule. Remaining: ${Math.max(0, remaining)}.`); }

    let total;
    try {
      total = calculateRentalTotal({ rate: equipment.rental_rate, rateType: equipment.rate_type, start, end, quantity, farmArea });
    } catch (error) {
      await connection.rollback(); return publicError(res, 400, error.message);
    }

    const [insert] = await connection.query(
      `INSERT INTO rental_requests
       (farmer_id, equipment_id, quantity, start_date, end_date, farm_area, total_amount, rental_rate_snapshot, rate_type_snapshot, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
      [farmerId, equipmentId, quantity, startSql, endSql, equipment.rate_type === 'hectare' ? Number(farmArea) : null,
       total, equipment.rental_rate, equipment.rate_type]);

    const proofPath =
      paymentMethod !== 'cash' && req.file
        ? `payment-proofs/${req.file.filename}`
        : null;
    await connection.query(
      `INSERT INTO booking_payments (booking_id, payment_method, reference_number, proof_image, payment_status)
       VALUES (?, ?, ?, ?, 'pending')`,
      [insert.insertId, paymentMethod, paymentMethod === 'cash' ? null : String(req.body.payment_reference).trim(), proofPath]);

    await connection.commit();
    keepUploadedProof = Boolean(proofPath);
    // Notify equipment owner and administrators after the booking is safely committed.
    try {
      await notifyUser(equipment.owner_id, 'New booking request', `A farmer submitted booking #${insert.insertId}.`, '/owner/bookings');
      await notifyAdmins('New booking request', `Booking #${insert.insertId} has been submitted and is waiting for owner review.`, '/admin/reports');
    } catch (notificationError) { console.error('Booking notification failed:', notificationError); }
    const [created] = await db.query(
      `SELECT r.*, r.quantity AS rental_quantity, e.equipment_name, e.brand_model, p.payment_method, p.reference_number AS payment_reference, p.proof_image AS payment_proof, p.payment_status
       FROM rental_requests r JOIN equipment e ON e.id = r.equipment_id
       LEFT JOIN booking_payments p ON p.booking_id = r.id WHERE r.id = ?`, [insert.insertId]);
    return res.status(201).json({ success: true, message: 'Booking request submitted. Waiting for owner approval.', data: created[0] });
  } catch (error) {
    if (connection) await connection.rollback();
    if (error.code === 'ER_DUP_ENTRY') return publicError(res, 409, 'This booking request has already been submitted.');
    console.error('Create booking error:', error);
    return publicError(res, 500, 'An error occurred while saving the booking. Make sure the database migration has been applied.');
  } finally {
    if (!keepUploadedProof && req.file?.path) {
      await fs.unlink(req.file.path).catch((error) => {
        if (error.code !== 'ENOENT') {
          console.error('Failed to remove unused payment proof:', error);
        }
      });
    }

    if (connection) connection.release();
  }
}

// GET /api/rentals - role-scoped listing for farmer, owner, admin
async function list(req, res) {
  try {
    const { id, role } = req.user;
    const { status } = req.query;
    let where = '1=1'; const params = [];
    if (role === 'farmer') { where += ' AND r.farmer_id = ?'; params.push(id); }
    else if (role === 'owner') { where += ' AND e.owner_id = ?'; params.push(id); }
    if (status) { if (!BOOKING_STATUSES.includes(status)) return publicError(res, 400, 'Invalid booking status filter.'); where += ' AND r.status = ?'; params.push(status); }
    const [rows] = await db.query(
      `SELECT r.*, r.quantity AS rental_quantity, e.equipment_name, e.brand_model, e.owner_id, u.full_name AS farmer_name,
              p.payment_method, p.reference_number AS payment_reference, p.proof_image AS payment_proof, p.payment_status
       FROM rental_requests r JOIN equipment e ON e.id = r.equipment_id
       JOIN users u ON u.id = r.farmer_id LEFT JOIN booking_payments p ON p.booking_id = r.id
       WHERE ${where} ORDER BY r.created_at DESC`, params);
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('List bookings error:', error);
    publicError(res, 500, 'Unable to load bookings.');
  }
}

async function getOne(req, res) {
  try {
    const [rows] = await db.query(
      `SELECT r.*, r.quantity AS rental_quantity, e.equipment_name, e.brand_model, e.owner_id, e.image_path,
              u.full_name AS farmer_name, p.payment_method, p.reference_number AS payment_reference,
              p.proof_image AS payment_proof, p.payment_status
       FROM rental_requests r JOIN equipment e ON e.id = r.equipment_id
       JOIN users u ON u.id = r.farmer_id LEFT JOIN booking_payments p ON p.booking_id = r.id
       WHERE r.id = ?`, [req.params.id]);
    if (!rows.length) return publicError(res, 404, 'Booking not found.');
    const booking = rows[0];
    const isAllowed = req.user.role === 'admin' ||
      (req.user.role === 'farmer' && Number(booking.farmer_id) === Number(req.user.id)) ||
      (req.user.role === 'owner' && Number(booking.owner_id) === Number(req.user.id));
    if (!isAllowed) return publicError(res, 403, 'You do not have access to this booking.');
    res.json({ success: true, data: booking });
  } catch (error) { console.error('Get booking:', error); publicError(res, 500, 'Unable to load booking details.'); }
}

async function cancel(req, res) {
  try {
    const [result] = await db.query(
      `UPDATE rental_requests SET status = 'cancelled' WHERE id = ? AND farmer_id = ? AND status = 'pending'`,
      [req.params.id, req.user.id]);
    if (!result.affectedRows) return publicError(res, 409, 'Unable to cancel this booking. Only pending bookings can be cancelled.');
    const [ownerRows] = await db.query('SELECT e.owner_id FROM rental_requests r JOIN equipment e ON e.id = r.equipment_id WHERE r.id = ?', [req.params.id]);
    if (ownerRows.length) { try { await notifyUser(ownerRows[0].owner_id, 'Booking cancelled', `Farmer cancelled booking #${req.params.id}.`, '/owner/bookings'); } catch (notificationError) { console.error('Cancellation notification failed:', notificationError); } }
    res.json({ success: true, message: 'Booking cancelled.' });
  } catch (error) { console.error('Cancel booking:', error); publicError(res, 500, 'Unable to cancel the booking.'); }
}

async function updateStatus(req, res) {
  const nextStatus = String(req.body.status || '').toLowerCase();

  if (!['approved', 'rejected'].includes(nextStatus)) {
    return publicError(res, 400, 'Owner may only approve or reject a pending booking.');
  }

  let connection;

  try {
    connection = await db.getConnection();
    await connection.beginTransaction();

    // Get the equipment ID before acquiring locks.
    const [bookingLookup] = await connection.query(
      'SELECT id, equipment_id FROM rental_requests WHERE id = ?',
      [req.params.id]
    );

    if (!bookingLookup.length) {
      await connection.rollback();
      return publicError(res, 404, 'Booking not found.');
    }

    // Lock the equipment first to serialize approvals for the same equipment.
    const [equipmentRows] = await connection.query(
      `SELECT id, owner_id, quantity, availability_status,
              approval_status, is_archived
       FROM equipment
       WHERE id = ?
       FOR UPDATE`,
      [bookingLookup[0].equipment_id]
    );

    if (!equipmentRows.length) {
      await connection.rollback();
      return publicError(res, 404, 'Equipment not found.');
    }

    const equipment = equipmentRows[0];

    // Lock and retrieve the booking after locking its equipment.
    const [rows] = await connection.query(
      `SELECT r.*, r.quantity AS rental_quantity
       FROM rental_requests r
       WHERE r.id = ?
       FOR UPDATE`,
      [req.params.id]
    );

    if (
      !rows.length ||
      Number(equipment.owner_id) !== Number(req.user.id) ||
      rows[0].status !== 'pending'
    ) {
      await connection.rollback();
      return publicError(
        res,
        409,
        'Booking not found, not owned by you, or no longer pending.'
      );
    }

    const booking = rows[0];

    if (nextStatus === 'approved') {
      if (
        equipment.approval_status !== 'approved' ||
        equipment.availability_status !== 'available' ||
        Number(equipment.is_archived) === 1
      ) {
        await connection.rollback();
        return publicError(
          res,
          409,
          'Cannot approve: equipment is no longer available or approved.'
        );
      }

      const availableQuantity = Number(equipment.quantity);
      const requestedQuantity = Number(booking.quantity);

      if (
        !Number.isInteger(availableQuantity) ||
        availableQuantity < 1 ||
        !Number.isInteger(requestedQuantity) ||
        requestedQuantity < 1
      ) {
        await connection.rollback();
        return publicError(res, 409, 'Invalid equipment or booking quantity.');
      }

      const [overlaps] = await connection.query(
        `SELECT COALESCE(SUM(quantity), 0) AS reserved
         FROM rental_requests
         WHERE equipment_id = ?
           AND id <> ?
           AND status IN ('approved', 'ongoing')
           AND start_date < ?
           AND end_date > ?`,
        [
          booking.equipment_id,
          booking.id,
          booking.end_date,
          booking.start_date
        ]
      );

      const reserved = Number(overlaps[0].reserved || 0);
      const remaining = availableQuantity - reserved;

      if (requestedQuantity > remaining) {
        await connection.rollback();
        return publicError(
          res,
          409,
          `Cannot approve: only ${Math.max(0, remaining)} unit(s) remain available for this schedule.`
        );
      }
    }

    await connection.query(
      'UPDATE rental_requests SET status = ? WHERE id = ?',
      [nextStatus, booking.id]
    );

    await connection.commit();

    try {
      await notifyUser(
        booking.farmer_id,
        `Booking ${nextStatus}`,
        `Your booking #${booking.id} has been ${nextStatus} by the equipment owner.`,
        '/farmer/rentals'
      );
    } catch (notificationError) {
      console.error('Status notification failed:', notificationError);
    }

    return res.json({
      success: true,
      message: `Booking ${nextStatus}.`
    });

  } catch (error) {
    if (connection) await connection.rollback();

    console.error('Update booking status:', error);

    return publicError(res, 500, 'Unable to update the booking status.');

  } finally {
    if (connection) connection.release();
  }
}

// PATCH /api/rentals/:id/archive|restore - archive ng farmer lang, hindi apektado ang owner/admin
function setArchived(value) {
  return async (req, res) => {
    try {
      const statusRule = value ? "AND status IN ('completed','cancelled')" : '';
      const [result] = await db.query(
        `UPDATE rental_requests SET is_archived_by_farmer = ?
         WHERE id = ? AND farmer_id = ? ${statusRule}`,
        [value, Number(req.params.id), req.user.id]
      );
      if (!result.affectedRows) return publicError(res, 404, 'Booking not found, or only completed/cancelled bookings can be archived.');
      res.json({ success: true });
    } catch (error) {
      console.error('Archive booking:', error);
      publicError(res, 500, 'Unable to update booking.');
    }
  };
}

const archive = setArchived(1);
const restore = setArchived(0);

module.exports = { listMine, create, list, getOne, cancel, updateStatus, archive, restore };
