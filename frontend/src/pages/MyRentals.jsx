import { useEffect, useMemo, useState } from 'react';
import { api, getAuthenticatedFile } from '../api/client';
import Pagination from '../components/admin/Pagination';
import PendingSyncList from '../components/PendingSyncList.jsx';
import useAutoRefresh from '../utils/useAutoRefresh.js';
import { paymentState } from '../utils/paymentState.js';
import '../styles/booking.css';

const money = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' });
const STATUSES = ['pending', 'approved', 'ongoing', 'completed', 'rejected', 'cancelled'];
const pretty = value => String(value || '—').replace(/[_-]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

function dayOf(value) {
  if (!value) return '';
  return String(value).slice(0, 10);
}

function dateLabel(value) {
  const day = dayOf(value);
  if (!day) return '—';
  const parsed = new Date(`${day}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return String(value);
  return parsed.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function MyRentals() {
  const [rows, setRows] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [proofLoading, setProofLoading] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [tab, setTab] = useState('active');
  const itemsPerPage = 8;

  async function load(quiet = false) {
    try {
      if (quiet !== true) setError('');
      const result = await api(tab === 'archived' ? '/rentals/mine?archived=1' : '/rentals/mine');
      setRows(result.data || []);
    } catch (e) {
      if (quiet !== true) setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [tab]);
  useAutoRefresh(() => load(true));

  async function cancel(id) {
    if (!await window.agrileaseDialog.confirm('Cancel this pending booking? This cannot be undone.', { title: 'Cancel booking', confirmText: 'Cancel booking' })) return;
    try {
      setError('');
      await api(`/rentals/${id}/cancel`, { method: 'PATCH' });
      await load();
    } catch (e) {
      setError(e.message);
    }
  }

  async function setArchived(id, action) {
    try {
      setError('');
      await api(`/rentals/${id}/${action}`, { method: 'PATCH' });
      setRows(current => current.filter(row => Number(row.id) !== Number(id)));
    } catch (e) {
      setError(e.message);
    }
  }

  async function viewProof(row) {
    if (!row.payment_id && !row.id) { setError('Payment record not found.'); return; }
    try {
      setError('');
      setProofLoading(row.id);
      const blob = await getAuthenticatedFile(`/rentals/payments/${row.payment_id || row.id}/proof`);
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank', 'noopener,noreferrer');
      window.setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (e) {
      setError(e.message);
    } finally {
      setProofLoading(null);
    }
  }

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return rows.filter(row => {
      if (status !== 'all' && String(row.status).toLowerCase() !== status) return false;
      // Date range: sinasala ang booking na ang schedule ay tumatama sa napiling petsa.
      const start = dayOf(row.start_date);
      const end = dayOf(row.end_date) || start;
      if (dateFrom && end && end < dateFrom) return false;
      if (dateTo && start && start > dateTo) return false;
      if (!query) return true;
      return [row.id, row.equipment_name, row.brand_model, row.payment_reference, row.payment_method, row.status]
        .some(value => String(value ?? '').toLowerCase().includes(query));
    });
  }, [rows, search, status, dateFrom, dateTo]);

  useEffect(() => { setCurrentPage(1); }, [search, status, dateFrom, dateTo, tab]);

  const displayedRows = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const hasFilters = search || status !== 'all' || dateFrom || dateTo;
  const invalidRange = dateFrom && dateTo && dateFrom > dateTo;

  function reset() { setSearch(''); setStatus('all'); setDateFrom(''); setDateTo(''); }

  if (loading) return <p>Loading your bookings...</p>;

  return (
    <section className="mb-page">
      <div className="mb-heading">
        <div>
          <h1>My Bookings</h1>
          <p>Track your rental requests, schedules, and payment status.</p>
        </div>
      </div>

      {error && <p className="booking-error">{error}</p>}

      <div className="mb-actions">
        <button type="button" className={`mb-btn ${tab === 'active' ? '' : 'mb-btn-secondary'}`} onClick={() => setTab('active')}>Active</button>
        <button type="button" className={`mb-btn ${tab === 'archived' ? '' : 'mb-btn-secondary'}`} onClick={() => setTab('archived')}>Archived</button>
      </div>

      <PendingSyncList kind="booking" onSynced={load} />

      <div className="mb-filters">
        <label className="mb-filter mb-filter-search">
          <input aria-label="Search rentals" type="search" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search equipment, booking number, or reference..." />
        </label>
        <label className="mb-filter">
          <select aria-label="Filter by status" value={status} onChange={e => setStatus(e.target.value)}>
            <option value="all">All Statuses</option>
            {STATUSES.map(item => <option key={item} value={item}>{pretty(item)}</option>)}
          </select>
        </label>
        <label className="mb-filter">
          <span>From</span>
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
        </label>
        <label className="mb-filter">
          <span>To</span>
          <input type="date" value={dateTo} min={dateFrom || undefined} onChange={e => setDateTo(e.target.value)} />
        </label>
        <button type="button" className="mb-btn mb-btn-secondary mb-filter-reset" onClick={reset} disabled={!hasFilters}>Reset</button>
      </div>
      {invalidRange && <p className="booking-error">The start date cannot be later than the end date.</p>}

      {!rows.length ? (
        <div className="mb-empty">{tab === 'archived' ? 'No archived bookings.' : 'You do not have any bookings yet.'}</div>
      ) : !filtered.length ? (
        <div className="mb-empty">No bookings match your filters.</div>
      ) : (
        <div className="mb-table-wrap">
          <table className="mb-table">
            <thead>
              <tr>
                <th>Booking</th>
                <th>Equipment</th>
                <th>Schedule</th>
                <th>Qty</th>
                <th>Payment</th>
                <th>Total</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {displayedRows.map(row => (
                <tr key={row.id}>
                  <td data-label="Booking"><strong>#{row.id}</strong></td>
                  <td data-label="Equipment">
                    <strong>{row.equipment_name}</strong>
                    {row.brand_model && <small>{row.brand_model}</small>}
                  </td>
                  <td data-label="Schedule">
                    <span>{dateLabel(row.start_date)}</span>
                    <small>to {dateLabel(row.end_date)}</small>
                  </td>
                  <td data-label="Qty">{row.rental_quantity || 1}</td>
                  <td data-label="Payment">
                    <span>{pretty(row.payment_method)}</span>
                    <small>{paymentState(row, 'farmer').text}</small>
                    {row.payment_reference && <small>Ref: {row.payment_reference}</small>}
                  </td>
                  <td data-label="Total"><strong>{money.format(Number(row.total_amount || 0))}</strong></td>
                  <td data-label="Status"><span className={`rental-status ${row.status}`}>{row.status}</span></td>
                  <td data-label="Actions">
                    <div className="mb-actions">
                      {row.payment_proof && (
                        <button type="button" className="mb-btn mb-btn-secondary" disabled={proofLoading === row.id} onClick={() => viewProof(row)}>
                          {proofLoading === row.id ? 'Opening...' : 'View proof'}
                        </button>
                      )}
                      {row.status === 'pending' && (
                        <button type="button" className="mb-btn mb-btn-danger" onClick={() => cancel(row.id)}>Cancel</button>
                      )}
                      {tab === 'active' && ['completed', 'cancelled'].includes(row.status) && (
                        <button type="button" className="mb-btn mb-btn-secondary" onClick={() => setArchived(row.id, 'archive')}>Archive</button>
                      )}
                      {tab === 'archived' && (
                        <button type="button" className="mb-btn mb-btn-secondary" onClick={() => setArchived(row.id, 'restore')}>Restore</button>
                      )}
                      {tab === 'active' && !row.payment_proof && !['pending', 'completed', 'cancelled'].includes(row.status) && <span className="mb-muted">—</span>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Pagination totalItems={filtered.length} itemsPerPage={itemsPerPage} currentPage={currentPage} onPageChange={setCurrentPage} />
    </section>
  );
}