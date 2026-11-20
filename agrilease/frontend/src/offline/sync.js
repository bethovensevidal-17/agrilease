import { enqueueRequest, saveAuthToken } from './idb';
import { API_BASE } from '../api/config';

function currentQueueOwner() {
  try {
    const user = JSON.parse(localStorage.getItem('agrilease_user') || 'null');
    return user ? `${user.role || 'user'}:${user.id ?? user.email ?? 'unknown'}` : 'unknown';
  } catch { return 'unknown'; }
}

function absoluteApiUrl(path) {
  const root = API_BASE.startsWith('http') ? API_BASE : `${window.location.origin}${API_BASE}`;
  return `${root}${path}`;
}

async function requestBackgroundSync() {
  try {
    const registration = await navigator.serviceWorker?.ready;
    if (registration?.sync) await registration.sync.register('agrilease-background-sync');
    else (registration?.active || navigator.serviceWorker?.controller)?.postMessage({ type: 'FLUSH_BACKGROUND_QUEUE' });
  } catch (error) {
    console.warn('Background sync could not be registered:', error);
    navigator.serviceWorker?.controller?.postMessage({ type: 'FLUSH_BACKGROUND_QUEUE' });
  }
}

export async function queueMessage(receiverId, message, token) {
  if (!token) throw new Error('Your saved session is unavailable. Please sign in again when online.');
  await saveAuthToken(token);
  await enqueueRequest({
    method: 'POST',
    path: absoluteApiUrl('/messages'),
    body: { receiver_id: receiverId, message },
    token,
    ownerKey: currentQueueOwner(),
    kind: 'message',
    label: 'Chat message',
  });
  await requestBackgroundSync();
}

export async function queueOfflineBooking(payload, token) {
  if (!token) throw new Error('Your saved session is unavailable. Please sign in again when online.');
  if (payload.payment_method !== 'cash') throw new Error('Only Cash booking requests can be queued while offline.');
  await saveAuthToken(token);
  await enqueueRequest({
    method: 'POST',
    path: absoluteApiUrl('/rentals'),
    body: payload,
    token,
    ownerKey: currentQueueOwner(),
    kind: 'booking',
    label: 'Cash booking request',
  });
  await requestBackgroundSync();
  return true;
}
