
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { getUser, clearAuth, api } from '../api/client';
import { useEffect, useState } from 'react';

const links = [
  { to: '/farmer', label: 'Overview', end: true },
  { to: '/farmer/equipment', label: 'Browse Equipment' },
  { to: '/farmer/rentals', label: 'My Rentals' },
  { to: '/farmer/messages', label: 'Messages' },
  { to: '/farmer/notifications', label: 'Notifications' },
  { to: '/farmer/profile', label: 'My Profile' },
];

export default function FarmerDashboard() {
  const navigate = useNavigate();
  const user = getUser();

  function logout() {
    clearAuth();
    navigate('/login', { replace: true });
  }

  return (
    <div className="farmer-dashboard">
      <aside className="farmer-sidebar">
        <div className="farmer-brand">AGRILEASE</div>
        <p className="farmer-sidebar-label">FARMER MENU</p>

        <nav className="farmer-nav">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className={({ isActive }) =>
                isActive ? 'farmer-nav-link active' : 'farmer-nav-link'
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>

        <button className="farmer-logout" onClick={logout}>
          Log Out
        </button>
      </aside>

      <main className="farmer-main">
        <header className="farmer-topbar">
          <div>
            <span className="farmer-topbar-title">Farmer Portal</span>
            <span className="farmer-topbar-subtitle">
              AGRILEASE Management System
            </span>
          </div>

          <div className="farmer-account">
            <div className="farmer-avatar">
              {user?.full_name?.charAt(0)?.toUpperCase() || 'F'}
            </div>
            <div>
              <strong>{user?.full_name || 'Farmer'}</strong>
              <small>Farmer Account</small>
            </div>
          </div>
        </header>

        <section className="farmer-content">
          <Outlet />
        </section>
      </main>
    </div>
  );
}

export function FarmerOverview() {
  const user = getUser();
  const [bookings, setBookings] = useState([]);
  const [activityError, setActivityError] = useState('');
  useEffect(() => { let active = true; api('/rentals/mine').then(r => { if (active) setBookings(r.data || []); }).catch(e => { if (active) setActivityError(e.message || 'Unable to load booking summary.'); }); return () => { active = false; }; }, []);
  const activeRentals = bookings.filter(b => ['approved', 'ongoing'].includes(String(b.status).toLowerCase())).length;
  const pendingRentals = bookings.filter(b => String(b.status).toLowerCase() === 'pending').length;
  const completedRentals = bookings.filter(b => String(b.status).toLowerCase() === 'completed').length;

  return (
    <div>
      <div className="farmer-welcome">
        <h1>Welcome, {user?.full_name || 'Farmer'}!</h1>
        <p>Manage your equipment rentals and explore available farm equipment.</p>
      </div>

      <div className="farmer-stat-grid">
        <div className="farmer-stat-card">
          <span>Active Rentals</span>
          <strong>{activeRentals}</strong>
          <small>Your approved or ongoing equipment rentals</small>
        </div>

        <div className="farmer-stat-card">
          <span>Pending Requests</span>
          <strong>{pendingRentals}</strong>
          <small>Requests waiting for approval</small>
        </div>

        <div className="farmer-stat-card">
          <span>Completed Rentals</span>
          <strong>{completedRentals}</strong>
          <small>Your completed rentals</small>
        </div>
      </div>

      {activityError && <p className="error">{activityError}</p>}
      <div className="farmer-panel">
        <h2>Recent Booking Activity</h2>
        {bookings.length ? <div style={{ display: 'grid', gap: 10 }}>{bookings.slice(0, 5).map(item => <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', borderBottom: '1px solid #e8eee8', padding: '8px 0' }}><span><strong>{item.equipment_name || `Booking #${item.id}`}</strong><small style={{ display: 'block' }}>{item.start_date || item.start_at || ''}</small></span><span>{item.status}</span></div>)}</div> : <p>No rental activity yet. Browse equipment to submit your first booking request.</p>}
      </div>
      <div className="farmer-panel">
        <h2>Getting Started</h2>
        <p>
          Browse available agricultural equipment, view the details, and send
          rental requests to equipment owners.
        </p>
      </div>
    </div>
  );
}

export function FarmerPlaceholder({ title }) {
  return (
    <div className="farmer-panel">
      <h1>{title}</h1>
      <p>This section will be developed in the next part of AGRILEASE.</p>
    </div>
  );
}
