<<<<<<< HEAD
import { useEffect, useState } from 'react';
import { api, getAuthenticatedFile } from '../api/client';
import Pagination from '../components/admin/Pagination';
import '../styles/booking.css';

const money = new Intl.NumberFormat('en-PH', {
  style: 'currency',
  currency: 'PHP',
});
=======
import { useEffect, useMemo, useState } from 'react';
import { api, getAuthenticatedFile } from '../api/client';
import Pagination from '../components/admin/Pagination';
import PendingSyncList from '../components/PendingSyncList.jsx';
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
>>>>>>> master

export default function MyRentals() {
  const [rows, setRows] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [proofLoading, setProofLoading] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
<<<<<<< HEAD
=======
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
>>>>>>> master
  const itemsPerPage = 8;

  async function load() {
    try {
      setError('');
      const result = await api('/rentals/mine');
      setRows(result.data || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

<<<<<<< HEAD
  useEffect(() => {
    load();
  }, []);

  async function cancel(id) {
    if (!await window.agrileaseDialog.confirm('Cancel this pending booking?')) return;

=======
  useEffect(() => { load(); }, []);

  async function cancel(id) {
    if (!await window.agrileaseDialog.confirm('Cancel this pending booking? This cannot be undone.', { title: 'Cancel booking', confirmText: 'Cancel booking' })) return;
>>>>>>> master
    try {
      setError('');
      await api(`/rentals/${id}/cancel`, { method: 'PATCH' });
      await load();
    } catch (e) {
      setError(e.message);
    }
  }

  async function viewProof(row) {
<<<<<<< HEAD
    if (!row.payment_id) {
      setError('Payment record not found.');
      return;
    }

    try {
      setError('');
      setProofLoading(row.id);

      const blob = await getAuthenticatedFile(
        `/rentals/payments/${row.payment_id}/proof`
      );

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');

      link.href = url;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.click();

=======
    if (!row.payment_id && !row.id) { setError('Payment record not found.'); return; }
    try {
      setError('');
      setProofLoading(row.id);
      const blob = await getAuthenticatedFile(`/rentals/payments/${row.payment_id || row.id}/proof`);
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank', 'noopener,noreferrer');
>>>>>>> master
      window.setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (e) {
      setError(e.message);
    } finally {
      setProofLoading(null);
    }
  }

<<<<<<< HEAD
  const displayedRows = rows.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
=======
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

  useEffect(() => { setCurrentPage(1); }, [search, status, dateFrom, dateTo]);

  const displayedRows = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const hasFilters = search || status !== 'all' || dateFrom || dateTo;
  const invalidRange = dateFrom && dateTo && dateFrom > dateTo;

  function reset() { setSearch(''); setStatus('all'); setDateFrom(''); setDateTo(''); }
>>>>>>> master

  if (loading) return <p>Loading your bookings...</p>;

  return (
<<<<<<< HEAD
    <section className="my-rentals">
      <h1>My Bookings</h1>

      {error && <p className="booking-error">{error}</p>}

      {!rows.length && (
        <p>You do not have any bookings yet.</p>
      )}

      {displayedRows.map(row => (
        <article className="rental-row" key={row.id}>
          <div>
            <h3>{row.equipment_name}</h3>

            <p>
              {row.start_date} – {row.end_date}
            </p>

            <p>
              Quantity: {row.rental_quantity || 1}
              {' · '}
              Payment: {(row.payment_method || '—').replace('_', ' ')}
            </p>

            <p>
              Payment status: {row.payment_status || 'pending'}
            </p>

            {row.payment_reference && (
              <p>
                Reference number: {row.payment_reference}
              </p>
            )}

            {row.payment_proof && (
              <button
                type="button"
                disabled={proofLoading === row.id}
                onClick={() => viewProof(row)}
              >
                {proofLoading === row.id
                  ? 'Opening proof...'
                  : 'View payment proof'}
              </button>
            )}

            <strong>
              {money.format(Number(row.total_amount || 0))}
            </strong>
          </div>

          <div>
            <span className={`rental-status ${row.status}`}>
              {row.status}
            </span>

            {row.status === 'pending' && (
              <button onClick={() => cancel(row.id)}>
                Cancel booking
              </button>
            )}
          </div>
        </article>
      ))}
      <Pagination totalItems={rows.length} itemsPerPage={itemsPerPage} currentPage={currentPage} onPageChange={setCurrentPage} />
=======
    <section className="mb-page">
      <div className="mb-heading">
        <div>
          <h1>My Bookings</h1>
          <p>Track your rental requests, schedules, and payment status.</p>
        </div>
        <button type="button" className="mb-btn mb-btn-secondary" onClick={load}>Refresh</button>
      </div>

      {error && <p className="booking-error">{error}</p>}

      <PendingSyncList kind="booking" onSynced={load} />

      <div className="mb-filters">
        <label className="mb-filter mb-filter-search">
          <span>Search</span>
          <input type="search" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search equipment, booking number, or reference..." />
        </label>
        <label className="mb-filter">
          <span>Status</span>
          <select value={status} onChange={e => setStatus(e.target.value)}>
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

      <p className="mb-count">{filtered.length} of {rows.length} booking{rows.length === 1 ? '' : 's'}</p>

      {!rows.length ? (
        <div className="mb-empty">You do not have any bookings yet.</div>
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
                    <small>{pretty(row.payment_status || 'pending')}</small>
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
                      {!row.payment_proof && row.status !== 'pending' && <span className="mb-muted">—</span>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Pagination totalItems={filtered.length} itemsPerPage={itemsPerPage} currentPage={currentPage} onPageChange={setCurrentPage} />
>>>>>>> master
    </section>
  );
}
