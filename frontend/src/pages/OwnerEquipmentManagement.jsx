import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  RefreshCw,
  Tractor,
  MapPin,
  Pencil,
  Archive,
} from 'lucide-react';

import { api } from '../api/client';
import { assetUrl } from '../api/config';
<<<<<<< HEAD
=======
import PendingSyncList from '../components/PendingSyncList.jsx';
>>>>>>> master

export default function OwnerEquipmentManagement() {
  const navigate = useNavigate();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showArchived, setShowArchived] = useState(false);

  async function loadEquipment() {
    try {
      setLoading(true);
      setError('');

      const result = await api(
        showArchived
          ? '/equipment/mine?archived=1'
          : '/equipment/mine'
      );

      setItems(result.data || []);
    } catch (err) {
      setError(err.message || 'Unable to load your equipment.');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleArchive(id) {
    const confirmed = await window.agrileaseDialog.confirm(
      'Are you sure you want to archive this equipment?'
    );

    if (!confirmed) return;

    try {
      setError('');

      await api(`/equipment/${id}/archive`, {
        method: 'PATCH',
      });

      await loadEquipment();
    } catch (err) {
      setError(err.message || 'Unable to archive equipment.');
    }
  }

  async function handleRestore(id) {
    const confirmed = await window.agrileaseDialog.confirm(
      'Are you sure you want to restore this equipment?'
    );

    if (!confirmed) return;

    try {
      setError('');

      await api(`/equipment/${id}/restore`, {
        method: 'PATCH',
      });

      await loadEquipment();
    } catch (err) {
      setError(err.message || 'Unable to restore equipment.');
    }
  }

  useEffect(() => {
    loadEquipment();
  }, [showArchived]);

  const groupedEquipment = items.reduce((groups, item) => {
    const category = item.category_name || 'Uncategorized';

    if (!groups[category]) {
      groups[category] = [];
    }

    groups[category].push(item);
    return groups;
  }, {});

  function statusClass(status) {
    return `owner-status owner-status-${String(
      status || 'pending'
    ).toLowerCase()}`;
  }

  return (
    <div className="owner-page">
      <div className="owner-welcome">
        <div>
          <h1>Equipment Management</h1>
          <p>
            Manage and monitor all your listed agricultural equipment.
          </p>
        </div>

        <div className="owner-equipment-actions">
          <button
            className="owner-refresh"
            onClick={loadEquipment}
            disabled={loading}
          >
            <RefreshCw size={16} />
            {loading ? 'Loading...' : 'Refresh'}
          </button>

          {!showArchived && (
            <button
              className="owner-add-button"
              onClick={() => navigate('/owner/equipment/add')}
            >
              <Plus size={18} />
              Add New Equipment
            </button>
          )}
        </div>
      </div>

      {/* Active and Archived Tabs */}
      <div className="owner-equipment-tabs">
        <button
          type="button"
          className={!showArchived ? 'active' : ''}
          onClick={() => setShowArchived(false)}
        >
          Active Equipment
        </button>

        <button
          type="button"
          className={showArchived ? 'active' : ''}
          onClick={() => setShowArchived(true)}
        >
          Archived Equipment
        </button>
      </div>

      <div className="owner-equipment-summary">
        <span>
          {showArchived ? 'Archived Listings' : 'Total Listings'}:{' '}
          <strong>{items.length}</strong>
        </span>

        {!showArchived && (
          <>
            <span>
              Pending:{' '}
              <strong>
                {items.filter(item => item.approval_status === 'pending').length}
              </strong>
            </span>

            <span>
              Approved:{' '}
              <strong>
                {items.filter(item => item.approval_status === 'approved').length}
              </strong>
            </span>

            <span>
              Rejected:{' '}
              <strong>
                {items.filter(item => item.approval_status === 'rejected').length}
              </strong>
            </span>
          </>
        )}
      </div>

<<<<<<< HEAD
=======
      <PendingSyncList kind="equipment" onSynced={loadEquipment} />

>>>>>>> master
      {error && (
        <div className="owner-notice">
          <strong>Unable to load equipment</strong>
          <p>{error}</p>
        </div>
      )}

      {loading ? (
        <div className="owner-empty-state">
          Loading your equipment...
        </div>
      ) : !error && items.length === 0 ? (
        <div className="owner-empty-state">
          <Tractor size={42} />

          <h2>
  {showArchived
    ? 'No Archived Equipment'
    : 'No Active Equipment'}
</h2>

<p>
  {showArchived
    ? 'Equipment you archive will appear here.'
    : 'You currently have no active equipment listings.'}
</p>

          
        </div>
      ) : (
        Object.entries(groupedEquipment).map(([category, equipment]) => (
          <section className="owner-category-section" key={category}>
            <div className="owner-category-heading">
              <h2>{category}</h2>
              <span>{equipment.length} equipment</span>
            </div>

            <div className="owner-equipment-grid">
              {equipment.map(item => (
                <article className="owner-equipment-card" key={item.id}>
                  <div className="owner-equipment-image">
  {item.image_path ? (
    <img
      src={assetUrl(`/uploads/${item.image_path.replace(/^\/+/, '')}`)}
      alt={item.name}
      loading="lazy"
    />
  ) : (
    <span className="owner-equipment-icon">
      <Tractor size={25} />
    </span>
  )}

  <span className={statusClass(item.approval_status)}>
    {showArchived
      ? 'Archived'
      : item.approval_status || 'Pending'}
  </span>
</div>

                  <h3>{item.name}</h3>

                  {item.brand_model && (
                    <p className="owner-equipment-model">
                      {item.brand_model}
                    </p>
                  )}

                  {item.location && (
                    <p className="owner-equipment-location">
                      <MapPin size={15} />
                      {item.location}
                    </p>
                  )}

                  <div className="owner-equipment-details">
                    <div>
                      <span>Rental Rate</span>
                      <strong>
                        ₱{Number(item.rate || 0).toLocaleString('en-PH')}
                        {item.rate_type ? ` / ${item.rate_type}` : ''}
                      </strong>
                    </div>

                    <div>
                      <span>Availability</span>
                      <strong>
                        {item.availability || 'Unavailable'}
                      </strong>
                    </div>
                  </div>

                  <div className="owner-equipment-card-footer">
                    {showArchived ? (
                      <div className="owner-card-actions">
                        <button
                          type="button"
                          className="owner-restore-button"
                          onClick={() => handleRestore(item.id)}
                        >
                          <RefreshCw size={14} />
                          Restore
                        </button>
                      </div>
                    ) : (
                      <>
                        <span className={statusClass(item.approval_status)}>
                          {item.approval_status === 'approved'
                            ? 'Approved Listing'
                            : item.approval_status === 'rejected'
                              ? 'Needs Attention'
                              : 'Waiting for Review'}
                        </span>

                        <div className="owner-card-actions">
                          <button
                            type="button"
                            className="owner-edit-button"
                            onClick={() =>
                              navigate(`/owner/equipment/${item.id}/edit`)
                            }
                          >
                            <Pencil size={14} />
                            Edit
                          </button>

                          <button
                            type="button"
                            className="owner-archive-button"
                            onClick={() => handleArchive(item.id)}
                          >
                            <Archive size={14} />
                            Archive
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </article>
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
