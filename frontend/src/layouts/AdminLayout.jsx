import { useCallback, useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  ClipboardCheck,
  Tractor,
  CreditCard,
  BarChart3,
  Bell,
  Menu,
  WifiOff,
  X,
  LogOut,
} from 'lucide-react';

import { api, getUser, clearAuth } from '../api/client';
import '../admin.css';
import '../logo.css';

const navigation = [
  { label: 'Dashboard', path: '/admin', icon: LayoutDashboard, end: true },
  { label: 'User Management', path: '/admin/users', icon: Users },
  { label: 'Owner Verification', path: '/admin/owners', icon: ClipboardCheck },
  { label: 'Equipment Management', path: '/admin/equipment', icon: Tractor },
  { label: 'Subscription Management', path: '/admin/subscriptions', icon: CreditCard },
  { label: 'Reports', path: '/admin/reports', icon: BarChart3 },
  { label: 'Offline Access', path: '/admin/offline', icon: WifiOff },
];

const ADMIN_PAGE_TITLES = {
  '/admin': 'Dashboard',
  '/admin/users': 'User Management',
  '/admin/owners': 'Owner Verification',
  '/admin/equipment': 'Equipment Management',
  '/admin/rentals': 'Rental Monitoring',
  '/admin/booking-payments': 'Booking Payments',
  '/admin/subscriptions': 'Subscription Management',
  '/admin/reports': 'Reports',
  '/admin/offline': 'Offline Access',
  '/admin/notifications': 'Notifications',
  '/admin/profile': 'My Profile',
  '/admin/content': 'Website Content',
};
function adminPageTitle(pathname) {
  const path = pathname.replace(/\/+$/, '') || '/admin';
  return ADMIN_PAGE_TITLES[path] || 'Dashboard';
}

export default function AdminLayout() {
  const location = useLocation();
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

  // Label every table cell with its column name so the tables can turn into stacked cards on phones.
  useEffect(() => {
    const root = document.querySelector('.admin-page-content');
    if (!root) return undefined;
    const labelCells = () => {
      root.querySelectorAll('table').forEach(table => {
        const heads = Array.from(table.querySelectorAll('thead th')).map(th => th.textContent.trim());
        if (!heads.length) return;
        table.querySelectorAll('tbody tr').forEach(row => {
          const cells = Array.from(row.children);
          if (cells.length === 1 && cells[0].colSpan > 1) return;
          cells.forEach((cell, index) => { if (heads[index] && cell.dataset.label !== heads[index]) cell.dataset.label = heads[index]; });
        });
      });
    };
    labelCells();
    const observer = new MutationObserver(labelCells);
    observer.observe(root, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

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
          <span className="admin-brand-mark has-logo"><img src="/logo-mark.png" alt="" /></span>
          <span className="admin-brand-copy"><strong>AGRILEASE</strong><small>ADMIN PORTAL</small></span>
        </div>


        <div className="admin-nav-heading">MAIN MENU</div>

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
          <span>Log Out</span>
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

            <h1 className="admin-page-title">{adminPageTitle(location.pathname)}</h1>
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
