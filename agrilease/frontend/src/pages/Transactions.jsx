import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, getAuthenticatedFile } from '../api/client';
import Pagination from '../components/admin/Pagination';

const peso = value => Number(value || 0).toLocaleString('en-PH', { style: 'currency', currency: 'PHP' });
const pretty = value => String(value || '—').replace(/[_-]/g, ' ').replace(/\\b\\w/g, c => c.toUpperCase());
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

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await api('/rentals');
      setRows(result.data || []);
    } catch (err) {
      setError(err.message || 'Unable to load rental transactions.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

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
        <button className="um-refresh" type="button" onClick={load} disabled={loading}>{loading ? 'Loading...' : 'Refresh'}</button>
      </div>

      {error && <div className="um-message error" role="alert">{error}</div>}

      <section className="um-panel" style={{ padding: 16, marginBottom: 18 }}>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <input aria-label="Search transactions" value={search} onChange={e => setSearch(e.target.value)}
            placeholder={role === 'owner' ? 'Search booking, farmer, equipment, or reference...' : 'Search booking, equipment, owner, or reference...'}
            style={{ flex: '1 1 300px', minWidth: 0, padding: 11, border: '1px solid #dce5df', borderRadius: 8 }} />
          <select aria-label="Payment status" value={status} onChange={e => setStatus(e.target.value)}
            style={{ padding: 11, border: '1px solid #dce5df', borderRadius: 8 }}>
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
                  <td><span className="am-pill">{pretty(row.payment_status || 'unpaid')}</span></td>
                  <td>{dateText(row.paid_at || row.payment_date || row.created_at)}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>}
        {!loading && <Pagination totalItems={filtered.length} itemsPerPage={itemsPerPage} currentPage={currentPage} onPageChange={setCurrentPage} />}
      </section>
      <p style={{ marginTop: 14, color: '#718078', fontSize: 13 }}>
        Need to check a rental request? <Link to={role === 'owner' ? '/owner/bookings' : '/farmer/rentals'}>Open {role === 'owner' ? 'Rental Bookings' : 'My Bookings'}</Link>.
      </p>
    </section>
  );
}
