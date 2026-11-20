import { useCallback, useEffect, useState } from 'react';
import { api } from '../api/client';
import { useNavigate } from 'react-router-dom';
import { getNotificationTarget } from '../utils/notificationTarget';

function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString('en-PH');
}

export default function NotificationCenter({ title = 'Notifications', role = 'farmer' }) {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('active');

  const load = useCallback(async (showLoading = false) => {
    try {
      if (showLoading) setLoading(true);
      const result = await api(tab === 'archived' ? '/notifications?archived=1' : '/notifications');
      setItems(result.data || []);
      setError('');
    } catch (err) {
      setError(err.message || 'Unable to load notifications.');
    } finally {
      if (showLoading) setLoading(false);
    }
  }, [tab]);

  useEffect(() => {
    load(true);
    // Polling keeps notifications fresh without requiring an additional WebSocket service.
    const timer = window.setInterval(() => load(false), 30000);
    return () => window.clearInterval(timer);
  }, [load]);

  function notificationTarget(item) { return getNotificationTarget(item, role); }

  async function openNotification(item) {
    if (!Number(item.is_read)) await markRead(item.id);
    navigate(notificationTarget(item));
  }

  async function markRead(id) {
    try {
      setBusy(true);
      await api(`/notifications/${id}/read`, { method: 'PATCH' });
      setItems(current => current.map(item => Number(item.id) === Number(id) ? { ...item, is_read: 1 } : item));
    } catch (err) { setError(err.message || 'Unable to update notification.'); }
    finally { setBusy(false); }
  }

  async function setArchived(id, action) {
    try {
      setBusy(true);
      await api(`/notifications/${id}/${action}`, { method: 'PATCH' });
      setItems(current => current.filter(item => Number(item.id) !== Number(id)));
    } catch (err) { setError(err.message || 'Unable to update notification.'); }
    finally { setBusy(false); }
  }

  async function markAllRead() {
    try {
      setBusy(true);
      await api('/notifications/read-all', { method: 'PATCH' });
      setItems(current => current.map(item => ({ ...item, is_read: 1 })));
    } catch (err) { setError(err.message || 'Unable to update notifications.'); }
    finally { setBusy(false); }
  }

  const unread = items.filter(item => !Number(item.is_read)).length;
  return (
    <div className="am-page">
      <div className="admin-page-heading">
        <div><h1>{title}</h1><p>Booking, payment, and account updates for your AgriLease account.</p></div>
        <div className="am-actions">
          <button className="um-refresh" onClick={() => load(true)} disabled={loading}>Refresh</button>
          <button className="am-button approve" onClick={markAllRead} disabled={busy || unread === 0}>Mark All Read</button>
        </div>
      </div>
      {error && <div className="um-message error">{error}</div>}
      <div className="am-actions">
        <button className={`am-button ${tab === 'active' ? 'approve' : 'neutral'}`} onClick={() => setTab('active')}>Active</button>
        <button className={`am-button ${tab === 'archived' ? 'approve' : 'neutral'}`} onClick={() => setTab('archived')}>Archived</button>
      </div>
      <section className="um-panel">
        <div className="um-panel-heading"><div><h2>All Notifications</h2><p>{unread} unread notifications · Automatically refreshes every 30 seconds</p></div><span className="um-total">{items.length} records</span></div>
        {loading ? <div className="am-empty">Loading notifications...</div> : items.length === 0 ? <div className="am-empty">{tab === 'archived' ? 'No archived notifications.' : 'No notifications yet.'}</div> :
          <div className="am-notification-list">{items.map(item => <article role="button" tabIndex={0} onClick={() => openNotification(item)} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') openNotification(item); }} className={`am-notification notification-clickable ${Number(item.is_read) ? 'read' : 'unread'}`} key={item.id}>
            <div><strong>{item.title}</strong><p>{item.message}</p><small>{formatDate(item.created_at)}</small></div>
            <div className="am-actions">
              {tab === 'active' && !Number(item.is_read) && <button className="am-button approve" disabled={busy} onClick={event => { event.stopPropagation(); markRead(item.id); }}>Mark Read</button>}
              {tab === 'active'
                ? <button className="am-button neutral" disabled={busy} onClick={event => { event.stopPropagation(); setArchived(item.id, 'archive'); }}>Archive</button>
                : <button className="am-button approve" disabled={busy} onClick={event => { event.stopPropagation(); setArchived(item.id, 'restore'); }}>Restore</button>}
            </div>
          </article>)}</div>}
      </section>
    </div>
  );
}