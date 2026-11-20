import { useCallback, useEffect, useState } from 'react';
import { api } from '../api/client';
import { Tractor, ClipboardList, Hourglass, Check } from 'lucide-react';
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

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, PointElement, LineElement, Tooltip, Legend, Filler);

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { position: 'bottom', labels: { usePointStyle: true, padding: 18 } } },
};

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [monthly, setMonthly] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      setError('');
      const [summary, analytics] = await Promise.all([
        api('/admin/dashboard'),
        api('/admin/analytics/monthly'),
      ]);
      setStats(summary.data || summary);
      setMonthly(analytics.data || []);
    } catch (err) {
      setError(err.message || 'Unable to load dashboard information.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const timer = setInterval(load, 60000);
    return () => clearInterval(timer);
  }, [load]);

  const s = stats || {};
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
      <div className="admin-reference-heading">
        <div>
          <div className="admin-breadcrumb">AGRILEASE / ADMINISTRATION</div>
          <h1>Dashboard Overview</h1>
          <p>Monitor your agricultural rental operations.</p>
        </div>
        <span className="admin-today">{new Date().toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
      </div>

      <section className="admin-welcome-banner">
        <small>ADMINISTRATION PORTAL</small>
        <h2>Welcome back, AgriLease Admin!</h2>
        <p>Here's an overview of your AgriLease rental operations and current system activities.</p>
      </section>

      {error && <div className="admin-error">{error}<button onClick={load}>Retry</button></div>}
      {loading && !stats ? <div className="admin-loading">Loading dashboard statistics...</div> : (
        <>
          <h2 className="admin-section-heading">System Overview</h2>
          <p className="admin-section-description">Current equipment and reservation statistics.</p>
          <div className="admin-summary-grid admin-four-stats">
            <StatCard title="Total Equipment" value={s.total_equipment} subtitle="Equipment records" icon={Tractor} />
            <StatCard title="Total Reservations" value={s.total_rentals} subtitle="All booking requests" icon={ClipboardList} color="blue" />
            <StatCard title="Pending Reservations" value={s.pending_rentals} subtitle="Awaiting a decision" icon={Hourglass} color="orange" />
            <StatCard title="Approved Reservations" value={s.approved_rentals} subtitle="Approved requests" icon={Check} color="purple" />
          </div>

          <div className="admin-reference-chart-grid">
            <ChartCard title="Booking Activity" subtitle="Bookings created over the last six months">
              <div className="admin-reference-chart">{monthly.length ? <Bar data={bookingChart} options={{ ...chartOptions, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { precision: 0 } } } }} /> : <div className="admin-chart-empty">No booking activity data available yet.</div>}</div>
            </ChartCard>
            <ChartCard title="Booking Status" subtitle="Distribution of booking records">
              <div className="admin-reference-chart admin-doughnut">{<Doughnut data={statusChart} options={{ ...chartOptions, cutout: '65%' }} />}</div>
            </ChartCard>
          </div>
        </>
      )}
    </div>
  );
}
