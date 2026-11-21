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
import StatCard from '../components/admin/StatCard';
import ChartCard from '../components/admin/ChartCard';
import Pagination from '../components/admin/Pagination';
import { Activity, UserRound, Clock3 } from 'lucide-react';

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
    <div className="admin-dashboard-page admin-reference-dashboard">
      <section className="role-welcome-banner admin-welcome-banner">
        <small className="farmer-welcome-kicker">ADMINISTRATION PORTAL</small>
        <h2>Welcome back, AgriLease Admin!</h2>
        <p>Here's an overview of your AgriLease rental operations and current system activities.</p>
        <div className="farmer-welcome-actions"><Link to="/admin/owners" className="farmer-primary-action">Owner Verification</Link><Link to="/admin/equipment" className="farmer-secondary-action">Equipment Management</Link></div>
      </section>

      {error && <div className="admin-error">{error}<button onClick={load}>Retry</button></div>}
      {loading && !stats ? <div className="admin-loading">Loading dashboard statistics...</div> : (
        <>
          <h2 className="admin-section-heading">System Overview</h2>
          <div className="admin-summary-grid admin-four-stats">
            <StatCard title="Total Equipment" value={s.total_equipment} subtitle="Equipment records" />
            <StatCard title="Total Reservations" value={s.total_rentals} subtitle="All booking requests" />
            <StatCard title="Pending Reservations" value={s.pending_rentals} subtitle="Awaiting a decision" color="orange" />
            <StatCard title="Approved Reservations" value={s.approved_rentals} subtitle="Approved requests" />
          </div>

          <div className="admin-reference-chart-grid">
            <ChartCard title="Booking Activity" subtitle="Bookings created over the last six months">
              <div className="admin-reference-chart">{monthly.length ? <Bar data={bookingChart} options={{ ...chartOptions, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { precision: 0 } } } }} /> : <div className="admin-chart-empty">No booking activity data available yet.</div>}</div>
            </ChartCard>
            <ChartCard title="Booking Status" subtitle="Distribution of booking records">
              <div className="admin-reference-chart admin-doughnut">{<Doughnut data={statusChart} options={{ ...chartOptions, cutout: '65%' }} />}</div>
            </ChartCard>
          </div>

          <section className="admin-activity-panel" aria-labelledby="admin-recent-activity-title">
            <div className="admin-activity-panel-heading">
              <div><h2 id="admin-recent-activity-title">Recent System Activity</h2><p>Latest account registrations and system events.</p></div>
              <Activity size={20} aria-hidden="true" />
            </div>
            {visibleActivity.length ? <div className="admin-activity-list">
              {visibleActivity.map((item, index) => <article className="admin-activity-row" key={item.id ?? `${item.created_at}-${index}`}>
                <span className="admin-activity-icon"><UserRound size={16}/></span>
                <div className="admin-activity-copy"><strong>{item.actor_name || 'System'}</strong><span>{item.action || 'System event'}{item.actor_role ? ` · ${item.actor_role}` : ''}</span></div>
                <time><Clock3 size={12}/> {item.created_at ? new Date(item.created_at).toLocaleString('en-PH') : '—'}</time>
              </article>)}
            </div> : <div className="admin-activity-empty">No activity records are available yet.</div>}
            <Pagination totalItems={activity.length} itemsPerPage={activityPageSize} currentPage={activityPage} onPageChange={setActivityPage}/>
          </section>
        </>
      )}
    </div>
  );
}
