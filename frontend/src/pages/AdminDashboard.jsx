import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import Pagination from '../components/admin/Pagination';
import { Activity, UserRound, Clock3, CalendarDays, Package } from 'lucide-react';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, PointElement, LineElement, Tooltip, Legend, Filler);

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { position: 'bottom', labels: { usePointStyle: true, padding: 18 } } },
};

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [monthly, setMonthly] = useState([]);
  const [activity, setActivity] = useState([]);
  const [activityPage, setActivityPage] = useState(1);
  const activityPageSize = 8;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      setError('');
      const [summary, analytics, activityResult] = await Promise.all([
        api('/admin/dashboard'),
        api('/admin/analytics/monthly'),
        api('/admin/activity'),
      ]);
      setStats(summary.data || summary);
      setMonthly(analytics.data || []);
      setActivity(activityResult.data || []);
    } catch (err) {
      setError(err.message || 'Unable to load dashboard information.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const timer = setInterval(load, 15000);
    return () => clearInterval(timer);
  }, [load]);

  const s = stats || {};
  const activityStart = (activityPage - 1) * activityPageSize;
  const visibleActivity = activity.slice(activityStart, activityStart + activityPageSize);
  const bookingChart = {
    labels: monthly.map(row => row.month),
    datasets: [{ label: 'Reservations', data: monthly.map(row => Number(row.rentals || 0)), backgroundColor: '#176b3a', borderRadius: 6 }],
  };
  const statusChart = {
    labels: ['Pending', 'Approved', 'Completed', 'Rejected', 'Cancelled'],
    datasets: [{
      data: [s.pending_rentals || 0, s.approved_rentals || 0, s.completed_rentals || 0, s.rejected_rentals || 0, s.cancelled_rentals || 0].map(Number),
      backgroundColor: ['#e8a317', '#176b3a', '#2787c7', '#dc4c4c', '#64748b'],
      borderWidth: 0,
    }],
  };

  return (
    <div className="owner-page owner-dashboard admin-dashboard-page">
      <section className="role-welcome-banner owner-welcome-banner">
        <small className="farmer-welcome-kicker">ADMINISTRATION PORTAL</small>
        <h1>Welcome back, AgriLease Admin!</h1>
        <p>Here is an overview of your AgriLease rental operations and current system activities.</p>
        <div className="farmer-welcome-actions"><Link to="/admin/owners" className="farmer-primary-action">Owner Verification</Link><Link to="/admin/equipment" className="farmer-secondary-action">Equipment Management</Link></div>
      </section>

      <div className="farmer-section-heading"><div><h2>System Overview</h2><p>A quick summary of equipment records and reservations.</p></div>{loading && !stats && <span className="farmer-loading-label">Updating…</span>}</div>

      {error && <div className="admin-error">{error}<button onClick={load}>Retry</button></div>}

      <section className="owner-kpi-strip owner-kpi-cards admin-kpi-cards" aria-label="System summary">
        <div><span>Total Equipment</span><strong>{stats ? Number(s.total_equipment || 0).toLocaleString() : '—'}</strong><small>Equipment records</small></div>
        <div><span>Total Reservations</span><strong>{stats ? Number(s.total_rentals || 0).toLocaleString() : '—'}</strong><small>All booking requests</small></div>
        <div><span>Pending Reservations</span><strong className="owner-kpi-warning">{stats ? Number(s.pending_rentals || 0).toLocaleString() : '—'}</strong><small>Awaiting a decision</small></div>
        <div><span>Approved Reservations</span><strong>{stats ? Number(s.approved_rentals || 0).toLocaleString() : '—'}</strong><small>Approved requests</small></div>
      </section>

      <section className="owner-dashboard-grid">
        <article className="owner-dashboard-panel owner-chart-panel">
          <div className="owner-panel-heading"><div><h2>Booking Activity</h2><p>Bookings created over the last six months</p></div><span className="owner-panel-icon"><CalendarDays size={18} /></span></div>
          <div className="owner-chart-area">{loading && !stats ? <div className="owner-chart-empty">Loading chart…</div> : monthly.length ? <Bar data={bookingChart} options={{ ...chartOptions, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { precision: 0 }, grid: { color: '#edf1ed' } }, x: { grid: { display: false } } } }} /> : <div className="owner-chart-empty">No booking activity data available yet.</div>}</div>
        </article>
        <article className="owner-dashboard-panel owner-chart-panel">
          <div className="owner-panel-heading"><div><h2>Booking Status</h2><p>Distribution of booking records</p></div><span className="owner-panel-icon"><Package size={18} /></span></div>
          <div className="owner-doughnut-area">{loading && !stats ? <div className="owner-chart-empty">Loading chart…</div> : <Doughnut data={statusChart} options={{ ...chartOptions, cutout: '66%', plugins: { legend: { position: 'bottom', labels: { usePointStyle: true, boxWidth: 8, padding: 14 } } } }} />}</div>
        </article>
      </section>

      <section className="owner-dashboard-panel owner-recent-panel" aria-labelledby="admin-recent-activity-title">
        <div className="owner-panel-heading"><div><h2 id="admin-recent-activity-title">Recent System Activity</h2><p>Latest account registrations and system events</p></div><span className="owner-panel-icon"><Activity size={18} aria-hidden="true" /></span></div>
        {visibleActivity.length ? <div className="admin-activity-list">
          {visibleActivity.map((item, index) => <article className="admin-activity-row" key={item.id ?? `${item.created_at}-${index}`}>
            <span className="admin-activity-icon"><UserRound size={16}/></span>
            <div className="admin-activity-copy"><strong>{item.actor_name || 'System'}</strong><span>{item.action || 'System event'}{item.actor_role ? ` · ${item.actor_role}` : ''}</span></div>
            <time><Clock3 size={12}/> {item.created_at ? new Date(item.created_at).toLocaleString('en-PH') : '—'}</time>
          </article>)}
        </div> : <div className="owner-empty-state"><Activity size={26}/><strong>No activity yet</strong><p>System events will appear here.</p></div>}
        <Pagination totalItems={activity.length} itemsPerPage={activityPageSize} currentPage={activityPage} onPageChange={setActivityPage}/>
      </section>
    </div>
  );
}
