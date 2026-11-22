const db = require('../db');

async function columns(table) {
  const [rows] = await db.execute(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`,
    [table]
  );
  return new Set(rows.map(row => row.COLUMN_NAME));
}

function expression(alias, available, candidates, output, fallback = 'NULL') {
  const column = candidates.find(name => available.has(name));
  return column ? `${alias}.\`${column}\` AS \`${output}\`` : `${fallback} AS \`${output}\``;
}

async function getRentals(req, res, next) {
  try {
    const c = await columns('rental_requests');
    if (!c.size) {
      return res.status(503).json({ success: false, message: 'The rental_requests table is not available in the connected database.', data: [] });
    }
    const userColumns = await columns('users');
    const equipmentColumns = await columns('equipment');
    const joins = [];
    if (c.has('farmer_id') && userColumns.has('id')) {
      joins.push('LEFT JOIN users farmer ON farmer.id = rr.farmer_id');
    }
    if (c.has('equipment_id') && equipmentColumns.has('id')) {
      joins.push('LEFT JOIN equipment e ON e.id = rr.equipment_id');
      if (equipmentColumns.has('owner_id')) joins.push('LEFT JOIN users owner ON owner.id = e.owner_id');
    }
    // Ang payment method/status ay nasa booking_payments (wala sa rental_requests), kaya kailangan ang join na ito.
    const paymentColumns = await columns('booking_payments');
    const hasPayments = paymentColumns.has('booking_id') && paymentColumns.has('payment_method') && c.has('id');
    if (hasPayments) joins.push('LEFT JOIN booking_payments bp ON bp.id = (SELECT MAX(bp2.id) FROM booking_payments bp2 WHERE bp2.booking_id = rr.id)');
    const startField = ['start_at', 'start_date'].find(name => c.has(name));
    const endField = ['end_at', 'end_date'].find(name => c.has(name));
    const where = [];
    const params = [];
    if (req.query.status && c.has('status')) {
      const allowed = ['pending', 'approved', 'rejected', 'ongoing', 'completed', 'cancelled'];
      if (!allowed.includes(req.query.status)) return res.status(400).json({ success: false, message: 'Invalid rental status.' });
      where.push('rr.status = ?'); params.push(req.query.status);
    }
    const dateFrom = typeof req.query.date_from === 'string' ? req.query.date_from : '';
    const dateTo = typeof req.query.date_to === 'string' ? req.query.date_to : '';
    const validDate = value => /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));
    if (dateFrom && !validDate(dateFrom)) return res.status(400).json({ success: false, message: 'Invalid start date filter.' });
    if (dateTo && !validDate(dateTo)) return res.status(400).json({ success: false, message: 'Invalid end date filter.' });
    if (dateFrom && dateTo && dateFrom > dateTo) return res.status(400).json({ success: false, message: 'Start date cannot be later than end date.' });
    if (startField && dateFrom) { where.push(`DATE(rr.\`${startField}\`) >= ?`); params.push(dateFrom); }
    if (startField && dateTo) { where.push(`DATE(rr.\`${startField}\`) <= ?`); params.push(dateTo); }
    const ownerSearch = typeof req.query.owner === 'string' ? req.query.owner.trim() : '';
    if (ownerSearch && equipmentColumns.has('owner_id') && userColumns.has('full_name') && c.has('equipment_id')) {
      where.push('(owner.full_name LIKE ? OR CAST(owner.id AS CHAR) = ?)');
      params.push(`%${ownerSearch}%`, ownerSearch);
    }
    const order = c.has('created_at') ? 'rr.created_at DESC' : c.has('id') ? 'rr.id DESC' : '1';
    const select = [
      expression('rr', c, ['id'], 'id'),
      expression('rr', c, ['status'], 'status'),
      expression('rr', c, ['total_amount'], 'total_amount'),
      hasPayments ? 'bp.payment_method AS payment_method' : expression('rr', c, ['payment_method', 'method'], 'payment_method'),
      hasPayments && paymentColumns.has('payment_status') ? 'bp.payment_status AS payment_status' : 'NULL AS payment_status',
      expression('rr', c, ['created_at'], 'created_at'),
      startField ? `rr.\`${startField}\` AS start_at` : 'NULL AS start_at',
      endField ? `rr.\`${endField}\` AS end_at` : 'NULL AS end_at',
      c.has('farmer_id') && userColumns.has('full_name') ? 'farmer.full_name AS farmer_name' : 'NULL AS farmer_name',
      equipmentColumns.has('equipment_name') && c.has('equipment_id') ? 'e.equipment_name AS equipment_name' :
        equipmentColumns.has('name') && c.has('equipment_id') ? 'e.name AS equipment_name' : 'NULL AS equipment_name',
      equipmentColumns.has('owner_id') && userColumns.has('full_name') && c.has('equipment_id') ? 'owner.full_name AS owner_name' : 'NULL AS owner_name'
    ];
    const sql = `SELECT ${select.join(', ')} FROM rental_requests rr ${joins.join(' ')}
      ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
      ORDER BY ${order}`;
    const [rows] = await db.query(sql, params);
    return res.json({ success: true, data: rows });
  } catch (error) { next(error); }
}

async function getSubscriptions(req, res, next) {
  try {
    const subCols = await columns('subscriptions');
    const planCols = await columns('subscription_plans');
    const userCols = await columns('users');
    let plans = [], subscriptions = [], payments = [];
    if (planCols.size) {
      const planName = planCols.has('plan_name') ? 'plan_name' : 'name';
      const [rows] = await db.query(
        `SELECT id, \`${planName}\` AS plan_name, price, duration_days, equipment_limit, ${planCols.has('description') ? 'description' : 'NULL AS description'}, ${planCols.has('is_active') ? 'is_active' : '1 AS is_active'} FROM subscription_plans ORDER BY price ASC`
      );
      plans = rows;
    }
    if (subCols.size) {
      const joins = [];
      if (subCols.has('owner_id') && userCols.has('id')) joins.push('LEFT JOIN users u ON u.id = s.owner_id');
      if (subCols.has('plan_id') && planCols.has('id')) joins.push('LEFT JOIN subscription_plans p ON p.id = s.plan_id');
      const planName = planCols.has('plan_name') ? 'p.plan_name' : planCols.has('name') ? 'p.name' : 'NULL';
      const start = subCols.has('start_date') ? 's.start_date' : subCols.has('starts_at') ? 's.starts_at' : 'NULL';
      const end = subCols.has('end_date') ? 's.end_date' : subCols.has('ends_at') ? 's.ends_at' : 'NULL';
      const [rows] = await db.query(`SELECT s.id, s.owner_id, s.plan_id,
        ${subCols.has('subscription_type') ? 's.subscription_type' : 'NULL'} AS subscription_type,
        ${subCols.has('status') ? 's.status' : 'NULL'} AS status,
        ${start} AS starts_at, ${end} AS ends_at,
        ${subCols.has('created_at') ? 's.created_at' : 'NULL'} AS created_at,
        ${userCols.has('full_name') && subCols.has('owner_id') ? 'u.full_name' : 'NULL'} AS owner_name,
        ${subCols.has('plan_id') ? planName : 'NULL'} AS plan_name,
        ${planCols.has('price') ? 'p.price' : 'NULL'} AS price
        FROM subscriptions s ${joins.join(' ')} ORDER BY ${subCols.has('created_at') ? 's.created_at DESC' : 's.id DESC'}`);
      subscriptions = rows;
    }
    const payCols = await columns('subscription_payments');
    if (payCols.size) {
      const joins = [];
      if (payCols.has('subscription_id') && subCols.has('id')) joins.push('LEFT JOIN subscriptions s ON s.id = sp.subscription_id');
      if (subCols.has('owner_id') && payCols.has('subscription_id') && subCols.has('id')) joins.push('LEFT JOIN users u ON u.id = s.owner_id');
      const canPlan = planCols.size && subCols.has('plan_id') && payCols.has('subscription_id') && subCols.has('id');
      if (canPlan) joins.push('LEFT JOIN subscription_plans pl ON pl.id = s.plan_id');
      const payPlanName = planCols.has('plan_name') ? 'pl.plan_name' : planCols.has('name') ? 'pl.name' : 'NULL';
      const [rows] = await db.query(`SELECT sp.id,
        ${canPlan ? payPlanName : 'NULL'} AS plan_name,
        ${canPlan && planCols.has('duration_days') ? 'pl.duration_days' : 'NULL'} AS duration_days,
        ${payCols.has('rejection_reason') ? 'sp.rejection_reason' : 'NULL'} AS rejection_reason,
        ${subCols.has('status') && payCols.has('subscription_id') ? 's.status' : 'NULL'} AS subscription_status,
        ${payCols.has('subscription_id') ? 'sp.subscription_id' : 'NULL'} AS subscription_id,
        ${payCols.has('amount') ? 'sp.amount' : 'NULL'} AS amount,
        ${payCols.has('payment_method') ? 'sp.payment_method' : 'NULL'} AS payment_method,
        ${payCols.has('reference_number') ? 'sp.reference_number' : 'NULL'} AS reference,
        ${payCols.has('proof_image') ? 'sp.proof_image' : 'NULL'} AS proof_image,
        ${payCols.has('payment_status') ? 'sp.payment_status' : 'NULL'} AS status,
        ${payCols.has('payment_date') ? 'sp.payment_date' : 'NULL'} AS created_at,
        ${subCols.has('owner_id') && payCols.has('subscription_id') ? 's.owner_id' : 'NULL'} AS owner_id,
        ${userCols.has('full_name') && subCols.has('owner_id') && payCols.has('subscription_id') ? 'u.full_name' : 'NULL'} AS owner_name
        FROM subscription_payments sp ${joins.join(' ')} ORDER BY sp.id DESC`);
      payments = rows;
    }
    return res.json({ success: true, subscriptionsConfigured: subCols.size > 0,
      paymentsConfigured: payCols.size > 0, plans, subscriptions, payments });
  } catch (error) { next(error); }
}

async function getProfile(req, res, next) {
  try {
    const [rows] = await db.execute(
      `SELECT id, full_name, email, phone, role, status, created_at
       FROM users WHERE id = ? AND role = 'admin' LIMIT 1`,
      [req.user.id]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Admin account not found.' });
    return res.json({ success: true, data: rows[0] });
  } catch (error) { next(error); }
}

async function updateProfile(req, res, next) {
  try {
    const fullName = typeof req.body.full_name === 'string' ? req.body.full_name.trim() : '';
    const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const phone = typeof req.body.phone === 'string' ? req.body.phone.trim() : '';
    if (fullName.length < 2 || fullName.length > 120) return res.status(400).json({ success: false, message: 'Full name must be 2 to 120 characters.' });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 190) return res.status(400).json({ success: false, message: 'Enter a valid email address.' });
    if (phone.length > 20) return res.status(400).json({ success: false, message: 'Phone number is too long.' });
    const [existing] = await db.execute('SELECT id FROM users WHERE email = ? AND id <> ? LIMIT 1', [email, req.user.id]);
    if (existing.length) return res.status(409).json({ success: false, message: 'Email is already used by another account.' });
    await db.execute(
      `UPDATE users SET full_name = ?, email = ?, phone = ?
       WHERE id = ? AND role = 'admin'`,
      [fullName, email, phone || null, req.user.id]
    );
    const [rows] = await db.execute(
      `SELECT id, full_name, email, phone, role, status, created_at
       FROM users WHERE id = ? AND role = 'admin' LIMIT 1`,
      [req.user.id]
    );
    return res.json({ success: true, message: 'Admin profile updated.', data: rows[0] });
  } catch (error) { next(error); }
}

async function getNotifications(req, res, next) {
  try {
    const [rows] = await db.execute(
      `SELECT id, title, message, action_url, is_read, created_at
       FROM notifications WHERE user_id = ?
       ORDER BY created_at DESC LIMIT 100`,
      [req.user.id]
    );
    return res.json({ success: true, data: rows });
  } catch (error) { next(error); }
}

async function markNotificationRead(req, res, next) {
  try {
    const [result] = await db.execute(
      `UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?`,
      [Number(req.params.id), req.user.id]
    );
    if (!result.affectedRows) return res.status(404).json({ success: false, message: 'Notification not found.' });
    return res.json({ success: true, message: 'Notification marked as read.' });
  } catch (error) { next(error); }
}

async function markAllNotificationsRead(req, res, next) {
  try {
    await db.execute('UPDATE notifications SET is_read = 1 WHERE user_id = ?', [req.user.id]);
    return res.json({ success: true, message: 'All notifications marked as read.' });
  } catch (error) { next(error); }
}

module.exports = {
  getRentals, getSubscriptions, getProfile, updateProfile,
  getNotifications, markNotificationRead, markAllNotificationsRead,
  verifySubscriptionPayment: require('./subscriptionController').verifyPayment
};

// Complete activity history. This reads the existing activity_logs table and
// resolves the account behind each event so the admin can identify the actor.
async function getActivity(req, res, next) {
  try {
    const logCols = await columns('activity_logs');
    if (!logCols.size) return res.json({ success: true, data: [], configured: false });
    const userCols = await columns('users');
    const joins = logCols.has('user_id') && userCols.has('id')
      ? 'LEFT JOIN users u ON u.id = al.user_id' : '';
    const actor = userCols.has('full_name') ? 'u.full_name'
      : userCols.has('name') ? 'u.name'
      : userCols.has('email') ? 'u.email' : 'NULL';
    const role = userCols.has('role') ? 'u.role' : 'NULL';
    const created = logCols.has('created_at') ? 'al.created_at' : 'NULL';
    const action = logCols.has('action') ? 'al.action' : "'System event'";
    const id = logCols.has('id') ? 'al.id' : '0';
    const userId = logCols.has('user_id') ? 'al.user_id' : 'NULL';
    const order = logCols.has('created_at') ? 'al.created_at DESC' : logCols.has('id') ? 'al.id DESC' : '1';
    const [rows] = await db.query(
      `SELECT ${id} AS id, ${userId} AS user_id, ${actor} AS actor_name,
       ${role} AS actor_role, ${action} AS action, ${created} AS created_at
       FROM activity_logs al ${joins} ORDER BY ${order}`
    );
    return res.json({ success: true, data: rows, configured: true });
  } catch (error) { next(error); }
}

// Rental sales from verified booking payments only.
async function getReportRentalPayments(req, res, next) {
  try {
    const paymentCols = await columns('booking_payments');
    const rentalCols = await columns('rental_requests');
    const equipmentCols = await columns('equipment');
    const userCols = await columns('users');

    if (!paymentCols.size || !rentalCols.size) {
      return res.json({
        success: true,
        data: [],
        configured: false
      });
    }

    const joins = [
      'LEFT JOIN rental_requests rr ON rr.id = bp.booking_id'
    ];

    if (rentalCols.has('farmer_id') && userCols.has('id')) {
      joins.push('LEFT JOIN users farmer ON farmer.id = rr.farmer_id');
    }

    if (rentalCols.has('equipment_id') && equipmentCols.has('id')) {
      joins.push('LEFT JOIN equipment e ON e.id = rr.equipment_id');

      if (equipmentCols.has('owner_id') && userCols.has('id')) {
        joins.push('LEFT JOIN users owner ON owner.id = e.owner_id');
      }
    }

    const farmerName = userCols.has('full_name')
      ? 'farmer.full_name'
      : userCols.has('name') ? 'farmer.name' : 'NULL';

    const ownerName = userCols.has('full_name')
      ? 'owner.full_name'
      : userCols.has('name') ? 'owner.name' : 'NULL';

    const equipmentName = equipmentCols.has('equipment_name')
      ? 'e.equipment_name'
      : equipmentCols.has('name') ? 'e.name' : 'NULL';

    const [rows] = await db.query(`
      SELECT
        bp.id,
        bp.booking_id AS rental_id,
        rr.total_amount AS amount,
        bp.payment_method AS method,
        bp.payment_date AS paid_at,
        rr.total_amount,
        ${farmerName} AS farmer_name,
        ${ownerName} AS owner_name,
        ${equipmentName} AS equipment_name,
        bp.payment_status AS payment_status
      FROM booking_payments bp
      ${joins.join(' ')}
      WHERE bp.payment_status = 'verified'
      ORDER BY
        COALESCE(bp.payment_date, bp.created_at) DESC,
        bp.id DESC
    `);

    return res.json({
      success: true,
      data: rows,
      configured: true
    });
  } catch (error) {
    next(error);
  }
}

module.exports.getActivity = getActivity;
module.exports.getReportRentalPayments = getReportRentalPayments;
