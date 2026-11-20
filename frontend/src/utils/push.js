import { API_BASE } from '../api/config';

function authHeaders(token) {
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
}

// A push subscription belongs to one browser, but the server ties it to one user account.
// Re-registering it after sign-in moves it to the account that is signed in now, so alerts
// are never delivered to someone who previously used the same browser.
export async function resyncPushSubscription() {
  try {
    const token = localStorage.getItem('agrilease_token');
    if (!token || !('serviceWorker' in navigator) || !('PushManager' in window)) return;
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    if (!subscription) return;
    await fetch(`${API_BASE}/push/subscribe`, {
      method: 'POST',
      headers: authHeaders(token),
      body: JSON.stringify({ subscription: subscription.toJSON() }),
    });
  } catch (error) {
    console.warn('Push subscription could not be refreshed:', error);
  }
}

// Called on sign-out: stop sending this account's alerts to this browser.
export async function removePushSubscription(token) {
  try {
    if (!token || !('serviceWorker' in navigator) || !('PushManager' in window)) return;
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    if (!subscription) return;
    await fetch(`${API_BASE}/push/subscribe`, {
      method: 'DELETE',
      headers: authHeaders(token),
      body: JSON.stringify({ endpoint: subscription.endpoint }),
    });
  } catch (error) {
    console.warn('Push subscription could not be removed:', error);
  }
}

function urlBase64ToUint8Array(base64) {
  const padding = '='.repeat((4 - base64.length % 4) % 4);
  const raw = atob((base64 + padding).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(raw, char => char.charCodeAt(0));
}

// Asks permission, subscribes this browser, and saves the subscription for the signed-in account.
// Returns a short message for the page to show.
export async function enablePushNotifications() {
  const token = localStorage.getItem('agrilease_token');
  if (!token) return 'Sign in first.';
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || typeof Notification === 'undefined') return 'This browser does not support push notifications.';
  if (!navigator.onLine) return 'Connect to the internet to turn on push notifications.';
  const keyResponse = await fetch(`${API_BASE}/push/public-key`);
  const key = await keyResponse.json().catch(() => ({}));
  if (!key.enabled || !key.publicKey) return 'Push notifications are not set up on the server yet (VAPID keys are missing).';
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return 'Notification permission was not granted.';
  const registration = await navigator.serviceWorker.ready;
  const subscription = (await registration.pushManager.getSubscription())
    || await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(key.publicKey) });
  const response = await fetch(`${API_BASE}/push/subscribe`, { method: 'POST', headers: authHeaders(token), body: JSON.stringify({ subscription: subscription.toJSON() }) });
  return response.ok ? 'Push notifications are on for this browser.' : 'Could not save the push subscription.';
}
