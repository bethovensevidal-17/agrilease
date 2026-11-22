import { Routes, Route, Navigate, useParams } from 'react-router-dom';

import Layout from './components/Layout.jsx';
import AdminLayout from './layouts/AdminLayout.jsx';

import BrowseEquipment from './pages/BrowseEquipment.jsx';
import LandingPage from './pages/LandingPage.jsx';
import EquipmentBooking from './pages/EquipmentBooking.jsx';
import MyRentals from './pages/MyRentals.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import AdminDashboard from './pages/AdminDashboard.jsx';
import OwnerVerification from './pages/OwnerVerification.jsx';
import UserManagement from './pages/UserManagement.jsx';
import EquipmentManagement from './pages/EquipmentManagement.jsx';
import SubscriptionsPayments from './pages/SubscriptionsPayments.jsx';
import Reports from './pages/Reports.jsx';
import AdminProfile from './pages/AdminProfile.jsx';
import AdminNotifications from './pages/AdminNotifications.jsx';
import OwnerLayout from './layouts/OwnerLayout.jsx';
import OwnerOverview from './pages/OwnerOverview.jsx';
import OwnerAddEquipment from './pages/OwnerAddEquipment.jsx';
import OwnerEquipmentManagement from './pages/OwnerEquipmentManagement.jsx';
import OwnerEditEquipment from './pages/OwnerEditEquipment.jsx';
import OwnerBookings from './pages/OwnerBookings.jsx';
import NotificationCenter from './pages/NotificationCenter.jsx';
import Messages from './pages/Messages.jsx';
import OwnerSubscription from './pages/OwnerSubscription.jsx';
import OwnerPaymentSettings from './pages/OwnerPaymentSettings.jsx';
import FarmerProfile from './pages/FarmerProfile.jsx';
import AdminContent from './pages/AdminContent.jsx';
import Transactions from './pages/Transactions.jsx';
import OfflineSettings from './pages/OfflineSettings.jsx';

import './admin-modules.css';

import {
  getToken,
  getUser,
  clearAuth,
} from './api/client';

import FarmerDashboard, {
  FarmerOverview,
  FarmerPlaceholder,
} from './pages/FarmerDashboard.jsx';

function ProtectedRoute({ role, children }) {
  const token = getToken();
  const user = getUser();

  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role !== role) {
    return <Navigate to={`/${user.role}`} replace />;
  }

  return children;
}

// Pag farmer na naka-login ang nagbukas ng public link, ilipat sa farmer layout para hindi mawala ang sidebar.
function PublicEquipmentRoute() {
  const { id } = useParams();
  const user = getUser();
  if (getToken() && user?.role === 'farmer') return <Navigate to={`/farmer/equipment/${id}`} replace />;
  return <EquipmentBooking />;
}

function SimpleDashboard({ role }) {
  const user = getUser();

  async function logout() {
    if (!await window.agrileaseDialog.confirm('Are you sure you want to logout?')) return;
    clearAuth();
    window.location.href = '/login';
  }

  return (
    <div className="dashboard-placeholder">
      <h1>{role.charAt(0).toUpperCase() + role.slice(1)} Dashboard</h1>
      <p>Welcome, {user?.full_name}!</p>
      <button onClick={logout}>Logout</button>
    </div>
  );
}

function AdminPlaceholder({ title }) {
  return (
    <div className="admin-page-heading">
      <div>
        <h1>{title}</h1>
        <p>This admin module is not yet implemented.</p>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      {/* Authentication */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* Farmer Dashboard */}
      <Route
        path="/farmer"
        element={
          <ProtectedRoute role="farmer">
            <FarmerDashboard />
          </ProtectedRoute>
        }
      >
        <Route index element={<FarmerOverview />} />
        <Route path="equipment" element={<BrowseEquipment />} />
        <Route path="equipment/:id" element={<EquipmentBooking />} />
        <Route path="rentals" element={<MyRentals />} />
        <Route path="transactions" element={<Transactions role="farmer" />} />
        <Route path="messages" element={<Messages />} />
        <Route path="offline" element={<OfflineSettings />} />
        <Route
          path="notifications"
          element={<NotificationCenter title="Farmer Notifications" role="farmer" />}
        />
        <Route
          path="profile"
          element={<FarmerProfile />}
        />
      </Route>

      {/* Owner Dashboard */}
      <Route
        path="/owner"
        element={
          <ProtectedRoute role="owner">
            <OwnerLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<OwnerOverview />} />
        <Route path="bookings" element={<OwnerBookings />} />
        <Route path="transactions" element={<Transactions role="owner" />} />
        <Route path="subscription" element={<OwnerSubscription />} />
        <Route path="payment-settings" element={<OwnerPaymentSettings />} />
        <Route path="offline" element={<OfflineSettings />} />
        <Route path="messages" element={<Messages />} />
        <Route path="notifications" element={<NotificationCenter title="Owner Notifications" role="owner" />} />
        <Route path="equipment/add" element={<OwnerAddEquipment />} />
        <Route path="equipment/:id/edit" element={<OwnerEditEquipment />} />
        <Route path="equipment" element={<OwnerEquipmentManagement />} />
        </Route>
        
      
      {/* Admin Layout and Pages */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute role="admin">
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<AdminDashboard />} />

        <Route
          path="users"
          element={<UserManagement />}
        />

        <Route
          path="owners"
          element={<OwnerVerification />}
        />

        <Route
          path="equipment"
          element={<EquipmentManagement />}
        />

        {/* Inalis na ang admin Rental Monitoring at Booking Payments. Ang mga lumang notification/link ay napupunta sa Reports. */}
        <Route path="rentals" element={<Navigate to="/admin/reports" replace />} />
        <Route path="booking-payments" element={<Navigate to="/admin/reports" replace />} />

        <Route
          path="subscriptions"
          element={<SubscriptionsPayments />}
        />

        <Route
          path="reports"
          element={<Reports />}
        />

        <Route
          path="profile"
          element={<AdminProfile />}
        />

        <Route
          path="notifications"
          element={<AdminNotifications />}
        />

        <Route
          path="content"
          element={<AdminContent />}
        />

        <Route path="offline" element={<OfflineSettings />} />
      </Route>

      {/* Public landing page, equipment browsing, and equipment details */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/browse" element={<Layout />}>
        <Route index element={<BrowseEquipment />} />
      </Route>
      <Route path="/equipment/:id" element={<PublicEquipmentRoute />} />

      {/* Unknown Routes */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
