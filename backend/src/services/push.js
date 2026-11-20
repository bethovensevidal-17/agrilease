const crypto = require('crypto');
const db = require('../db');

// Web Push is optional: without the `web-push` package or VAPID keys, sendPush quietly does nothing
// and the in-app notifications keep working as usual.
let webpush = null;
try { webpush = require('web-push'); } catch { /* package not installed */ }

let configured = false;
function isEnabled() {
  if (!webpush || !process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) return false;
  if (!configured) {
    webpush.setVapidDetails(process.env.VAPID_SUBJECT || 'mailto:admin@agrilease.local', process.env.VAPID_PUBLIC_KEY, process.env.VAPID_PRIVATE_KEY);
    configured = true;
  }
  return true;
}

const hashEndpoint = endpoint => crypto.createHash('sha256').update(String(endpoint)).digest('hex');

async function saveSubscription(userId, subscription) {
  const endpoint = subscription?.endpoint;
  const p256dh = subscription?.keys?.p256dh;
  const auth = subscription?.keys?.auth;
  if (!endpoint || !p256dh || !auth) throw new Error('Invalid push subscription.');
  // One browser belongs to one account at a time: re-saving moves it to the account that is signed in now.
  await db.execute(
    `INSERT INTO push_subscriptions (user_id, endpoint, endpoint_hash, p256dh, auth) VALUES (?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE user_id = VALUES(user_id), p256dh = VALUES(p256dh), auth = VALUES(auth)`,
    [userId, endpoint, hashEndpoint(endpoint), p256dh, auth]
  );
}

async function removeSubscription(userId, endpoint) {
  if (!endpoint) return;
  await db.execute('DELETE FROM push_subscriptions WHERE endpoint_hash = ? AND user_id = ?', [hashEndpoint(endpoint), userId]);
}

async function sendPush(userId, payload) {
  if (!userId || !isEnabled()) return;
  const [subs] = await db.execute('SELECT id, endpoint, p256dh, auth FROM push_subscriptions WHERE user_id = ?', [Number(userId)]);
  const body = JSON.stringify(payload);
  await Promise.all(subs.map(async sub => {
    try {
      await webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, body);
    } catch (error) {
      // 404/410 means the browser removed the subscription.
      if (error.statusCode === 404 || error.statusCode === 410) await db.execute('DELETE FROM push_subscriptions WHERE id = ?', [sub.id]).catch(() => {});
      else console.error('Push delivery failed:', error.statusCode || error.message);
    }
  }));
}

module.exports = { isEnabled, saveSubscription, removeSubscription, sendPush };
