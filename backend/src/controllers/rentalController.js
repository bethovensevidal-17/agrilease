const db = require('../db');
const { calcBase, hasConflict } = require('../utils/pricing');

// MySQL DATETIME format na hindi ginagalaw ang timezone: 'YYYY-MM-DD HH:MM:SS'
function toSql(d) {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ` +
         `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

// POST /api/rentals  (farmer lang)
async function create(req, res) {
  try {
    const farmerId = req.user.id; // galing sa token, hindi sa body
    const { equipment_id, start_at, end_at, hectares, payment_method, gcash_ref, client_key } = req.body;

    // 1. Validation
    if (!equipment_id || !start_at || !end_at) {
      return res.status(400).json({ error: 'Kailangan ang equipment_id, start_at at end_at.' });
    }
    const start = new Date(start_at);
    const end = new Date(end_at);
    if (isNaN(start) || isNaN(end)) {
      return res.status(400).json({ error: 'Hindi valid ang petsa.' });
    }
    if (end <= start) {
      return res.status(400).json({ error: 'Dapat mas huli ang end_at kaysa start_at.' });
    }
    if (start < new Date()) {
      return res.status(400).json({ error: 'Hindi puwedeng simulan sa nakaraan.' });
    }
    const method = payment_method === 'gcash' ? 'gcash' : 'cash';
    if (method === 'gcash' && !/^\d{13}$/.test(String(gcash_ref || ''))) {
      return res.status(400).json({ error: 'Kailangan ng 13-digit na GCash reference number.' });
    }

    // 2. Idempotency: kung na-submit na ang client_key, ibalik ang dati
    if (client_key) {
      const [dup] = await db.query(
        'SELECT * FROM rental_requests WHERE client_key = ? AND farmer_id = ? LIMIT 1',
        [client_key, farmerId]
      );
      if (dup.length) return res.status(200).json(dup[0]);
    }

    // 3. Equipment check
    const [eq] = await db.query(
      `SELECT id, owner_id, rate, rate_type FROM equipment
       WHERE id = ? AND approval_status = 'approved'
         AND availability = 'available' AND archived_at IS NULL`,
      [equipment_id]
    );
    if (!eq.length) {
      return res.status(404).json({ error: 'Hindi available ang equipment na ito.' });
    }
    const item = eq[0];
    if (item.owner_id === farmerId) {
      return res.status(400).json({ error: 'Hindi mo puwedeng rentahan ang sarili mong equipment.' });
    }

    let ha = null;
    if (item.rate_type === 'hectare') {
      ha = Number(hectares);
      if (!ha || ha <= 0) {
        return res.status(400).json({ error: 'Kailangan ng hectares para sa ganitong equipment.' });
      }
    }

    // 4. Conflict check
    const startSql = toSql(start);
    const endSql = toSql(end);
    if (await hasConflict(db, item.id, startSql, endSql)) {
      return res.status(409).json({ error: 'May ibang rental na sa oras na ito.' });
    }

    // 5. Presyo: kinukuwenta ng server, hindi tinatanggap mula sa client
    const base = calcBase(item.rate, item.rate_type, start, end, ha);

    // 6. Insert
    const [result] = await db.query(
      `INSERT INTO rental_requests
        (farmer_id, equipment_id, start_at, end_at, hectares,
         base_amount, total_amount, payment_method, gcash_ref, client_key)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [farmerId, item.id, startSql, endSql, ha,
       base, base, method, method === 'gcash' ? gcash_ref : null, client_key || null]
    );

    const [rows] = await db.query('SELECT * FROM rental_requests WHERE id = ?', [result.insertId]);
    return res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Naipadala na ang request na ito.' });
    }
    console.error(err);
    return res.status(500).json({ error: 'May error sa server.' });
  }
}

// GET /api/rentals
// farmer: sariling requests; owner: requests para sa equipment niya; admin: lahat
async function list(req, res) {
  try {
    const { id, role } = req.user;
    const { status } = req.query;

    let where = '';
    const params = [];
    if (role === 'farmer') {
      where = 'WHERE r.farmer_id = ?';
      params.push(id);
    } else if (role === 'owner') {
      where = 'WHERE e.owner_id = ?';
      params.push(id);
    } else {
      where = 'WHERE 1=1';
    }
    if (status) {
      where += ' AND r.status = ?';
      params.push(status);
    }

    const [rows] = await db.query(
      `SELECT r.*, e.name AS equipment_name, e.owner_id
       FROM rental_requests r
       JOIN equipment e ON e.id = r.equipment_id
       ${where}
       ORDER BY r.created_at DESC`,
      params
    );
    return res.json(rows);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'May error sa server.' });
  }
}

module.exports = { create, list };