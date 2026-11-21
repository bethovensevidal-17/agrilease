import { useCallback, useEffect, useMemo, useState } from 'react';
import { api, getAuthenticatedFile } from '../api/client';
import Pagination from '../components/admin/Pagination';
import useAutoRefresh from '../utils/useAutoRefresh.js';

const peso = value => Number(value || 0).toLocaleString('en-PH', { style: 'currency', currency: 'PHP' });
const pretty = value => String(value || '—').replace(/[_-]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
const dateText = value => {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString('en-PH');
};

export default function Transactions({ role = 'farmer' }) {
  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  const load = useCallback(async (quiet = false) => {
    if (!quiet) { setLoading(true); setError(''); }
    try {
      const result = await api('/rentals');
      setRows(result.data || []);
    } catch (err) {
      if (!quiet) setError(err.message || 'Unable to load rental transactions.');
    } finally {
      if (!quiet) setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  useAutoRefresh(() => load(true));

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return rows.filter(row => {
      const paymentStatus = String(row.payment_status || 'unpaid').toLowerCase();
      if (status !== 'all' && paymentStatus !== status) return false;
      if (!query) return true;
      return [row.id, row.equipment_name, row.farmer_name, row.payment_reference, row.payment_method]
        .some(value => String(value || '').toLowerCase().includes(query));
    });
  }, [rows, search, status]);

  const displayedRows = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  async function openProof(id) {
    try {
      const blob = await getAuthenticatedFile(role === 'owner' ? `/owner/bookings/${id}/proof` : `/rentals/payments/${id}/proof`);
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank', 'noopener,noreferrer');
      window.setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (err) {
      setError(err.message || 'Unable to open payment proof.');
    }
  }

  return (
    <section className="am-page" style={{ maxWidth: 1180, margin: '0 auto' }}>
      <div className="admin-page-heading">
        <div>
          <h1>Rental Transactions</h1>
          <p>{role === 'owner' ? 'Monitor payments and transaction records for your equipment rentals.' : 'View your rental payment records, payment methods, and payment history.'}</p>
        </div>
        {role !== 'farmer' && <button className="um-refresh" type="button" onClick={() => load()} disabled={loading}>{loading ? 'Loading...' : 'Refresh'}</button>}
      </div>

      {error && <div className="um-message error" role="alert">{error}</div>}

      <section className="um-panel tx-filter-panel">
        <div className="tx-filters">
          <input aria-label="Search transactions" type="search" value={search} onChange={e => { setSearch(e.target.value); setCurrentPage(1); }}
            placeholder={role === 'owner' ? 'Search booking, farmer, equipment, or reference...' : 'Search booking, equipment, or reference...'} />
          <select aria-label="Payment status" value={status} onChange={e => { setStatus(e.target.value); setCurrentPage(1); }}>
            <option value="all">All Payment Statuses</option>
            <option value="pending">Pending</option>
            <option value="verified">Verified / Paid</option>
            <option value="rejected">Rejected</option>
            <option value="unpaid">Unpaid</option>
          </select>
        </div>
      </section>

      <section className="um-panel">
        <div className="um-panel-heading">
          <div><h2>Payment History</h2><p>{filtered.length} transaction record(s)</p></div>
        </div>
        {loading ? <div className="am-empty">Loading transactions...</div> :
          filtered.length === 0 ? <div className="am-empty">No transaction records match your search.</div> :
          <div className="um-table-wrapper">
            <table className="um-table" style={{ minWidth: 850 }}>
              <thead><tr>
                <th>Booking</th>{role === 'owner' && <th>Farmer</th>}
                <th>Equipment</th><th>Amount</th><th>Payment Method</th><th>Reference</th><th>Payment Proof</th><th>Status</th><th>Date</th>
              </tr></thead>
              <tbody>{displayedRows.map(row => (
                <tr key={row.id}>
                  <td>#{row.id}</td>
                  {role === 'owner' && <td>{row.farmer_name || '—'}</td>}
                  <td>{row.equipment_name || 'Equipment unavailable'}</td>
                  <td><strong>{peso(row.total_price ?? row.total_amount ?? row.total)}</strong></td>
                  <td>{pretty(row.payment_method)}</td>
                  <td>{row.payment_reference || '—'}</td>
                  <td>{row.payment_proof ? <button type="button" className="um-refresh" onClick={() => openProof(row.id)}>View Proof</button> : '—'}</td>
                  <td><span className={`am-pill pay-${String(row.payment_status || 'unpaid').toLowerCase()}`}>{pretty(row.payment_status || 'unpaid')}</span></td>
                  <td>{dateText(row.paid_at || row.payment_date || row.created_at)}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>}
        {!loading && <Pagination totalItems={filtered.length} itemsPerPage={itemsPerPage} currentPage={currentPage} onPageChange={setCurrentPage} />}
      </section>
    </section>
  );
}
