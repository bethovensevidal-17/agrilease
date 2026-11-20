const db = require('../db');

// Farmers and owners may communicate only when there is a rental relationship
// between them. Admin accounts are intentionally excluded from this chat API.
async function canCommunicate(userId, otherId) {
  const [rows] = await db.execute(
    `SELECT 1
       FROM rental_requests rr
       JOIN equipment e ON e.id = rr.equipment_id
      WHERE (rr.farmer_id = ? AND e.owner_id = ?)
         OR (rr.farmer_id = ? AND e.owner_id = ?)
      LIMIT 1`,
    [userId, otherId, otherId, userId]
  );
  return rows.length > 0;
}


async function contacts(req, res, next) {
  try {
    if (!['farmer', 'owner'].includes(req.user.role)) return res.status(403).json({ error: 'Chat is available to farmers and owners only.' });
    const sql = req.user.role === 'farmer'
      ? `SELECT DISTINCT u.id AS user_id, u.full_name, u.role FROM rental_requests rr JOIN equipment e ON e.id = rr.equipment_id JOIN users u ON u.id = e.owner_id WHERE rr.farmer_id = ? ORDER BY u.full_name`
      : `SELECT DISTINCT u.id AS user_id, u.full_name, u.role FROM rental_requests rr JOIN users u ON u.id = rr.farmer_id JOIN equipment e ON e.id = rr.equipment_id WHERE e.owner_id = ? ORDER BY u.full_name`;
    const [rows] = await db.execute(sql, [req.user.id]);
    res.json({ data: rows });
  } catch (error) { next(error); }
}

async function conversations(req, res, next) {
  try {
    if (!['farmer', 'owner'].includes(req.user.role)) return res.status(403).json({ error: 'Chat is available to farmers and owners only.' });
    const [rows] = await db.execute(
      `SELECT u.id AS user_id, u.full_name, u.role,
              MAX(m.sent_at) AS last_message_at,
              SUBSTRING_INDEX(GROUP_CONCAT(m.message ORDER BY m.sent_at DESC SEPARATOR '\\n'), '\\n', 1) AS last_message
         FROM messages m
         JOIN users u ON u.id = CASE WHEN m.sender_id = ? THEN m.receiver_id ELSE m.sender_id END
        WHERE m.sender_id = ? OR m.receiver_id = ?
        GROUP BY u.id, u.full_name, u.role
        ORDER BY last_message_at DESC`,
      [req.user.id, req.user.id, req.user.id]
    );
    res.json({ data: rows });
  } catch (error) { next(error); }
}

async function history(req, res, next) {
  try {
    if (!['farmer', 'owner'].includes(req.user.role)) return res.status(403).json({ error: 'Chat is available to farmers and owners only.' });
    const otherId = Number(req.params.userId);
    if (!Number.isInteger(otherId) || otherId <= 0 || !(await canCommunicate(req.user.id, otherId))) {
      return res.status(403).json({ error: 'You cannot access this conversation.' });
    }
    const [rows] = await db.execute(
      `SELECT id, sender_id, receiver_id, message, sent_at
         FROM messages
        WHERE (sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)
        ORDER BY sent_at ASC LIMIT 300`,
      [req.user.id, otherId, otherId, req.user.id]
    );
    res.json({ data: rows });
  } catch (error) { next(error); }
}

async function send(req, res, next) {
  try {
    if (!['farmer', 'owner'].includes(req.user.role)) return res.status(403).json({ error: 'Chat is available to farmers and owners only.' });
    const receiverId = Number(req.body.receiver_id);
    const message = typeof req.body.message === 'string' ? req.body.message.trim() : '';
    if (!Number.isInteger(receiverId) || receiverId <= 0 || !message || message.length > 2000) {
      return res.status(422).json({ error: 'Enter a message (maximum 2,000 characters).' });
    }
    if (!(await canCommunicate(req.user.id, receiverId))) return res.status(403).json({ error: 'You can message only an owner or farmer connected through a rental request.' });
    const [result] = await db.execute('INSERT INTO messages (sender_id, receiver_id, message) VALUES (?, ?, ?)', [req.user.id, receiverId, message]);
    const [rows] = await db.execute('SELECT id, sender_id, receiver_id, message, sent_at FROM messages WHERE id = ?', [result.insertId]);
    res.status(201).json({ data: rows[0] });
  } catch (error) { next(error); }
}

module.exports = { contacts, conversations, history, send };
