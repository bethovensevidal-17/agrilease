
const db = require('../db');

const RATE_TYPES = ['hour', 'day', 'hectare'];
const CONDITIONS = ['excellent', 'good', 'fair', 'needs_repair'];
const LOCATIONS = [
  'Victoria, Oriental Mindoro',
  'Socorro, Oriental Mindoro'
];
const PAGE_SIZE = 10;

function validate(body) {
  const errors = [];
  const rate = Number(body.rate);

  if (!body.name || String(body.name).trim().length < 2) {
    errors.push('Kailangan ng pangalan ng equipment.');
  }

  if (!Number(body.category_id)) {
    errors.push('Pumili ng category.');
  }

  if (!(rate > 0)) {
    errors.push('Ang rate ay dapat higit sa 0.');
  }

  if (!RATE_TYPES.includes(body.rate_type)) {
    errors.push('Gumamit ng hour, day, o hectare.');
  }

  if (!CONDITIONS.includes(body.condition_status)) {
    errors.push('Mali ang condition.');
  }

  if (!LOCATIONS.includes(body.location)) {
    errors.push('Victoria o Socorro, Oriental Mindoro lang.');
  }

  return errors;
}

// PUBLIC: Browse approved and available equipment
async function listPublic(req, res) {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);

  const where = [
    "e.approval_status = 'approved'",
    "e.availability_status = 'available'",
    'e.is_archived = 0'
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

  if (LOCATIONS.includes(req.query.location)) {
    where.push('e.location = ?');
    params.push(req.query.location);
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
            c.category_name AS category_name,
            u.full_name AS owner_name
       FROM equipment e
       LEFT JOIN equipment_categories c ON c.id = e.category_id
       JOIN users u ON u.id = e.owner_id
      WHERE e.id = ?
        AND e.approval_status = 'approved'
        AND e.is_archived = 0`,
    [req.params.id]
  );

  if (!rows.length) {
    return res.status(404).json({
      error: 'Hindi nahanap ang equipment.'
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

  const [result] = await db.query(
    `INSERT INTO equipment
      (
        owner_id,
        category_id,
        equipment_name,
        brand_model,
        description,
        rental_rate,
        rate_type,
        condition_status,
        location,
        availability_status,
        approval_status,
        is_archived
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 0)`,
    [
      req.user.id,
      Number(b.category_id),
      String(b.name).trim(),
      b.brand_model || null,
      b.description || null,
      Number(b.rate),
      b.rate_type,
      b.condition_status,
      b.location,
      b.availability === 'unavailable' ? 'unavailable' : 'available'
    ]
  );

  res.status(201).json({
    success: true,
    id: result.insertId,
    approval_status: 'pending'
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
      error: 'Hindi nahanap ang equipment.'
    });
  }

  const errors = validate(req.body);

  if (errors.length) {
    return res.status(400).json({ errors });
  }

  const b = req.body;

  await db.query(
    `UPDATE equipment
        SET category_id = ?,
            equipment_name = ?,
            brand_model = ?,
            description = ?,
            rental_rate = ?,
            rate_type = ?,
            condition_status = ?,
            location = ?,
            availability_status = ?
      WHERE id = ? AND owner_id = ?`,
    [
      Number(b.category_id),
      String(b.name).trim(),
      b.brand_model || null,
      b.description || null,
      Number(b.rate),
      b.rate_type,
      b.condition_status,
      b.location,
      b.availability === 'unavailable' ? 'unavailable' : 'available',
      req.params.id,
      req.user.id
    ]
  );

  res.json({ success: true, message: 'Equipment updated.' });
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
      error: 'Hindi nahanap o naka-archive na.'
    });
  }

  res.json({ success: true, message: 'Equipment archived.' });
}

// OWNER: Restore equipment
async function restore(req, res) {
  const [result] = await db.query(
    `UPDATE equipment
        SET is_archived = 0
      WHERE id = ? AND owner_id = ? AND is_archived = 1`,
    [req.params.id, req.user.id]
  );

  if (!result.affectedRows) {
    return res.status(404).json({
      error: 'Hindi nahanap o hindi naka-archive.'
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

  const [rows] = await db.query(
    `SELECT e.*,
            e.equipment_name AS name,
            e.rental_rate AS rate,
            e.availability_status AS availability,
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

// ADMIN: Approve or reject
async function setApproval(req, res) {
  const status = req.body.approval_status;

  if (!['approved', 'rejected'].includes(status)) {
    return res.status(400).json({
      error: 'approved o rejected lang.'
    });
  }

  const [result] = await db.query(
    'UPDATE equipment SET approval_status = ? WHERE id = ?',
    [status, req.params.id]
  );

  if (!result.affectedRows) {
    return res.status(404).json({
      error: 'Hindi nahanap ang equipment.'
    });
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

module.exports = {
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
