import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Tractor,
  Menu,
  X,
  LogOut,
} from 'lucide-react';

import { getUser, clearAuth } from '../api/client';

const navigation = [
  {
    label: 'Dashboard',
    path: '/owner',
    icon: LayoutDashboard,
    end: true,
  },
  {
    label: 'Equipment Management',
    path: '/owner/equipment',
    icon: Tractor,
  },
];

export default function OwnerLayout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const user = getUser();
  const navigate = useNavigate();

  function logout() {
    if (!window.confirm('Are you sure you want to logout?')) return;

    clearAuth();
    navigate('/login', { replace: true });
  }

  function closeMenu() {
    setMenuOpen(false);
  }

  return (
    <div className="owner-shell">
      {menuOpen && (
        <button
          className="owner-backdrop"
          aria-label="Close navigation menu"
          onClick={closeMenu}
        />
      )}

      <aside className={`owner-sidebar ${menuOpen ? 'open' : ''}`}>
        <div className="owner-brand">AGRILEASE</div>

        <div className="owner-nav-heading">OWNER PORTAL</div>

        <nav className="owner-navigation">
          {navigation.map(({ label, path, icon: Icon, end }) => (
            <NavLink
              key={path}
              to={path}
              end={end}
              onClick={closeMenu}
              className={({ isActive }) =>
                `owner-nav-link ${isActive ? 'active' : ''}`
              }
            >
              <Icon size={19} strokeWidth={1.8} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <button className="owner-logout" onClick={logout}>
          <LogOut size={19} />
          <span>Logout</span>
        </button>
      </aside>

      <div className="owner-main">
        <header className="owner-topbar">
          <div className="owner-topbar-left">
            <button
              className="owner-menu-button"
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            >
              {menuOpen ? <X size={23} /> : <Menu size={23} />}
            </button>

            <div>
              <strong>AGRILEASE OWNER</strong>
              <span>Equipment Management Portal</span>
            </div>
          </div>

          <div className="owner-account">
            <span className="owner-avatar">
              {(user?.full_name || 'Owner').charAt(0).toUpperCase()}
            </span>
            <span className="owner-user-info">
              <strong>{user?.full_name || 'Equipment Owner'}</strong>
              <small>Equipment Owner</small>
            </span>
          </div>
        </header>

        <main className="owner-page-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
