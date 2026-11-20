const db = require('../db');

async function notifyUser(userId, title, message) {
  if (!userId) return;
  await db.execute(
    'INSERT INTO notifications (user_id, title, message, is_read) VALUES (?, ?, ?, 0)',
    [Number(userId), String(title).slice(0, 150), String(message)]
  );
}

async function notifyAdmins(title, message) {
  const [admins] = await db.execute("SELECT id FROM users WHERE role = 'admin' AND status = 'active'");
  for (const admin of admins) await notifyUser(admin.id, title, message);
}

module.exports = { notifyUser, notifyAdmins };
