import { useEffect, useState } from 'react';
import { api, getAuthenticatedFile } from '../api/client';
import Pagination from '../components/admin/Pagination';
import '../styles/booking.css';

const money = new Intl.NumberFormat('en-PH', {
  style: 'currency',
  currency: 'PHP',
});

export default function MyRentals() {
  const [rows, setRows] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [proofLoading, setProofLoading] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  async function load() {
    try {
      setError('');
      const result = await api('/rentals/mine');
      setRows(result.data || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function cancel(id) {
    if (!await window.agrileaseDialog.confirm('Cancel this pending booking?')) return;

    try {
      setError('');
      await api(`/rentals/${id}/cancel`, { method: 'PATCH' });
      await load();
    } catch (e) {
      setError(e.message);
    }
  }

  async function viewProof(row) {
    if (!row.payment_id) {
      setError('Payment record not found.');
      return;
    }

    try {
      setError('');
      setProofLoading(row.id);

      const blob = await getAuthenticatedFile(
        `/rentals/payments/${row.payment_id}/proof`
      );

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');

      link.href = url;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.click();

      window.setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (e) {
      setError(e.message);
    } finally {
      setProofLoading(null);
    }
  }

  const displayedRows = rows.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  if (loading) return <p>Loading your bookings...</p>;

  return (
    <section className="my-rentals">
      <h1>My Bookings</h1>

      {error && <p className="booking-error">{error}</p>}

      {!rows.length && (
        <p>You do not have any bookings yet.</p>
      )}

      {displayedRows.map(row => (
        <article className="rental-row" key={row.id}>
          <div>
            <h3>{row.equipment_name}</h3>

            <p>
              {row.start_date} – {row.end_date}
            </p>

            <p>
              Quantity: {row.rental_quantity || 1}
              {' · '}
              Payment: {(row.payment_method || '—').replace('_', ' ')}
            </p>

            <p>
              Payment status: {row.payment_status || 'pending'}
            </p>

            {row.payment_reference && (
              <p>
                Reference number: {row.payment_reference}
              </p>
            )}

            {row.payment_proof && (
              <button
                type="button"
                disabled={proofLoading === row.id}
                onClick={() => viewProof(row)}
              >
                {proofLoading === row.id
                  ? 'Opening proof...'
                  : 'View payment proof'}
              </button>
            )}

            <strong>
              {money.format(Number(row.total_amount || 0))}
            </strong>
          </div>

          <div>
            <span className={`rental-status ${row.status}`}>
              {row.status}
            </span>

            {row.status === 'pending' && (
              <button onClick={() => cancel(row.id)}>
                Cancel booking
              </button>
            )}
          </div>
        </article>
      ))}
      <Pagination totalItems={rows.length} itemsPerPage={itemsPerPage} currentPage={currentPage} onPageChange={setCurrentPage} />
    </section>
  );
}
