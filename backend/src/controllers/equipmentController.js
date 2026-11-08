const fs = require('fs');
const path = require('path');
const db = require('../db');

const RATE_TYPES = ['hourly', 'daily', 'hectare'];
const CONDITIONS = ['excellent', 'good', 'fair'];
const LOCATIONS = ['Victoria, Oriental Mindoro', 'Socorro, Oriental Mindoro'];
const PAGE_SIZE = 10;

// Late fee: kung blanko, 1.5x ng hourly rate (hourly at daily). Walang default para sa hectare.
function resolveLateFee(rateType, rate, lateFee) {
  if (lateFee !== undefined && lateFee !== null && lateFee !== '') return Number(lateFee);
  if (rateType === 'hourly') return Math.round(rate * 1.5 * 100) / 100;
  if (rateType === 'daily') return Math.round((rate / 24) * 1.5 * 100) / 100;
  return 0;
}

function validate(body) {
  const errors = [];
  const rate = Number(body.rate);
  if (!body.name || String(body.name).trim().length < 2) errors.push('Kailangan ng pangalan ng equipment.');
  if (!Number(body.category_id)) errors.push('Pumili ng category.');
  if (!(rate > 0)) errors.push('Ang rate ay dapat higit sa 0.');
  if (!RATE_TYPES.includes(body.rate_type)) errors.push('Mali ang rate type.');
  if (!CONDITIONS.includes(body.condition_status)) errors.push('Mali ang condition.');
  if (!LOCATIONS.includes(body.location)) errors.push('Victoria o Socorro, Oriental Mindoro lang.');
  if (body.late_fee_per_hour !== undefined && body.late_fee_per_hour !== '' && !(Number(body.late_fee_per_hour) >= 0)) {
    errors.push('Mali ang late fee.');
  }
  return errors;
}

function removeImage(imagePath) {
  if (!imagePath) return;
  const file = path.join(__dirname, '..', '..', imagePath.replace(/^\//, ''));
  fs.unlink(file, () => {});
}

// PUBLIC: Browse equipment (approved, available, hindi archived) na may search, filter, at pagination ng 10.
async function listPublic(req, res) {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const where = ["e.approval_status = 'approved'", "e.availability = 'available'", 'e.archived_at IS NULL'];
  const params = [];
  if (req.query.q) {
    where.push('(e.name LIKE ? OR e.brand_model LIKE ?)');
    params.push(`%${req.query.q}%`, `%${req.query.q}%`);
  }
  if (req.query.category_id) { where.push('e.category_id = ?'); params.push(Number(req.query.category_id)); }
  if (LOCATIONS.includes(req.query.location)) { where.push('e.location = ?'); params.push(req.query.location); }
  if (RATE_TYPES.includes(req.query.rate_type)) { where.push('e.rate_type = ?'); params.push(req.query.rate_type); }

  const whereSql = where.join(' AND ');
  const [[{ total }]] = await db.query(`SELECT COUNT(*) AS total FROM equipment e WHERE ${whereSql}`, params);
  const [rows] = await db.query(
    `SELECT e.*, c.name AS category_name, u.name AS owner_name
       FROM equipment e
       JOIN equipment_categories c ON c.id = e.category_id
       JOIN users u ON u.id = e.owner_id
      WHERE ${whereSql}
      ORDER BY e.created_at DESC
      LIMIT ? OFFSET ?`,
    [...params, PAGE_SIZE, (page - 1) * PAGE_SIZE]
  );
  res.json({ data: rows, page, pageSize: PAGE_SIZE, total, totalPages: Math.ceil(total / PAGE_SIZE) });
}

async function getOne(req, res) {
  const [rows] = await db.query(
    `SELECT e.*, c.name AS category_name, u.name AS owner_name
       FROM equipment e
       JOIN equipment_categories c ON c.id = e.category_id
       JOIN users u ON u.id = e.owner_id
      WHERE e.id = ? AND e.approval_status = 'approved' AND e.archived_at IS NULL`,
    [req.params.id]
  );
  if (!rows.length) return res.status(404).json({ error: 'Hindi nahanap ang equipment.' });
  res.json(rows[0]);
}

// OWNER: sariling equipment lang. ?archived=1 para makita ang archived.
async function listMine(req, res) {
  const archived = req.query.archived === '1';
  const [rows] = await db.query(
    `SELECT e.*, c.name AS category_name
       FROM equipment e JOIN equipment_categories c ON c.id = e.category_id
      WHERE e.owner_id = ? AND e.archived_at IS ${archived ? 'NOT NULL' : 'NULL'}
      ORDER BY e.created_at DESC`,
    [req.user.id]
  );
  res.json({ data: rows });
}

// OWNER: Add. Laging "pending" hanggang i-approve ng admin.
async function create(req, res) {
  const errors = validate(req.body);
  if (errors.length) { if (req.file) removeImage(`/uploads/equipment/${req.file.filename}`); return res.status(400).json({ errors }); }
  const b = req.body;
  const rate = Number(b.rate);
  const imagePath = req.file ? `/uploads/equipment/${req.file.filename}` : null;
  const [result] = await db.query(
    `INSERT INTO equipment
       (owner_id, category_id, name, brand_model, description, rate, rate_type, late_fee_per_hour,
        condition_status, location, availability, approval_status, image_path)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,'pending',?)`,
    [
      req.user.id, Number(b.category_id), String(b.name).trim(), b.brand_model || null, b.description || null,
      rate, b.rate_type, resolveLateFee(b.rate_type, rate, b.late_fee_per_hour), b.condition_status, b.location,
      b.availability === 'unavailable' ? 'unavailable' : 'available', imagePath,
    ]
  );
  res.status(201).json({ id: result.insertId, approval_status: 'pending' });
}

// OWNER: Edit (sariling equipment lang).
async function update(req, res) {
  const [rows] = await db.query('SELECT * FROM equipment WHERE id = ? AND owner_id = ?', [req.params.id, req.user.id]);
  if (!rows.length) { if (req.file) removeImage(`/uploads/equipment/${req.file.filename}`); return res.status(404).json({ error: 'Hindi nahanap ang equipment.' }); }
  const errors = validate(req.body);
  if (errors.length) { if (req.file) removeImage(`/uploads/equipment/${req.file.filename}`); return res.status(400).json({ errors }); }
  const b = req.body;
  const rate = Number(b.rate);
  let imagePath = rows[0].image_path;
  if (req.file) { removeImage(imagePath); imagePath = `/uploads/equipment/${req.file.filename}`; }
  await db.query(
    `UPDATE equipment SET category_id=?, name=?, brand_model=?, description=?, rate=?, rate_type=?,
            late_fee_per_hour=?, condition_status=?, location=?, availability=?, image_path=?
      WHERE id = ? AND owner_id = ?`,
    [
      Number(b.category_id), String(b.name).trim(), b.brand_model || null, b.description || null, rate, b.rate_type,
      resolveLateFee(b.rate_type, rate, b.late_fee_per_hour), b.condition_status, b.location,
      b.availability === 'unavailable' ? 'unavailable' : 'available', imagePath, req.params.id, req.user.id,
    ]
  );
  res.json({ ok: true });
}

// OWNER: Archive / Restore (soft delete; hindi binubura ang row).
async function archive(req, res) {
  const [r] = await db.query('UPDATE equipment SET archived_at = NOW() WHERE id = ? AND owner_id = ? AND archived_at IS NULL', [req.params.id, req.user.id]);
  if (!r.affectedRows) return res.status(404).json({ error: 'Hindi nahanap o naka-archive na.' });
  res.json({ ok: true });
}

async function restore(req, res) {
  const [r] = await db.query('UPDATE equipment SET archived_at = NULL WHERE id = ? AND owner_id = ? AND archived_at IS NOT NULL', [req.params.id, req.user.id]);
  if (!r.affectedRows) return res.status(404).json({ error: 'Hindi nahanap o hindi naka-archive.' });
  res.json({ ok: true });
}

// ADMIN: lahat ng equipment, may filter ayon sa approval_status.
async function listAdmin(req, res) {
  const params = [];
  let where = '1=1';
  if (['pending', 'approved', 'rejected'].includes(req.query.status)) { where += ' AND e.approval_status = ?'; params.push(req.query.status); }
  const [rows] = await db.query(
    `SELECT e.*, c.name AS category_name, u.name AS owner_name
       FROM equipment e
       JOIN equipment_categories c ON c.id = e.category_id
       JOIN users u ON u.id = e.owner_id
      WHERE ${where} ORDER BY e.created_at DESC`,
    params
  );
  res.json({ data: rows });
}

// ADMIN: Approve / Reject.
async function setApproval(req, res) {
  const status = req.body.approval_status;
  if (!['approved', 'rejected'].includes(status)) return res.status(400).json({ error: 'approved o rejected lang.' });
  const [r] = await db.query('UPDATE equipment SET approval_status = ? WHERE id = ?', [status, req.params.id]);
  if (!r.affectedRows) return res.status(404).json({ error: 'Hindi nahanap ang equipment.' });
  res.json({ ok: true, approval_status: status });
}

async function listCategories(req, res) {
  const [rows] = await db.query('SELECT id, name FROM equipment_categories ORDER BY name');
  res.json({ data: rows });
}

module.exports = { listPublic, getOne, listMine, create, update, archive, restore, listAdmin, setApproval, listCategories };
