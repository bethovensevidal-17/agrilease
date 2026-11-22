import { useEffect, useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import useAutoRefresh from '../utils/useAutoRefresh.js';
import { api } from '../api/client';
import Pagination from '../components/admin/Pagination';
import { paymentState } from '../utils/paymentState.js';

const PAGE_SIZE = 8;
const STATUSES = ['pending', 'approved', 'rejected', 'ongoing', 'completed', 'cancelled'];

function dateTime(value) {
  if (!value) return '—';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? String(value) : parsed.toLocaleString('en-PH');
}
function money(value) {
  return Number(value || 0).toLocaleString('en-PH', { style: 'currency', currency: 'PHP' });
}

export default function RentalMonitoring() {
  const [rentals, setRentals] = useState([]);
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [owner, setOwner] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function load(silent = false) {
    try {
      if (!silent) { setLoading(true); setError(''); }
      const params = new URLSearchParams();
      if (status) params.set('status', status);
      if (owner.trim()) params.set('owner', owner.trim());
      if (dateFrom) params.set('date_from', dateFrom);
      if (dateTo) params.set('date_to', dateTo);
      const query = params.toString();
      const result = await api(`/admin/rentals${query ? `?${query}` : ''}`);
      setRentals(result.data || []);
    } catch (err) {
      if (!silent) { setError(err.message || 'Unable to load rental records.'); setRentals([]); }
    } finally { setLoading(false); }
  }

  useEffect(() => {
    setPage(1);
    const timer = window.setTimeout(load, 250);
    return () => window.clearTimeout(timer);
  }, [status, owner, dateFrom, dateTo]);

  useAutoRefresh(() => load(true));

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rentals;
    return rentals.filter(r => [
      r.id, r.farmer_name, r.owner_name, r.equipment_name, r.status, r.payment_method
    ].some(v => String(v || '').toLowerCase().includes(q)));
  }, [rentals, search]);

  const shown = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="am-page">
      <div className="am-stats">
        <div className="am-stat"><span>Total Rentals</span><strong>{rentals.length}</strong></div>
        <div className="am-stat"><span>Pending</span><strong>{rentals.filter(r => r.status === 'pending').length}</strong></div>
        <div className="am-stat"><span>Ongoing</span><strong>{rentals.filter(r => r.status === 'ongoing').length}</strong></div>
        <div className="am-stat"><span>Completed</span><strong>{rentals.filter(r => r.status === 'completed').length}</strong></div>
      </div>

      <section className="um-panel">
        <div className="um-panel-heading">
          <div><h2>Rental Records</h2><p>Read-only administrative monitoring.</p></div>
          <span className="um-total">{filtered.length} records</span>
        </div>
        <div className="um-toolbar">
          <div className="um-search"><Search size={18} />
            <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search farmer, owner, equipment, or ID..." /></div>
          <input value={owner} onChange={e => { setOwner(e.target.value); setPage(1); }} placeholder="Filter by owner name or ID" aria-label="Filter by equipment owner" />
          <label className="am-filter-date">From <input type="date" value={dateFrom} max={dateTo || undefined} onChange={e => { setDateFrom(e.target.value); setPage(1); }} /></label>
          <label className="am-filter-date">To <input type="date" value={dateTo} min={dateFrom || undefined} onChange={e => { setDateTo(e.target.value); setPage(1); }} /></label>
          <button type="button" className="um-refresh" onClick={() => { setOwner(''); setDateFrom(''); setDateTo(''); setStatus(''); setSearch(''); setPage(1); }}>Clear Filters</button>
          <select value={status} onChange={e => setStatus(e.target.value)} aria-label="Filter rental status">
            <option value="">All Statuses</option>
            {STATUSES.map(s => <option key={s} value={s}>{s[0].toUpperCase() + s.slice(1)}</option>)}
          </select>
        </div>
        {error && <div className="um-message error">{error}</div>}
        <div className="um-table-wrapper">
          <table className="um-table">
            <thead><tr><th>Rental ID</th><th>Farmer</th><th>Owner</th><th>Equipment</th>
              <th>Rental Period</th><th>Total</th><th>Payment</th><th>Status</th></tr></thead>
            <tbody>
              {loading ? <tr><td colSpan="8" className="um-empty">Loading rental records...</td></tr>
                : shown.length === 0 ? <tr><td colSpan="8" className="um-empty">No rental records found.</td></tr>
                : shown.map(r => <tr key={r.id}>
                  <td>#{r.id}</td><td>{r.farmer_name || '—'}</td><td>{r.owner_name || '—'}</td>
                  <td>{r.equipment_name || '—'}</td>
                  <td><span className="am-date">{dateTime(r.start_at)}</span><span className="am-subtext">to {dateTime(r.end_at)}</span></td>
                  <td>{money(r.total_amount)}</td><td>{r.payment_method ? <><span style={{ textTransform: 'capitalize' }}>{String(r.payment_method).replace(/_/g, ' ')}</span><span className="am-subtext">{paymentState(r, 'admin').text}</span></> : '—'}</td>
                  <td><span className={`am-pill ${r.status || ''}`}>{r.status || 'Unknown'}</span></td>
                </tr>)}
            </tbody>
          </table>
        </div>
        {!loading && <Pagination totalItems={filtered.length} itemsPerPage={PAGE_SIZE}
          currentPage={page} onPageChange={setPage} />}
      </section>
      <p className="am-note">Rental records are displayed for monitoring only. Approval and status transitions should be handled by the rental workflow, not changed directly from this page.</p>
    </div>
  );
}
