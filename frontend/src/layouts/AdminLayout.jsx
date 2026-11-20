import { useCallback, useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  ClipboardCheck,
  Tractor,
  CreditCard,
  BarChart3,
  Bell,
  Menu,
<<<<<<< HEAD
=======
  WifiOff,
>>>>>>> master
  X,
  LogOut,
} from 'lucide-react';

import { api, getUser, clearAuth } from '../api/client';
import '../admin.css';

const navigation = [
  { label: 'Dashboard', path: '/admin', icon: LayoutDashboard, end: true },
  { label: 'User Management', path: '/admin/users', icon: Users },
  { label: 'Owner Verification', path: '/admin/owners', icon: ClipboardCheck },
  { label: 'Equipment Management', path: '/admin/equipment', icon: Tractor },
  { label: 'Subscription Management', path: '/admin/subscriptions', icon: CreditCard },
  { label: 'Reports', path: '/admin/reports', icon: BarChart3 },
<<<<<<< HEAD
=======
  { label: 'Offline Access', path: '/admin/offline', icon: WifiOff },
>>>>>>> master
];

export default function AdminLayout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const user = getUser();
  const navigate = useNavigate();

  const loadHeaderIndicators = useCallback(async () => {
    try {
      const notifications = await api('/notifications');
      setUnreadNotifications(Number(notifications?.unread_count || 0));
    } catch { /* Header remains usable if indicator endpoints are unavailable. */ }
  }, []);

  useEffect(() => {
    loadHeaderIndicators();
    const timer = window.setInterval(loadHeaderIndicators, 20000);
    return () => window.clearInterval(timer);
  }, [loadHeaderIndicators]);

  async function logout() {
    if (!await window.agrileaseDialog.confirm('Are you sure you want to logout?')) return;

    clearAuth();
    navigate('/login', { replace: true });
  }

  function closeMenu() {
    setMenuOpen(false);
  }

  return (
    <div className="admin-shell">
      {menuOpen && (
        <button
          className="admin-backdrop"
          aria-label="Close navigation menu"
          onClick={closeMenu}
        />
      )}

      <aside className={`admin-sidebar ${menuOpen ? 'open' : ''}`}>
        <div className="admin-brand admin-reference-brand">
          <span className="admin-brand-mark">A</span>
          <span className="admin-brand-copy"><strong>AGRILEASE</strong><small>ADMIN PORTAL</small></span>
        </div>


        <nav className="admin-navigation">
          {navigation.map(({ label, path, icon: Icon, end }) => (
            <NavLink
              key={path}
              to={path}
              end={end}
              onClick={closeMenu}
              className={({ isActive }) =>
                `admin-nav-link ${isActive ? 'active' : ''}`
              }
            >
              <Icon size={19} strokeWidth={1.8} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <button className="admin-logout" onClick={logout}>
          <LogOut size={19} />
          <span>Logout</span>
        </button>
      </aside>

      <div className="admin-main">
        <header className="admin-topbar portal-topbar">
          <div className="admin-topbar-left">
            <button
              className="admin-menu-button"
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={menuOpen}
            >
              {menuOpen ? <X size={23} /> : <Menu size={23} />}
            </button>

            <div className="role-header-title">
              <small>AGRILEASE / ADMIN PORTAL</small>
              <strong>Administration Portal</strong>
              <span>Manage users, equipment, subscriptions and reports.</span>
            </div>
          </div>

          <div className="admin-topbar-right">
            <button
              className="admin-icon-button admin-header-indicator portal-header-icon"
              title={`Notifications${unreadNotifications ? ` (${unreadNotifications} unread)` : ''}`}
              aria-label={`Notifications${unreadNotifications ? `, ${unreadNotifications} unread` : ''}`}
              onClick={() => navigate('/admin/notifications')}
            >
              <Bell size={20} />
              {unreadNotifications > 0 && <span className="portal-header-count">{unreadNotifications > 99 ? '99+' : unreadNotifications}</span>}
            </button>

            <button
              className="admin-profile-button"
              onClick={() => navigate('/admin/profile')}
            >
              <span className="admin-avatar portal-avatar">
                {(user?.full_name || 'Admin').charAt(0).toUpperCase()}
              </span>
              <span className="admin-profile-copy"><strong>{user?.full_name || 'Administrator'}</strong><small>Administrator</small></span>
            </button>
          </div>
        </header>

        <main className="admin-page-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
