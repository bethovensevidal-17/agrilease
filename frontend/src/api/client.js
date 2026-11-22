import { getSnapshot, refreshQueueTokens, saveAuthToken, saveSnapshot } from '../offline/idb';
import { shouldCacheApiPath } from '../offline/features';
import { removePushSubscription, resyncPushSubscription } from '../utils/push';
import { API_BASE } from './config';

export function getToken() {
  return localStorage.getItem('agrilease_token');
}

export function setToken(token) {
  if (token) {
    localStorage.setItem('agrilease_token', token);
    saveAuthToken(token).catch(error => console.warn('Unable to sync offline session token:', error));
    navigator.serviceWorker?.controller?.postMessage({ type: 'SET_AUTH_TOKEN', token });
  } else {
    localStorage.removeItem('agrilease_token');
    saveAuthToken(null).catch(error => console.warn('Unable to clear offline session token:', error));
    navigator.serviceWorker?.controller?.postMessage({ type: 'SET_AUTH_TOKEN', token: null });
  }
}

export function getUser() {
  try {
    const user = localStorage.getItem('agrilease_user');
    return user ? JSON.parse(user) : null;
  } catch {
    return null;
  }
}

export function setUser(user) {
  if (user) {
    localStorage.setItem('agrilease_user', JSON.stringify(user));
    // Signing in again lets queued actions that were waiting on an expired session continue.
    const ownerKey = `${user.role || 'user'}:${user.id ?? user.email ?? 'unknown'}`;
    refreshQueueTokens(ownerKey, getToken())
      .then(() => navigator.serviceWorker?.ready.then(registration => (registration.active || navigator.serviceWorker.controller)?.postMessage({ type: 'FLUSH_BACKGROUND_QUEUE', release: navigator.onLine })))
      .catch(error => console.warn('Unable to refresh queued sessions:', error));
    resyncPushSubscription();
  } else localStorage.removeItem('agrilease_user');
}

export function clearAuth() {
  // Stop push alerts for this account on this browser before the token is removed.
  removePushSubscription(getToken());
  setToken(null);
  setUser(null);
}

// Tells the server about the logout (so it appears in the Activity Log), then clears the session.
// Never blocks the user: if the server cannot be reached the session is still cleared.
export async function signOut() {
  const token = getToken();
  if (token && navigator.onLine) {
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 2500);
    try {
      await fetch(`${API_BASE}/auth/logout`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, signal: controller.signal });
    } catch { /* continue logging out locally */ }
    window.clearTimeout(timer);
  }
  clearAuth();
}

function getSnapshotKey(path) {
  const user = getUser();
  const identity = user ? `${user.role || 'user'}:${user.id ?? user.email ?? 'unknown'}` : 'public';
  return `${identity}:${API_BASE}${path}`;
}

function isCacheableGet(path) {
  return !/\/auth\//i.test(path) && !/\/payments\/\d+\/proof/i.test(path) && shouldCacheApiPath(path);
}

export async function api(path, { method = 'GET', body, formData, headers: extraHeaders } = {}) {
  const headers = { ...(extraHeaders || {}) };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  let payload;
  if (formData) payload = formData;
  else if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }

  const normalizedMethod = method.toUpperCase();
  const snapshotKey = normalizedMethod === 'GET' && isCacheableGet(path) ? getSnapshotKey(path) : null;
  let response;
  try {
    response = await fetch(API_BASE + path, { method: normalizedMethod, headers, body: payload });
  } catch (networkError) {
    if (snapshotKey) {
      try {
        const cached = await getSnapshot(snapshotKey);
        if (cached !== undefined) return cached;
      } catch (cacheError) {
        console.warn('Unable to read cached AgriLease data:', cacheError);
      }
    }
    throw networkError;
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    // Na-suspend ang account habang naka-login: ipakita lang ang reason sa login page.
    if (response.status === 403 && data.suspended) {
      clearAuth();
      sessionStorage.setItem('agrilease_login_notice', data.message || data.error || 'Your account has been suspended.');
      window.location.href = '/login';
      throw new Error(data.message || data.error);
    }
    const failure = new Error(data.detail || data.error || data.message || (Array.isArray(data.errors) && data.errors.join(' ')) || 'May nangyaring error.');
    failure.errors = data.errors;
    failure.status = response.status;
    throw failure;
  }
  if (snapshotKey) {
    saveSnapshot(snapshotKey, data).catch(error => console.warn('Unable to cache offline data:', error));
  }
  return data;
}

export async function getAuthenticatedFile(path) {
  const token = getToken();
  const response = await fetch(API_BASE + path, {
    method: 'GET',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.message || data.error || 'Unable to open document.');
  }
  return response.blob();
}
