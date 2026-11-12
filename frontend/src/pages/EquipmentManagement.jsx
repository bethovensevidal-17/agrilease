import { useEffect, useMemo, useState } from 'react';
import { api } from '../api/client';
import Pagination from '../components/admin/Pagination';

const PAGE_SIZE = 10;

function money(value) {
  return Number(value || 0).toLocaleString('en-PH', {
    style: 'currency', currency: 'PHP'
  });
}

function date(value) {
  return value ? new Date(value).toLocaleDateString('en-PH') : '—';
}

export default function EquipmentManagement() {
  const [items, setItems] = useState([]);
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  async function load() {
    try {
      setLoading(true);
      setError('');
      const query = status ? `?status=${encodeURIComponent(status)}` : '';
      const result = await api(`/equipment/admin${query}`);
      setItems(result.data || []);
    } catch (err) {
      setError(err.message || 'Unable to load equipment.');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { setPage(1); load(); }, [status]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter(item =>
      [item.name, item.equipment_name, item.owner_name, item.category_name,
       item.location, item.brand_model]
        .some(value => String(value || '').toLowerCase().includes(q))
    );
  }, [items, search]);

  const shown = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  async function setApproval(item, approval_status) {
    const action = approval_status === 'approved' ? 'approve' : 'reject';
    if (!window.confirm(`Are you sure you want to ${action} "${item.name || item.equipment_name}"?`)) return;
    try {
      setBusyId(item.id);
      setError('');
      setMessage('');
      await api(`/equipment/${item.id}/approval`, {
        method: 'PATCH', body: { approval_status }
      });
      setMessage(`Equipment ${action}d successfully.`);
      await load();
    } catch (err) {
      setError(err.message || `Unable to ${action} equipment.`);
    } finally {
      setBusyId(null);
    }
  }

  const count = value => items.filter(item => item.approval_status === value).length;

  return (
    <div className="am-page">
      <div className="admin-page-heading">
        <div>
          <h1>Equipment Management</h1>
          <p>Review equipment listings and control their public visibility.</p>
        </div>
        <button className="um-refresh" type="button" onClick={load} disabled={loading}>
          {loading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      <div className="am-stats">
        <div className="am-stat"><span>Total Listings</span><strong>{items.length}</strong></div>
        <div className="am-stat"><span>Pending</span><strong>{count('pending')}</strong></div>
        <div className="am-stat"><span>Approved</span><strong>{count('approved')}</strong></div>
        <div className="am-stat"><span>Rejected</span><strong>{count('rejected')}</strong></div>
      </div>

      <section className="um-panel">
        <div className="um-panel-heading">
          <div><h2>Equipment Listings</h2><p>Approve or reject submitted equipment.</p></div>
          <span className="um-total">{filtered.length} records</span>
        </div>

        <div className="um-toolbar">
          <div className="um-search">
            <span aria-hidden="true">⌕</span>
            <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search equipment, owner, or category..." />
          </div>
          <select value={status} onChange={e => setStatus(e.target.value)} aria-label="Filter approval status">
            <option value="">All Approval Statuses</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>

        {message && <div className="um-message success">{message}</div>}
        {error && <div className="um-message error">{error}</div>}

        <div className="um-table-wrapper">
          <table className="um-table">
            <thead><tr>
              <th>Equipment</th><th>Owner</th><th>Category</th><th>Rate</th>
              <th>Location</th><th>Availability</th><th>Approval</th><th>Action</th>
            </tr></thead>
            <tbody>
              {loading ? <tr><td colSpan="8" className="um-empty">Loading equipment...</td></tr>
                : shown.length === 0 ? <tr><td colSpan="8" className="um-empty">No equipment listings found.</td></tr>
                : shown.map(item => <tr key={item.id}>
                  <td><strong>{item.name || item.equipment_name || 'Unnamed equipment'}</strong>
                    <small className="am-subtext">{item.brand_model || `ID #${item.id}`}</small></td>
                  <td>{item.owner_name || '—'}</td>
                  <td>{item.category_name || '—'}</td>
                  <td>{money(item.rate ?? item.rental_rate)} / {item.rate_type || '—'}</td>
                  <td>{item.location || '—'}</td>
                  <td><span className={`am-pill ${item.availability || item.availability_status || ''}`}>
                    {item.availability || item.availability_status || 'Unknown'}</span></td>
                  <td><span className={`am-pill ${item.approval_status || ''}`}>{item.approval_status || 'Unknown'}</span></td>
                  <td><div className="am-actions">
                    {item.approval_status !== 'approved' && <button disabled={busyId === item.id}
                      className="am-button approve" onClick={() => setApproval(item, 'approved')}>
                      {busyId === item.id ? 'Saving...' : 'Approve'}
                    </button>}
                    {item.approval_status !== 'rejected' && <button disabled={busyId === item.id}
                      className="am-button reject" onClick={() => setApproval(item, 'rejected')}>Reject</button>}
                  </div></td>
                </tr>)}
            </tbody>
          </table>
        </div>
        {!loading && <Pagination totalItems={filtered.length} itemsPerPage={PAGE_SIZE}
          currentPage={page} onPageChange={setPage} />}
      </section>
    </div>
  );
}
