<<<<<<< HEAD
const CACHE_NAME = 'agrilease-shell-v2';
const APP_SHELL = ['/', '/index.html', '/manifest.webmanifest', '/agrilease-logo.png'];
=======
const CACHE_NAME = 'agrilease-shell-v5';
const APP_SHELL = ['/', '/index.html', '/manifest.webmanifest', '/agrilease-logo.png'];
const DB_NAME = 'agrilease-offline-v1';
const DB_VERSION = 2;
let flushPromise = null;

function openDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('queue')) db.createObjectStore('queue', { keyPath: 'id', autoIncrement: true });
      if (!db.objectStoreNames.contains('settings')) db.createObjectStore('settings');
      if (!db.objectStoreNames.contains('snapshots')) db.createObjectStore('snapshots');
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function getSetting(db, key) {
  return new Promise((resolve, reject) => {
    const request = db.transaction('settings').objectStore('settings').get(key);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function updateQueueRecord(db, item) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('queue', 'readwrite');
    tx.objectStore('queue').put({ ...item, updatedAt: Date.now() });
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
}

function removeQueueRecord(db, id) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('queue', 'readwrite');
    tx.objectStore('queue').delete(id);
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
}

// A queued item is retried later (never marked failed) for these temporary server responses.
const RETRYABLE_STATUS = [408, 425, 429];
const HELD_RELEASE_AFTER_MS = 20000;

function buildRequestInit(item, token) {
  const headers = { Authorization: `Bearer ${token}` };
  if (item.clientRequestId) headers['X-Idempotency-Key'] = item.clientRequestId;
  if (item.method === 'GET') return { method: 'GET', headers };
  if (item.fields) {
    // Multipart (for example equipment with an image). The browser sets the boundary header itself.
    const data = new FormData();
    Object.entries(item.fields).forEach(([key, value]) => data.append(key, value == null ? '' : String(value)));
    if (item.file) data.append(item.fileField || 'file', item.file, item.fileName || 'upload');
    return { method: item.method, headers, body: data };
  }
  headers['Content-Type'] = 'application/json';
  return { method: item.method, headers, body: JSON.stringify(item.body || {}) };
}

async function readErrorReason(response) {
  const result = await response.json().catch(() => ({}));
  if (Array.isArray(result.errors) && result.errors.length) return { reason: result.errors.join(' '), result };
  return { reason: result.message || result.error || `Server rejected the request (HTTP ${response.status}).`, result };
}

// release=true: the page reported "online", so items held while offline may be sent now.
// fromSyncEvent=true: the browser fired Background Sync; held items are only sent once they have waited a while.
async function flushQueue({ release = false, fromSyncEvent = false } = {}) {
  if (flushPromise) {
    // A run is already in progress. If this request also releases held items, run once more right after it.
    const current = flushPromise;
    return release ? current.then(() => flushQueue({ release, fromSyncEvent })) : current;
  }
  flushPromise = (async () => {
    const db = await openDb();
    let retryNeeded = false;
    try {
      const items = (await new Promise((resolve, reject) => {
        const request = db.transaction('queue').objectStore('queue').getAll();
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
      })).sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
      const savedToken = await getSetting(db, 'authToken');
      let processed = 0;

      for (const item of items) {
        if (item.status === 'failed' || item.failed || item.status === 'auth') continue;
        if (item.held && !release && !(fromSyncEvent && Date.now() - (item.createdAt || 0) > HELD_RELEASE_AFTER_MS)) continue;
        const token = item.token || savedToken;
        if (!token) {
          await updateQueueRecord(db, { ...item, status: 'auth', lastError: 'Sign in again (online) to finish syncing this action.' });
          continue;
        }
        try {
          const response = await fetch(item.path, buildRequestInit(item, token));
          if (response.ok) {
            await removeQueueRecord(db, item.id);
            processed += 1;
          } else if (response.status === 401) {
            await updateQueueRecord(db, { ...item, held: false, status: 'auth', attempts: (item.attempts || 0) + 1, lastError: 'Your saved session expired. Sign in again (online) and this action will sync automatically.' });
          } else if (response.status === 409 || (response.status >= 400 && response.status < 500 && !RETRYABLE_STATUS.includes(response.status))) {
            const { reason, result } = await readErrorReason(response);
            if (result.code === 'REQUEST_IN_PROGRESS') {
              await updateQueueRecord(db, { ...item, held: false, status: 'pending', lastError: 'The server is still processing this action. Will retry.' });
              retryNeeded = true;
              break;
            }
            await updateQueueRecord(db, { ...item, held: false, status: 'failed', failed: true, attempts: (item.attempts || 0) + 1, lastError: reason });
          } else {
            await updateQueueRecord(db, { ...item, held: false, status: 'pending', attempts: (item.attempts || 0) + 1, lastError: `Temporary server error (HTTP ${response.status}).` });
            retryNeeded = true;
            break;
          }
        } catch (error) {
          await updateQueueRecord(db, { ...item, status: 'pending', attempts: (item.attempts || 0) + 1, lastError: error.message || 'Network unavailable. Will retry.' });
          retryNeeded = true;
          break;
        }
      }
      const remaining = await new Promise((resolve, reject) => {
        const request = db.transaction('queue').objectStore('queue').getAll();
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
      });
      const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      clients.forEach(client => client.postMessage({
        type: 'BACKGROUND_SYNC_COMPLETE',
        processed,
        pending: remaining.filter(item => item.status !== 'failed' && !item.failed).length,
        failed: remaining.filter(item => item.status === 'failed' || item.failed).length,
      }));
    } finally {
      db.close();
    }
    return retryNeeded;
  })().finally(() => { flushPromise = null; });
  return flushPromise;
}
>>>>>>> master

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
<<<<<<< HEAD
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key)))).then(() => self.clients.claim()));
=======
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => (key.startsWith('agrilease-shell-') && key !== CACHE_NAME) || key === 'agrilease-selected-features-v1').map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', event => {
  if (event.data?.type === 'SET_AUTH_TOKEN') {
    event.waitUntil((async () => {
      const db = await openDb();
      try {
        await new Promise((resolve, reject) => {
          const tx = db.transaction('settings', 'readwrite');
          tx.objectStore('settings').put(event.data.token || null, 'authToken');
          tx.oncomplete = resolve;
          tx.onerror = () => reject(tx.error);
        });
      } finally { db.close(); }
    })());
  }
  if (event.data?.type === 'FLUSH_BACKGROUND_QUEUE') event.waitUntil(flushQueue({ release: Boolean(event.data.release) }));
});

self.addEventListener('sync', event => {
  if (event.tag !== 'agrilease-background-sync') return;
  // Rejecting makes the browser retry this sync later when some actions could not reach the server yet.
  event.waitUntil(flushQueue({ fromSyncEvent: true }).then(retryNeeded => {
    if (retryNeeded) throw new Error('Some queued actions are still waiting for the server.');
  }));
>>>>>>> master
});

self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
<<<<<<< HEAD
  // Never cache API calls, uploads, authenticated data, or non-GET requests.
  if (request.method !== 'GET' || url.origin !== self.location.origin || url.pathname.startsWith('/api/') || url.pathname.startsWith('/uploads/')) return;
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).then(response => {
      const copy = response.clone();
      caches.open(CACHE_NAME).then(cache => cache.put('/index.html', copy));
      return response;
    }).catch(() => caches.match('/index.html').then(cached => cached || caches.match('/'))));
    return;
  }
  event.respondWith(caches.match(request).then(cached => cached || fetch(request).then(response => {
    if (response.ok) { const copy = response.clone(); caches.open(CACHE_NAME).then(cache => cache.put(request, copy)); }
    return response;
  })));
=======
  if (request.method !== 'GET' || url.pathname.startsWith('/uploads/')) return;
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/')) return; // Authenticated JSON is cached per account by the API client in IndexedDB.

  event.respondWith((async () => {
    if (request.mode === 'navigate') {
      try {
        const response = await fetch(request);
        if (response.ok) await (await caches.open(CACHE_NAME)).put('/index.html', response.clone());
        return response;
      } catch {
        return (await caches.match('/index.html')) || (await caches.match('/')) || new Response('AgriLease is unavailable offline. Open it once while online first.', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
      }
    }
    const cached = await caches.match(request);
    if (cached) return cached;
    try {
      const response = await fetch(request);
      if (response.ok) await (await caches.open(CACHE_NAME)).put(request, response.clone());
      return response;
    } catch {
      return new Response('This file is not cached yet. Open this page while online first.', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
    }
  })());
});

self.addEventListener('push', event => {
  let data = { title: 'AgriLease', body: 'You have a new notification.', url: '/notifications' };
  try { if (event.data) data = { ...data, ...event.data.json() }; }
  catch { if (event.data) data.body = event.data.text(); }
  event.waitUntil(self.registration.showNotification(data.title, {
    body: data.body,
    icon: '/agrilease-logo.png',
    badge: '/agrilease-logo.png',
    data: { url: data.url || '/' },
    // A unique tag per alert so several notifications can be shown; the same tag replaces a duplicate delivery.
    tag: data.tag || `agrilease-${Date.now()}`,
    renotify: true,
  }));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const raw = event.notification.data?.url || '/';
  const target = new URL(raw, self.location.origin).href;
  event.waitUntil((async () => {
    const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of clients) {
      if (new URL(client.url).origin !== self.location.origin) continue;
      try {
        await client.focus();
        // Tell the open app to navigate in-app (keeps React Router state, no full reload).
        client.postMessage({ type: 'NOTIFICATION_NAVIGATE', url: new URL(target).pathname + new URL(target).search });
        return;
      } catch { /* try the next window, or open a new one */ }
    }
    await self.clients.openWindow(target);
  })());
});

// The browser may rotate a push subscription; re-subscribe and tell the server so alerts keep arriving.
self.addEventListener('pushsubscriptionchange', event => {
  event.waitUntil((async () => {
    const db = await openDb();
    let apiRoot; let token;
    try { apiRoot = await getSetting(db, 'apiRoot'); token = await getSetting(db, 'authToken'); } finally { db.close(); }
    if (!apiRoot || !token) return;
    const keyResponse = await fetch(`${apiRoot}/push/public-key`);
    const key = await keyResponse.json();
    if (!key.enabled || !key.publicKey) return;
    const padding = '='.repeat((4 - key.publicKey.length % 4) % 4);
    const raw = atob((key.publicKey + padding).replace(/-/g, '+').replace(/_/g, '/'));
    const subscription = await self.registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: Uint8Array.from(raw, c => c.charCodeAt(0)) });
    await fetch(`${apiRoot}/push/subscribe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ subscription: subscription.toJSON() }),
    });
  })().catch(() => {}));
>>>>>>> master
});
