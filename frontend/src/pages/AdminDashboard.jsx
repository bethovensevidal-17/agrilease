import { useCallback, useEffect, useState } from 'react';
import { api } from '../api/client';

import {
  Users,
  Tractor,
  ClipboardList,
  CreditCard,
} from 'lucide-react';

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';

import { Bar, Line } from 'react-chartjs-2';

import StatCard from '../components/admin/StatCard';
import ChartCard from '../components/admin/ChartCard';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  Filler
);

const getNumber = (value) => Number(value ?? 0);

const commonOptions = {
  responsive: true,
  maintainAspectRatio: false,
  animation: {
    duration: 400,
  },
  plugins: {
    legend: {
      display: false,
    },
  },
};

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [monthlyData, setMonthlyData] = useState([]);
  const [activityLogs, setActivityLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState(null);

  const loadDashboard = useCallback(async (showLoading = false) => {
    try {
      if (showLoading) setLoading(true);

      setError('');

      const response = await api('/admin/dashboard');
      setStats(response.data);
      setLastUpdated(new Date());

      try {
        const monthlyResponse = await api('/admin/analytics/monthly');
        setMonthlyData(monthlyResponse.data || []);
      } catch {
        setMonthlyData([]);
      }

      try {
        const activityResponse = await api('/admin/activity');
        setActivityLogs(activityResponse.data || []);
      } catch {
        setActivityLogs([]);
      }
    } catch (err) {
      setError(err.message || 'Failed to load dashboard.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard(true);

    const interval = setInterval(() => {
      loadDashboard(false);
    }, 60000);

    return () => clearInterval(interval);
  }, [loadDashboard]);

  const s = stats || {};

  const growthData = {
    labels: monthlyData.map(item => item.month),
    datasets: [
      {
        label: 'User Registrations',
        data: monthlyData.map(item => Number(item.users || 0)),
        borderColor: '#397443',
        backgroundColor: 'rgba(57, 116, 67, 0.10)',
        fill: true,
        tension: 0.35,
        pointRadius: 4,
      },
      {
        label: 'Equipment Listings',
        data: monthlyData.map(item => Number(item.equipment || 0)),
        borderColor: '#d4a34a',
        backgroundColor: 'rgba(212, 163, 74, 0.08)',
        fill: true,
        tension: 0.35,
        pointRadius: 4,
      },
    ],
  };

  const growthOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 400 },
    plugins: {
      legend: {
        display: true,
        position: 'bottom',
        labels: { usePointStyle: true, padding: 18 },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: { precision: 0 },
      },
    },
  };

  // Equipment approval overview
  const equipmentData = {
    labels: ['Approved', 'Pending Approval'],
    datasets: [
      {
        label: 'Equipment',
        data: [
          getNumber(s.approved_equipment),
          getNumber(s.pending_equipment),
        ],
        backgroundColor: ['#397443', '#d4a34a'],
        borderRadius: 7,
        barThickness: 24,
      },
    ],
  };

  // Pending tasks overview
  const attentionData = {
    labels: [
      'Owner Verification',
      'Equipment Approval',
      'Subscriptions',
      'Payments',
    ],
    datasets: [
      {
        label: 'Pending Items',
        data: [
          getNumber(s.pending_owners),
          getNumber(s.pending_equipment),
          getNumber(s.pending_subscriptions),
          getNumber(s.pending_payments),
        ],
        backgroundColor: [
          '#d4a34a',
          '#3978a8',
          '#8064a8',
          '#c75b50',
        ],
        borderRadius: 6,
        barThickness: 22,
      },
    ],
  };

  const horizontalOptions = {
    ...commonOptions,
    indexAxis: 'y',
    scales: {
      x: {
        beginAtZero: true,
        ticks: { precision: 0 },
        grid: { color: '#edf0ed' },
      },
      y: {
        grid: { display: false },
      },
    },
  };

  return (
    <div className="admin-dashboard-page">

      {/* PAGE HEADER */}
      <div className="admin-page-heading">
        <div>
          <h1>Admin Dashboard</h1>
          <p>Overview of the AGRILEASE platform.</p>
        </div>

        <div className="admin-date">
          {new Date().toLocaleDateString('en-PH', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </div>
      </div>

      {error && (
        <div className="admin-error">
          {error}
          <button
            className="admin-retry"
            onClick={() => loadDashboard(true)}
          >
            Retry
          </button>
        </div>
      )}

      {loading && !stats ? (
        <div className="admin-loading">
          Loading dashboard statistics...
        </div>
      ) : stats ? (
        <>
          {/* SUMMARY */}
          <h2 className="admin-section-heading">
            System Overview
          </h2>

          <div className="admin-summary-grid">
            <StatCard
              title="Total Users"
              value={s.total_users}
              subtitle={`${getNumber(s.active_users)} active accounts`}
              icon={Users}
            />

            <StatCard
              title="Total Equipment"
              value={s.total_equipment}
              subtitle={`${getNumber(s.approved_equipment)} approved`}
              icon={Tractor}
              color="blue"
            />

            <StatCard
              title="Rental Requests"
              value={s.total_rentals}
              subtitle={`${getNumber(s.pending_rentals)} pending`}
              icon={ClipboardList}
              color="orange"
            />

            <StatCard
              title="Active Subscriptions"
              value={s.active_subscriptions}
              subtitle={`${getNumber(s.pending_subscriptions)} pending`}
              icon={CreditCard}
              color="purple"
            />
          </div>

          <h2 className="admin-section-heading">
            Platform Analytics
          </h2>

          <div className="admin-analytics-grid">
            <ChartCard
              title="Platform Growth"
              subtitle="Monthly user registrations and equipment listings"
            >
              {monthlyData.length > 0 ? (
                <div className="admin-growth-chart">
                  <Line data={growthData} options={growthOptions} />
                </div>
              ) : (
                <div className="admin-chart-empty">
                  Monthly growth data is not yet available.
                  <small>
                    Required endpoint: GET /api/admin/analytics/monthly
                  </small>
                </div>
              )}
            </ChartCard>

            <ChartCard
              title="Equipment Overview"
              subtitle="Approval distribution"
            >
              <div className="admin-side-chart">
                <Bar data={equipmentData} options={horizontalOptions} />
              </div>
            </ChartCard>

            <ChartCard
              title="Needs Your Attention"
              subtitle="Pending administrative tasks"
            >
              <div className="admin-side-chart">
                <Bar data={attentionData} options={horizontalOptions} />
              </div>
            </ChartCard>
          </div>

          {/* RECENT ACTIVITY */}
          <h2 className="admin-section-heading">
            Recent System Activity
          </h2>

          <div className="admin-activity-panel">
            {activityLogs.length ? (
              <div className="admin-activity-list">
                {activityLogs.slice(0, 30).map((log, index) => (
                  <div className="admin-activity-row" key={log.id || index}>
                    <div className="admin-activity-icon"><ClipboardList size={18} /></div>
                    <div className="admin-activity-copy">
                      <strong>{log.actor_name || (log.user_id ? `User #${log.user_id}` : 'System')}</strong>
                      <span>{log.action}</span>
                    </div>
                    <time>{log.created_at ? new Date(log.created_at).toLocaleString('en-PH') : '—'}</time>
                    {log.actor_role && <small>{log.actor_role}</small>}
                  </div>
                ))}
              </div>
            ) : (
              <div className="admin-activity-empty">
                <ClipboardList size={30} />
                <strong>No system activity recorded yet.</strong>
                <span>New successful logins and supported account actions will appear here.</span>
              </div>
            )}
          </div>

          <p className="admin-updated">
            Last updated:{' '}
            {lastUpdated
              ? lastUpdated.toLocaleTimeString('en-PH')
              : 'Waiting for data'}
            {' · '}Automatically refreshes every 60 seconds.
          </p>
        </>
      ) : (
        <div className="admin-loading">
          No dashboard data available.
        </div>
      )}

    </div>
  );
}
