const db = require('../db');

async function list(req, res) {
  try {
    const archived = req.query.archived === '1' ? 1 : 0;
    const [rows] = await db.execute(
      `SELECT id, title, message, action_url, is_read, is_archived, created_at
       FROM notifications WHERE user_id = ? AND is_archived = ?
       ORDER BY created_at DESC LIMIT 100`,
      [req.user.id, archived]
    );
    res.json({ success: true, data: rows, unread_count: archived ? 0 : rows.filter(row => !Number(row.is_read)).length });
  } catch (error) {
    console.error('List notifications:', error);
    res.status(500).json({ success: false, error: 'Unable to retrieve notifications.' });
  }
}

async function markRead(req, res) {
  try {
    const [result] = await db.execute(
      'UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?',
      [Number(req.params.id), req.user.id]
    );
    if (!result.affectedRows) return res.status(404).json({ success: false, error: 'Notification not found.' });
    res.json({ success: true });
  } catch (error) {
    console.error('Mark notification read:', error);
    res.status(500).json({ success: false, error: 'Unable to update notification.' });
  }
}

async function markAllRead(req, res) {
  try {
    await db.execute('UPDATE notifications SET is_read = 1 WHERE user_id = ?', [req.user.id]);
    res.json({ success: true });
  } catch (error) {
    console.error('Mark all notifications read:', error);
    res.status(500).json({ success: false, error: 'Unable to update notifications.' });
  }
}

function setArchived(value) {
  return async (req, res) => {
    try {
      const [result] = await db.execute(
        'UPDATE notifications SET is_archived = ? WHERE id = ? AND user_id = ?',
        [value, Number(req.params.id), req.user.id]
      );
      if (!result.affectedRows) return res.status(404).json({ success: false, error: 'Notification not found.' });
      res.json({ success: true });
    } catch (error) {
      console.error('Archive notification:', error);
      res.status(500).json({ success: false, error: 'Unable to update notification.' });
    }
  };
}

const archive = setArchived(1);
const restore = setArchived(0);

module.exports = { list, markRead, markAllRead, archive, restore };
