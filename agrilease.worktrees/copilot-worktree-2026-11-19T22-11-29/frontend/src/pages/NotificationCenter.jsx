import { useCallback, useEffect, useState } from 'react';
import { api } from '../api/client';

function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString('en-PH');
}

export default function NotificationCenter({ title = 'Notifications' }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async (showLoading = false) => {
    try {
      if (showLoading) setLoading(true);
      const result = await api('/notifications');
      setItems(result.data || []);
      setError('');
    } catch (err) {
      setError(err.message || 'Unable to load notifications.');
    } finally {
      if (showLoading) setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(true);
    // Polling keeps notifications fresh without requiring an additional WebSocket service.
    const timer = window.setInterval(() => load(false), 30000);
    return () => window.clearInterval(timer);
  }, [load]);

  async function markRead(id) {
    try {
      setBusy(true);
      await api(`/notifications/${id}/read`, { method: 'PATCH' });
      setItems(current => current.map(item => Number(item.id) === Number(id) ? { ...item, is_read: 1 } : item));
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
      <section className="um-panel">
        <div className="um-panel-heading"><div><h2>All Notifications</h2><p>{unread} unread notifications · Automatically refreshes every 30 seconds</p></div><span className="um-total">{items.length} records</span></div>
        {loading ? <div className="am-empty">Loading notifications...</div> : items.length === 0 ? <div className="am-empty">No notifications yet.</div> :
          <div className="am-notification-list">{items.map(item => <article className={`am-notification ${Number(item.is_read) ? 'read' : 'unread'}`} key={item.id}>
            <div><strong>{item.title}</strong><p>{item.message}</p><small>{formatDate(item.created_at)}</small></div>
            {!Number(item.is_read) && <button className="am-button approve" disabled={busy} onClick={() => markRead(item.id)}>Mark Read</button>}
          </article>)}</div>}
      </section>
    </div>
  );
}
