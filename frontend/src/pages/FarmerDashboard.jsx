
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { getUser, clearAuth } from '../api/client';

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

  return (
    <div>
      <div className="farmer-welcome">
        <h1>Welcome, {user?.full_name || 'Farmer'}!</h1>
        <p>Manage your equipment rentals and explore available farm equipment.</p>
      </div>

      <div className="farmer-stat-grid">
        <div className="farmer-stat-card">
          <span>Active Rentals</span>
          <strong>0</strong>
          <small>Your ongoing equipment rentals</small>
        </div>

        <div className="farmer-stat-card">
          <span>Pending Requests</span>
          <strong>0</strong>
          <small>Requests waiting for approval</small>
        </div>

        <div className="farmer-stat-card">
          <span>Completed Rentals</span>
          <strong>0</strong>
          <small>Your completed rentals</small>
        </div>
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
