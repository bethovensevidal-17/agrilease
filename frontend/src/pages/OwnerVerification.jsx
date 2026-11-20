
import { useEffect, useRef, useState } from 'react';
import {
  Search,
  RefreshCw,
  FileText,
  X
} from 'lucide-react';

import {
  api,
  getAuthenticatedFile
} from '../api/client';

import Pagination from '../components/admin/Pagination';

function formatDate(date) {
  if (!date) return '—';

  return new Date(date).toLocaleDateString('en-PH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

export default function OwnerVerification() {
  const [owners, setOwners] = useState([]);
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [processingId, setProcessingId] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');

  const [selectedOwner, setSelectedOwner] = useState(null);
  const [documents, setDocuments] = useState({});
  const [documentLoading, setDocumentLoading] = useState({});
  const [documentErrors, setDocumentErrors] = useState({});

  const documentUrls = useRef({});

  const itemsPerPage = 8;

  async function loadOwners(selectedStatus = status) {
    try {
      setLoading(true);
      setError('');

      const params = new URLSearchParams();

      if (selectedStatus) {
        params.set('status', selectedStatus);
      }

      const query = params.toString();

      const response = await api(
        `/admin/owners${query ? `?${query}` : ''}`
      );

      setOwners(response.data || []);
    } catch (err) {
      setError(err.message || 'Unable to load owner records.');
      setOwners([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setCurrentPage(1);
    loadOwners(status);
  }, [status]);

  useEffect(() => {
    return () => {
      Object.values(documentUrls.current).forEach(url => {
        URL.revokeObjectURL(url);
      });
    };
  }, []);

  const filteredOwners = owners.filter(owner => {
    const keyword = search.trim().toLowerCase();

    return (
      (owner.full_name || '').toLowerCase().includes(keyword) ||
      (owner.business_name || '').toLowerCase().includes(keyword) ||
      (owner.email || '').toLowerCase().includes(keyword)
    );
  });

  const startIndex = (currentPage - 1) * itemsPerPage;

  const displayedOwners = filteredOwners.slice(
    startIndex,
    startIndex + itemsPerPage
  );

  async function openDocument(type) {
    if (!selectedOwner) return;

    try {
      setDocumentLoading(prev => ({
        ...prev,
        [type]: true
      }));

      setDocumentErrors(prev => ({
        ...prev,
        [type]: ''
      }));

      const blob = await getAuthenticatedFile(
        `/admin/owners/${selectedOwner.id}/documents/${type}`
      );

      if (documentUrls.current[type]) {
        URL.revokeObjectURL(documentUrls.current[type]);
      }

      const url = URL.createObjectURL(blob);

      documentUrls.current[type] = url;

      setDocuments(prev => ({
        ...prev,
        [type]: {
          url,
          contentType: blob.type
        }
      }));
    } catch (err) {
      setDocumentErrors(prev => ({
        ...prev,
        [type]: err.message || 'Unable to load document.'
      }));
    } finally {
      setDocumentLoading(prev => ({
        ...prev,
        [type]: false
      }));
    }
  }

  function closeReview() {
    Object.values(documentUrls.current).forEach(url => {
      URL.revokeObjectURL(url);
    });

    documentUrls.current = {};

    setSelectedOwner(null);
    setDocuments({});
    setDocumentErrors({});
    setDocumentLoading({});
    setRejectionReason('');
  }

  async function updateOwner(ownerId, newStatus) {
    const action = newStatus === 'verified'
      ? 'approve'
      : 'reject';

    if (newStatus === 'rejected' && rejectionReason.trim().length < 5) {
      setError('Please enter a rejection reason with at least 5 characters.');
      return;
    }

    if (!await window.agrileaseDialog.confirm(`Are you sure you want to ${action} this owner?`)) {
      return;
    }

    try {
      setProcessingId(ownerId);
      setError('');
      setMessage('');

      await api(`/admin/owners/${ownerId}/verify`, {
        method: 'PATCH',
        body: {
          status: newStatus,
          rejection_reason: newStatus === 'rejected'
            ? rejectionReason.trim()
            : null
        }
      });

      setRejectionReason('');

      setMessage(
        newStatus === 'verified'
          ? 'Owner successfully approved.'
          : 'Owner successfully rejected.'
      );

      closeReview();
      setCurrentPage(1);

      await loadOwners(status);
    } catch (err) {
      setError(err.message || 'Unable to update owner.');
    } finally {
      setProcessingId(null);
    }
  }

  const pendingCount = owners.filter(
    owner => owner.verification_status === 'pending'
  ).length;

  return (
    <div className="um-page owner-verification-page">

      <div className="admin-page-heading">
        <div>
          <h1>Owner Verification</h1>
          <p>
            Review owner applications and verify submitted documents.
          </p>
        </div>

        <button
          type="button"
          className="um-refresh"
          onClick={() => loadOwners(status)}
          disabled={loading}
        >
          <RefreshCw size={16} />
          {loading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      {message && (
        <div className="um-message success">{message}</div>
      )}

      {error && (
        <div className="um-message error">{error}</div>
      )}

      <section className="um-panel">

        <div className="um-panel-heading">
          <div>
            <h2>Owner Applications</h2>
            <p>
              Review and manage equipment owner registration requests.
            </p>
          </div>

          <span className="um-total">
            {filteredOwners.length} records
          </span>
        </div>

        <div className="um-toolbar">

          <div className="um-search">
            <Search size={18} />

            <input
              type="text"
              placeholder="Search owner, business name, or email..."
              value={search}
              onChange={event => {
                setSearch(event.target.value);
                setCurrentPage(1);
              }}
            />
          </div>

          <select
            value={status}
            onChange={event => {
              setStatus(event.target.value);
              setCurrentPage(1);
            }}
            aria-label="Filter by verification status"
          >
            <option value="">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="verified">Verified</option>
            <option value="rejected">Rejected</option>
          </select>

        </div>

        <div className="um-table-wrapper">
          <table className="um-table">
            <thead>
              <tr>
                <th>Owner</th>
                <th>Business Name</th>
                <th>Phone</th>
                <th>Date Registered</th>
                <th>Verification</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" className="um-empty">
                    Loading owner applications...
                  </td>
                </tr>
              ) : displayedOwners.length === 0 ? (
                <tr>
                  <td colSpan="6" className="um-empty">
                    No owner applications found.
                  </td>
                </tr>
              ) : (
                displayedOwners.map(owner => (
                  <tr key={owner.id}>
                    <td>
                      <div className="um-user">
                        <div className="um-avatar">
                          {owner.full_name?.charAt(0).toUpperCase()}
                        </div>

                        <div>
                          <strong>{owner.full_name}</strong>
                          <small>{owner.email}</small>
                        </div>
                      </div>
                    </td>

                    <td>{owner.business_name || 'Not provided'}</td>

                    <td>{owner.phone || '—'}</td>

                    <td>{formatDate(owner.created_at)}</td>

                    <td>
                      <span
                        className={`owner-status ${owner.verification_status}`}
                      >
                        {owner.verification_status}
                      </span>
                    </td>

                    <td>
                      <button
                        type="button"
                        className="owner-review-btn"
                        onClick={() => {
                          setError('');
                          setRejectionReason('');
                          setSelectedOwner(owner);
                        }}
                      >
                        Review Application
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {!loading && (
          <Pagination
            totalItems={filteredOwners.length}
            itemsPerPage={itemsPerPage}
            currentPage={currentPage}
            onPageChange={setCurrentPage}
          />
        )}

      </section>

      {selectedOwner && (
        <div
          className="owner-modal-overlay"
          onClick={event => {
            if (event.target === event.currentTarget) {
              closeReview();
            }
          }}
        >
          <div
            className="owner-review-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="owner-review-title"
          >

            <div className="owner-modal-header">
              <div>
                <h2 id="owner-review-title">
                  Review Owner Application
                </h2>
                <p>
                  Check the registration information and submitted documents.
                </p>
              </div>

              <button
                type="button"
                className="owner-modal-close"
                onClick={closeReview}
                aria-label="Close review"
              >
                <X size={22} />
              </button>
            </div>

            <div className="owner-modal-body">

              <section className="owner-review-section">
                <h3>Registration Information</h3>

                <div className="owner-review-info">
                  <p>
                    <strong>Full Name:</strong>
                    <span>{selectedOwner.full_name || 'Not provided'}</span>
                  </p>

                  <p>
                    <strong>Email Address:</strong>
                    <span>{selectedOwner.email || 'Not provided'}</span>
                  </p>

                  <p>
                    <strong>Phone Number:</strong>
                    <span>{selectedOwner.phone || 'Not provided'}</span>
                  </p>

                  <p>
                    <strong>Business Name:</strong>
                    <span>{selectedOwner.business_name || 'Not provided'}</span>
                  </p>

                  <p>
                    <strong>Business Address:</strong>
                    <span>{selectedOwner.address || 'Not provided'}</span>
                  </p>

                  <p>
                    <strong>Date Registered:</strong>
                    <span>{formatDate(selectedOwner.created_at)}</span>
                  </p>

                  <p>
                    <strong>Account Status:</strong>
                    <span>{selectedOwner.account_status || 'Unknown'}</span>
                  </p>

                  <p>
                    <strong>Verification Status:</strong>
                    <span>{selectedOwner.verification_status}</span>
                  </p>
                </div>
              </section>

              {selectedOwner.verification_status === 'rejected' &&
                selectedOwner.rejection_reason && (
                  <section className="owner-review-section">
                    <h3>Previous Rejection Reason</h3>
                    <p>{selectedOwner.rejection_reason}</p>
                  </section>
                )}

              <section className="owner-review-section">
                <h3>Submitted Documents</h3>

                {[
                  {
                    type: 'business_permit',
                    label: 'Business Permit'
                  },
                  {
                    type: 'government_id',
                    label: 'Government ID'
                  }
                ].map(document => {
                  const file = documents[document.type];

                  return (
                    <div
                      className="owner-document-card"
                      key={document.type}
                    >
                      <div className="owner-document-heading">
                        <div>
                          <FileText size={18} />
                          <strong>{document.label}</strong>
                        </div>

                        <button
                          type="button"
                          onClick={() => openDocument(document.type)}
                          disabled={documentLoading[document.type]}
                        >
                          {documentLoading[document.type]
                            ? 'Loading...'
                            : file
                              ? 'Reload Document'
                              : 'View Document'}
                        </button>
                      </div>

                      {documentErrors[document.type] && (
                        <p className="admin-error">
                          {documentErrors[document.type]}
                        </p>
                      )}

                      {file && (
                        <div className="owner-document-preview">
                          {file.contentType === 'application/pdf' ? (
                            <iframe
                              src={file.url}
                              title={document.label}
                            />
                          ) : file.contentType?.startsWith('image/') ? (
                            <img
                              src={file.url}
                              alt={document.label}
                            />
                          ) : (
                            <a
                              href={file.url}
                              target="_blank"
                              rel="noreferrer"
                            >
                              Open document
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </section>

            </div>

            <div className="owner-modal-actions">
              {selectedOwner.verification_status === 'pending' && (
                <>
                  <div
                    className="owner-rejection-reason"
                    style={{ flexBasis: '100%' }}
                  >
                    <label htmlFor="owner-rejection-reason">
                      Reason for rejection (required when rejecting)
                    </label>

                    <textarea
                      id="owner-rejection-reason"
                      rows={3}
                      maxLength={1000}
                      value={rejectionReason}
                      onChange={event => setRejectionReason(event.target.value)}
                      placeholder="Explain what document or information needs correction..."
                    />
                  </div>

                  <button
                    type="button"
                    className="owner-reject"
                    disabled={processingId !== null}
                    onClick={() => updateOwner(selectedOwner.id, 'rejected')}
                  >
                    {processingId === selectedOwner.id
                      ? 'Processing...'
                      : 'Reject'}
                  </button>

                  <button
                    type="button"
                    className="owner-approve"
                    disabled={processingId !== null}
                    onClick={() => updateOwner(selectedOwner.id, 'verified')}
                  >
                    {processingId === selectedOwner.id
                      ? 'Processing...'
                      : 'Approve'}
                  </button>
                </>
              )}
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
