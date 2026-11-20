import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { clearQueueItem, countSnapshots, readQueue, updateQueueItem } from '../offline/idb';
import { getToken, getUser } from '../api/client';
import { requestSync } from '../offline/sync';
import { enablePushNotifications } from '../utils/push';
import './offline-settings.css';

const ROLE_GUIDANCE = {
  farmer: {
    title: 'Farmer Offline Access',
    intro: 'Maaari mong buksan ang AgriLease gamit ang dati mong naka-login na session. Ang mga GET data na nabuksan habang online ay awtomatikong sine-save sa device.',
    available: ['Previously loaded equipment and public pages', 'Previously synchronized rentals, transactions, and profile information', 'Create a Cash booking request and keep it pending on this device'],
    limits: ['Hindi pa official ang offline booking at hindi pa reserved ang equipment hangga’t hindi ito validated at na-save ng server.', 'GCash at Bank Transfer submissions require internet.', 'Hindi available ang unang login habang offline.'],
  },
  owner: {
    title: 'Owner Offline Access',
    intro: 'Makikita mo offline ang dati nang na-load na dashboard at records. Puwede ka ring mag-add ng bagong equipment: mase-save ito sa device at awtomatikong ipapadala kapag may internet na.',
    available: ['Previously loaded dashboard and equipment information', 'Previously synchronized bookings and transactions', 'Add new equipment (with image) and keep it pending on this device'],
    limits: ['Hindi puwedeng mag-approve/reject o magpalit ng booking status offline.', 'Hindi mase-save ang equipment edits, archive, payment, o subscription changes offline.', 'Ang bagong equipment na na-save offline ay hindi pa nakalista hangga’t hindi ito natatanggap ng server at naaprubahan ng Admin.', 'Kailangan mong nabuksan ang Add Equipment page habang online kahit minsan para ma-save ang category list.'],
  },
  admin: {
    title: 'Admin Offline Access',
    intro: 'Read-only monitoring ang offline mode. Ang dati nang na-load na dashboard at reports ay naka-save sa kasalukuyang browser account.',
    available: ['Previously loaded dashboard and analytics', 'Previously synchronized reports and activity information', 'Previously loaded user and equipment lists'],
    limits: ['Hindi puwedeng mag-approve/reject ng accounts, equipment, payments, o subscriptions offline.', 'Hindi mase-save ang administrative changes offline.', 'I-refresh ang reports kapag bumalik ang internet.'],
  },
};

export default function OfflineSettings() {
  const user = getUser();
  const role = user?.role || 'farmer';
  const guidance = ROLE_GUIDANCE[role] || ROLE_GUIDANCE.farmer;
  const [online, setOnline] = useState(() => navigator.onLine);
  const [queue, setQueue] = useState([]);
  const [cachedCount, setCachedCount] = useState(0);
  const [message, setMessage] = useState('');
  const [busyId, setBusyId] = useState(null);

  const refreshStatus = useCallback(async () => {
    try {
      const identity = `${user?.role || 'user'}:${user?.id ?? user?.email ?? 'unknown'}:`;
      const ownerKey = `${user?.role || 'user'}:${user?.id ?? user?.email ?? 'unknown'}`;
      const [items, snapshots] = await Promise.all([readQueue(), countSnapshots(identity)]);
      setQueue(items.filter(item => !item.ownerKey || item.ownerKey === ownerKey));
      setCachedCount(snapshots);
    } catch (error) {
      setMessage(error.message || 'Hindi mabasa ang offline storage.');
    }
  }, [user?.role, user?.id, user?.email]);

  useEffect(() => {
    refreshStatus();
    const onOnline = () => {
      setOnline(true);
      setMessage('May internet na. Sinusubukang i-sync ang pending actions.');
      requestSync({ release: true });
      window.setTimeout(refreshStatus, 1200);
    };
    const onOffline = () => {
      setOnline(false);
      setMessage('Offline ka ngayon. Ang saved records ay read-only; ang Cash booking (Farmer) at bagong equipment (Owner) ay mananatiling pending sa device.');
    };
    const onMessage = event => {
      if (event.data?.type === 'BACKGROUND_SYNC_COMPLETE') {
        setMessage(`${event.data.processed || 0} action(s) synced · ${event.data.pending || 0} pending · ${event.data.failed || 0} failed.`);
        refreshStatus();
      }
    };
    const onSyncComplete = event => onMessage({ data: event.detail });
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    window.addEventListener('agrilease:sync-complete', onSyncComplete);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
      window.removeEventListener('agrilease:sync-complete', onSyncComplete);
    };
  }, [refreshStatus]);

  const pending = useMemo(() => queue.filter(item => item.status !== 'failed' && !item.failed), [queue]);
  const failed = useMemo(() => queue.filter(item => item.status === 'failed' || item.failed), [queue]);

  async function retryItem(item) {
    const token = getToken();
    if (!token) {
      setMessage('Walang active saved session. Mag-login muna online bago i-retry ang action.');
      return;
    }
    setBusyId(item.id);
    try {
      await updateQueueItem(item.id, { token, status: 'pending', failed: false, lastError: '', held: !navigator.onLine });
      await refreshStatus();
      if (!navigator.onLine) {
        setMessage('Naka-queue na ulit. Awtomatikong susubukan kapag bumalik ang internet.');
      } else {
        requestSync({ release: true });
        setMessage('Sinusubukang ipadala ulit sa server.');
      }
    } catch (error) {
      setMessage(error.message || 'Hindi na-retry ang action.');
    } finally { setBusyId(null); }
  }

  async function turnOnPush() {
    try { setMessage(await enablePushNotifications()); }
    catch (error) { setMessage(error.message || 'Could not turn on push notifications.'); }
  }

  async function discardItem(item) {
    if (!await window.agrileaseDialog.confirm('Remove this pending action from this device? It will not be sent to the server.', { title: 'Remove pending action', confirmText: 'Remove' })) return;
    setBusyId(item.id);
    try {
      await clearQueueItem(item.id);
      await refreshStatus();
      setMessage('Inalis ang queued action sa device.');
    } catch (error) {
      setMessage(error.message || 'Hindi maalis ang queued action.');
    } finally { setBusyId(null); }
  }

  return (
    <main className="offline-settings-page">
      <header className="offline-settings-header">
        <div>
          <p className="offline-eyebrow">AGRILEASE · {role.toUpperCase()} PORTAL</p>
          <h1>{guidance.title}</h1>
          <p className="offline-intro">{guidance.intro}</p>
          <Link className="offline-back-link" to={`/${role}`}>Back to dashboard</Link>
        </div>
        <span className={`offline-connection ${online ? 'is-online' : 'is-offline'}`}>
          <span className="offline-connection-dot" />{online ? 'Online' : 'Offline'}
        </span>
      </header>

      <section className="offline-summary-grid">
        <article className="offline-summary-card"><span>Saved API data</span><strong>{cachedCount}</strong><small>Cached records / pages for this account</small></article>
        <article className="offline-summary-card"><span>Pending sync</span><strong>{pending.length}</strong><small>Waiting to reach the server</small></article>
        <article className="offline-summary-card"><span>Needs review</span><strong>{failed.length}</strong><small>Rejected or failed actions</small></article>
      </section>

      <section className="offline-feature-section">
        <div className="offline-section-heading"><div><h2>Available offline</h2><p>Automatic ang caching habang online at ginagamit mo ang bawat page.</p></div></div>
        <div className="offline-feature-grid">
          {guidance.available.map((item, index) => (
            <article className="offline-feature-card is-selected" key={item}>
              <span className="offline-feature-icon">{index === 0 ? '📥' : index === 1 ? '📋' : '🔄'}</span>
              <span className="offline-feature-copy"><span className="offline-feature-title">{item}</span><span className="offline-feature-description">Kailangan munang mabuksan habang online para ma-save ang pinakabagong data sa device.</span></span>
              <span className="offline-card-state">Automatic cache</span>
            </article>
          ))}
        </div>
      </section>

      <section className="offline-limit-note"><strong>Importanteng limitasyon</strong><ul>{guidance.limits.map(item => <li key={item}>{item}</li>)}</ul></section>

      {role === 'farmer' && <section className="offline-howto"><strong>Cash booking synchronization</strong><p>Kapag nag-submit ka ng Cash booking habang offline, mase-save ito bilang Pending Sync sa device. Hindi pa ito official at hindi pa reserved ang equipment. Kapag bumalik ang internet, ibe-verify ng server ang schedule, availability, quantity, at account bago ito maging official booking.</p></section>}

      {role === 'owner' && <section className="offline-howto"><strong>Equipment synchronization</strong><p>Kapag nag-add ka ng equipment habang offline, mase-save ito (kasama ang image) bilang Pending Sync sa device. Hindi pa ito nakalista sa server. Kapag bumalik ang internet, awtomatiko itong ipapadala; kung tanggap, mapupunta ito sa Admin approval.</p></section>}

      <section className="offline-howto offline-queue-section">
        <div className="offline-queue-heading"><div><strong>Synchronization queue</strong><p>{pending.length} pending · {failed.length} needs review</p></div><div className="offline-queue-tools"><button type="button" className="offline-save-button" onClick={turnOnPush}>Turn on push notifications</button><button type="button" className="offline-save-button" onClick={refreshStatus}>Refresh status</button></div></div>
        {message && <p className="offline-status" role="status">{message}</p>}
        {queue.length === 0 ? <p className="offline-empty-queue">Walang pending o failed action sa device na ito.</p> : (
          <div className="offline-queue-list">
            {queue.map(item => {
              const isFailed = item.status === 'failed' || item.failed;
              return <article className="offline-queue-item" key={item.id}>
                <div className="offline-queue-copy"><strong>{item.label || (item.kind === 'booking' ? 'Cash booking request' : item.kind === 'equipment' ? 'New equipment' : 'Queued action')}</strong><small>{new Date(item.createdAt).toLocaleString('en-PH')}</small>{item.lastError && <span className="offline-queue-error">{item.lastError}</span>}</div>
                <span className={`offline-queue-state ${isFailed ? 'failed' : 'pending'}`}>{isFailed ? 'Needs review' : item.status === 'auth' ? 'Sign in required' : 'Pending sync'}</span>
                <div className="offline-queue-actions">{isFailed && <button type="button" disabled={busyId === item.id} onClick={() => retryItem(item)}>Retry</button>}<button type="button" className="offline-discard-button" disabled={busyId === item.id} onClick={() => discardItem(item)}>Remove</button></div>
              </article>;
            })}
          </div>
        )}
      </section>
    </main>
  );
}
