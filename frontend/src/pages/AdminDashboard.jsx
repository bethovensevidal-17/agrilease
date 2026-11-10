import { useEffect, useState } from 'react';
import { api, getUser, clearAuth } from '../api/client';

export default function AdminDashboard() {
  const user = getUser();

  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function loadDashboard() {
    try {
      setLoading(true);
      setError('');

      const response = await api('/admin/dashboard');
      setStats(response.data);
    } catch (err) {
      setError(err.message || 'Failed to load dashboard.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  function logout() {
    clearAuth();
    window.location.href = '/login';
  }

  const cards = [
    { label: 'Total Users', value: stats?.total_users },
    { label: 'Farmers', value: stats?.total_farmers },
    { label: 'Equipment Owners', value: stats?.total_owners },
    { label: 'Administrators', value: stats?.total_admins },
    { label: 'Active Users', value: stats?.active_users },
    { label: 'Pending Owner Verification', value: stats?.pending_owners },
    { label: 'Total Equipment', value: stats?.total_equipment },
    { label: 'Pending Equipment Approval', value: stats?.pending_equipment },
    { label: 'Approved Equipment', value: stats?.approved_equipment },
    { label: 'Total Rental Requests', value: stats?.total_rentals },
    { label: 'Pending Rentals', value: stats?.pending_rentals },
    { label: 'Ongoing Rentals', value: stats?.ongoing_rentals },
    { label: 'Completed Rentals', value: stats?.completed_rentals },
    { label: 'Active Subscriptions', value: stats?.active_subscriptions },
    { label: 'Pending Subscriptions', value: stats?.pending_subscriptions },
    { label: 'Pending Payments', value: stats?.pending_payments },
  ];

  return (
    <div className="admin-dashboard">
      <aside className="admin-sidebar">
        <h2>AGRILEASE</h2>
        <p className="admin-sidebar-label">ADMINISTRATION</p>

        <nav>
          <a href="/admin" className="active">Dashboard</a>
          <a href="/admin">Owner Verification</a>
          <a href="/admin">Equipment Management</a>
          <a href="/admin">Rental Monitoring</a>
          <a href="/admin">Subscriptions</a>
        </nav>

        <button onClick={logout} className="admin-logout">
          Logout
        </button>
      </aside>

      <main className="admin-main">
        <header className="admin-header">
          <div>
            <h1>Admin Dashboard</h1>
            <p>Welcome, {user?.full_name || 'Administrator'}!</p>
          </div>

          <button onClick={loadDashboard} disabled={loading}>
            {loading ? 'Loading...' : 'Refresh'}
          </button>
        </header>

        {error && (
          <div className="admin-error">
            {error}
          </div>
        )}

        {loading && !stats ? (
          <p>Loading dashboard statistics...</p>
        ) : stats ? (
          <>
            <h2 className="admin-section-title">System Overview</h2>

            <div className="admin-stat-grid">
              {cards.map((card) => (
                <div className="admin-stat-card" key={card.label}>
                  <span>{card.label}</span>
                  <strong>{Number(card.value ?? 0).toLocaleString()}</strong>
                </div>
              ))}
            </div>

            <p className="admin-updated">
              Dashboard statistics from AGRILEASE database.
            </p>
          </>
        ) : (
          !error && <p>No dashboard data available.</p>
        )}
      </main>
    </div>
  );
}
