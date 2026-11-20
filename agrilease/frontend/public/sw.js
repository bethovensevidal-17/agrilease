const CACHE_NAME = 'agrilease-shell-v4';
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

async function flushQueue() {
  if (flushPromise) return flushPromise;
  flushPromise = (async () => {
    const db = await openDb();
    try {
      const items = await new Promise((resolve, reject) => {
        const request = db.transaction('queue').objectStore('queue').getAll();
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
      });
      const savedToken = await getSetting(db, 'authToken');
      let processed = 0;

      for (const item of items) {
        if (item.status === 'failed' || item.failed) continue;
        const token = item.token || savedToken;
        if (!token) {
          await updateQueueRecord(db, { ...item, status: 'failed', failed: true, lastError: 'No saved login token. Sign in online and retry this action.' });
          continue;
        }
        try {
          const response = await fetch(item.path, {
            method: item.method,
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: item.method === 'GET' ? undefined : JSON.stringify(item.body || {}),
          });
          if (response.ok) {
            await removeQueueRecord(db, item.id);
            processed += 1;
          } else if (response.status >= 400 && response.status < 500) {
            const result = await response.json().catch(() => ({}));
            const reason = result.message || result.error || `Server rejected the request (HTTP ${response.status}).`;
            await updateQueueRecord(db, { ...item, status: 'failed', failed: true, attempts: (item.attempts || 0) + 1, lastError: reason });
          } else {
            await updateQueueRecord(db, { ...item, status: 'pending', attempts: (item.attempts || 0) + 1, lastError: `Temporary server error (HTTP ${response.status}).` });
            break;
          }
        } catch (error) {
          await updateQueueRecord(db, { ...item, status: 'pending', attempts: (item.attempts || 0) + 1, lastError: error.message || 'Network unavailable. Will retry.' });
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
  })().finally(() => { flushPromise = null; });
  return flushPromise;
}

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
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
  if (event.data?.type === 'FLUSH_BACKGROUND_QUEUE') event.waitUntil(flushQueue());
});

self.addEventListener('sync', event => {
  if (event.tag === 'agrilease-background-sync') event.waitUntil(flushQueue());
});

self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
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
    tag: 'agrilease-notification',
  }));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const target = event.notification.data?.url || '/';
  event.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
    for (const client of clients) {
      if ('focus' in client) {
        client.navigate(target);
        return client.focus();
      }
    }
    return self.clients.openWindow(target);
  }));
});
