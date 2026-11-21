import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ClipboardList, Package, RefreshCw } from 'lucide-react';
import { clearQueueItem, countSnapshots, readQueue, updateQueueItem } from '../offline/idb';
import { getToken, getUser } from '../api/client';
import useAutoRefresh from '../utils/useAutoRefresh.js';
import { requestSync } from '../offline/sync';
import { enablePushNotifications } from '../utils/push';
import './offline-settings.css';

const ROLE_GUIDANCE = {
  farmer: {
    title: 'Farmer Offline Access',
    intro: 'You can open AgriLease using your previously signed-in session. Data you open while online is saved on this device automatically.',
    available: ['Previously loaded equipment and public pages', 'Previously synchronized rentals, transactions, and profile information', 'Create a Cash booking request and keep it pending on this device'],
    limits: ['An offline booking is not official and the equipment is not reserved until the server validates and saves it.', 'GCash at Bank Transfer submissions require internet.', 'The first login is not available while offline.'],
  },
  owner: {
    title: 'Owner Offline Access',
    intro: 'You can view your previously loaded dashboard and records offline. You can also add new equipment: it is saved on this device and sent automatically once you are back online.',
    available: ['Previously loaded dashboard and equipment information', 'Previously synchronized bookings and transactions', 'Add new equipment (with image) and keep it pending on this device'],
    limits: ['Approving, rejecting, or changing a booking status is not possible offline.', 'Equipment edits, archiving, payment, and subscription changes cannot be saved offline.', 'New equipment saved offline is not listed until the server receives it and the Admin approves it.', 'Open the Add Equipment page at least once while online so the category list is saved.'],
  },
  admin: {
    title: 'Admin Offline Access',
    intro: 'Offline mode is read-only monitoring. Previously loaded dashboards and reports are saved in the current browser account.',
    available: ['Previously loaded dashboard and analytics', 'Previously synchronized reports and activity information', 'Previously loaded user and equipment lists'],
    limits: ['Approving or rejecting accounts, equipment, payments, or subscriptions is not possible offline.', 'Administrative changes cannot be saved offline.', 'Refresh the reports once you are back online.'],
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
      setMessage(error.message || 'Unable to read offline storage.');
    }
  }, [user?.role, user?.id, user?.email]);

  useEffect(() => {
    refreshStatus();
    const onOnline = () => {
      setOnline(true);
      setMessage('You are back online. Syncing pending actions.');
      requestSync({ release: true });
      window.setTimeout(refreshStatus, 1200);
    };
    const onOffline = () => {
      setOnline(false);
      setMessage('You are offline. Saved records are read-only; Cash bookings (Farmer) and new equipment (Owner) stay pending on this device.');
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
  useAutoRefresh(refreshStatus, 10000, { offline: true });

  const pending = useMemo(() => queue.filter(item => item.status !== 'failed' && !item.failed), [queue]);
  const failed = useMemo(() => queue.filter(item => item.status === 'failed' || item.failed), [queue]);

  async function retryItem(item) {
    const token = getToken();
    if (!token) {
      setMessage('There is no active saved session. Log in online first before retrying the action.');
      return;
    }
    setBusyId(item.id);
    try {
      await updateQueueItem(item.id, { token, status: 'pending', failed: false, lastError: '', held: !navigator.onLine });
      await refreshStatus();
      if (!navigator.onLine) {
        setMessage('Queued again. It will be retried automatically once you are back online.');
      } else {
        requestSync({ release: true });
        setMessage('Retrying to send to the server.');
      }
    } catch (error) {
      setMessage(error.message || 'Unable to retry the action.');
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
      setMessage('The queued action was removed from this device.');
    } catch (error) {
      setMessage(error.message || 'Unable to remove the queued action.');
    } finally { setBusyId(null); }
  }

  return (
    <main className="offline-settings-page">
      <header className="offline-settings-header">
        <div>
          <p className="offline-eyebrow">AGRILEASE · {role.toUpperCase()} PORTAL</p>
          <h1>{guidance.title}</h1>
          <p className="offline-intro">{guidance.intro}</p>
          {role !== 'farmer' && <Link className="offline-back-link" to={`/${role}`}>Back to dashboard</Link>}
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
        <div className="offline-section-heading"><div><h2>Available offline</h2><p>Pages are cached automatically while you are online and using them.</p></div></div>
        <div className="offline-feature-grid">
          {guidance.available.map((item, index) => (
            <article className="offline-feature-card is-selected" key={item}>
              <span className="offline-feature-icon">{index === 0 ? <Package size={22} strokeWidth={1.8} /> : index === 1 ? <ClipboardList size={22} strokeWidth={1.8} /> : <RefreshCw size={22} strokeWidth={1.8} />}</span>
              <span className="offline-feature-copy"><span className="offline-feature-title">{item}</span></span>
              <span className="offline-card-state">Automatic cache</span>
            </article>
          ))}
        </div>
      </section>

      {role !== 'farmer' && <section className="offline-limit-note"><strong>Important limitations</strong><ul>{guidance.limits.map(item => <li key={item}>{item}</li>)}</ul></section>}

      {role === 'farmer' && <section className="offline-howto"><strong>Cash booking synchronization</strong><p>When you submit a Cash booking while offline, it is saved on this device as Pending Sync. It is not official yet and the equipment is not reserved. Once you are back online, the server verifies the schedule, availability, quantity, and your account before it becomes an official booking.</p></section>}

      {role === 'owner' && <section className="offline-howto"><strong>Equipment synchronization</strong><p>When you add equipment while offline, it is saved on this device (with its image) as Pending Sync. It is not listed on the server yet. Once you are back online it is sent automatically; if accepted, it goes to Admin approval.</p></section>}

      <section className="offline-howto offline-queue-section">
        <div className="offline-queue-heading"><div><strong>Synchronization queue</strong><p>{pending.length} pending · {failed.length} needs review</p></div><div className="offline-queue-tools"><button type="button" className="offline-save-button" onClick={turnOnPush}>Turn on push notifications</button>{role !== 'farmer' && <button type="button" className="offline-save-button" onClick={refreshStatus}>Refresh status</button>}</div></div>
        {message && <p className="offline-status" role="status">{message}</p>}
        {queue.length === 0 ? <p className="offline-empty-queue">There are no pending or failed actions on this device.</p> : (
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
