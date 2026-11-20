const db = require('../db');
const { sendPush } = require('../services/push');
const { broadcastMessage } = require('../realtime');
let schemaPromise;

// Support both database snapshots found in this project:
// legacy: message/sent_at; newer schema: body/created_at.
async function getMessageSchema() {
  if (!schemaPromise) {
    schemaPromise = db.query('SHOW COLUMNS FROM messages').then(([rows]) => {
      const names = new Set(rows.map(row => row.Field));
      const body = names.has('message') ? 'message' : names.has('body') ? 'body' : null;
      const sent = names.has('sent_at') ? 'sent_at' : names.has('created_at') ? 'created_at' : null;
      if (!body || !sent) throw new Error('Messages table schema mismatch: expected message/body and sent_at/created_at columns.');
      return { body, sent, hasReadAt: names.has('read_at') };
    }).catch(error => { schemaPromise = null; throw error; });
  }
  return schemaPromise;
}

async function canCommunicate(userId, otherId) {
  const [rows] = await db.execute(
    `SELECT 1 FROM rental_requests rr
       JOIN equipment e ON e.id = rr.equipment_id
      WHERE (rr.farmer_id = ? AND e.owner_id = ?)
         OR (rr.farmer_id = ? AND e.owner_id = ?)
      LIMIT 1`,
    [userId, otherId, otherId, userId]
  );
  return rows.length > 0;
}

function requireChatRole(req, res) {
  if (!['farmer', 'owner'].includes(req.user?.role)) {
    res.status(403).json({ error: 'Chat is available to farmers and owners only.' });
    return false;
  }
  return true;
}

async function contacts(req, res, next) {
  try {
    if (!requireChatRole(req, res)) return;
    const sql = req.user.role === 'farmer'
      ? `SELECT DISTINCT u.id AS user_id, u.full_name, u.role FROM rental_requests rr JOIN equipment e ON e.id = rr.equipment_id JOIN users u ON u.id = e.owner_id WHERE rr.farmer_id = ? ORDER BY u.full_name`
      : `SELECT DISTINCT u.id AS user_id, u.full_name, u.role FROM rental_requests rr JOIN users u ON u.id = rr.farmer_id JOIN equipment e ON e.id = rr.equipment_id WHERE e.owner_id = ? ORDER BY u.full_name`;
    const [rows] = await db.execute(sql, [req.user.id]);
    res.json({ data: rows });
  } catch (error) { next(error); }
}

async function conversations(req, res, next) {
  try {
    if (!requireChatRole(req, res)) return;
    const schema = await getMessageSchema();
    const unreadExpr = schema.hasReadAt
      ? `SUM(CASE WHEN m.receiver_id = ? AND m.read_at IS NULL THEN 1 ELSE 0 END)`
      : '0';
    const params = schema.hasReadAt
      ? [req.user.id, req.user.id, req.user.id, req.user.id]
      : [req.user.id, req.user.id, req.user.id];
    const [rows] = await db.execute(
      `SELECT u.id AS user_id, u.full_name, u.role,
              MAX(m.${schema.sent}) AS last_message_at,
              ${unreadExpr} AS unread_count,
              SUBSTRING_INDEX(GROUP_CONCAT(m.${schema.body} ORDER BY m.${schema.sent} DESC SEPARATOR '\\n'), '\\n', 1) AS last_message
         FROM messages m
         JOIN users u ON u.id = CASE WHEN m.sender_id = ? THEN m.receiver_id ELSE m.sender_id END
        WHERE m.sender_id = ? OR m.receiver_id = ?
        GROUP BY u.id, u.full_name, u.role
        ORDER BY last_message_at DESC`, params
    );
    res.json({ data: rows });
  } catch (error) { next(error); }
}

async function history(req, res, next) {
  try {
    if (!requireChatRole(req, res)) return;
    const otherId = Number(req.params.userId);
    if (!Number.isInteger(otherId) || otherId <= 0 || !(await canCommunicate(req.user.id, otherId))) {
      return res.status(403).json({ error: 'You cannot access this conversation.' });
    }
    const schema = await getMessageSchema();
    if (schema.hasReadAt) {
      await db.execute('UPDATE messages SET read_at = CURRENT_TIMESTAMP WHERE sender_id = ? AND receiver_id = ? AND read_at IS NULL', [otherId, req.user.id]);
    }
    const [rows] = await db.execute(
      `SELECT id, sender_id, receiver_id, ${schema.body} AS message, ${schema.sent} AS sent_at
         FROM messages
        WHERE (sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)
        ORDER BY ${schema.sent} ASC LIMIT 300`,
      [req.user.id, otherId, otherId, req.user.id]
    );
    res.json({ data: rows });
  } catch (error) { next(error); }
}

async function unreadCount(req, res, next) {
  try {
    if (!requireChatRole(req, res)) return;
    const schema = await getMessageSchema();
    if (!schema.hasReadAt) return res.json({ unread_count: 0, read_tracking_enabled: false });
    const [rows] = await db.execute('SELECT COUNT(*) AS unread_count FROM messages WHERE receiver_id = ? AND read_at IS NULL', [req.user.id]);
    res.json({ unread_count: Number(rows[0]?.unread_count || 0), read_tracking_enabled: true });
  } catch (error) { next(error); }
}

async function send(req, res, next) {
  try {
    if (!requireChatRole(req, res)) return;
    const receiverId = Number(req.body.receiver_id);
    const message = typeof req.body.message === 'string' ? req.body.message.trim() : '';
    if (!Number.isInteger(receiverId) || receiverId <= 0 || !message || message.length > 2000) {
      return res.status(422).json({ error: 'Enter a message (maximum 2,000 characters).' });
    }
    if (receiverId === Number(req.user.id)) return res.status(422).json({ error: 'You cannot send a message to yourself.' });
    if (!(await canCommunicate(req.user.id, receiverId))) return res.status(403).json({ error: 'You can message only an owner or farmer connected through a rental request.' });
    const schema = await getMessageSchema();
    const [result] = await db.execute(
      `INSERT INTO messages (sender_id, receiver_id, ${schema.body}) VALUES (?, ?, ?)`,
      [req.user.id, receiverId, message]
    );
    const [rows] = await db.execute(
      `SELECT id, sender_id, receiver_id, ${schema.body} AS message, ${schema.sent} AS sent_at FROM messages WHERE id = ?`,
      [result.insertId]
    );
    // Real-time: ipadala agad sa receiver (at sa ibang tab ng sender) sa pamamagitan ng WebSocket.
    broadcastMessage(rows[0]);
    sendPush(receiverId, { title: 'New AgriLease message', body: message.slice(0, 120), url: req.user.role === 'farmer' ? '/owner/messages' : '/farmer/messages', tag: `agrilease-message-${result.insertId}` }).catch(error => console.error('Message push failed:', error.message));
    res.status(201).json({ data: rows[0] });
  } catch (error) { next(error); }
}

module.exports = { contacts, conversations, history, unreadCount, send };
