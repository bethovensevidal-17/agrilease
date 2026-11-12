import { useEffect, useState } from 'react';
import {
  Search,
  Users,
  UserCheck,
  UserX,
  RefreshCw,
  ShieldCheck
} from 'lucide-react';

import { api } from '../api/client';
import Pagination from '../components/admin/Pagination';

function formatDate(date) {
  if (!date) return '—';

  return new Date(date).toLocaleDateString('en-PH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

function StatusBadge({ status }) {
  return (
    <span className={`um-status ${status}`}>
      {status}
    </span>
  );
}

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  async function loadUsers() {
    try {
      setLoading(true);
      setError('');

      const params = new URLSearchParams();

      if (search.trim()) params.set('search', search.trim());
      if (role) params.set('role', role);
      if (status) params.set('status', status);

      const query = params.toString();
      const result = await api(
        `/admin/users${query ? `?${query}` : ''}`
      );

      setUsers(result.data || []);
    } catch (err) {
      setError(err.message || 'Unable to load users.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setCurrentPage(1);

    const timer = setTimeout(() => {
      loadUsers();
    }, 300);

    return () => clearTimeout(timer);
  }, [search, role, status]);

  async function handleStatusChange(user) {
    const newStatus =
      user.status === 'active' ? 'suspended' : 'active';

    const confirmed = window.confirm(
      `Are you sure you want to ${newStatus} ${user.full_name}'s account?`
    );

    if (!confirmed) return;

    try {
      setUpdatingId(user.id);
      setError('');
      setMessage('');

      const result = await api(`/admin/users/${user.id}/status`, {
        method: 'PATCH',
        body: { status: newStatus }
      });

      setMessage(result.message || 'Account updated successfully.');
      await loadUsers();
    } catch (err) {
      setError(err.message || 'Unable to update account.');
    } finally {
      setUpdatingId(null);
    }
  }

  const activeCount = users.filter(
    user => user.status === 'active'
  ).length;

  const pendingCount = users.filter(
    user => user.status === 'pending'
  ).length;

  const suspendedCount = users.filter(
    user => user.status === 'suspended'
  ).length;

  const totalPages = Math.ceil(users.length / itemsPerPage);

  const startIndex = (currentPage - 1) * itemsPerPage;

  const displayedUsers = users.slice(
    startIndex,
    startIndex + itemsPerPage
  );

  return (
    <div className="um-page">
      <div className="admin-page-heading">
        <div>
          <h1>User Management</h1>
          <p>Manage and monitor all registered AGRILEASE accounts.</p>
        </div>

        <button
          className="um-refresh"
          onClick={loadUsers}
          disabled={loading}
        >
          <RefreshCw size={16} />
          Refresh
        </button>
      </div>

      <div className="um-summary">
        <div className="um-summary-card">
          <div className="um-summary-icon">
            <Users size={21} />
          </div>
          <div>
            <span>Users Found</span>
            <strong>{users.length}</strong>
          </div>
        </div>

        <div className="um-summary-card">
          <div className="um-summary-icon active">
            <UserCheck size={21} />
          </div>
          <div>
            <span>Active</span>
            <strong>{activeCount}</strong>
          </div>
        </div>

        <div className="um-summary-card">
          <div className="um-summary-icon pending">
            <ShieldCheck size={21} />
          </div>
          <div>
            <span>Pending</span>
            <strong>{pendingCount}</strong>
          </div>
        </div>

        <div className="um-summary-card">
          <div className="um-summary-icon suspended">
            <UserX size={21} />
          </div>
          <div>
            <span>Suspended</span>
            <strong>{suspendedCount}</strong>
          </div>
        </div>
      </div>

      <section className="um-panel">
        <div className="um-panel-heading">
          <div>
            <h2>Registered Users</h2>
            <p>View and manage user accounts.</p>
          </div>
          <span className="um-total">
            {users.length} records
          </span>
        </div>

        <div className="um-toolbar">
          <div className="um-search">
            <Search size={18} />
            <input
              type="text"
              placeholder="Search name or email..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          <select
            value={role}
            onChange={e => setRole(e.target.value)}
            aria-label="Filter by role"
          >
            <option value="">All Roles</option>
            <option value="admin">Admin</option>
            <option value="farmer">Farmer</option>
            <option value="owner">Owner</option>
          </select>

          <select
            value={status}
            onChange={e => setStatus(e.target.value)}
            aria-label="Filter by status"
          >
            <option value="">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>

        {message && (
          <div className="um-message success">{message}</div>
        )}

        {error && (
          <div className="um-message error">{error}</div>
        )}

        <div className="um-table-wrapper">
          <table className="um-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Role</th>
                <th>Phone</th>
                <th>Date Registered</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" className="um-empty">
                    Loading users...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan="6" className="um-empty">
                    No users found.
                  </td>
                </tr>
              ) : (
                displayedUsers.map(user => (
                  <tr key={user.id}>
                    <td>
                      <div className="um-user">
                        <div className="um-avatar">
                          {user.full_name?.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <strong>{user.full_name}</strong>
                          <small>{user.email}</small>
                        </div>
                      </div>
                    </td>

                    <td>
                      <span className={`um-role ${user.role}`}>
                        {user.role}
                      </span>
                    </td>

                    <td>{user.phone || '—'}</td>

                    <td>{formatDate(user.created_at)}</td>

                    <td>
                      <StatusBadge status={user.status} />
                    </td>

                    <td>
                      {user.role === 'admin' ? (
                        <span className="um-protected">
                          Protected
                        </span>
                      ) : user.status === 'active' ||
                        user.status === 'suspended' ? (
                        <button
                          className={`um-action ${
                            user.status === 'active'
                              ? 'suspend'
                              : 'activate'
                          }`}
                          disabled={updatingId === user.id}
                          onClick={() => handleStatusChange(user)}
                        >
                          {updatingId === user.id
                            ? 'Updating...'
                            : user.status === 'active'
                              ? 'Suspend'
                              : 'Activate'}
                        </button>
                      ) : (
                        <span className="um-protected">
                          Manage in verification
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <Pagination
          totalItems={users.length}
          itemsPerPage={itemsPerPage}
          currentPage={currentPage}
          onPageChange={setCurrentPage}
        />
      </section>
    </div>
  );
}
