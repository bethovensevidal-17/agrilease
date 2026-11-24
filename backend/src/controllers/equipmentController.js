
const db = require('../db');
const { notifyUser, notifyAdmins } = require('../services/notifications');
const { coverageCondition, checkListingAllowance } = require('../services/subscriptionAccess');

const RATE_TYPES = ['hour', 'day', 'hectare'];
const CONDITIONS = ['excellent', 'good', 'fair', 'needs_repair'];
const PAGE_SIZE = 10;

function validate(body) {
  const errors = [];
  const rate = Number(body.rate);

  if (!body.name || String(body.name).trim().length < 2) {
    errors.push('Equipment name is required.');
  }

  if (!Number(body.category_id)) {
    errors.push('Select a category.');
  }

  if (!(rate > 0)) {
    errors.push('The rate must be greater than 0.');
  }

  const quantity = Number(body.available_quantity ?? body.quantity ?? 1);
  if (!Number.isInteger(quantity) || quantity < 1) {
    errors.push('Available quantity must be a whole number of at least 1.');
  }

  if (!RATE_TYPES.includes(body.rate_type)) {
    errors.push('Use hour, day, or hectare.');
  }

  if (!CONDITIONS.includes(body.condition_status)) {
    errors.push('Invalid condition.');
  }

  if (!body.location || String(body.location).trim().length < 2 || String(body.location).trim().length > 255) {
    errors.push('Enter a valid equipment location (2–255 characters).');
  }

  return errors;
}

// PUBLIC: Browse approved and available equipment
async function listPublic(req, res) {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);

  const where = [
    "e.approval_status = 'approved'",
    "e.availability_status = 'available'",
    'e.is_archived = 0',
    // Naka-hide ang listings ng owner na walang active plan (may grace period).
    coverageCondition('e')
  ];

  const params = [];

  if (req.query.q) {
    where.push('(e.equipment_name LIKE ? OR e.brand_model LIKE ?)');
    params.push(`%${req.query.q}%`, `%${req.query.q}%`);
  }

  if (req.query.category_id) {
    where.push('e.category_id = ?');
    params.push(Number(req.query.category_id));
  }

  if (typeof req.query.location === 'string' && req.query.location.trim()) {
    where.push('e.location = ?');
    params.push(req.query.location.trim());
  }

  if (RATE_TYPES.includes(req.query.rate_type)) {
    where.push('e.rate_type = ?');
    params.push(req.query.rate_type);
  }

  const whereSql = where.join(' AND ');

  const [[{ total }]] = await db.query(
    `SELECT COUNT(*) AS total
       FROM equipment e
      WHERE ${whereSql}`,
    params
  );

  const [rows] = await db.query(
    `SELECT e.*,
            e.equipment_name AS name,
            e.rental_rate AS rate,
            e.availability_status AS availability,
            e.quantity AS available_quantity,
            c.category_name AS category_name,
            u.full_name AS owner_name
       FROM equipment e
       LEFT JOIN equipment_categories c ON c.id = e.category_id
       JOIN users u ON u.id = e.owner_id
      WHERE ${whereSql}
      ORDER BY e.created_at DESC
      LIMIT ? OFFSET ?`,
    [...params, PAGE_SIZE, (page - 1) * PAGE_SIZE]
  );

  res.json({
    data: rows,
    page,
    pageSize: PAGE_SIZE,
    total,
    totalPages: Math.ceil(total / PAGE_SIZE)
  });
}

// PUBLIC: View one equipment
async function getOne(req, res) {
  const [rows] = await db.query(
    `SELECT e.*,
            e.equipment_name AS name,
            e.rental_rate AS rate,
            e.availability_status AS availability,
            e.quantity AS available_quantity,
            c.category_name AS category_name,
            u.full_name AS owner_name
       FROM equipment e
       LEFT JOIN equipment_categories c ON c.id = e.category_id
       JOIN users u ON u.id = e.owner_id
      WHERE e.id = ?
        AND e.approval_status = 'approved'
        AND e.is_archived = 0
        AND ${coverageCondition('e')}`,
    [req.params.id]
  );

  if (!rows.length) {
    return res.status(404).json({
      error: 'Equipment not found.'
    });
  }

  res.json(rows[0]);
}

// OWNER: List own equipment
async function listMine(req, res) {
  const archived = req.query.archived === '1';

  const [rows] = await db.query(
    `SELECT e.*,
            e.equipment_name AS name,
            e.rental_rate AS rate,
            e.availability_status AS availability,
            e.quantity AS available_quantity,
            c.category_name AS category_name
       FROM equipment e
       LEFT JOIN equipment_categories c ON c.id = e.category_id
      WHERE e.owner_id = ?
        AND e.is_archived = ?
      ORDER BY e.created_at DESC`,
    [req.user.id, archived ? 1 : 0]
  );

  res.json({ data: rows });
}

// OWNER: Add equipment
async function create(req, res) {
  const errors = validate(req.body);

  if (errors.length) {
    return res.status(400).json({ errors });
  }

  const b = req.body;

  // Enforce the current, non-expired subscription and its listing limit on the server.
  const allowance = await checkListingAllowance(req.user.id);
  if (!allowance.ok) return res.status(allowance.status).json(allowance.body);

  // Save uploaded image path, if provided.
  const imagePath = req.file
    ? `equipment/${req.file.filename}`
    : null;

  const [result] = await db.query(
    `INSERT INTO equipment
      (
        owner_id,
        category_id,
        equipment_name,
        brand_model,
        description,
        image_path,
        rental_rate,
        quantity,
        rate_type,
        condition_status,
        location,
        availability_status,
        approval_status,
        is_archived
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'approved', 0)`,
    [
      req.user.id,
      Number(b.category_id),
      String(b.name).trim(),
      b.brand_model || null,
      b.description || null,
      imagePath,
      Number(b.rate),
      Number(b.available_quantity ?? b.quantity ?? 1),
      b.rate_type,
      b.condition_status,
      b.location,
      b.availability === 'unavailable' ? 'unavailable' : 'available'
    ]
  );

  // Verified owners are auto-approved, so admins only need to be informed and can take the listing down if needed.
  try {
    await notifyAdmins(
      'New equipment listed',
      `"${String(b.name).trim()}" was added by a verified owner and is now visible to farmers. You can take it down from Equipment Management if needed.`,
      '/admin/equipment'
    );
  } catch (error) {
    console.error('New equipment notification failed:', error.message);
  }

  res.status(201).json({
    success: true,
    id: result.insertId,
    approval_status: 'approved'
  });
}

// OWNER: Update equipment
async function update(req, res) {
  const [rows] = await db.query(
    'SELECT * FROM equipment WHERE id = ? AND owner_id = ?',
    [req.params.id, req.user.id]
  );

  if (!rows.length) {
    return res.status(404).json({
      error: 'Equipment not found.'
    });
  }

  const errors = validate(req.body);

  if (errors.length) {
    return res.status(400).json({ errors });
  }

  const b = req.body;

  const resubmit = rows[0].approval_status === 'rejected';

  // Keep the existing image if no new image is uploaded.
  const imagePath = req.file
    ? `equipment/${req.file.filename}`
    : rows[0].image_path;

  await db.query(
    `UPDATE equipment
        SET category_id = ?,
            equipment_name = ?,
            brand_model = ?,
            description = ?,
            image_path = ?,
            rental_rate = ?,
            quantity = ?,
            rate_type = ?,
            condition_status = ?,
            location = ?,
            availability_status = ?,
            approval_status = ?,
            rejection_reason = ?
      WHERE id = ? AND owner_id = ?`,
    [
      Number(b.category_id),
      String(b.name).trim(),
      b.brand_model || null,
      b.description || null,
      imagePath,
      Number(b.rate),
      Number(b.available_quantity ?? b.quantity ?? 1),
      b.rate_type,
      b.condition_status,
      b.location,
      b.availability === 'unavailable' ? 'unavailable' : 'available',
      // Kapag na-reject at in-edit ng owner, babalik sa pending para ma-review ulit ng admin.
      resubmit ? 'pending' : rows[0].approval_status,
      resubmit ? null : (rows[0].rejection_reason ?? null),
      req.params.id,
      req.user.id
    ]
  );

  if (resubmit) {
    try {
      await notifyAdmins(
        'Equipment resubmitted',
        `"${String(b.name).trim()}" was edited after being rejected and is waiting for review.`,
        '/admin/equipment'
      );
    } catch (error) {
      console.error('Resubmit notification failed:', error.message);
    }
  }

  res.json({
    success: true,
    message: resubmit ? 'Equipment updated and sent for review again.' : 'Equipment updated.'
  });
}

// OWNER: Archive equipment
async function archive(req, res) {
  const [result] = await db.query(
    `UPDATE equipment
        SET is_archived = 1
      WHERE id = ? AND owner_id = ? AND is_archived = 0`,
    [req.params.id, req.user.id]
  );

  if (!result.affectedRows) {
    return res.status(404).json({
      error: 'Not found or already archived.'
    });
  }

  res.json({ success: true, message: 'Equipment archived.' });
}

// OWNER: Restore equipment
async function restore(req, res) {
  // Ang pag-restore ay nagdadagdag ng listing, kaya sakop din ng limit ng plan.
  const [[archived]] = await db.query(
    'SELECT id FROM equipment WHERE id = ? AND owner_id = ? AND is_archived = 1',
    [req.params.id, req.user.id]
  );
  if (!archived) return res.status(404).json({ error: 'Not found or not archived.' });
  const allowance = await checkListingAllowance(req.user.id);
  if (!allowance.ok) return res.status(allowance.status).json(allowance.body);

  const [result] = await db.query(
    `UPDATE equipment
        SET is_archived = 0
      WHERE id = ? AND owner_id = ? AND is_archived = 1`,
    [req.params.id, req.user.id]
  );

  if (!result.affectedRows) {
    return res.status(404).json({
      error: 'Not found or not archived.'
    });
  }

  res.json({ success: true, message: 'Equipment restored.' });
}

// ADMIN: List all equipment
async function listAdmin(req, res) {
  const params = [];
  let where = '1=1';

  if (['pending', 'approved', 'rejected'].includes(req.query.status)) {
    where += ' AND e.approval_status = ?';
    params.push(req.query.status);
  }
  if (['available', 'unavailable', 'rented', 'maintenance'].includes(req.query.availability)) {
    where += ' AND e.availability_status = ?';
    params.push(req.query.availability);
  }
  if (req.query.category_id && Number.isInteger(Number(req.query.category_id))) {
    where += ' AND e.category_id = ?';
    params.push(Number(req.query.category_id));
  }
  if (req.query.owner_id && Number.isInteger(Number(req.query.owner_id))) {
    where += ' AND e.owner_id = ?';
    params.push(Number(req.query.owner_id));
  }
  if (req.query.archived === '1') where += ' AND e.is_archived = 1';
  else if (req.query.archived !== 'all') where += ' AND e.is_archived = 0';
  if (typeof req.query.q === 'string' && req.query.q.trim()) {
    const term = `%${req.query.q.trim()}%`;
    where += ' AND (e.equipment_name LIKE ? OR e.brand_model LIKE ? OR u.full_name LIKE ? OR e.location LIKE ?)';
    params.push(term, term, term, term);
  }

  const [rows] = await db.query(
    `SELECT e.*,
            e.equipment_name AS name,
            e.rental_rate AS rate,
            e.availability_status AS availability,
            e.quantity AS available_quantity,
            c.category_name AS category_name,
            u.full_name AS owner_name
       FROM equipment e
       LEFT JOIN equipment_categories c ON c.id = e.category_id
       JOIN users u ON u.id = e.owner_id
      WHERE ${where}
      ORDER BY e.created_at DESC`,
    params
  );

  res.json({ data: rows });
}

// ADMIN: Approve or reject (kasama ang pag-take down ng approved listing)
async function setApproval(req, res) {
  const status = req.body.approval_status;
  const reason = String(req.body.reason || '').trim().slice(0, 255);

  if (!['approved', 'rejected'].includes(status)) {
    return res.status(400).json({
      error: 'Only approved or rejected is allowed.'
    });
  }
  if (status === 'rejected' && reason.length < 3) {
    return res.status(400).json({
      error: 'Enter a reason so the owner knows why the listing was rejected.'
    });
  }

  const [[item]] = await db.query(
    'SELECT id, owner_id, equipment_name, approval_status FROM equipment WHERE id = ?',
    [req.params.id]
  );
  if (!item) {
    return res.status(404).json({
      error: 'Equipment not found.'
    });
  }
  if (item.approval_status === status) {
    return res.json({ success: true, approval_status: status, unchanged: true });
  }

  await db.query(
    'UPDATE equipment SET approval_status = ?, rejection_reason = ? WHERE id = ?',
    [status, status === 'rejected' ? reason : null, item.id]
  );

  // Dapat alam ng owner kung ano ang nangyari sa listing niya.
  try {
    if (status === 'approved') {
      await notifyUser(
        item.owner_id,
        item.approval_status === 'rejected' ? 'Equipment re-approved' : 'Equipment approved',
        `Your listing "${item.equipment_name}" is approved and now visible to farmers.`,
        '/owner/equipment'
      );
    } else {
      await notifyUser(
        item.owner_id,
        item.approval_status === 'approved' ? 'Equipment taken down' : 'Equipment rejected',
        `Your listing "${item.equipment_name}" was ${item.approval_status === 'approved' ? 'taken down' : 'rejected'}. Reason: ${reason}. You can edit it and it will be sent for review again.`,
        '/owner/equipment'
      );
    }
  } catch (error) {
    console.error('Equipment approval notification failed:', error.message);
  }

  res.json({
    success: true,
    approval_status: status
  });
}

// List categories
async function listCategories(req, res) {
  const [rows] = await db.query(
    `SELECT id, category_name AS name
       FROM equipment_categories
      ORDER BY category_name`
  );

  res.json({ data: rows });
}


// FARMER: Get only the selected equipment owner's public rental payment instructions.
async function getPaymentDetails(req, res) {
  try {
    const equipmentId = Number(req.params.id);
    if (!Number.isInteger(equipmentId) || equipmentId < 1) {
      return res.status(400).json({ success: false, error: 'Invalid equipment ID.' });
    }
    const [rows] = await db.query(
      `SELECT pp.gcash_number, pp.gcash_account_name, pp.gcash_qr_path,
              pp.bank_name, pp.bank_account_name, pp.bank_account_number,
              pp.other_payment_instructions
         FROM equipment e
         LEFT JOIN provider_profiles pp ON pp.user_id = e.owner_id
        WHERE e.id = ? AND e.approval_status = 'approved' AND e.is_archived = 0
          AND ${coverageCondition('e')}
        LIMIT 1`,
      [equipmentId]
    );
    if (!rows.length) return res.status(404).json({ success: false, error: 'Equipment not found.' });
    const data = rows[0];
    res.json({
      success: true,
      data: {
        gcash_number: data.gcash_number,
        gcash_account_name: data.gcash_account_name,
        gcash_qr_url: data.gcash_qr_path
          ? `/uploads/provider-payment/${encodeURIComponent(require('path').basename(data.gcash_qr_path))}`
          : null,
        bank_name: data.bank_name,
        bank_account_name: data.bank_account_name,
        bank_account_number: data.bank_account_number,
        other_payment_instructions: data.other_payment_instructions,
      },
    });
  } catch (error) {
    console.error('Get equipment owner payment details:', error);
    res.status(500).json({ success: false, error: 'Unable to load owner payment details.' });
  }
}

module.exports = { getPaymentDetails,
  listPublic,
  getOne,
  listMine,
  create,
  update,
  archive,
  restore,
  listAdmin,
  setApproval,
  listCategories
};
