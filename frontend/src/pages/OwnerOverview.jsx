import { useEffect, useState } from 'react';
import { api, getUser } from '../api/client';

export default function OwnerOverview() {
  const user = getUser();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function loadEquipment() {
    try {
      setLoading(true);
      setError('');

      const result = await api('/equipment/mine');
      setItems(result.data || []);
    } catch (err) {
      setError(
        err.message || 'Unable to load your equipment listings.'
      );
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadEquipment();
  }, []);

  const count = status =>
    items.filter(item => item.approval_status === status).length;

  return (
    <div className="owner-page">
      <div className="owner-welcome">
        <div>
          <h1>Welcome, {user?.full_name || 'Owner'}!</h1>
          <p>
            Manage your agricultural equipment and monitor your listings.
          </p>
        </div>

        <button
          className="owner-refresh"
          onClick={loadEquipment}
          disabled={loading}
        >
          {loading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      {error ? (
        <div className="owner-notice">
          <strong>Equipment information unavailable</strong>
          <p>{error}</p>
          <p>
            If your account is still awaiting verification, you can access
            equipment management once your Owner account is verified.
          </p>
        </div>
      ) : (
        <>
          <div className="owner-stat-grid">
            <div className="owner-stat-card">
              <span>Total Equipment</span>
              <strong>{loading ? '—' : items.length}</strong>
              <small>Your active equipment listings</small>
            </div>

            <div className="owner-stat-card">
              <span>Pending Approval</span>
              <strong>{loading ? '—' : count('pending')}</strong>
              <small>Waiting for Admin review</small>
            </div>

            <div className="owner-stat-card">
              <span>Approved</span>
              <strong>{loading ? '—' : count('approved')}</strong>
              <small>Approved equipment listings</small>
            </div>

            <div className="owner-stat-card">
              <span>Rejected</span>
              <strong>{loading ? '—' : count('rejected')}</strong>
              <small>Listings requiring attention</small>
            </div>
          </div>

          {!loading && items.length === 0 && (
  <section className="owner-panel">
    <h2>Getting Started</h2>
    <p>
      You haven't added any equipment yet. Start by listing your
      agricultural equipment on AGRILEASE. Your submission will
      be reviewed by the Admin before becoming visible to farmers.
    </p>
  </section>
)}
        </>
      )}
    </div>
  );
}
