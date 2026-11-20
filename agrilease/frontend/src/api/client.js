import { getSnapshot, saveAuthToken, saveSnapshot } from '../offline/idb';
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
  if (user) localStorage.setItem('agrilease_user', JSON.stringify(user));
  else localStorage.removeItem('agrilease_user');
}

export function clearAuth() {
  setToken(null);
  setUser(null);
}

function getSnapshotKey(path) {
  const user = getUser();
  const identity = user ? `${user.role || 'user'}:${user.id ?? user.email ?? 'unknown'}` : 'public';
  return `${identity}:${API_BASE}${path}`;
}

function isCacheableGet(path) {
  return !/\/auth\//i.test(path) && !/\/payments\/\d+\/proof/i.test(path);
}

export async function api(path, { method = 'GET', body, formData } = {}) {
  const headers = {};
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
    throw new Error(data.detail || data.error || data.message || 'May nangyaring error.');
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
