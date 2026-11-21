import { useEffect, useState } from 'react';
import useAutoRefresh from '../utils/useAutoRefresh.js';
import {
  Search,
  Users,
  UserCheck,
  UserX,
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
  const itemsPerPage = 8;
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [summary, setSummary] = useState({ total: 0, active: 0, pending: 0, suspended: 0, farmers: 0, owners: 0 });
  const [selectedUser, setSelectedUser] = useState(null);

  async function loadUsers(silent = false) {
    try {
      if (!silent) { setLoading(true); setError(''); }

      const params = new URLSearchParams();

      if (search.trim()) params.set('search', search.trim());
      if (role) params.set('role', role);
      if (status) params.set('status', status);

      const query = params.toString();
      const result = await api(
        `/admin/users${query ? `?${query}` : ''}`
      );

      setUsers(result.data || []);
      setSummary(result.summary || { total: result.total || 0, active: 0, pending: 0, suspended: 0, farmers: 0, owners: 0 });
    } catch (err) {
      if (!silent) setError(err.message || 'Unable to load users.');
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

  useAutoRefresh(() => loadUsers(true));

  async function handleStatusChange(user) {
    const newStatus =
      user.status === 'active' ? 'suspended' : 'active';

    const reason = newStatus === 'suspended' ? (await window.agrileaseDialog.prompt(`Enter the reason for suspending ${user.full_name}'s account:`, { title: 'Suspend account', placeholder: 'Enter the reason (at least 5 characters)' }))?.trim() : '';
    if (newStatus === 'suspended' && (!reason || reason.length < 5)) { setError('A suspension reason of at least 5 characters is required.'); return; }
    // Suspend: ang reason prompt na ang confirmation. Restore: may sariling confirmation.
    if (newStatus === 'active') {
      const confirmed = await window.agrileaseDialog.confirm(`Restore ${user.full_name}'s account? They will be able to log in again.`, { title: 'Restore account', confirmText: 'Restore' });
      if (!confirmed) return;
    }

    try {
      setUpdatingId(user.id);
      setError('');
      setMessage('');

      const result = await api(`/admin/users/${user.id}/status`, {
        method: 'PATCH',
        body: { status: newStatus, reason }
      });

      setMessage(result.message || 'Account updated successfully.');
      await loadUsers();
    } catch (err) {
      setError(err.message || 'Unable to update account.');
    } finally {
      setUpdatingId(null);
    }
  }

  const activeCount = summary.active;
  const pendingCount = summary.pending;
  const suspendedCount = summary.suspended;

  const totalPages = Math.ceil(users.length / itemsPerPage);

  const startIndex = (currentPage - 1) * itemsPerPage;

  const displayedUsers = users.slice(
    startIndex,
    startIndex + itemsPerPage
  );

  return (
    <div className="um-page">
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
              placeholder="Search name, email, or phone..."
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
          <button type="button" className="um-clear" onClick={() => { setSearch(''); setRole(''); setStatus(''); }}>Clear Filters</button>
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
                      {user.status === 'suspended' && user.suspension_reason && (
                        <small className="um-reason" title={user.suspension_reason}>Reason: {user.suspension_reason}</small>
                      )}
                    </td>

                    <td>
                      <div className="um-actions">
                      <button className="um-action view" onClick={() => setSelectedUser(user)}>View Details</button>
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
                              : 'Restore'}
                        </button>
                      ) : (
                        <span className="um-protected">
                          Manage in verification
                        </span>
                      )}
                      </div>
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

      {selectedUser && (
        <div className="um-modal-backdrop" role="presentation" onClick={() => setSelectedUser(null)}>
          <section className="um-user-modal" role="dialog" aria-modal="true" aria-labelledby="um-user-title" onClick={event => event.stopPropagation()}>
            <div className="um-modal-heading"><div><h2 id="um-user-title">User Details</h2><p>Account information and current status</p></div><button onClick={() => setSelectedUser(null)} aria-label="Close details">×</button></div>
            <dl className="um-detail-grid">
              <div><dt>Full Name</dt><dd>{selectedUser.full_name || '—'}</dd></div>
              <div><dt>Email Address</dt><dd>{selectedUser.email || '—'}</dd></div>
              <div><dt>Phone Number</dt><dd>{selectedUser.phone || '—'}</dd></div>
              <div><dt>Role</dt><dd>{selectedUser.role}</dd></div>
              <div><dt>Account Status</dt><dd><StatusBadge status={selectedUser.status} /></dd></div>
              <div><dt>Date Registered</dt><dd>{formatDate(selectedUser.created_at)}</dd></div>
              <div><dt>User ID</dt><dd>#{selectedUser.id}</dd></div>
              {selectedUser.status === 'suspended' && <div><dt>Suspension Reason</dt><dd>{selectedUser.suspension_reason || 'No reason recorded.'}</dd></div>}
            </dl>
            <button className="um-modal-close" onClick={() => setSelectedUser(null)}>Close</button>
          </section>
        </div>
      )}
    </div>
  );
}
