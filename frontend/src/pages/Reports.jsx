import { useEffect, useMemo, useState } from 'react';
import { api } from '../api/client';
import { Bar, Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend);

const SECTIONS = [
  { key: 'users', label: 'All Users', date: ['created_at'] },
  { key: 'owners', label: 'Owner Verification', date: ['created_at', 'reviewed_at'] },
  { key: 'equipment', label: 'Equipment Listings', date: ['created_at', 'updated_at'] },
  { key: 'rentals', label: 'Rental Records', date: ['created_at', 'start_at', 'end_at'] },
  { key: 'rentalPayments', label: 'Rental Sales / Payments', date: ['paid_at', 'created_at'] },
  { key: 'subscriptions', label: 'Subscriptions', date: ['created_at', 'starts_at', 'ends_at'] },
  { key: 'payments', label: 'Subscription Payments', date: ['created_at', 'paid_at'] },
  { key: 'activity', label: 'System Activity Logs', date: ['created_at'] },
];
const EMPTY = Object.fromEntries(SECTIONS.map(s => [s.key, []]));
const LABELS = {
  id: 'ID', user_id: 'User ID', full_name: 'Name', name: 'Name', email: 'Email', phone: 'Phone', role: 'Role', status: 'Status',
  verification_status: 'Verification', business_name: 'Business', equipment_name: 'Equipment', owner_name: 'Owner', farmer_name: 'Farmer',
  category_name: 'Category', rental_rate: 'Rate', rate: 'Rate', availability_status: 'Availability', approval_status: 'Approval',
  start_at: 'Rental Start', end_at: 'Rental End', total_amount: 'Total Amount', amount: 'Amount', base_amount: 'Base Amount',
  payment_method: 'Payment Method', method: 'Method', reference: 'Reference', plan_name: 'Plan', price: 'Price', starts_at: 'Starts', ends_at: 'Expires',
  action: 'Activity', created_at: 'Date / Time', paid_at: 'Paid At', reviewed_at: 'Reviewed At', recorded_by_name: 'Recorded By',
};
const DATE_KEYS = new Set(['created_at', 'updated_at', 'paid_at', 'reviewed_at', 'starts_at', 'ends_at', 'start_at', 'end_at']);
const MONEY_KEYS = new Set(['amount', 'total_amount', 'base_amount', 'price', 'rate', 'rental_rate']);
const safeRows = value => Array.isArray(value) ? value : Array.isArray(value?.data) ? value.data : [];
const parseDate = value => { if (!value) return null; const d = new Date(value); return Number.isNaN(d.getTime()) ? null : d; };
const showValue = (key, value) => {
  if (value === null || value === undefined || value === '') return '—';
  if (DATE_KEYS.has(key)) { const d = parseDate(value); return d ? d.toLocaleString('en-PH') : String(value); }
  if (MONEY_KEYS.has(key) && Number.isFinite(Number(value))) return Number(value).toLocaleString('en-PH', { style: 'currency', currency: 'PHP' });
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
};

function RecordsTable({ rows }) {
  if (!rows.length) return <div className="am-empty">No records found for the selected date range.</div>;
  const keys = [...new Set(rows.flatMap(row => Object.keys(row)))].filter(key => !['password', 'password_hash', 'token'].includes(key));
  return <div className="um-table-wrapper"><table className="um-table am-report-table"><thead><tr>{keys.map(key => <th key={key}>{LABELS[key] || key.replaceAll('_', ' ')}</th>)}</tr></thead><tbody>{rows.map((row, i) => <tr key={row.id ?? i}>{keys.map(key => <td key={key}>{showValue(key, row[key])}</td>)}</tr>)}</tbody></table></div>;
}

export default function Reports() {
  const [records, setRecords] = useState(EMPTY);
  const [active, setActive] = useState('users');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState([]);

  async function load() {
    setLoading(true); setErrors([]);
    const jobs = [
      ['users', () => api('/admin/users')], ['owners', () => api('/admin/owners')],
      ['equipment', () => api('/equipment/admin')], ['rentals', () => api('/admin/rentals')],
      ['rentalPayments', () => api('/admin/report-rental-payments')], ['subscriptions', () => api('/admin/subscriptions')],
      ['activity', () => api('/admin/activity')],
    ];
    const results = await Promise.allSettled(jobs.map(([, fn]) => fn()));
    const next = { ...EMPTY }; const failed = [];
    results.forEach((result, index) => {
      const key = jobs[index][0];
      if (result.status !== 'fulfilled') { failed.push(key); return; }
      const value = result.value;
      if (key === 'subscriptions') {
        next.subscriptions = safeRows(value.subscriptions);
        next.payments = safeRows(value.payments);
      } else next[key] = safeRows(value);
    });
    setRecords(next); setErrors(failed); setLoading(false);
  }
  useEffect(() => { load(); }, []);

  const allRows = records[active] || [];
  const dateFilteredRecords = useMemo(() => Object.fromEntries(SECTIONS.map(section => [section.key, records[section.key].filter(row => {
    const d = section.date.map(key => parseDate(row[key])).find(Boolean);
    if (fromDate && (!d || d < new Date(`${fromDate}T00:00:00`))) return false;
    if (toDate && (!d || d > new Date(`${toDate}T23:59:59.999`))) return false;
    return true;
  })])), [records, fromDate, toDate]);
  const salesByMonth = useMemo(() => {
    const totals = new Map();
    [...dateFilteredRecords.rentalPayments, ...dateFilteredRecords.payments].forEach(row => {
      const d = parseDate(row.paid_at || row.created_at);
      if (!d) return;
      const key = d.toLocaleDateString('en-PH', { month: 'short', year: 'numeric' });
      totals.set(key, (totals.get(key) || 0) + Number(row.amount || row.total_amount || 0));
    });
    return [...totals.entries()];
  }, [dateFilteredRecords]);
  const salesChart = { labels: salesByMonth.map(item => item[0]), datasets: [{ label: 'Recorded Sales (PHP)', data: salesByMonth.map(item => item[1]), backgroundColor: '#43834d', borderRadius: 6 }] };
  const categoryChart = { labels: SECTIONS.map(s => s.label), datasets: [{ data: SECTIONS.map(s => dateFilteredRecords[s.key].length), backgroundColor: ['#43834d', '#d7a343', '#6994ad', '#8d78ad', '#bf8667', '#70a59a', '#aa8b59', '#718096'], borderWidth: 0 }] };
  const chartOptions = { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } }, scales: { y: { beginAtZero: true } } };
  const filtered = useMemo(() => allRows.filter(row => {
    const section = SECTIONS.find(item => item.key === active);
    const dateValue = section.date.map(key => parseDate(row[key])).find(Boolean);
    if (fromDate && (!dateValue || dateValue < new Date(`${fromDate}T00:00:00`))) return false;
    if (toDate && (!dateValue || dateValue > new Date(`${toDate}T23:59:59.999`))) return false;
    if (search.trim() && !Object.values(row).some(value => String(value ?? '').toLowerCase().includes(search.trim().toLowerCase()))) return false;
    return true;
  }), [allRows, active, fromDate, toDate, search]);

  function printRecords(all = false) {
    const sections = all ? SECTIONS : [SECTIONS.find(s => s.key === active)];
    const html = sections.map(section => {
      const rows = all ? dateFilteredRecords[section.key] : filtered;
      if (!rows.length) return `<section><h2>${section.label}</h2><p>No records for selected date range.</p></section>`;
      const keys = [...new Set(rows.flatMap(row => Object.keys(row)))].filter(key => !['password', 'password_hash', 'token'].includes(key));
      const head = keys.map(key => `<th>${LABELS[key] || key.replaceAll('_', ' ')}</th>`).join('');
      const body = rows.map(row => `<tr>${keys.map(key => `<td>${String(showValue(key, row[key])).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;')}</td>`).join('')}</tr>`).join('');
      return `<section><h2>${section.label} (${rows.length})</h2><table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></section>`;
    }).join('');
    const w = window.open('', '_blank');
    if (!w) { alert('Please allow pop-ups to print or save PDF.'); return; }
    w.document.write(`<!doctype html><html><head><title>AGRILEASE Reports</title><style>body{font:12px Arial,sans-serif;color:#17251a;padding:24px}h1{font-size:22px}h2{font-size:16px;margin:24px 0 8px}p{color:#555}table{border-collapse:collapse;width:100%;font-size:10px;table-layout:auto}th,td{border:1px solid #bbb;padding:6px;text-align:left;overflow-wrap:anywhere}th{background:#eaf1e8}section{break-inside:avoid;margin-bottom:24px}@media print{body{padding:0}section{break-inside:auto}tr{break-inside:avoid}}</style></head><body><h1>AGRILEASE — ${all ? 'All Records' : sections[0].label}</h1><p>Generated: ${new Date().toLocaleString('en-PH')} · Date filter: ${fromDate || 'Any'} to ${toDate || 'Any'}</p>${html}</body></html>`);
    w.document.close(); w.focus(); w.print();
  }

  return <div className="am-page am-reports-page">
    <div className="admin-page-heading am-no-print"><div><h1>Reports &amp; Records</h1><p>Monitor all available platform records and sales by date. Print directly or save as PDF.</p></div><div className="am-actions"><button className="um-refresh" onClick={load} disabled={loading}>{loading ? 'Loading…' : 'Refresh'}</button><button className="am-button" onClick={() => printRecords(false)} disabled={loading}>Print Current Records</button><button className="am-button approve" onClick={() => printRecords(true)} disabled={loading}>Print / Save All as PDF</button></div></div>
    <section className="um-panel am-no-print"><div className="am-report-toolbar"><div><h2>Date Range Filter</h2><p>Filters the selected record type, including sales and payment records.</p></div><div className="am-actions"><label>From <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} /></label><label>To <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} /></label><button className="um-refresh" onClick={() => { setFromDate(''); setToDate(''); setSearch(''); }}>Clear</button></div></div></section>
    {errors.length > 0 && <div className="um-message error am-no-print">Some data sources could not be loaded: {errors.join(', ')}. Check the API and database, then refresh.</div>}
    <div className="am-chart-grid am-no-print"><section className="um-panel am-chart-panel"><div className="um-panel-heading"><div><h2>Recorded Sales by Month</h2><p>Rental and subscription payments within the selected date range.</p></div></div>{salesByMonth.length ? <div className="am-chart-area"><Bar data={salesChart} options={chartOptions} /></div> : <div className="am-empty">No payment sales recorded for this date range.</div>}</section><section className="um-panel am-chart-panel"><div className="um-panel-heading"><div><h2>Records by Category</h2><p>All loaded record types within the selected date range.</p></div></div><div className="am-chart-area am-doughnut-area"><Doughnut data={categoryChart} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }} /></div></section></div>
    <section className="um-panel am-no-print"><div className="am-tabs am-report-tabs">{SECTIONS.map(section => <button key={section.key} className={active === section.key ? 'active' : ''} onClick={() => { setActive(section.key); setSearch(''); }}>{section.label} ({records[section.key].length})</button>)}</div><div className="um-panel-heading am-report-toolbar"><div><h2>{SECTIONS.find(s => s.key === active)?.label}</h2><p>{filtered.length} records shown · {allRows.length} total records</p></div><input className="am-report-search" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search records…" /></div>{loading ? <div className="am-empty">Loading records…</div> : <RecordsTable rows={filtered} />}</section>
  </div>;
}
