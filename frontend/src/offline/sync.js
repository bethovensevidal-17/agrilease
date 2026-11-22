import { enqueueRequest, releaseHeldItems, saveApiRoot, saveAuthToken } from './idb';
import { API_BASE } from '../api/config';
import { isQueueAllowed } from './features';

export function currentQueueOwner() {
  try {
    const user = JSON.parse(localStorage.getItem('agrilease_user') || 'null');
    return user ? `${user.role || 'user'}:${user.id ?? user.email ?? 'unknown'}` : 'unknown';
  } catch { return 'unknown'; }
}

export function apiRoot() {
  return API_BASE.startsWith('http') ? API_BASE : `${window.location.origin}${API_BASE}`;
}

function absoluteApiUrl(path) {
  return `${apiRoot()}${path}`;
}

export function newRequestId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `req-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}

// True when a failed request looks like "the network/server could not be reached" (not a server rejection).
export function isNetworkFailure(error) {
  if (!navigator.onLine) return true;
  return error instanceof TypeError || /failed to fetch|networkerror|load failed|network request failed/i.test(String(error?.message || ''));
}

export function notifyServiceWorker(message) {
  return navigator.serviceWorker?.ready
    .then(registration => (registration.active || navigator.serviceWorker.controller)?.postMessage(message))
    .catch(() => {});
}

// Ask the service worker to send queued actions. release=true also sends items that were held while offline.
export async function requestSync({ release = false } = {}) {
  try {
    if (release) await releaseHeldItems();
    const registration = await navigator.serviceWorker?.ready;
    if (registration?.sync && !release) {
      try { await registration.sync.register('agrilease-background-sync'); } catch { /* fall through to message */ }
    }
    (registration?.active || navigator.serviceWorker?.controller)?.postMessage({ type: 'FLUSH_BACKGROUND_QUEUE', release });
  } catch (error) {
    console.warn('Could not start offline synchronization:', error);
  }
}

async function queueRequest({ kind, label, method = 'POST', path, body, fields, file, fileField, token, clientRequestId }) {
  if (!isQueueAllowed(kind)) throw new Error('This offline feature is turned off. Turn it on in Offline Access to use it without internet.');
  if (!token) throw new Error('Your saved session is unavailable. Please sign in again when online.');
  const offline = !navigator.onLine;
  await saveAuthToken(token);
  await saveApiRoot(apiRoot());
  await enqueueRequest({
    method,
    path: absoluteApiUrl(path),
    body,
    fields,
    file: file || undefined,
    fileName: file?.name,
    fileField,
    token,
    ownerKey: currentQueueOwner(),
    kind,
    label,
    clientRequestId: clientRequestId || newRequestId(),
    held: offline,
  });
  // While the browser says it is offline, wait for the "online" event instead of sending right away.
  if (!offline) await requestSync();
}

export async function queueMessage(receiverId, message, token) {
  await queueRequest({ kind: 'message', label: 'Chat message', path: '/messages', body: { receiver_id: receiverId, message }, token });
}

export async function queueOfflineBooking(payload, token, clientRequestId) {
  if (payload.payment_method !== 'cash') throw new Error('Only Cash booking requests can be queued while offline.');
  await queueRequest({ kind: 'booking', label: 'Cash booking request', path: '/rentals', body: payload, token, clientRequestId });
  return true;
}

// Owner equipment: text fields plus the optional image are stored together in IndexedDB.
export async function queueOfflineEquipment(fields, imageFile, token, clientRequestId) {
  await queueRequest({
    kind: 'equipment',
    label: `New equipment: ${String(fields.name || '').trim() || 'Untitled'}`,
    path: '/equipment',
    fields,
    file: imageFile,
    fileField: 'image',
    token,
    clientRequestId,
  });
  return true;
}
