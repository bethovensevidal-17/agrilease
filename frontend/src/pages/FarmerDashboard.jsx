import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, Tractor, ClipboardList, ReceiptText, MessageCircle, Bell, UserRound, LogOut, MapPin, RefreshCw, Menu, X, WifiOff } from 'lucide-react';
import { getUser, clearAuth, api } from '../api/client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement,
  ArcElement, Tooltip, Legend, Filler,
} from 'chart.js';
import { Line, Doughnut } from 'react-chartjs-2';
import '../logo.css';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, ArcElement, Tooltip, Legend, Filler);

const primaryLinks = [
  { to: '/farmer', label: 'Dashboard', end: true, icon: LayoutDashboard },
  { to: '/farmer/equipment', label: 'Browse Equipment', icon: Tractor },
  { to: '/farmer/rentals', label: 'My Bookings', icon: ClipboardList },
  { to: '/farmer/transactions', label: 'Transactions', icon: ReceiptText },
  { to: '/farmer/offline', label: 'Offline Access', icon: WifiOff },
];

export default function FarmerDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  useEffect(() => { setMenuOpen(false); }, [location.pathname]);
  const user = getUser();
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const loadIndicators = useCallback(async () => {
    try {
      const [messages, notifications] = await Promise.all([api('/messages/unread-count'), api('/notifications')]);
      setUnreadMessages(Number(messages.unread_count || 0));
      setUnreadNotifications(Number(notifications.unread_count || 0));
    } catch { /* Keep the farmer navigation available if indicator APIs are unavailable. */ }
  }, []);
  useEffect(() => { loadIndicators(); const timer = window.setInterval(loadIndicators, 20000); return () => window.clearInterval(timer); }, [loadIndicators]);
  async function logout() {
    if (!await window.agrileaseDialog.confirm('Are you sure you want to logout?', { title: 'Logout', confirmText: 'Logout' })) return;
    clearAuth();
    navigate('/login', { replace: true });
  }

  return (
    <div className="farmer-dashboard">
      {menuOpen && <button type="button" className="farmer-backdrop" aria-label="Close navigation menu" onClick={() => setMenuOpen(false)} />}
      <aside className={`farmer-sidebar ${menuOpen ? 'open' : ''}`}>
        <div className="farmer-brand-wrap"><div className="farmer-brand-mark has-logo"><img src="/logo-mark.png" alt="" /></div><div><strong>AGRILEASE</strong><small>FARMER PORTAL</small></div></div>
        <p className="farmer-sidebar-label">FARMER MENU</p>
        <nav className="farmer-nav" aria-label="Farmer navigation">
          {primaryLinks.map(({ to, label, end, icon: Icon }) => <NavLink key={to} to={to} end={end} className={({ isActive }) => isActive ? 'farmer-nav-link active' : 'farmer-nav-link'}><Icon size={18} strokeWidth={1.8}/><span>{label}</span></NavLink>)}
        </nav>
        <button className="farmer-logout" onClick={logout}><LogOut size={17}/> <span>Log Out</span></button>
      </aside>
      <main className="farmer-main">
        <header className="farmer-topbar portal-topbar">
          <button type="button" className="farmer-menu-button" onClick={() => setMenuOpen(open => !open)} aria-label={menuOpen ? 'Close menu' : 'Open menu'} aria-expanded={menuOpen}>{menuOpen ? <X size={23}/> : <Menu size={23}/>}</button>
          <div className="role-header-title"><small>AGRILEASE / FARMER PORTAL</small><strong>My Rental Dashboard</strong><span>Browse equipment and manage your rental activity.</span></div>
          <div className="farmer-account"><button className="farmer-header-icon portal-header-icon" title="Messages" aria-label={`Messages${unreadMessages ? `, ${unreadMessages} unread` : ''}`} onClick={() => navigate('/farmer/messages')}><MessageCircle size={19}/>{unreadMessages > 0 && <span className="portal-header-count">{unreadMessages > 99 ? '99+' : unreadMessages}</span>}</button><button className="farmer-header-icon portal-header-icon" title="Notifications" aria-label={`Notifications${unreadNotifications ? `, ${unreadNotifications} unread` : ''}`} onClick={() => navigate('/farmer/notifications')}><Bell size={19}/>{unreadNotifications > 0 && <span className="portal-header-count">{unreadNotifications > 99 ? '99+' : unreadNotifications}</span>}</button><button className="farmer-profile-shortcut" onClick={() => navigate('/farmer/profile')} title="My Profile"><span className="farmer-avatar portal-avatar">{user?.full_name?.charAt(0)?.toUpperCase() || 'F'}</span><span className="farmer-account-copy"><strong>{user?.full_name || 'Farmer'}</strong><small>Farmer Account</small></span></button></div>
        </header>
        <section className="farmer-content"><Outlet /></section>
      </main>
    </div>
  );
}

const money = value => `₱${Number(value || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const dateLabel = value => value ? new Date(value).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
const statusLabel = value => String(value || 'pending').charAt(0).toUpperCase() + String(value || 'pending').slice(1).toLowerCase();

function loadLeaflet() {
  if (window.L) return Promise.resolve(window.L);
  if (window.__agrileaseLeafletPromise) return window.__agrileaseLeafletPromise;
  window.__agrileaseLeafletPromise = new Promise((resolve, reject) => {
    if (!document.querySelector('link[data-agrilease-leaflet]')) {
      const link = document.createElement('link'); link.rel = 'stylesheet'; link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'; link.dataset.agrileaseLeaflet = 'true'; document.head.appendChild(link);
    }
    const script = document.createElement('script'); script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'; script.async = true;
    script.onload = () => resolve(window.L); script.onerror = () => reject(new Error('Hindi ma-load ang map library. I-check ang internet connection.'));
    document.body.appendChild(script);
  });
  return window.__agrileaseLeafletPromise;
}

function NearbyEquipmentMap({ equipment }) {
  const mapElement = useRef(null);
  const mapRef = useRef(null);
  const [mapError, setMapError] = useState('');
  useEffect(() => {
    let cancelled = false;
    loadLeaflet().then(L => {
      if (cancelled || !mapElement.current || mapRef.current) return;
      // The current database stores municipality-level locations, not exact GPS coordinates.
      const centers = {
        'Victoria, Oriental Mindoro': [13.1776, 121.2787],
        'Socorro, Oriental Mindoro': [13.0594, 121.4060],
      };
      const fallback = [13.1776, 121.2787];
      const map = L.map(mapElement.current, { scrollWheelZoom: false }).setView(fallback, 11);
      mapRef.current = map;
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; OpenStreetMap contributors' }).addTo(map);
      const grouped = equipment.reduce((groups, item) => {
        const location = item.location || 'Victoria, Oriental Mindoro';
        groups[location] = groups[location] || [];
        groups[location].push(item);
        return groups;
      }, {});
      const markerPoints = [];
      Object.entries(grouped).forEach(([location, items]) => {
        const point = centers[location] || fallback;
        const marker = L.marker(point).addTo(map);
        const popupItems = items.slice(0, 8).map(item => `<div class=\"farmer-map-popup-item\"><strong>${String(item.name || item.equipment_name || 'Farm equipment').replace(/[<>]/g, '')}</strong><br>${money(item.rate || item.rental_rate)} / ${String(item.rate_type || '').replace(/[<>]/g, '')}</div>`).join('');
        marker.bindPopup(`<strong>${String(location).replace(/[<>]/g, '')}</strong><br><small>${items.length} available listing(s)</small>${popupItems}`);
        markerPoints.push(point);
      });
      if (markerPoints.length > 1) map.fitBounds(markerPoints, { padding: [24, 24], maxZoom: 12 });
      setTimeout(() => map.invalidateSize(), 150);
    }).catch(error => { if (!cancelled) setMapError(error.message); });
    return () => { cancelled = true; if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; } };
  }, [equipment]);
  return <div className="farmer-map-wrap"><div ref={mapElement} className="farmer-map" role="img" aria-label="Map of available agricultural equipment locations" />{mapError && <div className="farmer-map-error">{mapError}</div>}{!equipment.length && <div className="farmer-map-empty"><MapPin size={20}/> No approved equipment locations to display yet.</div>}</div>;
}

export function FarmerOverview() {
  const user = getUser();
  const [bookings, setBookings] = useState([]);
  const [equipment, setEquipment] = useState([]);
  const [equipmentTotal, setEquipmentTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    setError('');
    try {
      const [rentalResult, equipmentResult] = await Promise.all([api('/rentals/mine'), api('/equipment')]);
      setBookings(Array.isArray(rentalResult.data) ? rentalResult.data : []);
      setEquipment(Array.isArray(equipmentResult.data) ? equipmentResult.data : []);
      setEquipmentTotal(Number(equipmentResult.total ?? equipmentResult.data?.length ?? 0));
    } catch (err) { setError(err.message || 'Unable to load dashboard information.'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); const timer = setInterval(load, 60000); return () => clearInterval(timer); }, [load]);

  const counts = useMemo(() => {
    const result = { pending: 0, approved: 0, ongoing: 0, completed: 0, rejected: 0, cancelled: 0 };
    bookings.forEach(row => { const key = String(row.status || '').toLowerCase(); if (key in result) result[key] += 1; });
    return result;
  }, [bookings]);
  const monthly = useMemo(() => {
    const now = new Date();
    const months = Array.from({ length: 6 }, (_, index) => { const d = new Date(now.getFullYear(), now.getMonth() - 5 + index, 1); return { key: `${d.getFullYear()}-${d.getMonth()}`, label: d.toLocaleDateString('en-PH', { month: 'short', year: '2-digit' }), value: 0, year: d.getFullYear(), month: d.getMonth() }; });
    bookings.forEach(row => { const d = new Date(row.created_at || row.createdAt || row.start_at || row.start_date); const found = months.find(m => m.year === d.getFullYear() && m.month === d.getMonth()); if (found && !Number.isNaN(d.getTime())) found.value += 1; });
    return months;
  }, [bookings]);
  const lineData = { labels: monthly.map(m => m.label), datasets: [{ label: 'Bookings', data: monthly.map(m => m.value), borderColor: '#2e8b45', backgroundColor: 'rgba(46,139,69,.14)', fill: true, tension: .35, pointRadius: 4, pointHoverRadius: 6 }] };
  const statusLabels = ['Pending', 'Approved', 'Ongoing', 'Completed', 'Rejected', 'Cancelled'];
  const doughnutData = { labels: statusLabels, datasets: [{ data: [counts.pending, counts.approved, counts.ongoing, counts.completed, counts.rejected, counts.cancelled], backgroundColor: ['#e0a82e', '#2e8b45', '#2787c7', '#12432a', '#d9534f', '#8a9a8f'], borderWidth: 0, hoverOffset: 5 }] };
  const chartOptions = { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { usePointStyle: true, padding: 16, boxWidth: 8 } } } };
  const recent = [...bookings].sort((a,b) => new Date(b.created_at || b.start_at || 0) - new Date(a.created_at || a.start_at || 0)).slice(0, 5);

  return <div className="farmer-overview-page">
    <section className="role-welcome-banner farmer-welcome-banner"><div className="farmer-welcome-kicker">WELCOME TO AGRILEASE</div><h1>Good day, {user?.full_name || 'Farmer'}!</h1><p>Find agricultural equipment for your farm, submit rental requests, and monitor your bookings in one place.</p><div className="farmer-welcome-actions"><NavLink to="/farmer/equipment" className="farmer-primary-action">Browse Equipment</NavLink><NavLink to="/farmer/rentals" className="farmer-secondary-action">My Bookings</NavLink></div></section>
    {error && <div className="farmer-dashboard-error">{error}<button onClick={load}><RefreshCw size={14}/> Retry</button></div>}
    <div className="farmer-section-heading"><div><h2>Rental Overview</h2><p>A quick summary of your equipment rental activity.</p></div>{loading && <span className="farmer-loading-label">Updating…</span>}</div>
    <section className="farmer-stat-grid farmer-stat-grid-compact">
      <article className="farmer-stat-card"><span>Available Equipment</span><strong>{loading ? '—' : equipmentTotal}</strong><small>Approved equipment ready to rent</small></article>
      <article className="farmer-stat-card"><span>Total Bookings</span><strong>{loading ? '—' : bookings.length}</strong><small>All your submitted requests</small></article>
      <article className="farmer-stat-card"><span>Pending</span><strong className="farmer-stat-pending">{loading ? '—' : counts.pending}</strong><small>Awaiting owner response</small></article>
    </section>
    <section className="farmer-panel farmer-map-panel"><div className="farmer-panel-heading"><div><h2>Nearby Equipment</h2><p>Explore available farm equipment and view their locations.</p></div></div><NearbyEquipmentMap equipment={equipment}/><small className="farmer-map-caption">Select a map marker to view equipment details. Locations reflect the municipality saved in each listing.</small></section>
    <section className="farmer-analytics-section"><div className="farmer-section-heading"><div><h2>Rental Analytics</h2><p>Overview of your booking activity and rental status.</p></div></div><div className="farmer-chart-grid"><article className="farmer-panel farmer-chart-panel"><h3>Monthly Booking Activity</h3><p>Track your booking activity over the past six months.</p><div className="farmer-chart-area">{bookings.length ? <Line data={lineData} options={{ ...chartOptions, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { precision: 0 } } } }}/> : <div className="farmer-chart-empty">No booking activity available yet.</div>}</div></article><article className="farmer-panel farmer-chart-panel"><h3>Booking Status Distribution</h3><p>Breakdown of your rental request statuses.</p><div className="farmer-chart-area farmer-doughnut-area">{bookings.length ? <Doughnut data={doughnutData} options={{ ...chartOptions, cutout: '66%' }}/> : <div className="farmer-chart-empty">No booking status data available yet.</div>}</div></article></div></section>
    <section className="farmer-panel farmer-recent-panel"><div className="farmer-panel-heading"><div><h2>Recent Bookings</h2><p>Your five most recent rental requests.</p></div><NavLink to="/farmer/rentals">View All Bookings</NavLink></div>{recent.length ? <div className="farmer-table-wrap"><table className="farmer-recent-table"><thead><tr><th>Equipment</th><th>Rental Dates</th><th>Quantity</th><th>Total</th><th>Status</th></tr></thead><tbody>{recent.map(row => <tr key={row.id}><td><strong>{row.equipment_name || row.name || `Booking #${row.id}`}</strong></td><td>{dateLabel(row.start_at || row.start_date)} – {dateLabel(row.end_at || row.end_date)}</td><td>{row.quantity || 1}</td><td>{money(row.total_amount ?? row.total_price ?? row.amount)}</td><td><span className={`farmer-status-pill status-${String(row.status || 'pending').toLowerCase()}`}>{statusLabel(row.status)}</span></td></tr>)}</tbody></table></div> : <div className="farmer-recent-empty">No bookings yet. Browse equipment to send your first rental request.</div>}</section>
  </div>;
}

export function FarmerPlaceholder({ title }) { return <div className="farmer-panel"><h1>{title}</h1><p>This section will be developed in the next part of AGRILEASE.</p></div>; }
