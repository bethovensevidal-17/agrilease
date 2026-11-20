import { useEffect, useMemo, useState } from 'react';
import { api } from '../api/client';
import { Bar, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Tooltip,
  Legend
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Tooltip,
  Legend
);

const SECTIONS = [
  { key: 'users', label: 'All Users', date: ['created_at'] },
  { key: 'owners', label: 'Owner Verification', date: ['created_at', 'reviewed_at'] },
  { key: 'equipment', label: 'Equipment Listings', date: ['created_at', 'updated_at'] },
  { key: 'rentals', label: 'Rental Records', date: ['created_at', 'start_date', 'end_date', 'start_at', 'end_at'] },
  { key: 'rentalPayments', label: 'Rental Sales / Payments', date: ['paid_at', 'created_at'] },
  { key: 'subscriptions', label: 'Subscriptions', date: ['created_at', 'start_date', 'end_date', 'starts_at', 'ends_at'] },
  { key: 'payments', label: 'Subscription Payments', date: ['created_at', 'payment_date', 'paid_at'] },
  { key: 'activity', label: 'System Activity Logs', date: ['created_at'] }
];

const EMPTY = Object.fromEntries(
  SECTIONS.map(section => [section.key, []])
);

const LABELS = {
  id: 'ID',
  user_id: 'User ID',
  full_name: 'Name',
  name: 'Name',
  email: 'Email',
  phone: 'Phone',
  role: 'Role',
  status: 'Status',
  verification_status: 'Verification',
  business_name: 'Business',
  equipment_name: 'Equipment',
  owner_name: 'Owner',
  farmer_name: 'Farmer',
  category_name: 'Category',
  rental_rate: 'Rate',
  rate: 'Rate',
  availability_status: 'Availability',
  approval_status: 'Approval',
  start_at: 'Rental Start',
  end_at: 'Rental End',
  total_amount: 'Total Amount',
  amount: 'Amount',
  base_amount: 'Base Amount',
  payment_method: 'Payment Method',
  method: 'Method',
  reference: 'Reference',
  plan_name: 'Plan',
  price: 'Price',
  start_date: 'Starts',
  end_date: 'Expires',
  payment_date: 'Payment Date',
  starts_at: 'Starts',
  ends_at: 'Expires',
  action: 'Activity',
  created_at: 'Date / Time',
  paid_at: 'Paid At',
  reviewed_at: 'Reviewed At',
  recorded_by_name: 'Recorded By'
};

const DATE_KEYS = new Set([
  'created_at',
  'updated_at',
  'paid_at',
  'reviewed_at',
  'start_date',
  'end_date',
  'payment_date',
  'starts_at',
  'ends_at',
  'start_at',
  'end_at'
]);

const MONEY_KEYS = new Set([
  'amount',
  'total_amount',
  'base_amount',
  'price',
  'rate',
  'rental_rate'
]);

const safeRows = value =>
  Array.isArray(value)
    ? value
    : Array.isArray(value?.data)
      ? value.data
      : [];

const parseDate = value => {
  if (!value) return null;

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? null : date;
};

const showValue = (key, value) => {
  if (value === null || value === undefined || value === '') {
    return '—';
  }

  if (DATE_KEYS.has(key)) {
    const date = parseDate(value);
    return date ? date.toLocaleString('en-PH') : String(value);
  }

  if (MONEY_KEYS.has(key) && Number.isFinite(Number(value))) {
    return Number(value).toLocaleString('en-PH', {
      style: 'currency',
      currency: 'PHP'
    });
  }

  if (typeof value === 'object') {
    return JSON.stringify(value);
  }

  return String(value);
};

function RecordsTable({ rows }) {
  if (!rows.length) {
    return (
      <div className="am-empty">
        No records found for the selected filters.
      </div>
    );
  }

  // Sort records by ID: lowest to highest
  const sortedRows = [...rows].sort((a, b) => {
    const idA = Number(a.id);
    const idB = Number(b.id);

    if (Number.isFinite(idA) && Number.isFinite(idB)) {
      return idA - idB;
    }

    return String(a.id ?? '').localeCompare(String(b.id ?? ''));
  });

  const keys = [
    ...new Set(rows.flatMap(row => Object.keys(row)))
  ].filter(key =>
    !['password', 'password_hash', 'token'].includes(key)
  );

  return (
    <div className="um-table-wrapper">
      <table className="um-table am-report-table">
        <thead>
          <tr>
            {keys.map(key => (
              <th key={key}>
                {LABELS[key] || key.replaceAll('_', ' ')}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {sortedRows.map((row, index) => (
            <tr key={row.id ?? index}>
              {keys.map(key => (
                <td key={key}>
                  {showValue(key, row[key])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function Reports() {
  const [records, setRecords] = useState(EMPTY);
  const [active, setActive] = useState('users');

  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const [draftFromDate, setDraftFromDate] = useState('');
  const [draftToDate, setDraftToDate] = useState('');

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [ownerFilter, setOwnerFilter] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState([]);

  async function load() {
    setLoading(true);
    setErrors([]);

    const jobs = [
      ['users', () => api('/admin/users')],
      ['owners', () => api('/admin/owners')],
      ['equipment', () => api('/equipment/admin')],
      ['rentals', () => api('/admin/rentals')],
      ['rentalPayments', () => api('/admin/report-rental-payments')],
      ['subscriptions', () => api('/admin/subscriptions')],
      ['activity', () => api('/admin/activity')]
    ];

    const results = await Promise.allSettled(
      jobs.map(([, fn]) => fn())
    );

    const next = { ...EMPTY };
    const failed = [];

    results.forEach((result, index) => {
      const key = jobs[index][0];

      if (result.status !== 'fulfilled') {
        failed.push(key);
        return;
      }

      const value = result.value;

      if (key === 'subscriptions') {
        next.subscriptions = safeRows(value.subscriptions);
        next.payments = safeRows(value.payments);
      } else {
        next[key] = safeRows(value);
      }
    });

    setRecords(next);
    setErrors(failed);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const dateFilteredRecords = useMemo(() => {
    return Object.fromEntries(
      SECTIONS.map(section => [
        section.key,
        records[section.key].filter(row => {
          const date = section.date
            .map(key => parseDate(row[key]))
            .find(Boolean);

          if (
            fromDate &&
            (!date || date < new Date(`${fromDate}T00:00:00`))
          ) {
            return false;
          }

          if (
            toDate &&
            (!date || date > new Date(`${toDate}T23:59:59.999`))
          ) {
            return false;
          }

          return true;
        })
      ])
    );
  }, [records, fromDate, toDate]);

  const salesByMonth = useMemo(() => {
    const monthly = new Map();
    const add = (rows, bucket) => rows.forEach(row => {
      if (bucket === 'subscription' && row.payment_status !== 'verified') return;
      const date = parseDate(row.paid_at || row.payment_date || row.created_at);
      if (!date) return;
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const label = date.toLocaleDateString('en-PH', { month: 'short', year: 'numeric' });
      const entry = monthly.get(key) || { label, rental: 0, subscription: 0 };
      const amount = Number(row.amount || row.total_amount || 0);
      entry[bucket] += Number.isFinite(amount) ? amount : 0;
      monthly.set(key, entry);
    });
    add(dateFilteredRecords.rentalPayments, 'rental');
    add(dateFilteredRecords.payments, 'subscription');
    return [...monthly.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([, value]) => value);
  }, [dateFilteredRecords]);

  const salesChart = {
    labels: salesByMonth.map(item => item.label),
    datasets: [
      { label: 'Rental Revenue (PHP)', data: salesByMonth.map(item => item.rental), backgroundColor: '#43834d', borderRadius: 6 },
      { label: 'Subscription Revenue (PHP)', data: salesByMonth.map(item => item.subscription), backgroundColor: '#d7a343', borderRadius: 6 }
    ]
  };

  const categoryChart = {
    labels: SECTIONS.map(section => section.label),
    datasets: [
      {
        data: SECTIONS.map(
          section => dateFilteredRecords[section.key].length
        ),
        backgroundColor: [
          '#43834d',
          '#d7a343',
          '#6994ad',
          '#8d78ad',
          '#bf8667',
          '#70a59a',
          '#aa8b59',
          '#718096'
        ],
        borderWidth: 0
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom'
      }
    },
    scales: {
      y: {
        beginAtZero: true
      }
    }
  };

  const allRows = dateFilteredRecords[active] || [];

  const filtered = useMemo(() => {
    return allRows.filter(row => {
      if (statusFilter && !String(row.status ?? row.payment_status ?? row.approval_status ?? row.verification_status ?? '').toLowerCase().includes(statusFilter.toLowerCase())) return false;
      if (categoryFilter && !String(row.category_name ?? row.category ?? '').toLowerCase().includes(categoryFilter.toLowerCase())) return false;
      if (ownerFilter && !String(row.owner_name ?? row.business_name ?? row.owner_id ?? '').toLowerCase().includes(ownerFilter.toLowerCase())) return false;
      if (
        search.trim() &&
        !Object.values(row).some(value =>
          String(value ?? '')
            .toLowerCase()
            .includes(search.trim().toLowerCase())
        )
      ) {
        return false;
      }

      return true;
    });
  }, [allRows, search, statusFilter, categoryFilter, ownerFilter]);

  useEffect(() => { setPage(1); }, [active, search, statusFilter, categoryFilter, ownerFilter, fromDate, toDate]);
  const pageRows = filtered.slice((page - 1) * pageSize, page * pageSize);
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const uniqueCategories = [...new Set(allRows.map(row => row.category_name ?? row.category).filter(Boolean))];

  function applyDateFilter() {
    if (
      draftFromDate &&
      draftToDate &&
      draftFromDate > draftToDate
    ) {
      alert('Date From cannot be later than Date To.');
      return;
    }

    setFromDate(draftFromDate);
    setToDate(draftToDate);
  }

  function resetFilters() {
    setDraftFromDate('');
    setDraftToDate('');
    setFromDate('');
    setToDate('');
    setSearch('');
    setStatusFilter('');
    setCategoryFilter('');
    setOwnerFilter('');
  }

  function printRecords(all = false) {
    const sections = all
      ? SECTIONS
      : [SECTIONS.find(section => section.key === active)];

    const html = sections.map(section => {
      const rows = all
        ? dateFilteredRecords[section.key]
        : filtered;

      // Keep printed records in ascending ID order too
      const sortedRows = [...rows].sort((a, b) => {
        const idA = Number(a.id);
        const idB = Number(b.id);

        if (Number.isFinite(idA) && Number.isFinite(idB)) {
          return idA - idB;
        }

        return String(a.id ?? '').localeCompare(String(b.id ?? ''));
      });

      if (!sortedRows.length) {
        return `
          <section>
            <h2>${section.label}</h2>
            <p>No records for selected date range.</p>
          </section>
        `;
      }

      const keys = [
        ...new Set(sortedRows.flatMap(row => Object.keys(row)))
      ].filter(key =>
        !['password', 'password_hash', 'token'].includes(key)
      );

      const escapeHtml = value =>
        String(value)
          .replaceAll('&', '&amp;')
          .replaceAll('<', '&lt;')
          .replaceAll('>', '&gt;')
          .replaceAll('"', '&quot;')
          .replaceAll("'", '&#039;');

      const head = keys.map(key =>
        `<th>${escapeHtml(LABELS[key] || key.replaceAll('_', ' '))}</th>`
      ).join('');

      const body = sortedRows.map(row =>
        `<tr>${keys.map(key =>
          `<td>${escapeHtml(showValue(key, row[key]))}</td>`
        ).join('')}</tr>`
      ).join('');

      return `
        <section>
          <h2>${escapeHtml(section.label)} (${sortedRows.length})</h2>
          <table>
            <thead><tr>${head}</tr></thead>
            <tbody>${body}</tbody>
          </table>
        </section>
      `;
    }).join('');

    const windowRef = window.open('', '_blank');

    if (!windowRef) {
      alert('Please allow pop-ups to print or save PDF.');
      return;
    }

    windowRef.document.write(`
      <!doctype html>
      <html>
      <head>
        <title>AGRILEASE Reports</title>
        <style>
          body {
            font: 12px Arial, sans-serif;
            color: #17251a;
            padding: 24px;
          }

          h1 { font-size: 22px; }
          h2 { font-size: 16px; margin: 24px 0 8px; }
          p { color: #555; }

          table {
            border-collapse: collapse;
            width: 100%;
            font-size: 10px;
            table-layout: auto;
          }

          th, td {
            border: 1px solid #bbb;
            padding: 6px;
            text-align: left;
            overflow-wrap: anywhere;
          }

          th { background: #eaf1e8; }

          section {
            break-inside: avoid;
            margin-bottom: 24px;
          }

          @media print {
            body { padding: 0; }
            section { break-inside: auto; }
            tr { break-inside: avoid; }
          }
        </style>
      </head>

      <body>
        <h1>AGRILEASE — ${all ? 'All Records' : sections[0].label}</h1>

        <p>
          Generated: ${new Date().toLocaleString('en-PH')}
          · Date filter: ${fromDate || 'Any'} to ${toDate || 'Any'}
        </p>

        ${html}
      </body>
      </html>
    `);

    windowRef.document.close();
    windowRef.focus();
    windowRef.print();
  }

  return (
    <div className="am-page am-reports-page">

      {/* PAGE HEADING */}
      <div className="admin-page-heading am-no-print">
        <div>
          <h1>Reports &amp; Records</h1>
          <p>
            Monitor all available platform records and sales by date.
            View analytics and manage system records.
          </p>
        </div>

        <div className="am-actions">
          <button
            className="um-refresh"
            onClick={load}
            disabled={loading}
          >
            {loading ? 'Loading...' : 'Refresh'}
          </button>
        </div>
      </div>

      {errors.length > 0 && (
        <div className="um-message error am-no-print">
          Some data sources could not be loaded: {errors.join(', ')}.
          Check the API and database, then refresh.
        </div>
      )}

      {/* ANALYTICS */}
      <div className="am-chart-grid am-no-print">

        <section className="um-panel am-chart-panel">
          <div className="um-panel-heading">
            <div>
              <h2>Recorded Sales by Month</h2>
              <p>
                Rental and subscription payments within the selected date range.
              </p>
            </div>
          </div>

          {salesByMonth.length ? (
            <div className="am-chart-area">
              <Bar data={salesChart} options={chartOptions} />
            </div>
          ) : (
            <div className="am-empty">
              No payment sales recorded for this date range.
            </div>
          )}
        </section>

        <section className="um-panel am-chart-panel">
          <div className="um-panel-heading">
            <div>
              <h2>Records by Category</h2>
              <p>
                All loaded record types within the selected date range.
              </p>
            </div>
          </div>

          <div className="am-chart-area am-doughnut-area">
            <Doughnut
              data={categoryChart}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: 'bottom'
                  }
                }
              }}
            />
          </div>
        </section>

      </div>

      {/* RECORDS AND FILTERS */}
      <section className="um-panel am-no-print am-records-panel">

        <div className="um-panel-heading am-records-heading">
          <div>
            <h2>Reports Records</h2>
            <p>Select a category and filter records by date.</p>
          </div>

          <label className="am-record-type">
            <span>Report Type</span>
            <select
              value={active}
              onChange={event => {
                setActive(event.target.value);
                setSearch('');
              }}
            >
              {SECTIONS.map(section => (
                <option key={section.key} value={section.key}>
                  {section.label} ({records[section.key].length})
                </option>
              ))}
            </select>
          </label>
        </div>

        {/* DATE FILTER AND PRINT ACTIONS */}
        <div className="am-record-controls">

          <div className="am-record-date-controls">
            <strong className="am-record-filter-title">
              Date Range
            </strong>

            <label>
              <span>From</span>
              <input
                type="date"
                value={draftFromDate}
                onChange={event =>
                  setDraftFromDate(event.target.value)
                }
              />
            </label>

            <label>
              <span>To</span>
              <input
                type="date"
                value={draftToDate}
                onChange={event =>
                  setDraftToDate(event.target.value)
                }
              />
            </label>

            <button
              className="am-button approve"
              onClick={applyDateFilter}
              disabled={loading}
            >
              Apply
            </button>

            <button
              className="am-button neutral"
              onClick={resetFilters}
            >
              Reset
            </button>
          </div>

          <div className="am-record-print-controls">
            <button
              className="am-button neutral"
              onClick={() => printRecords(false)}
              disabled={loading}
            >
              Print Current
            </button>

            <button
              className="am-button approve"
              onClick={() => printRecords(true)}
              disabled={loading}
            >
              Print / Save All as PDF
            </button>
          </div>

        </div>

        {/* SEARCH AND RECORD COUNT */}
        <div className="am-record-search-row">
          <div>
            <h3>
              {SECTIONS.find(section => section.key === active)?.label}
            </h3>
            <p>
              {filtered.length} records shown
              {' · '}
              {allRows.length} total records
            </p>
          </div>

          <div className="am-report-filter-controls">
            <input className="am-report-search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Search records..." />
            <input className="am-report-search" value={ownerFilter} onChange={event => setOwnerFilter(event.target.value)} placeholder="Filter owner..." />
            <select value={statusFilter} onChange={event => setStatusFilter(event.target.value)} aria-label="Filter status">
              <option value="">All Statuses</option><option value="pending">Pending</option><option value="approved">Approved</option><option value="verified">Verified</option><option value="rejected">Rejected</option><option value="active">Active</option><option value="expired">Expired</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option>
            </select>
            <select value={categoryFilter} onChange={event => setCategoryFilter(event.target.value)} aria-label="Filter category">
              <option value="">All Categories</option>{uniqueCategories.map(value => <option key={value} value={value}>{value}</option>)}
            </select>
          </div>
        </div>

        {/* RECORDS TABLE */}
        {loading ? (
          <div className="am-empty">
            Loading records...
          </div>
        ) : (
          <RecordsTable rows={pageRows} />
        )}
        {!loading && filtered.length > 0 && (
          <div className="am-report-pagination">
            <span>Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, filtered.length)} of {filtered.length}</span>
            <div><button className="am-button neutral" disabled={page <= 1} onClick={() => setPage(value => Math.max(1, value - 1))}>Previous</button><strong>Page {page} of {pageCount}</strong><button className="am-button neutral" disabled={page >= pageCount} onClick={() => setPage(value => Math.min(pageCount, value + 1))}>Next</button></div>
          </div>
        )}

      </section>

    </div>
  );
}
