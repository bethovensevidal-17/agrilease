// Background job: (1) minarkahang expired ang lampas na sa end_date, (2) nagpapadala ng paalala bago mag-expire.
// Tumatakbo tuwing 1 oras. Safe i-run ulit-ulit.
const db = require('../db');
const { notifyUser } = require('./notifications');
const { GRACE_DAYS } = require('./subscriptionAccess');

const fmt = value => new Date(value).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' });

async function expireSubscriptions() {
  const [due] = await db.query(
    "SELECT id, owner_id, end_date FROM subscriptions WHERE status = 'active' AND end_date < NOW()"
  );
  if (!due.length) return 0;
  await db.query("UPDATE subscriptions SET status = 'expired' WHERE status = 'active' AND end_date < NOW()");
  const notified = new Set();
  for (const sub of due) {
    if (notified.has(sub.owner_id)) continue;
    // Huwag abisuhan kung may ibang active na plan na ang owner (early renewal).
    const [[still]] = await db.query(
      "SELECT COUNT(*) AS n FROM subscriptions WHERE owner_id = ? AND status = 'active' AND end_date >= NOW()",
      [sub.owner_id]
    );
    if (Number(still.n) > 0) continue;
    notified.add(sub.owner_id);
    try {
      await notifyUser(
        sub.owner_id,
        'Subscription expired',
        `Your subscription expired on ${fmt(sub.end_date)}. Your listings stay visible for ${GRACE_DAYS} more day(s). Renew to keep renting out your equipment.`,
        '/owner/subscription'
      );
    } catch (error) { console.error('Expiry notification failed:', error.message); }
  }
  return due.length;
}

// Para sa bawat owner, ang plan na pinakahuli ang end_date lang ang pinapaalalahanan (hindi ang mga na-stack na renewal).
async function sendReminders() {
  const base = `
    SELECT s.id, s.owner_id, s.end_date
      FROM subscriptions s
     WHERE s.status = 'active' AND s.end_date >= NOW()
       AND s.end_date <= DATE_ADD(NOW(), INTERVAL ? DAY)
       AND s.__col__ IS NULL
       AND NOT EXISTS (SELECT 1 FROM subscriptions n
                        WHERE n.owner_id = s.owner_id AND n.id <> s.id
                          AND n.status = 'active' AND n.end_date > s.end_date)`;

  const [soon1] = await db.query(base.replace('__col__', 'reminder_1d_sent_at'), [1]);
  for (const sub of soon1) {
    await db.query('UPDATE subscriptions SET reminder_1d_sent_at = NOW(), reminder_7d_sent_at = COALESCE(reminder_7d_sent_at, NOW()) WHERE id = ?', [sub.id]);
    try {
      await notifyUser(sub.owner_id, 'Subscription expires tomorrow', `Your subscription expires on ${fmt(sub.end_date)}. Renew now so your listings stay available to farmers.`, '/owner/subscription');
    } catch (error) { console.error('Reminder failed:', error.message); }
  }

  const [soon7] = await db.query(base.replace('__col__', 'reminder_7d_sent_at'), [7]);
  for (const sub of soon7) {
    await db.query('UPDATE subscriptions SET reminder_7d_sent_at = NOW() WHERE id = ?', [sub.id]);
    try {
      await notifyUser(sub.owner_id, 'Subscription expires in 7 days or less', `Your subscription expires on ${fmt(sub.end_date)}. Renew early to avoid any interruption. Your remaining days are kept.`, '/owner/subscription');
    } catch (error) { console.error('Reminder failed:', error.message); }
  }
  return soon1.length + soon7.length;
}

async function runSubscriptionJobs() {
  try {
    await expireSubscriptions();
    await sendReminders();
  } catch (error) {
    console.error('Subscription job failed:', error.message);
  }
}

function startSubscriptionJobs() {
  setTimeout(runSubscriptionJobs, 15 * 1000).unref();
  setInterval(runSubscriptionJobs, 60 * 60 * 1000).unref();
}

module.exports = { startSubscriptionJobs, runSubscriptionJobs, expireSubscriptions, sendReminders };
