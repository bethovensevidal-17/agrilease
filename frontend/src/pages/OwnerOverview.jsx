import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Line, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement,
  ArcElement, Tooltip, Legend, Filler,
} from 'chart.js';
import { api, getUser } from '../api/client';
<<<<<<< HEAD
import { RefreshCw, Plus, CalendarDays, Package, ArrowRight, AlertCircle } from 'lucide-react';
=======
import { RefreshCw, Plus, CalendarDays, Package, AlertCircle } from 'lucide-react';
>>>>>>> master

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, ArcElement, Tooltip, Legend, Filler);

const money = value => `₱${Number(value || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const dateLabel = value => value ? new Date(value).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

export default function OwnerOverview() {
  const user = getUser();
  const [items, setItems] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadDashboard = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const [equipmentResult, bookingResult] = await Promise.all([
        api('/equipment/mine'),
        api('/owner/bookings'),
      ]);
      setItems(equipmentResult.data || []);
      setBookings(bookingResult.data || []);
    } catch (err) {
      setError(err.message || 'Unable to load dashboard information.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadDashboard(); }, [loadDashboard]);

  const counts = useMemo(() => ({
    pending: bookings.filter(x => x.status === 'pending').length,
    approved: bookings.filter(x => x.status === 'approved' || x.status === 'ongoing').length,
    completed: bookings.filter(x => x.status === 'completed').length,
    rejected: bookings.filter(x => x.status === 'rejected' || x.status === 'cancelled').length,
  }), [bookings]);

  const monthly = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 6 }, (_, index) => {
      const month = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1);
      const key = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}`;
      const value = bookings.filter(row => {
        const d = new Date(row.created_at || row.start_date);
        return !Number.isNaN(d.getTime()) && `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` === key;
      }).length;
      return { label: month.toLocaleDateString('en-PH', { month: 'short' }), value };
    });
  }, [bookings]);

  const statusChart = {
    labels: ['Pending', 'Approved / Ongoing', 'Completed', 'Rejected / Cancelled'],
    datasets: [{ data: [counts.pending, counts.approved, counts.completed, counts.rejected], backgroundColor: ['#e9b949', '#3c9b68', '#286a49', '#d97878'], borderWidth: 0 }],
  };
  const lineChart = {
    labels: monthly.map(x => x.label),
    datasets: [{ label: 'Rental bookings', data: monthly.map(x => x.value), borderColor: '#28764b', backgroundColor: 'rgba(40,118,75,.12)', fill: true, tension: .35, pointRadius: 3, pointHoverRadius: 5 }],
  };
  const chartOptions = { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { precision: 0 }, grid: { color: '#edf1ed' } }, x: { grid: { display: false } } } };

  const recentBookings = bookings.slice(0, 5);
  const approvedEquipment = items.filter(x => x.approval_status === 'approved' && Number(x.is_archived || 0) === 0);

  return (
    <div className="owner-page owner-dashboard">
      <section className="role-welcome-banner owner-welcome-banner">
        <small>OWNER PORTAL</small>
        <h2>Welcome back, {user?.full_name || 'Equipment Owner'}!</h2>
        <p>Here is an overview of your equipment listings, rental requests, and business activity.</p>
      </section>

      {error && <div className="owner-dashboard-error"><AlertCircle size={18}/><span>{error}</span></div>}

      <section className="owner-kpi-strip owner-kpi-cards" aria-label="Owner summary">
        <div><span>Approved Equipment</span><strong>{loading ? '—' : approvedEquipment.length}</strong><small>Active approved listings</small></div>
        <div><span>Total Rental Bookings</span><strong>{loading ? '—' : bookings.length}</strong><small>All farmer requests</small></div>
        <div><span>Needs Your Review</span><strong className="owner-kpi-warning">{loading ? '—' : counts.pending}</strong><small>Pending requests</small></div>
      </section>

      <section className="owner-dashboard-grid">
        <article className="owner-dashboard-panel owner-chart-panel">
          <div className="owner-panel-heading"><div><h2>Rental Booking Activity</h2><p>Bookings received over the last six months</p></div><span className="owner-panel-icon"><CalendarDays size={18}/></span></div>
          <div className="owner-chart-area">{loading ? <div className="owner-chart-empty">Loading chart…</div> : <Line data={lineChart} options={chartOptions}/>}</div>
        </article>
        <article className="owner-dashboard-panel owner-chart-panel">
          <div className="owner-panel-heading"><div><h2>Booking Status</h2><p>Current status of your rental requests</p></div><span className="owner-panel-icon"><Package size={18}/></span></div>
          <div className="owner-doughnut-area">{loading ? <div className="owner-chart-empty">Loading chart…</div> : bookings.length ? <Doughnut data={statusChart} options={{ responsive: true, maintainAspectRatio: false, cutout: '66%', plugins: { legend: { position: 'bottom', labels: { usePointStyle: true, boxWidth: 8, padding: 14 } } } }}/> : <div className="owner-chart-empty">No booking data yet</div>}</div>
          <div className="owner-status-summary"><span>Pending <b>{counts.pending}</b></span><span>Approved <b>{counts.approved}</b></span><span>Completed <b>{counts.completed}</b></span></div>
        </article>
      </section>

      <section className="owner-dashboard-panel owner-recent-panel">
<<<<<<< HEAD
        <div className="owner-panel-heading"><div><h2>Recent Rental Bookings</h2><p>Latest requests from farmers</p></div><Link className="owner-text-link" to="/owner/bookings">View all <ArrowRight size={15}/></Link></div>
=======
        <div className="owner-panel-heading"><div><h2>Recent Rental Bookings</h2><p>Latest requests from farmers</p></div><Link className="owner-text-link" to="/owner/bookings">View all</Link></div>
>>>>>>> master
        {recentBookings.length ? (
          <div className="owner-table-wrap"><table className="owner-dashboard-table"><thead><tr><th>Farmer</th><th>Equipment</th><th>Rental Schedule</th><th>Amount</th><th>Status</th></tr></thead><tbody>
            {recentBookings.map(row => <tr key={row.id}><td>{row.farmer_name || 'Farmer'}</td><td>{row.equipment_name || 'Equipment'}</td><td>{dateLabel(row.start_date)} – {dateLabel(row.end_date)}</td><td>{money(row.total_amount)}</td><td><span className={`owner-booking-status status-${row.status}`}>{String(row.status || 'pending').replace('_', ' ')}</span></td></tr>)}
          </tbody></table></div>
        ) : <div className="owner-empty-state"><CalendarDays size={26}/><strong>No rental bookings yet</strong><p>New farmer booking requests will appear here.</p></div>}
      </section>

    </div>
  );
}
