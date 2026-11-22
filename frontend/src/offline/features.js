import { API_BASE } from '../api/config';

// Mga feature na puwedeng piliin ng user para gumana kahit offline.
//  - `match`: mga API path na sine-save sa device (IndexedDB) habang online, para mabasa kahit offline.
//  - `queueKind`: ang offline action na itinatabi sa device at kusang ipinapadala pagbalik ng internet.
//  - `prefetch`: mga API path na ise-save agad kapag pinindot ang "Save selected now".
// Kapag naka-OFF ang feature: hindi na sine-save ang data nito, at hindi tatanggapin ang offline action nito.
const EQUIPMENT_PUBLIC = /^\/equipment(?:\/(?!(?:mine|admin)(?:\/|$))|$)/;

export const OFFLINE_FEATURES = {
  farmer: [
    { id: 'equipment', icon: 'package', title: 'Browse equipment', description: 'Equipment list, details and categories you opened.', match: [EQUIPMENT_PUBLIC, /^\/categories/, /^\/content\/public/], prefetch: ['/equipment', '/categories'] },
    { id: 'rentals', icon: 'clipboard', title: 'My rentals and transactions', description: 'Your bookings and transaction history.', match: [/^\/rentals/], prefetch: ['/rentals/mine', '/rentals'] },
    { id: 'cash-booking', icon: 'sync', title: 'Cash booking requests', description: 'Submit a Cash booking offline. It waits on this device and is sent when you are back online.', queueKind: 'booking' },
    { id: 'messages', icon: 'message', title: 'Chat messages', description: 'Read saved conversations and write messages that send automatically later.', match: [/^\/messages/], queueKind: 'message', prefetch: ['/messages/contacts', '/messages/conversations'] },
    { id: 'notifications', icon: 'bell', title: 'Notifications', description: 'Alerts you already received.', match: [/^\/notifications/], prefetch: ['/notifications'] },
    { id: 'profile', icon: 'user', title: 'My profile', description: 'Your saved profile information.', match: [/^\/profile\//], prefetch: ['/profile/farmer'] },
  ],
  owner: [
    { id: 'equipment', icon: 'package', title: 'My equipment', description: 'Your equipment listings and the category list.', match: [/^\/equipment\/mine/, /^\/categories/], prefetch: ['/equipment/mine', '/categories'] },
    { id: 'add-equipment', icon: 'plus', title: 'Add equipment offline', description: 'Add equipment with its image offline. It waits on this device and is sent when you are back online.', queueKind: 'equipment' },
    { id: 'bookings', icon: 'clipboard', title: 'Bookings and transactions', description: 'Rental bookings and transaction records.', match: [/^\/owner\/bookings/, /^\/rentals/], prefetch: ['/owner/bookings'] },
    { id: 'subscription', icon: 'card', title: 'Subscription plans', description: 'Your plan, available plans and payment history.', match: [/^\/subscriptions\//], prefetch: ['/subscriptions/plans', '/subscriptions/mine', '/subscriptions/payments'] },
    { id: 'payment', icon: 'wallet', title: 'Payment settings', description: 'Your saved GCash and bank details.', match: [/^\/owner\/payment-settings/], prefetch: ['/owner/payment-settings'] },
    { id: 'messages', icon: 'message', title: 'Chat messages', description: 'Read saved conversations and write messages that send automatically later.', match: [/^\/messages/], queueKind: 'message', prefetch: ['/messages/contacts', '/messages/conversations'] },
    { id: 'notifications', icon: 'bell', title: 'Notifications', description: 'Alerts you already received.', match: [/^\/notifications/], prefetch: ['/notifications'] },
  ],
  admin: [
    { id: 'dashboard', icon: 'dashboard', title: 'Dashboard and analytics', description: 'Summary cards, monthly analytics and recent activity.', match: [/^\/admin\/dashboard/, /^\/admin\/analytics/, /^\/admin\/activity/], prefetch: ['/admin/dashboard', '/admin/analytics/monthly', '/admin/activity'] },
    { id: 'users', icon: 'users', title: 'Users and owners', description: 'User list and owner verification records.', match: [/^\/admin\/users/, /^\/admin\/owners/], prefetch: ['/admin/users', '/admin/owners'] },
    { id: 'equipment', icon: 'package', title: 'Equipment management', description: 'Equipment list and categories.', match: [/^\/equipment\/admin/, /^\/categories/], prefetch: ['/equipment/admin', '/categories'] },
    { id: 'rentals', icon: 'clipboard', title: 'Rental reports', description: 'Rental records and rental payment reports.', match: [/^\/admin\/rentals/, /^\/admin\/report-/], prefetch: ['/admin/rentals', '/admin/report-rental-payments'] },
    { id: 'subscriptions', icon: 'card', title: 'Subscriptions', description: 'Owner subscriptions, plans and subscription payments.', match: [/^\/admin\/subscription/], prefetch: ['/admin/subscriptions'] },
    { id: 'content', icon: 'megaphone', title: 'Website content', description: 'Homepage sections and announcements.', match: [/^\/content\/admin/], prefetch: ['/content/admin'] },
    { id: 'notifications', icon: 'bell', title: 'Notifications', description: 'Admin alerts you already received.', match: [/^\/admin\/notifications/, /^\/notifications/], prefetch: ['/admin/notifications'] },
  ],
};

const STORAGE_PREFIX = 'agrilease_offline_off:';

export function currentOfflineUser() {
  try {
    const user = JSON.parse(localStorage.getItem('agrilease_user') || 'null');
    if (!user) return null;
    const ownerKey = `${user.role || 'user'}:${user.id ?? user.email ?? 'unknown'}`;
    return { role: user.role || 'user', ownerKey, prefix: `${ownerKey}:${API_BASE}` };
  } catch { return null; }
}

export function featuresForRole(role) { return OFFLINE_FEATURES[role] || []; }

// Naka-save ang mga PINATAY na feature. Kapag wala pang naka-save, naka-ON ang lahat.
export function readDisabledFeatures(ownerKey) {
  try {
    const list = JSON.parse(localStorage.getItem(STORAGE_PREFIX + ownerKey) || '[]');
    return Array.isArray(list) ? list : [];
  } catch { return []; }
}

function writeDisabledFeatures(ownerKey, list) {
  try { localStorage.setItem(STORAGE_PREFIX + ownerKey, JSON.stringify([...new Set(list)])); } catch { /* storage full or blocked */ }
}

export function setFeatureEnabled(ownerKey, id, enabled) {
  const disabled = readDisabledFeatures(ownerKey).filter(item => item !== id);
  if (!enabled) disabled.push(id);
  writeDisabledFeatures(ownerKey, disabled);
}

export function setAllFeaturesEnabled(ownerKey, role, enabled) {
  writeDisabledFeatures(ownerKey, enabled ? [] : featuresForRole(role).map(feature => feature.id));
}

export function featureForPath(role, path) {
  const clean = String(path || '').split('?')[0];
  return featuresForRole(role).find(feature => (feature.match || []).some(pattern => pattern.test(clean))) || null;
}

// Ginagamit ng api client: sine-save lang ang GET data kung naka-ON ang feature nito.
// Ang path na hindi kabilang sa kahit anong feature (halimbawa, unread count) ay laging sine-save.
export function shouldCacheApiPath(path) {
  const user = currentOfflineUser();
  if (!user) return true;
  const feature = featureForPath(user.role, path);
  if (!feature) return true;
  return !readDisabledFeatures(user.ownerKey).includes(feature.id);
}

// Ginagamit ng offline queue: false kapag pinatay ng user ang feature na may ganitong queueKind.
export function isQueueAllowed(queueKind) {
  const user = currentOfflineUser();
  if (!user) return true;
  const feature = featuresForRole(user.role).find(item => item.queueKind === queueKind);
  if (!feature) return true;
  return !readDisabledFeatures(user.ownerKey).includes(feature.id);
}

// Bilang ng naka-save na pahina/data kada feature. `savedPaths` ay mga path (may query) na naka-save sa device.
export function countSavedByFeature(role, savedPaths) {
  const counts = {};
  for (const path of savedPaths) {
    const feature = featureForPath(role, path);
    if (feature) counts[feature.id] = (counts[feature.id] || 0) + 1;
  }
  return counts;
}
