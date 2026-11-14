import { Routes, Route, Navigate } from 'react-router-dom';

import Layout from './components/Layout.jsx';
import AdminLayout from './layouts/AdminLayout.jsx';

import BrowseEquipment from './pages/BrowseEquipment.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import AdminDashboard from './pages/AdminDashboard.jsx';
import OwnerVerification from './pages/OwnerVerification.jsx';
import UserManagement from './pages/UserManagement.jsx';
import EquipmentManagement from './pages/EquipmentManagement.jsx';
import RentalMonitoring from './pages/RentalMonitoring.jsx';
import SubscriptionsPayments from './pages/SubscriptionsPayments.jsx';
import Reports from './pages/Reports.jsx';
import AdminProfile from './pages/AdminProfile.jsx';
import AdminNotifications from './pages/AdminNotifications.jsx';
import OwnerLayout from './layouts/OwnerLayout.jsx';
import OwnerOverview from './pages/OwnerOverview.jsx';
import OwnerAddEquipment from './pages/OwnerAddEquipment.jsx';
import OwnerEquipmentManagement from './pages/OwnerEquipmentManagement.jsx';
import OwnerEditEquipment from './pages/OwnerEditEquipment.jsx';

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

function SimpleDashboard({ role }) {
  const user = getUser();

  function logout() {
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
        <Route
          path="rentals"
          element={<FarmerPlaceholder title="My Rentals" />}
        />
        <Route
          path="messages"
          element={<FarmerPlaceholder title="Messages" />}
        />
        <Route
          path="notifications"
          element={<FarmerPlaceholder title="Notifications" />}
        />
        <Route
          path="profile"
          element={<FarmerPlaceholder title="My Profile" />}
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

        <Route
          path="rentals"
          element={<RentalMonitoring />}
        />

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
      </Route>

      {/* Public Equipment Browse */}
      <Route element={<Layout />}>
        <Route index element={<BrowseEquipment />} />
      </Route>

      {/* Unknown Routes */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
