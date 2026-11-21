import { useEffect, useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { api } from '../api/client';
import Pagination from '../components/admin/Pagination';
import { assetUrl } from '../api/config';

const PAGE_SIZE = 8;
const money = value => Number(value || 0).toLocaleString('en-PH', { style: 'currency', currency: 'PHP' });
const pretty = value => String(value || '—').replaceAll('_', ' ');

export default function EquipmentManagement() {
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [status, setStatus] = useState('');
  const [availability, setAvailability] = useState('');
  const [category, setCategory] = useState('');
  const [archive, setArchive] = useState('active');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [selected, setSelected] = useState(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  async function load() {
    try {
      setLoading(true); setError('');
      const params = new URLSearchParams();
      if (status) params.set('status', status);
      if (availability) params.set('availability', availability);
      if (category) params.set('category_id', category);
      if (search.trim()) params.set('q', search.trim());
      if (archive === 'archived') params.set('archived', '1');
      const result = await api(`/equipment/admin?${params.toString()}`);
      setItems(result.data || []);
    } catch (err) { setError(err.message || 'Unable to load equipment.'); setItems([]); }
    finally { setLoading(false); }
  }

  useEffect(() => { api('/categories').then(r => setCategories(r.data || [])).catch(() => setCategories([])); }, []);
  useEffect(() => { setPage(1); load(); }, [status, availability, category, archive]);
  useEffect(() => { const timer = setTimeout(() => { setPage(1); load(); }, 250); return () => clearTimeout(timer); }, [search]);

  const filtered = useMemo(() => items, [items]);
  const shown = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const count = value => items.filter(item => item.approval_status === value).length;

  async function setApproval(item, approval_status) {
    const action = approval_status === 'approved' ? 'approve' : 'reject';
    if (!await window.agrileaseDialog.confirm(`Are you sure you want to ${action} "${item.name || item.equipment_name}"?`)) return;
    try {
      setBusyId(item.id); setError(''); setMessage('');
      await api(`/equipment/${item.id}/approval`, { method: 'PATCH', body: { approval_status } });
      setMessage(`Equipment ${action}d successfully.`); await load();
      if (selected?.id === item.id) setSelected({ ...selected, approval_status });
    } catch (err) { setError(err.message || `Unable to ${action} equipment.`); }
    finally { setBusyId(null); }
  }

  return <div className="am-page">
    <div className="admin-page-heading"><div><h1>Equipment Management</h1><p>Review, approve, and monitor equipment listings submitted by owners.</p></div>
      <button className="um-refresh" type="button" onClick={load} disabled={loading}>{loading ? 'Loading...' : 'Refresh'}</button></div>

    <div className="am-stats">
      <div className="am-stat"><span>Total Listings</span><strong>{items.length}</strong></div>
      <div className="am-stat"><span>Pending Approval</span><strong>{count('pending')}</strong></div>
      <div className="am-stat"><span>Approved</span><strong>{count('approved')}</strong></div>
      <div className="am-stat"><span>Rejected</span><strong>{count('rejected')}</strong></div>
    </div>

    <section className="um-panel">
      <div className="um-panel-heading"><div><h2>Equipment Listings</h2><p>Review listing details and control approval status.</p></div><span className="um-total">{filtered.length} records</span></div>
      <div className="um-toolbar">
        <div className="um-search"><Search size={18} /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search equipment, owner, model, or location..." /></div>
        <select value={status} onChange={e => setStatus(e.target.value)} aria-label="Approval status"><option value="">All Approval Statuses</option><option value="pending">Pending</option><option value="approved">Approved</option><option value="rejected">Rejected</option></select>
        <select value={category} onChange={e => setCategory(e.target.value)} aria-label="Category"><option value="">All Categories</option>{categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
        <select value={availability} onChange={e => setAvailability(e.target.value)} aria-label="Availability"><option value="">All Availability</option><option value="available">Available</option><option value="unavailable">Unavailable</option><option value="rented">Rented</option><option value="maintenance">Maintenance</option></select>
        <select value={archive} onChange={e => setArchive(e.target.value)} aria-label="Listing archive"><option value="active">Active Listings</option><option value="archived">Archived Listings</option><option value="all">All Listings</option></select>
        <button className="am-button neutral" type="button" onClick={() => { setSearch(''); setStatus(''); setCategory(''); setAvailability(''); setArchive('active'); }}>Clear Filters</button>
      </div>
      {message && <div className="um-message success">{message}</div>}{error && <div className="um-message error">{error}</div>}
      <div className="um-table-wrapper"><table className="um-table"><thead><tr><th>Equipment</th><th>Owner</th><th>Category</th><th>Rental Rate</th><th>Location</th><th>Availability</th><th>Approval</th><th>Action</th></tr></thead>
        <tbody>{loading ? <tr><td colSpan="8" className="um-empty">Loading equipment...</td></tr> : shown.length === 0 ? <tr><td colSpan="8" className="um-empty">{archive === 'archived' ? 'No archived equipment listings. Listings archived by owners will appear here.' : 'No equipment listings found.'}</td></tr> : shown.map(item => <tr key={item.id}>
          <td><strong>{item.name || item.equipment_name || 'Unnamed equipment'}</strong><small className="am-subtext">{item.brand_model || `ID #${item.id}`}</small></td><td>{item.owner_name || '—'}</td><td>{item.category_name || '—'}</td><td>{money(item.rate ?? item.rental_rate)} / {item.rate_type || '—'}</td><td>{item.location || '—'}</td>
          <td><span className={`am-pill ${item.availability || item.availability_status || ''}`}>{pretty(item.availability || item.availability_status)}</span></td><td><span className={`am-pill ${item.approval_status || ''}`}>{pretty(item.approval_status)}</span></td>
          <td><div className="am-actions"><button className="am-button neutral" onClick={() => setSelected(item)}>View</button>{archive !== 'archived' && item.approval_status !== 'approved' && <button disabled={busyId === item.id} className="am-button approve" onClick={() => setApproval(item, 'approved')}>Approve</button>}{archive !== 'archived' && item.approval_status !== 'rejected' && <button disabled={busyId === item.id} className="am-button reject" onClick={() => setApproval(item, 'rejected')}>Reject</button>}</div></td>
        </tr>)}</tbody></table></div>
      {!loading && <Pagination totalItems={filtered.length} itemsPerPage={PAGE_SIZE} currentPage={page} onPageChange={setPage} />}
    </section>

    {selected && <div className="am-modal-backdrop" role="presentation" onClick={() => setSelected(null)}><section className="am-detail-modal" role="dialog" aria-modal="true" aria-labelledby="equipment-detail-title" onClick={e => e.stopPropagation()}>
      <div className="um-panel-heading"><div><h2 id="equipment-detail-title">Equipment Details</h2><p>Listing reference #{selected.id}</p></div><button className="am-button neutral" onClick={() => setSelected(null)}>Close</button></div>
      {selected.image_path && <img className="am-equipment-preview" src={assetUrl(`/uploads/${String(selected.image_path).replace(/^\//, '')}`)} alt={selected.equipment_name || 'Equipment'} />}
      <div className="am-detail-grid">{[['Equipment Name', selected.equipment_name || selected.name],['Brand / Model', selected.brand_model],['Owner', selected.owner_name],['Category', selected.category_name],['Rental Rate', `${money(selected.rental_rate ?? selected.rate)} / ${selected.rate_type || ''}`],['Quantity', selected.quantity ?? selected.available_quantity],['Condition', pretty(selected.condition_status)],['Availability', pretty(selected.availability_status || selected.availability)],['Location', selected.location],['Approval Status', pretty(selected.approval_status)],['Description', selected.description],['Submitted', selected.created_at ? new Date(selected.created_at).toLocaleString('en-PH') : '—']].map(([label, value]) => <div key={label}><small>{label}</small><strong>{value || '—'}</strong></div>)}</div>
      {selected.approval_status !== 'approved' && <div className="am-actions modal-actions"><button className="am-button approve" disabled={busyId === selected.id} onClick={() => setApproval(selected, 'approved')}>Approve Listing</button>{selected.approval_status !== 'rejected' && <button className="am-button reject" disabled={busyId === selected.id} onClick={() => setApproval(selected, 'rejected')}>Reject Listing</button>}</div>}
    </section></div>}
  </div>;
}
