import { useCallback, useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  ReceiptText,
  MessageCircle,
  Bell,
  Tractor,
  CalendarDays,
  CreditCard,
  Wallet,
  Menu,
<<<<<<< HEAD
=======
  WifiOff,
>>>>>>> master
  X,
  LogOut,
} from 'lucide-react';

import { api, getUser, clearAuth } from '../api/client';

const navigation = [
  { label: 'Dashboard', path: '/owner', icon: LayoutDashboard, end: true },
  { label: 'My Equipment', path: '/owner/equipment', icon: Tractor },
  { label: 'Rental Bookings', path: '/owner/bookings', icon: CalendarDays },
  { label: 'Transactions', path: '/owner/transactions', icon: ReceiptText },
  { label: 'Subscription Plans', path: '/owner/subscription', icon: CreditCard },
  { label: 'Payment Settings', path: '/owner/payment-settings', icon: Wallet },
<<<<<<< HEAD
=======
  { label: 'Offline Access', path: '/owner/offline', icon: WifiOff },
>>>>>>> master
];

export default function OwnerLayout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const user = getUser();
  const navigate = useNavigate();

  const loadIndicators = useCallback(async () => {
    try {
      const [messageResult, notificationResult] = await Promise.all([
        api('/messages/unread-count'),
        api('/notifications'),
      ]);
      setUnreadMessages(Number(messageResult.unread_count || 0));
      setUnreadNotifications(Number(notificationResult.unread_count || 0));
    } catch { /* Keep navigation usable if indicator requests fail. */ }
  }, []);

  useEffect(() => {
    loadIndicators();
    const timer = window.setInterval(loadIndicators, 20000);
    return () => window.clearInterval(timer);
  }, [loadIndicators]);

  async function logout() {
    if (!await window.agrileaseDialog.confirm('Are you sure you want to logout?')) return;

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
        <div className="admin-brand admin-reference-brand"><span className="admin-brand-mark">A</span><span className="admin-brand-copy"><strong>AGRILEASE</strong><small>OWNER PORTAL</small></span></div>

        <div className="owner-nav-heading">MAIN MENU</div>

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
        <header className="owner-topbar portal-topbar">
          <div className="owner-topbar-left">
            <button
              className="owner-menu-button"
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            >
              {menuOpen ? <X size={23} /> : <Menu size={23} />}
            </button>

            <div className="role-header-title">
              <small>AGRILEASE / OWNER PORTAL</small>
              <strong>Dashboard Overview</strong>
              <span>Monitor your equipment listings and rental operations.</span>
            </div>
          </div>

          <div className="owner-account">
            <button className="owner-header-icon portal-header-icon" title="Messages" aria-label="Messages" onClick={() => navigate('/owner/messages')}><MessageCircle size={19}/>{unreadMessages > 0 && <span className="portal-header-count">{unreadMessages > 99 ? '99+' : unreadMessages}</span>}</button>
            <button className="owner-header-icon portal-header-icon" title="Notifications" aria-label="Notifications" onClick={() => navigate('/owner/notifications')}><Bell size={19}/>{unreadNotifications > 0 && <span className="portal-header-count">{unreadNotifications > 99 ? '99+' : unreadNotifications}</span>}</button>
            <span className="owner-avatar portal-avatar">
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
