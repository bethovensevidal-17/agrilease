import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import BrowseEquipment from './pages/BrowseEquipment.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import AdminDashboard from './pages/AdminDashboard.jsx';
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

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

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

      <Route
        path="/owner"
        element={
          <ProtectedRoute role="owner">
            <SimpleDashboard role="owner" />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin"
        element={
          <ProtectedRoute role="admin">
            <AdminDashboard />
          </ProtectedRoute>
        }
      />

      <Route element={<Layout />}>
        <Route index element={<BrowseEquipment />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
