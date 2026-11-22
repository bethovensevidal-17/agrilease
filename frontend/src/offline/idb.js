const DB_NAME = 'agrilease-offline-v1';
const DB_VERSION = 2;

function openDb() {
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) {
      reject(new Error('IndexedDB is not available in this browser.'));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('queue')) db.createObjectStore('queue', { keyPath: 'id', autoIncrement: true });
      if (!db.objectStoreNames.contains('settings')) db.createObjectStore('settings');
      if (!db.objectStoreNames.contains('snapshots')) db.createObjectStore('snapshots');
    };
    request.onsuccess = () => {
      const db = request.result;
      db.onversionchange = () => db.close();
      resolve(db);
    };
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error('Close other AgriLease tabs to finish updating offline storage.'));
  });
}

function requestResult(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function settingGet(key) {
  const db = await openDb();
  try { return await requestResult(db.transaction('settings').objectStore('settings').get(key)); }
  finally { db.close(); }
}

export async function settingSet(key, value) {
  const db = await openDb();
  try {
    await new Promise((resolve, reject) => {
      const tx = db.transaction('settings', 'readwrite');
      tx.objectStore('settings').put(value, key);
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error || new Error('Offline settings update was cancelled.'));
    });
  } finally { db.close(); }
}

export async function enqueueRequest(item) {
  const db = await openDb();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction('queue', 'readwrite');
      const request = tx.objectStore('queue').add({
        ...item,
        status: 'pending',
        failed: false,
        attempts: 0,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      let id;
      request.onsuccess = () => { id = request.result; };
      tx.oncomplete = () => resolve(id);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error || new Error('Could not save the offline action.'));
    });
  } finally { db.close(); }
}

export async function readQueue() {
  const db = await openDb();
  try { return (await requestResult(db.transaction('queue').objectStore('queue').getAll())) || []; }
  finally { db.close(); }
}

export async function updateQueueItem(id, updates) {
  const db = await openDb();
  try {
    await new Promise((resolve, reject) => {
      const tx = db.transaction('queue', 'readwrite');
      const store = tx.objectStore('queue');
      const get = store.get(Number(id));
      get.onsuccess = () => {
        if (get.result) store.put({ ...get.result, ...updates, updatedAt: Date.now() });
      };
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error || new Error('Could not update the queued action.'));
    });
  } finally { db.close(); }
}

export async function clearQueueItem(id) {
  const db = await openDb();
  try {
    await new Promise((resolve, reject) => {
      const tx = db.transaction('queue', 'readwrite');
      tx.objectStore('queue').delete(Number(id));
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error || new Error('Could not remove the queued action.'));
    });
  } finally { db.close(); }
}

export async function saveSnapshot(key, value) {
  const db = await openDb();
  try {
    await new Promise((resolve, reject) => {
      const tx = db.transaction('snapshots', 'readwrite');
      tx.objectStore('snapshots').put({ value, savedAt: Date.now() }, key);
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error || new Error('Could not cache this page data.'));
    });
  } finally { db.close(); }
}

export async function getSnapshot(key) {
  const db = await openDb();
  try {
    const record = await requestResult(db.transaction('snapshots').objectStore('snapshots').get(key));
    return record?.value;
  } finally { db.close(); }
}

export async function countSnapshots(prefix) {
  const db = await openDb();
  try {
    const records = await requestResult(db.transaction('snapshots').objectStore('snapshots').getAllKeys());
    return (records || []).filter(key => String(key).startsWith(prefix)).length;
  } finally { db.close(); }
}

// Lahat ng key ng snapshot na nagsisimula sa prefix (ibinabalik ang bahaging kasunod ng prefix: ang API path).
export async function listSnapshotPaths(prefix) {
  const db = await openDb();
  try {
    const keys = (await requestResult(db.transaction('snapshots').objectStore('snapshots').getAllKeys())) || [];
    return keys.map(String).filter(key => key.startsWith(prefix)).map(key => key.slice(prefix.length));
  } finally { db.close(); }
}

// Binubura ang mga snapshot ng account na tugma sa predicate(path). Ibinabalik kung ilan ang nabura.
export async function deleteSnapshotsWhere(prefix, predicate) {
  const db = await openDb();
  try {
    const keys = ((await requestResult(db.transaction('snapshots').objectStore('snapshots').getAllKeys())) || []).map(String);
    const targets = keys.filter(key => key.startsWith(prefix) && predicate(key.slice(prefix.length)));
    if (!targets.length) return 0;
    await new Promise((resolve, reject) => {
      const tx = db.transaction('snapshots', 'readwrite');
      const store = tx.objectStore('snapshots');
      targets.forEach(key => store.delete(key));
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error || new Error('Could not remove the saved data.'));
    });
    return targets.length;
  } finally { db.close(); }
}

export async function saveAuthToken(token) { return settingSet('authToken', token || null); }
export async function saveOfflineFeatures(features) { return settingSet('features', features); }
export async function getOfflineFeatures() { return (await settingGet('features')) || []; }

// Items saved while the browser reported "offline" are held until the browser reports "online"
// again, so they are never sent early (for example when only the page, not the server, is offline).
export async function releaseHeldItems() {
  const items = await readQueue();
  await Promise.all(items.filter(item => item.held).map(item => updateQueueItem(item.id, { held: false })));
}

// After the user signs in again, queued actions that were waiting on an expired session can use the new token.
export async function refreshQueueTokens(ownerKey, token) {
  if (!token) return;
  const items = await readQueue();
  await Promise.all(items
    .filter(item => item.ownerKey === ownerKey && item.status !== 'failed' && !item.failed)
    .map(item => updateQueueItem(item.id, { token, status: 'pending', lastError: item.status === 'auth' ? '' : item.lastError })));
}

export async function saveApiRoot(root) { return settingSet('apiRoot', root); }
