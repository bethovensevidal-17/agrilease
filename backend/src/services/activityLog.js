const db = require('../db');

// Turns an API write request into a plain-language sentence for the Activity Log.
// Returns { text, category } or null when the request should not be logged.
const num = (value) => (value ? `#${value}` : '');

const RULES = [
  // Account
  ['POST', /^\/auth\/logout$/, () => ['Logged out', 'account']],
  ['PATCH', /^\/profile\/(farmer|owner)$/, () => ['Updated profile information', 'account']],
  ['PATCH', /^\/admin\/profile$/, () => ['Updated profile information', 'account']],
  ['PUT', /^\/owner\/payment-settings$/, () => ['Updated payment settings', 'account']],
  ['POST', /^\/push\/subscribe$/, () => ['Turned on push notifications', 'account']],
  ['DELETE', /^\/push\/subscribe$/, () => ['Turned off push notifications', 'account']],

  // Bookings
  ['POST', /^\/rentals$/, () => ['Submitted a rental request', 'bookings']],
  ['PATCH', /^\/rentals\/(\d+)\/cancel$/, (m) => [`Cancelled booking ${num(m[1])}`, 'bookings']],
  ['PATCH', /^\/rentals\/(\d+)\/archive$/, (m) => [`Archived booking ${num(m[1])}`, 'bookings']],
  ['PATCH', /^\/rentals\/(\d+)\/restore$/, (m) => [`Restored booking ${num(m[1])}`, 'bookings']],
  ['PATCH', /^\/(?:rentals|owner\/bookings)\/(\d+)\/status$/, (m, req) => {
    const labels = { approved: 'Approved', rejected: 'Rejected', ongoing: 'Started', completed: 'Completed' };
    const verb = labels[String(req?.body?.status || '').toLowerCase()] || 'Updated';
    return [`${verb} booking ${num(m[1])}`, 'bookings'];
  }],
  ['PATCH', /^\/owner\/bookings\/(\d+)\/payment$/, (m) => [`Updated payment of booking ${num(m[1])}`, 'payments']],

  // Equipment
  ['POST', /^\/equipment$/, () => ['Added new equipment', 'equipment']],
  ['PUT', /^\/equipment\/(\d+)$/, (m) => [`Edited equipment ${num(m[1])}`, 'equipment']],
  ['PATCH', /^\/equipment\/(\d+)\/archive$/, (m) => [`Archived equipment ${num(m[1])}`, 'equipment']],
  ['PATCH', /^\/equipment\/(\d+)\/restore$/, (m) => [`Restored equipment ${num(m[1])}`, 'equipment']],
  ['PATCH', /^\/equipment\/(\d+)\/approval$/, (m, req) => {
    const verb = req?.body?.approval_status === 'rejected' ? 'Rejected' : 'Approved';
    return [`${verb} equipment listing ${num(m[1])}`, 'equipment'];
  }],

  // Subscriptions and payments
  ['POST', /^\/subscriptions\/request$/, () => ['Requested a subscription plan', 'payments']],
  ['POST', /^\/admin\/subscription-plans$/, () => ['Created a subscription plan', 'payments']],
  ['PATCH', /^\/admin\/subscription-plans\/(\d+)$/, (m) => [`Updated subscription plan ${num(m[1])}`, 'payments']],
  ['POST', /^\/admin\/subscriptions$/, () => ['Assigned a subscription to an owner', 'payments']],
  ['PATCH', /^\/admin\/subscriptions\/(\d+)$/, (m) => [`Updated subscription ${num(m[1])}`, 'payments']],
  ['PATCH', /^\/admin\/subscription-payments\/(\d+)\/verify$/, (m, req) => {
    const verb = String(req?.body?.status || '').toLowerCase() === 'rejected' ? 'Rejected' : 'Verified';
    return [`${verb} subscription payment ${num(m[1])}`, 'payments'];
  }],

  // Messages and notifications
  ['POST', /^\/messages$/, () => ['Sent a message', 'messages']],
  ['PATCH', /^\/notifications\/read-all$/, () => ['Marked all notifications as read', 'notifications']],
  ['PATCH', /^\/notifications\/(\d+)\/read$/, () => ['Read a notification', 'notifications']],
  ['PATCH', /^\/notifications\/(\d+)\/archive$/, () => ['Archived a notification', 'notifications']],
  ['PATCH', /^\/notifications\/(\d+)\/restore$/, () => ['Restored a notification', 'notifications']],
  ['PATCH', /^\/admin\/notifications\/read-all$/, () => ['Marked all notifications as read', 'notifications']],
  ['PATCH', /^\/admin\/notifications\/(\d+)\/read$/, () => ['Read a notification', 'notifications']],

  // Administration
  ['PATCH', /^\/admin\/owners\/(\d+)\/verify$/, (m, req) => {
    const verb = String(req?.body?.status || '').toLowerCase() === 'rejected' ? 'Rejected' : 'Verified';
    return [`${verb} owner application ${num(m[1])}`, 'admin'];
  }],
  ['PATCH', /^\/admin\/users\/(\d+)\/status$/, (m, req) => {
    const status = String(req?.body?.status || '').toLowerCase();
    const labels = { active: 'Activated', suspended: 'Suspended', rejected: 'Rejected', pending: 'Set to pending' };
    return [`${labels[status] || 'Changed the status of'} user account ${num(m[1])}`, 'admin'];
  }],
  ['POST', /^\/content\/homepage$/, () => ['Created website content', 'admin']],
  ['PUT', /^\/content\/homepage\/(\d+)$/, () => ['Edited website content', 'admin']],
  ['PATCH', /^\/content\/homepage\/(\d+)\/archive$/, () => ['Archived website content', 'admin']],
  ['PATCH', /^\/content\/homepage\/(\d+)\/restore$/, () => ['Restored website content', 'admin']],
  ['POST', /^\/content\/announcements$/, () => ['Posted an announcement', 'admin']],
  ['PUT', /^\/content\/announcements\/(\d+)$/, () => ['Edited an announcement', 'admin']],
  ['PATCH', /^\/content\/announcements\/(\d+)\/archive$/, () => ['Archived an announcement', 'admin']],
  ['PATCH', /^\/content\/announcements\/(\d+)\/restore$/, () => ['Restored an announcement', 'admin']],
];

function describeRequest(method, originalUrl, req) {
  const path = String(originalUrl || '').split('?')[0].replace(/^\/api/, '').replace(/\/+$/, '') || '/';
  const verb = String(method || '').toUpperCase();
  for (const [ruleMethod, pattern, build] of RULES) {
    if (ruleMethod !== verb) continue;
    const match = path.match(pattern);
    if (match) {
      const [text, category] = build(match, req);
      return { text, category };
    }
  }
  return { text: 'Made a change in the system', category: 'general' };
}

const CATEGORY_WORDS = [
  ['account', /logged (in|out)|login attempt|profile|payment settings|push notifications|account registered|registered/i],
  ['bookings', /booking|rental request/i],
  ['equipment', /equipment/i],
  ['payments', /subscription|payment/i],
  ['messages', /message/i],
  ['notifications', /notification/i],
  ['admin', /owner application|user account|website content|announcement/i],
];

function categoryOf(text) {
  const hit = CATEGORY_WORDS.find(([, pattern]) => pattern.test(text));
  return hit ? hit[0] : 'general';
}

// Older log rows were saved as raw text like "owner PATCH /api/rentals/5/status".
// Convert them to the same readable wording so the whole history looks consistent.
function readableAction(action) {
  const raw = String(action || '').trim();
  const legacy = raw.match(/^(farmer|owner|admin)\s+(GET|POST|PUT|PATCH|DELETE)\s+(\S+)$/i);
  if (legacy) return describeRequest(legacy[2], legacy[3]).text;
  const loggedIn = raw.match(/^(farmer|owner|admin)\s+logged in$/i);
  if (loggedIn) return 'Logged in';
  const registered = raw.match(/^(farmer|owner|admin)\s+account registered$/i);
  if (registered) {
    const kind = registered[1].toLowerCase();
    return `Registered ${kind === 'owner' ? 'an' : 'a'} ${kind} account`;
  }
  return raw || 'System event';
}

async function logActivity(userId, action) {
  try {
    await db.execute('INSERT INTO activity_logs (user_id, action) VALUES (?, ?)', [userId, String(action).slice(0, 255)]);
  } catch (error) {
    console.error('Activity log insert failed:', error.message);
  }
}

module.exports = { describeRequest, readableAction, categoryOf, logActivity };
