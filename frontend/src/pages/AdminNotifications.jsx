import { useEffect, useState } from 'react';
import useAutoRefresh from '../utils/useAutoRefresh.js';
import { api } from '../api/client';
import Pagination from '../components/admin/Pagination';
import { useNavigate } from 'react-router-dom';
import { getNotificationTarget } from '../utils/notificationTarget';

function dateTime(value) {
  return value ? new Date(value).toLocaleString('en-PH') : '—';
}

export default function AdminNotifications() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  async function load(silent = false) {
    try {
      if (!silent) { setLoading(true); setError(''); }
      const result = await api('/admin/notifications');
      setItems(result.data || []);
    } catch (err) { if (!silent) setError(err.message || 'Unable to load notifications.'); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);
  useAutoRefresh(() => load(true), 30000);

  const startIndex = (currentPage - 1) * itemsPerPage;
  const displayedItems = items.slice(startIndex, startIndex + itemsPerPage);

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
        <div className="am-actions">
          <button className="am-button approve" onClick={markAllRead} disabled={busy || !items.some(n => !Number(n.is_read))}>Mark All Read</button>
        </div>
      </div>
      {message && <div className="um-message success">{message}</div>}
      {error && <div className="um-message error">{error}</div>}
      <section className="um-panel">
        <div className="um-panel-heading"><div><h2>All Notifications</h2><p>{items.filter(n => !Number(n.is_read)).length} unread notifications</p></div><span className="um-total">{items.length} records</span></div>
        {loading ? <div className="am-empty">Loading notifications...</div> : items.length === 0 ? <div className="am-empty">No notifications yet.</div> :
          <div className="am-notification-list">{displayedItems.map(item => <article role="button" tabIndex={0} onClick={async () => { if (!Number(item.is_read)) await markRead(item.id); navigate(getNotificationTarget(item, 'admin')); }} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { if (!Number(item.is_read)) markRead(item.id); navigate(getNotificationTarget(item, 'admin')); } }} className={`am-notification notification-clickable ${Number(item.is_read) ? 'read' : 'unread'}`} key={item.id}>
            <div><strong>{item.title}</strong><p>{item.message}</p><small>{dateTime(item.created_at)}</small></div>
            {!Number(item.is_read) && <button className="am-button approve" disabled={busy} onClick={event => { event.stopPropagation(); markRead(item.id); }}>Mark Read</button>}
          </article>)}</div>}
        {!loading && <Pagination totalItems={items.length} itemsPerPage={itemsPerPage} currentPage={currentPage} onPageChange={setCurrentPage} />}
      </section>
    </div>
  );
}
