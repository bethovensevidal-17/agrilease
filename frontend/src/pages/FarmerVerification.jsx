
import { useEffect, useRef, useState } from 'react';
import useAutoRefresh from '../utils/useAutoRefresh.js';
import {
  Search,
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

export default function FarmerVerification() {
  const [farmers, setFarmers] = useState([]);
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [processingId, setProcessingId] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');

  const [selectedFarmer, setSelectedFarmer] = useState(null);
  const [documents, setDocuments] = useState({});
  const [documentLoading, setDocumentLoading] = useState({});
  const [documentErrors, setDocumentErrors] = useState({});

  const documentUrls = useRef({});

  const itemsPerPage = 8;

  async function loadFarmers(selectedStatus = status, silent = false) {
    try {
      if (!silent) { setLoading(true); setError(''); }

      const params = new URLSearchParams();

      if (selectedStatus) {
        params.set('status', selectedStatus);
      }

      const query = params.toString();

      const response = await api(
        `/admin/farmers${query ? `?${query}` : ''}`
      );

      setFarmers((response.data || []).map(o => ({ ...o, verification_status: o.verification_status || 'pending' })));
    } catch (err) {
      if (!silent) { setError(err.message || 'Unable to load farmer records.'); setFarmers([]); }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setCurrentPage(1);
    loadFarmers(status);
  }, [status]);

  useAutoRefresh(() => loadFarmers(status, true));

  useEffect(() => {
    return () => {
      Object.values(documentUrls.current).forEach(url => {
        URL.revokeObjectURL(url);
      });
    };
  }, []);

  const filteredFarmers = farmers.filter(farmer => {
    const keyword = search.trim().toLowerCase();

    return (
      (farmer.full_name || '').toLowerCase().includes(keyword) ||
      (farmer.farmer_id_number || '').toLowerCase().includes(keyword) ||
      (farmer.email || '').toLowerCase().includes(keyword)
    );
  });

  const startIndex = (currentPage - 1) * itemsPerPage;

  const displayedFarmers = filteredFarmers.slice(
    startIndex,
    startIndex + itemsPerPage
  );

  async function openDocument(type) {
    if (!selectedFarmer) return;

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
        `/admin/farmers/${selectedFarmer.id}/documents/${type}`
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

    setSelectedFarmer(null);
    setDocuments({});
    setDocumentErrors({});
    setDocumentLoading({});
    setRejectionReason('');
  }

  async function updateFarmer(farmerId, newStatus) {
    const action = newStatus === 'verified'
      ? 'approve'
      : 'reject';

    if (newStatus === 'rejected' && rejectionReason.trim().length < 5) {
      setError('Please enter a rejection reason with at least 5 characters.');
      return;
    }

    if (!await window.agrileaseDialog.confirm(`Are you sure you want to ${action} this farmer?`)) {
      return;
    }

    try {
      setProcessingId(farmerId);
      setError('');
      setMessage('');

      await api(`/admin/farmers/${farmerId}/verify`, {
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
          ? 'Farmer successfully approved.'
          : 'Farmer successfully rejected.'
      );

      closeReview();
      setCurrentPage(1);

      await loadFarmers(status);
    } catch (err) {
      setError(err.message || 'Unable to update farmer.');
    } finally {
      setProcessingId(null);
    }
  }

  const pendingCount = farmers.filter(
    farmer => farmer.verification_status === 'pending'
  ).length;

  return (
    <div className="um-page farmer-verification-page">

      {message && (
        <div className="um-message success">{message}</div>
      )}

      {error && (
        <div className="um-message error">{error}</div>
      )}

      <section className="um-panel">

        <div className="um-panel-heading">
          <div>
            <h2>Farmer Applications</h2>
            <p>
              Review and manage farmer registration requests and RSBSA / Farmer ID documents.
            </p>
          </div>

          <span className="um-total">
            {filteredFarmers.length} records
          </span>
        </div>

        <div className="um-toolbar">

          <div className="um-search">
            <Search size={18} />

            <input
              type="text"
              placeholder="Search farmer, Farmer ID number, or email..."
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
                <th>Farmer</th>
                <th>Farmer ID Number</th>
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
                    Loading farmer applications...
                  </td>
                </tr>
              ) : displayedFarmers.length === 0 ? (
                <tr>
                  <td colSpan="6" className="um-empty">
                    No farmer applications found.
                  </td>
                </tr>
              ) : (
                displayedFarmers.map(farmer => (
                  <tr key={farmer.id}>
                    <td>
                      <div className="um-user">
                        <div className="um-avatar">
                          {farmer.full_name?.charAt(0).toUpperCase()}
                        </div>

                        <div>
                          <strong>{farmer.full_name}</strong>
                          <small>{farmer.email}</small>
                        </div>
                      </div>
                    </td>

                    <td>{farmer.farmer_id_number || 'Not provided'}</td>

                    <td>{farmer.phone || '—'}</td>

                    <td>{formatDate(farmer.created_at)}</td>

                    <td>
                      <span
                        className={`owner-status ${farmer.verification_status}`}
                      >
                        {farmer.verification_status}
                      </span>
                    </td>

                    <td>
                      <button
                        type="button"
                        className="owner-review-btn"
                        onClick={() => {
                          setError('');
                          setRejectionReason('');
                          setSelectedFarmer(farmer);
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
            totalItems={filteredFarmers.length}
            itemsPerPage={itemsPerPage}
            currentPage={currentPage}
            onPageChange={setCurrentPage}
          />
        )}

      </section>

      {selectedFarmer && (
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
                  Review Farmer Application
                </h2>
                <p>
                  Compare the registration details with the uploaded RSBSA / Farmer ID before approving.
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
                    <span>{selectedFarmer.full_name || 'Not provided'}</span>
                  </p>

                  <p>
                    <strong>Email Address:</strong>
                    <span>{selectedFarmer.email || 'Not provided'}</span>
                  </p>

                  <p>
                    <strong>Phone Number:</strong>
                    <span>{selectedFarmer.phone || 'Not provided'}</span>
                  </p>

                  <p>
                    <strong>RSBSA / Farmer ID No.:</strong>
                    <span>{selectedFarmer.farmer_id_number || 'Not provided'}</span>
                  </p>

                  <p>
                    <strong>Address:</strong>
                    <span>{[selectedFarmer.address, selectedFarmer.barangay].filter(Boolean).join(', ') || 'Not provided'}</span>
                  </p>

                  <p>
                    <strong>Date Registered:</strong>
                    <span>{formatDate(selectedFarmer.created_at)}</span>
                  </p>

                  <p>
                    <strong>Account Status:</strong>
                    <span>{selectedFarmer.account_status || 'Unknown'}</span>
                  </p>

                  <p>
                    <strong>Verification Status:</strong>
                    <span>{selectedFarmer.verification_status}</span>
                  </p>
                </div>
              </section>

              {selectedFarmer.verification_status === 'rejected' &&
                selectedFarmer.rejection_reason && (
                  <section className="owner-review-section">
                    <h3>Previous Rejection Reason</h3>
                    <p>{selectedFarmer.rejection_reason}</p>
                  </section>
                )}

              <section className="owner-review-section">
                <h3>Submitted Farmer ID</h3>

                {[
                  {
                    type: 'farmer_id',
                    label: 'RSBSA / Farmer ID'
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

                        {selectedFarmer.has_document && (
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
                        )}
                      </div>

                      {!selectedFarmer.has_document && (
                        <p className="owner-document-empty">
                          No RSBSA / Farmer ID document is on file for this
                          account. This is usually a legacy account created
                          before document uploads were required.
                        </p>
                      )}

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
              {selectedFarmer.verification_status === 'pending' && (
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
                      placeholder="Explain why the Farmer ID was rejected (e.g. blurred, name or number does not match)..."
                    />
                  </div>

                  <button
                    type="button"
                    className="owner-reject"
                    disabled={processingId !== null}
                    onClick={() => updateFarmer(selectedFarmer.id, 'rejected')}
                  >
                    {processingId === selectedFarmer.id
                      ? 'Processing...'
                      : 'Reject'}
                  </button>

                  <button
                    type="button"
                    className="owner-approve"
                    disabled={processingId !== null}
                    onClick={() => updateFarmer(selectedFarmer.id, 'verified')}
                  >
                    {processingId === selectedFarmer.id
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
