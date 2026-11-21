import { useEffect, useMemo, useState } from 'react';
import useAutoRefresh from '../utils/useAutoRefresh.js';
import { api, getUser } from '../api/client';
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

const BASE_SECTIONS = [
  { key: 'users', label: 'All Users', date: ['created_at'] },
  { key: 'owners', label: 'Owner Verification', date: ['created_at', 'reviewed_at'] },
  { key: 'equipment', label: 'Equipment Listings', date: ['created_at', 'updated_at'] },
  { key: 'rentals', label: 'Rental Records', date: ['created_at', 'start_date', 'end_date', 'start_at', 'end_at'] },
  { key: 'rentalPayments', label: 'Rental Sales / Payments', date: ['paid_at', 'created_at'] },
  { key: 'subscriptions', label: 'Subscriptions', date: ['created_at', 'start_date', 'end_date', 'starts_at', 'ends_at'] },
  { key: 'payments', label: 'Subscription Payments', date: ['created_at', 'payment_date', 'paid_at'] },
  { key: 'activity', label: 'System Activity Logs', date: ['created_at'] }
];

// Summary reports are calculated from the loaded records, so they always match the data below them.
const SUMMARY_SECTIONS = [
  { key: 'summary', label: 'System Summary', kind: 'summary' },
  { key: 'revenue', label: 'Revenue by Month', kind: 'derived' },
  { key: 'equipmentPerformance', label: 'Equipment Performance', kind: 'derived' },
  { key: 'ownerPerformance', label: 'Owner Performance', kind: 'derived' },
  { key: 'farmerActivity', label: 'Farmer Activity', kind: 'derived' }
];

const ALL_SECTIONS = [...SUMMARY_SECTIONS, ...BASE_SECTIONS];

const EMPTY = Object.fromEntries(
  BASE_SECTIONS.map(section => [section.key, []])
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
  recorded_by_name: 'Recorded By',
  month: 'Month',
  bookings: 'Bookings',
  completed: 'Completed',
  cancelled: 'Cancelled',
  rejected: 'Rejected',
  listings: 'Listings',
  approved_listings: 'Approved Listings',
  rental_revenue: 'Rental Revenue',
  subscription_revenue: 'Subscription Revenue',
  total_revenue: 'Total Revenue',
  revenue: 'Revenue',
  total_spent: 'Total Spent',
  subscription_plan: 'Subscription Plan',
  subscription_status: 'Subscription Status',
  metric: 'Item',
  value: 'Value'
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
  'rental_rate',
  'rental_revenue',
  'subscription_revenue',
  'total_revenue',
  'revenue',
  'total_spent'
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

const num = value => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};
const lower = value => String(value ?? '').trim().toLowerCase();
const peso = value => num(value).toLocaleString('en-PH', { style: 'currency', currency: 'PHP' });
const percent = (part, total) => (total > 0 ? `${Math.round((part / total) * 100)}%` : '0%');
const monthKey = date => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
const monthLabel = date => date.toLocaleDateString('en-PH', { month: 'short', year: 'numeric' });
const countWhere = (rows, test) => rows.reduce((total, row) => total + (test(row) ? 1 : 0), 0);
const sumBy = (rows, pick) => rows.reduce((total, row) => total + num(pick(row)), 0);

function groupCount(rows, pick) {
  const map = new Map();
  rows.forEach(row => {
    const key = String(pick(row) || 'Not specified');
    map.set(key, (map.get(key) || 0) + 1);
  });
  return [...map.entries()].sort((a, b) => b[1] - a[1]);
}

const escapeHtml = value =>
  String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

function sortById(rows) {
  return [...rows].sort((a, b) => {
    const idA = Number(a.id);
    const idB = Number(b.id);
    if (Number.isFinite(idA) && Number.isFinite(idB)) return idA - idB;
    return String(a.id ?? '').localeCompare(String(b.id ?? ''));
  });
}

function tableHtml(rows) {
  const sorted = sortById(rows);
  const keys = [...new Set(sorted.flatMap(row => Object.keys(row)))]
    .filter(key => !['password', 'password_hash', 'token'].includes(key));
  const head = keys.map(key => `<th>${escapeHtml(LABELS[key] || key.replaceAll('_', ' '))}</th>`).join('');
  const body = sorted.map(row =>
    `<tr>${keys.map(key => `<td>${escapeHtml(showValue(key, row[key]))}</td>`).join('')}</tr>`
  ).join('');
  return `<table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`;
}

function summaryHtml(summary) {
  const groups = summary.groups.map(group => `
    <div class="group">
      <h3>${escapeHtml(group.title)}</h3>
      <table class="kv"><tbody>${group.items.map(item =>
        `<tr><td>${escapeHtml(item.label)}</td><td class="num">${escapeHtml(item.value)}</td></tr>`).join('')}</tbody></table>
    </div>`).join('');
  const tables = summary.tables.map(item => `
    <div class="wide">
      <h3>${escapeHtml(item.title)}</h3>
      ${item.rows.length ? tableHtml(item.rows) : '<p>No records for the selected period.</p>'}
    </div>`).join('');
  return `<div class="groups">${groups}</div>${tables}`;
}

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
  const [active, setActive] = useState('summary');

  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [ownerFilter, setOwnerFilter] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 8;
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState([]);

  async function load(silent = false) {
    if (!silent) { setLoading(true); setErrors([]); }

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
    if (!silent || failed.length === 0) setErrors(failed);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  // Reports load seven endpoints, so they refresh every minute instead of every 15 seconds.
  useAutoRefresh(() => load(true), 60000);

  const dateFilteredRecords = useMemo(() => {
    return Object.fromEntries(
      BASE_SECTIONS.map(section => [
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

  // System summary and derived reports (calculated from the loaded records, respecting the date range)
  const derived = useMemo(() => {
    const f = dateFilteredRecords;
    const users = f.users;
    const owners = f.owners;
    const rentals = f.rentals;
    const rentalPayments = f.rentalPayments;
    const subscriptions = f.subscriptions;
    const subPayments = f.payments;
    const allEquipment = records.equipment;
    const equipment = f.equipment;

    const verifiedSubPayments = subPayments.filter(row => lower(row.payment_status ?? row.status) === 'verified');
    const rentalRevenue = sumBy(rentalPayments, row => row.amount ?? row.total_amount);
    const subscriptionRevenue = sumBy(verifiedSubPayments, row => row.amount);
    const rentalStatus = status => countWhere(rentals, row => lower(row.status) === status);
    const completedRentals = rentalStatus('completed');
    const bookingValue = sumBy(
      rentals.filter(row => ['approved', 'ongoing', 'completed'].includes(lower(row.status))),
      row => row.total_amount
    );

    const ownerKey = row => lower(row.owner_name);
    const equipmentKey = row => `${lower(row.equipment_name)}|${ownerKey(row)}`;

    // ----- Revenue by month -----
    const months = new Map();
    const bucket = date => {
      const key = monthKey(date);
      if (!months.has(key)) months.set(key, { month: monthLabel(date), bookings: 0, completed: 0, rental_revenue: 0, subscription_revenue: 0, total_revenue: 0 });
      return months.get(key);
    };
    rentals.forEach(row => {
      const date = parseDate(row.created_at || row.start_at);
      if (!date) return;
      const entry = bucket(date);
      entry.bookings += 1;
      if (lower(row.status) === 'completed') entry.completed += 1;
    });
    rentalPayments.forEach(row => {
      const date = parseDate(row.paid_at || row.created_at);
      if (!date) return;
      bucket(date).rental_revenue += num(row.amount ?? row.total_amount);
    });
    verifiedSubPayments.forEach(row => {
      const date = parseDate(row.paid_at || row.payment_date || row.created_at);
      if (!date) return;
      bucket(date).subscription_revenue += num(row.amount);
    });
    const revenueRows = [...months.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([, entry]) => ({ ...entry, total_revenue: entry.rental_revenue + entry.subscription_revenue }));
    if (revenueRows.length) {
      revenueRows.push({
        month: 'TOTAL',
        bookings: sumBy(revenueRows, row => row.bookings),
        completed: sumBy(revenueRows, row => row.completed),
        rental_revenue: sumBy(revenueRows, row => row.rental_revenue),
        subscription_revenue: sumBy(revenueRows, row => row.subscription_revenue),
        total_revenue: sumBy(revenueRows, row => row.total_revenue)
      });
    }

    // ----- Equipment performance -----
    const equipmentMap = new Map();
    allEquipment.forEach(row => {
      equipmentMap.set(equipmentKey(row), {
        equipment_name: row.equipment_name || row.name || 'Equipment',
        owner_name: row.owner_name || '—',
        category_name: row.category_name || row.category || '—',
        availability_status: row.availability_status || '—',
        bookings: 0, completed: 0, revenue: 0
      });
    });
    const equipmentEntry = row => {
      const key = equipmentKey(row);
      if (!equipmentMap.has(key)) {
        equipmentMap.set(key, { equipment_name: row.equipment_name || 'Equipment', owner_name: row.owner_name || '—', category_name: '—', availability_status: '—', bookings: 0, completed: 0, revenue: 0 });
      }
      return equipmentMap.get(key);
    };
    rentals.forEach(row => {
      const entry = equipmentEntry(row);
      entry.bookings += 1;
      if (lower(row.status) === 'completed') entry.completed += 1;
    });
    rentalPayments.forEach(row => { equipmentEntry(row).revenue += num(row.amount ?? row.total_amount); });
    const equipmentPerformance = [...equipmentMap.values()].sort((a, b) => b.revenue - a.revenue || b.bookings - a.bookings || a.equipment_name.localeCompare(b.equipment_name));

    // ----- Owner performance -----
    const ownerMap = new Map();
    const ownerEntry = (name) => {
      const key = lower(name) || 'unknown';
      if (!ownerMap.has(key)) ownerMap.set(key, { owner_name: name || 'Unknown owner', listings: 0, approved_listings: 0, bookings: 0, completed: 0, revenue: 0, subscription_plan: '—', subscription_status: '—' });
      return ownerMap.get(key);
    };
    allEquipment.forEach(row => {
      const entry = ownerEntry(row.owner_name);
      entry.listings += 1;
      if (lower(row.approval_status) === 'approved') entry.approved_listings += 1;
    });
    rentals.forEach(row => {
      const entry = ownerEntry(row.owner_name);
      entry.bookings += 1;
      if (lower(row.status) === 'completed') entry.completed += 1;
    });
    rentalPayments.forEach(row => { ownerEntry(row.owner_name).revenue += num(row.amount ?? row.total_amount); });
    [...records.subscriptions].sort((a, b) => num(a.id) - num(b.id)).forEach(row => {
      if (!row.owner_name) return;
      const entry = ownerEntry(row.owner_name);
      entry.subscription_plan = row.plan_name || '—';
      entry.subscription_status = row.status || '—';
    });
    const ownerPerformance = [...ownerMap.values()].sort((a, b) => b.revenue - a.revenue || b.bookings - a.bookings || a.owner_name.localeCompare(b.owner_name));

    // ----- Farmer activity -----
    const farmerMap = new Map();
    const farmerEntry = name => {
      const key = lower(name) || 'unknown';
      if (!farmerMap.has(key)) farmerMap.set(key, { farmer_name: name || 'Unknown farmer', bookings: 0, completed: 0, cancelled: 0, rejected: 0, total_spent: 0 });
      return farmerMap.get(key);
    };
    rentals.forEach(row => {
      const entry = farmerEntry(row.farmer_name);
      const status = lower(row.status);
      entry.bookings += 1;
      if (status === 'completed') entry.completed += 1;
      if (status === 'cancelled') entry.cancelled += 1;
      if (status === 'rejected') entry.rejected += 1;
    });
    rentalPayments.forEach(row => { farmerEntry(row.farmer_name).total_spent += num(row.amount ?? row.total_amount); });
    const farmerActivity = [...farmerMap.values()].sort((a, b) => b.total_spent - a.total_spent || b.bookings - a.bookings || a.farmer_name.localeCompare(b.farmer_name));

    // ----- System summary -----
    const roleCount = role => countWhere(users, row => lower(row.role) === role);
    const ownerStatus = row => lower(row.verification_status ?? row.status);
    const subStatus = status => countWhere(subscriptions, row => lower(row.status) === status);
    const categories = groupCount(allEquipment, row => row.category_name || row.category)
      .map(([category, listings]) => ({ category_name: category, listings }));
    const planCounts = groupCount(subscriptions, row => row.plan_name)
      .map(([plan, count]) => ({ plan_name: plan, subscriptions: count }));

    const summary = {
      groups: [
        { title: 'Users', items: [
          { label: 'Total users', value: String(users.length) },
          { label: 'Farmers', value: String(roleCount('farmer')) },
          { label: 'Equipment owners', value: String(roleCount('owner')) },
          { label: 'Administrators', value: String(roleCount('admin')) },
          { label: 'Active accounts', value: String(countWhere(users, row => lower(row.status) === 'active')) },
          { label: 'Suspended accounts', value: String(countWhere(users, row => lower(row.status) === 'suspended')) }
        ] },
        { title: 'Owner Verification', items: [
          { label: 'Applications', value: String(owners.length) },
          { label: 'Pending review', value: String(countWhere(owners, row => ownerStatus(row) === 'pending')) },
          { label: 'Approved', value: String(countWhere(owners, row => ownerStatus(row) === 'approved')) },
          { label: 'Rejected', value: String(countWhere(owners, row => ownerStatus(row) === 'rejected')) }
        ] },
        { title: 'Equipment', items: [
          { label: 'Total listings', value: String(equipment.length) },
          { label: 'Approved', value: String(countWhere(equipment, row => lower(row.approval_status) === 'approved')) },
          { label: 'Pending approval', value: String(countWhere(equipment, row => lower(row.approval_status) === 'pending')) },
          { label: 'Rejected', value: String(countWhere(equipment, row => lower(row.approval_status) === 'rejected')) },
          { label: 'Available', value: String(countWhere(equipment, row => lower(row.availability_status) === 'available')) },
          { label: 'Unavailable', value: String(countWhere(equipment, row => lower(row.availability_status) === 'unavailable')) }
        ] },
        { title: 'Rental Bookings', items: [
          { label: 'Total bookings', value: String(rentals.length) },
          { label: 'Pending', value: String(rentalStatus('pending')) },
          { label: 'Approved', value: String(rentalStatus('approved')) },
          { label: 'Ongoing', value: String(rentalStatus('ongoing')) },
          { label: 'Completed', value: String(completedRentals) },
          { label: 'Rejected', value: String(rentalStatus('rejected')) },
          { label: 'Cancelled', value: String(rentalStatus('cancelled')) },
          { label: 'Completion rate', value: percent(completedRentals, rentals.length) },
          { label: 'Value of approved bookings', value: peso(bookingValue) }
        ] },
        { title: 'Revenue', items: [
          { label: 'Rental revenue (verified payments)', value: peso(rentalRevenue) },
          { label: 'Subscription revenue (verified)', value: peso(subscriptionRevenue) },
          { label: 'Total recorded revenue', value: peso(rentalRevenue + subscriptionRevenue) },
          { label: 'Verified rental payments', value: String(rentalPayments.length) },
          { label: 'Subscription payments awaiting review', value: String(countWhere(subPayments, row => lower(row.payment_status ?? row.status) === 'pending')) }
        ] },
        { title: 'Subscriptions', items: [
          { label: 'Total subscriptions', value: String(subscriptions.length) },
          { label: 'Active', value: String(subStatus('active')) },
          { label: 'Free trial', value: String(subStatus('trial') + subStatus('free_trial')) },
          { label: 'Expired', value: String(subStatus('expired')) },
          { label: 'Cancelled', value: String(subStatus('cancelled')) }
        ] },
        { title: 'System Activity', items: [
          { label: 'Logged events', value: String(f.activity.length) }
        ] }
      ],
      tables: [
        { title: 'Top equipment by revenue', rows: equipmentPerformance.filter(row => row.bookings > 0 || row.revenue > 0).slice(0, 5) },
        { title: 'Top owners by revenue', rows: ownerPerformance.filter(row => row.bookings > 0 || row.revenue > 0).slice(0, 5) },
        { title: 'Equipment listings by category', rows: categories },
        { title: 'Subscriptions by plan', rows: planCounts }
      ]
    };

    return {
      summary,
      tables: { revenue: revenueRows, equipmentPerformance, ownerPerformance, farmerActivity }
    };
  }, [dateFilteredRecords, records]);

  const tableData = useMemo(() => ({ ...dateFilteredRecords, ...derived.tables }), [dateFilteredRecords, derived]);

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
    labels: BASE_SECTIONS.map(section => section.label),
    datasets: [
      {
        data: BASE_SECTIONS.map(
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

  const activeSection = ALL_SECTIONS.find(section => section.key === active) || ALL_SECTIONS[0];
  const isSummary = activeSection.kind === 'summary';
  const allRows = isSummary ? [] : (tableData[active] || []);

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

  // Dates apply automatically as soon as they are picked.
  async function changeDate(which, value) {
    const nextFrom = which === 'from' ? value : fromDate;
    const nextTo = which === 'to' ? value : toDate;

    if (nextFrom && nextTo && nextFrom > nextTo) {
      await window.agrileaseDialog.alert('Date From cannot be later than Date To.');
      return;
    }

    if (which === 'from') setFromDate(value);
    else setToDate(value);
  }

  function resetFilters() {
    setFromDate('');
    setToDate('');
    setSearch('');
    setStatusFilter('');
    setCategoryFilter('');
    setOwnerFilter('');
  }

  async function printRecords(all = false) {
    const sections = all ? ALL_SECTIONS : [activeSection];

    const html = sections.map(section => {
      if (section.kind === 'summary') {
        return `<section><h2>${escapeHtml(section.label)}</h2>${summaryHtml(derived.summary)}</section>`;
      }

      const rows = all || section.kind === 'derived'
        ? (tableData[section.key] || [])
        : filtered;
      const data = !all && section.key === active ? filtered : rows;

      if (!data.length) {
        return `<section><h2>${escapeHtml(section.label)}</h2><p>No records for the selected date range.</p></section>`;
      }

      return `<section><h2>${escapeHtml(section.label)} (${data.length})</h2>${tableHtml(data)}</section>`;
    }).join('');

    const windowRef = window.open('', '_blank');

    if (!windowRef) {
      await window.agrileaseDialog.alert('Please allow pop-ups to print or save PDF.');
      return;
    }

    const preparedBy = getUser()?.full_name || 'Administrator';
    const title = all ? 'System Report' : activeSection.label;

    windowRef.document.write(`
      <!doctype html>
      <html>
      <head>
        <title>AGRILEASE ${escapeHtml(title)}</title>
        <style>
          @page { size: A4 landscape; margin: 12mm; }
          * { box-sizing: border-box; }
          body { font: 12px Arial, sans-serif; color: #17251a; padding: 24px; }
          .report-head { padding: 16px 20px; margin-bottom: 18px; border-radius: 10px; background: #12432a; color: #fff; }
          .report-head h1 { margin: 0; font-size: 22px; }
          .report-head p { margin: 6px 0 0; color: #d7ead9; font-size: 12px; }
          h2 { font-size: 16px; margin: 24px 0 8px; padding-bottom: 6px; border-bottom: 2px solid #43834d; color: #12432a; }
          h3 { font-size: 13px; margin: 0 0 6px; color: #12432a; }
          p { color: #555; }
          table { border-collapse: collapse; width: 100%; font-size: 10px; table-layout: auto; }
          th, td { border: 1px solid #bbb; padding: 6px; text-align: left; overflow-wrap: anywhere; }
          th { background: #eaf1e8; }
          .groups { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; margin-bottom: 14px; }
          .group { break-inside: avoid; }
          .kv td { font-size: 11px; }
          .kv td.num { width: 38%; font-weight: 700; text-align: right; }
          .wide { margin-top: 14px; break-inside: avoid; }
          section { margin-bottom: 24px; }
          @media print {
            body { padding: 0; }
            tr { break-inside: avoid; }
            thead { display: table-header-group; }
            .report-head { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            th { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          }
        </style>
      </head>

      <body>
        <div class="report-head">
          <h1>AGRILEASE — ${escapeHtml(title)}</h1>
          <p>
            Generated: ${escapeHtml(new Date().toLocaleString('en-PH'))}
            · Prepared by: ${escapeHtml(preparedBy)}
            · Period: ${escapeHtml(fromDate || 'Start')} to ${escapeHtml(toDate || 'Today')}
          </p>
        </div>

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
              <optgroup label="Summary reports">
                {SUMMARY_SECTIONS.map(section => (
                  <option key={section.key} value={section.key}>
                    {section.label}{section.kind === 'derived' ? ` (${tableData[section.key].length})` : ''}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Records">
                {BASE_SECTIONS.map(section => (
                  <option key={section.key} value={section.key}>
                    {section.label} ({records[section.key].length})
                  </option>
                ))}
              </optgroup>
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
                value={fromDate}
                max={toDate || undefined}
                onChange={event => changeDate('from', event.target.value)}
              />
            </label>

            <label>
              <span>To</span>
              <input
                type="date"
                value={toDate}
                min={fromDate || undefined}
                onChange={event => changeDate('to', event.target.value)}
              />
            </label>

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
              Print Current Report
            </button>

            <button
              className="am-button approve"
              onClick={() => printRecords(true)}
              disabled={loading}
            >
              Print Full Report (PDF)
            </button>
          </div>

        </div>

        {/* SEARCH AND RECORD COUNT */}
        <div className="am-record-search-row">
          <div>
            <h3>
              {activeSection.label}
            </h3>
            {isSummary ? (
              <p>Overview of the whole system for {fromDate || toDate ? `${fromDate || 'the start'} to ${toDate || 'today'}` : 'all dates'}.</p>
            ) : (
              <p>
                {filtered.length} records shown
                {' · '}
                {allRows.length} total records
              </p>
            )}
          </div>

          {!isSummary && <div className="am-report-filter-controls">
            <input className="am-report-search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Search records..." />
            <input className="am-report-search" value={ownerFilter} onChange={event => setOwnerFilter(event.target.value)} placeholder="Filter owner..." />
            <select value={statusFilter} onChange={event => setStatusFilter(event.target.value)} aria-label="Filter status">
              <option value="">All Statuses</option><option value="pending">Pending</option><option value="approved">Approved</option><option value="verified">Verified</option><option value="rejected">Rejected</option><option value="active">Active</option><option value="expired">Expired</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option>
            </select>
            <select value={categoryFilter} onChange={event => setCategoryFilter(event.target.value)} aria-label="Filter category">
              <option value="">All Categories</option>{uniqueCategories.map(value => <option key={value} value={value}>{value}</option>)}
            </select>
          </div>}
        </div>

        {/* RECORDS TABLE */}
        {loading ? (
          <div className="am-empty">
            Loading records...
          </div>
        ) : isSummary ? (
          <div className="am-summary-view">
            <div className="am-summary-groups">
              {derived.summary.groups.map(group => (
                <section className="am-summary-group" key={group.title}>
                  <h4>{group.title}</h4>
                  <div className="am-summary-tiles">
                    {group.items.map(item => (
                      <div className="am-summary-tile" key={item.label}>
                        <span>{item.label}</span>
                        <strong>{item.value}</strong>
                      </div>
                    ))}
                  </div>
                </section>
              ))}
            </div>

            {derived.summary.tables.map(item => (
              <section className="am-summary-table" key={item.title}>
                <h4>{item.title}</h4>
                <RecordsTable rows={item.rows} />
              </section>
            ))}
          </div>
        ) : (
          <RecordsTable rows={pageRows} />
        )}
        {!loading && !isSummary && filtered.length > 0 && (
          <div className="am-report-pagination">
            <span>Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, filtered.length)} of {filtered.length}</span>
            <div><button className="am-button neutral" disabled={page <= 1} onClick={() => setPage(value => Math.max(1, value - 1))}>Previous</button><strong>Page {page} of {pageCount}</strong><button className="am-button neutral" disabled={page >= pageCount} onClick={() => setPage(value => Math.min(pageCount, value + 1))}>Next</button></div>
          </div>
        )}

      </section>

    </div>
  );
}
