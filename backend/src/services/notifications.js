const db = require('../db');
<<<<<<< HEAD

async function notifyUser(userId, title, message, actionUrl = null) {
  if (!userId) return;
  await db.execute(
    'INSERT INTO notifications (user_id, title, message, action_url, is_read) VALUES (?, ?, ?, ?, 0)',
    [Number(userId), String(title).slice(0, 150), String(message), actionUrl]
  );
=======
const { sendPush } = require('./push');

async function notifyUser(userId, title, message, actionUrl = null) {
  if (!userId) return;
  const [inserted] = await db.execute(
    'INSERT INTO notifications (user_id, title, message, action_url, is_read) VALUES (?, ?, ?, ?, 0)',
    [Number(userId), String(title).slice(0, 150), String(message), actionUrl]
  );
  // A unique tag per notification keeps several alerts visible instead of each one replacing the last.
  sendPush(Number(userId), {
    title: String(title).slice(0, 120),
    body: String(message).slice(0, 180),
    url: actionUrl || '/notifications',
    tag: `agrilease-${inserted.insertId}`,
  })
    .catch(error => console.error('Notification push failed:', error.message));
>>>>>>> master
}

async function notifyAdmins(title, message, actionUrl = '/admin/notifications') {
  const [admins] = await db.execute("SELECT id FROM users WHERE role = 'admin' AND status = 'active'");
  for (const admin of admins) await notifyUser(admin.id, title, message, actionUrl);
}

module.exports = { notifyUser, notifyAdmins };
