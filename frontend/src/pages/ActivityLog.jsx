import { useCallback, useEffect, useState } from 'react';
import { api, getUser } from '../api/client';
import useAutoRefresh from '../utils/useAutoRefresh';

// MySQL returns "YYYY-MM-DD HH:MM:SS" (already in the server's local time), so build the date without timezone shifts.
function parseDate(value) {
  const m = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})/);
  return m ? new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]) : new Date(value);
}
function formatWhen(value) {
  const d = parseDate(value);
  if (Number.isNaN(d.getTime())) return '';
  const date = d.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
  const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  return `${date} · ${time}`;
}

export default function ActivityLog() {
  const me = getUser();
  const [page, setPage] = useState(1);
  const [result, setResult] = useState({ data: [], total: 0, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const r = await api(`/activity?${new URLSearchParams({ page: String(page), limit: '20', scope: 'me' })}`);
      setResult(r);
      if (r.page && r.page !== page) setPage(r.page);
      setError('');
    } catch (e) { setError(e.message || 'Unable to load your activity log.'); }
    finally { setLoading(false); }
  }, [page]);

  useEffect(() => { setLoading(true); load(); }, [load]);
  useAutoRefresh(load, 20000);

  const rows = result.data || [];
  const currentPage = result.page || page;
  const pages = result.pages || 1;

  return <section className="alog-page">
    <div className="alog-card">
      {error && <div className="alog-error">{error}</div>}
      <div className="alog-table-wrap">
        <table className="alog-table">
          <thead><tr><th>Time</th><th>Who</th><th>Action</th></tr></thead>
          <tbody>
            {loading && !rows.length
              ? <tr><td colSpan="3" className="alog-empty">Loading…</td></tr>
              : !rows.length
                ? <tr><td colSpan="3" className="alog-empty">No activity yet.</td></tr>
                : rows.map(item => <tr key={item.id}>
                  <td className="alog-time">{formatWhen(item.created_at)}</td>
                  <td>{item.user_name || item.full_name || item.actor_name || me?.full_name || me?.name || ''}</td>
                  <td>{item.action}</td>
                </tr>)}
          </tbody>
        </table>
      </div>
      {pages > 1 && <div className="alog-pager">
        <button type="button" disabled={currentPage <= 1} onClick={() => setPage(p => Math.max(p - 1, 1))}>Previous</button>
        <span>Page {currentPage} of {pages}</span>
        <button type="button" disabled={currentPage >= pages} onClick={() => setPage(p => p + 1)}>Next</button>
      </div>}
    </div>
  </section>;
}
