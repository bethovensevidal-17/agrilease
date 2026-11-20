const db = require('../db');

async function notifyUser(userId, title, message, actionUrl = null) {
  if (!userId) return;
  await db.execute(
    'INSERT INTO notifications (user_id, title, message, action_url, is_read) VALUES (?, ?, ?, ?, 0)',
    [Number(userId), String(title).slice(0, 150), String(message), actionUrl]
  );
}

async function notifyAdmins(title, message, actionUrl = '/admin/notifications') {
  const [admins] = await db.execute("SELECT id FROM users WHERE role = 'admin' AND status = 'active'");
  for (const admin of admins) await notifyUser(admin.id, title, message, actionUrl);
}

module.exports = { notifyUser, notifyAdmins };
