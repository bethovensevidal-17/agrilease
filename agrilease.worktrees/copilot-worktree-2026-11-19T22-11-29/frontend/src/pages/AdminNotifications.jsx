import { useEffect, useState } from 'react';
import { api } from '../api/client';

function dateTime(value) {
  return value ? new Date(value).toLocaleString('en-PH') : '—';
}

export default function AdminNotifications() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  async function load() {
    try {
      setLoading(true); setError('');
      const result = await api('/admin/notifications');
      setItems(result.data || []);
    } catch (err) { setError(err.message || 'Unable to load notifications.'); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  async function markRead(id) {
    try {
      setBusy(true); setError('');
      await api(`/admin/notifications/${id}/read`, { method: 'PATCH' });
      setItems(prev => prev.map(item => item.id === id ? { ...item, is_read: 1 } : item));
    } catch (err) { setError(err.message || 'Unable to update notification.'); }
    finally { setBusy(false); }
  }

  async function markAllRead() {
    try {
      setBusy(true); setError('');
      await api('/admin/notifications/read-all', { method: 'PATCH' });
      setItems(prev => prev.map(item => ({ ...item, is_read: 1 })));
      setMessage('All notifications marked as read.');
    } catch (err) { setError(err.message || 'Unable to update notifications.'); }
    finally { setBusy(false); }
  }

  return (
    <div className="am-page">
      <div className="admin-page-heading">
        <div><h1>Notifications</h1><p>Administrative alerts and account activity updates.</p></div>
        <div className="am-actions">
          <button className="um-refresh" onClick={load} disabled={loading}>Refresh</button>
          <button className="am-button approve" onClick={markAllRead} disabled={busy || !items.some(n => !Number(n.is_read))}>Mark All Read</button>
        </div>
      </div>
      {message && <div className="um-message success">{message}</div>}
      {error && <div className="um-message error">{error}</div>}
      <section className="um-panel">
        <div className="um-panel-heading"><div><h2>All Notifications</h2><p>{items.filter(n => !Number(n.is_read)).length} unread notifications</p></div><span className="um-total">{items.length} records</span></div>
        {loading ? <div className="am-empty">Loading notifications...</div> : items.length === 0 ? <div className="am-empty">No notifications yet.</div> :
          <div className="am-notification-list">{items.map(item => <article className={`am-notification ${Number(item.is_read) ? 'read' : 'unread'}`} key={item.id}>
            <div><strong>{item.title}</strong><p>{item.message}</p><small>{dateTime(item.created_at)}</small></div>
            {!Number(item.is_read) && <button className="am-button approve" disabled={busy} onClick={() => markRead(item.id)}>Mark Read</button>}
          </article>)}</div>}
      </section>
    </div>
  );
}
