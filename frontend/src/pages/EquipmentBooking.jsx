import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, getToken, getUser } from '../api/client';
import { isNetworkFailure, newRequestId, queueOfflineBooking } from '../offline/sync';
import '../styles/booking.css';
import { assetUrl } from '../api/config';

const money = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' });
const EMPTY_FORM = { start_date: '', start_time: '', end_date: '', end_time: '', quantity: '1', farm_area: '', payment_method: 'cash', payment_reference: '' };

// Same rule as the server: does the owner have the payment details for this method?
function ownerDetailsComplete(method, p) {
  if (!p) return false;
  if (method === 'gcash') return Boolean(p.gcash_number && p.gcash_account_name);
  if (method === 'bank_transfer') return Boolean(p.bank_name && p.bank_account_name && p.bank_account_number);
  if (method === 'other') return Boolean(p.other_payment_instructions);
  return true;
}

export default function EquipmentBooking() {
  const { id } = useParams();
  const user = getUser();
  const [equipment, setEquipment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [proof, setProof] = useState(null);
  const [ownerPayment, setOwnerPayment] = useState(null);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentLoadError, setPaymentLoadError] = useState('');
  const [fileKey, setFileKey] = useState(0);
  const [form, setForm] = useState(EMPTY_FORM);

  useEffect(() => {
    api(`/equipment/${id}`).then(setEquipment).catch(e => setError(e.message)).finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (form.payment_method === 'cash' || !getToken() || user?.role !== 'farmer') {
      setOwnerPayment(null); setPaymentLoadError(''); return;
    }
    let active = true;
    setPaymentLoading(true); setPaymentLoadError('');
    api(`/equipment/${id}/payment-details`)
      .then(result => { if (active) setOwnerPayment(result.data || {}); })
      .catch(err => { if (active) { setOwnerPayment(null); setPaymentLoadError(err.message); } })
      .finally(() => { if (active) setPaymentLoading(false); });
    return () => { active = false; };
  }, [id, form.payment_method, user?.role]);

  const estimate = useMemo(() => {
    if (!equipment) return null;
    const rate = Number(equipment.rental_rate ?? equipment.rate);
    const quantity = Number(form.quantity);
    if (!(rate > 0) || !(quantity > 0)) return null;
    if (equipment.rate_type === 'hectare') {
      const area = Number(form.farm_area);
      return area > 0 ? rate * area * quantity : null;
    }
    if (!form.start_date || !form.start_time || !form.end_date || !form.end_time) return null;
    const start = new Date(`${form.start_date}T${form.start_time}`);
    const end = new Date(`${form.end_date}T${form.end_time}`);
    const hours = (end - start) / 3600000;
    if (!(hours > 0)) return null;
    if (equipment.rate_type === 'hour') return rate * hours * quantity;
    // Per-day rate: minimum charge is 1 day (24 hours), prorated by hour beyond that. Same as the server.
    return rate * Math.max(hours, 24) / 24 * quantity;
  }, [equipment, form]);

  // Clear message for a wrong schedule, instead of a vague "Complete rental details".
  const scheduleError = useMemo(() => {
    if (!form.start_date || !form.start_time || !form.end_date || !form.end_time) return '';
    const start = new Date(`${form.start_date}T${form.start_time}`);
    const end = new Date(`${form.end_date}T${form.end_time}`);
    if (start < new Date()) return 'A rental cannot start in the past.';
    if (!(end > start)) return 'The end date/time must be later than the start date/time.';
    return '';
  }, [form.start_date, form.start_time, form.end_date, form.end_time]);

  // Online payment needs the owner's payment details; block submit until they are known and complete.
  const needsOwnerDetails = form.payment_method !== 'cash' && Boolean(getToken()) && user?.role === 'farmer';
  const ownerDetailsOk = !needsOwnerDetails || (!paymentLoading && !paymentLoadError && ownerDetailsComplete(form.payment_method, ownerPayment));

  function change(e) { setMessage(''); setForm(prev => ({ ...prev, [e.target.name]: e.target.value })); }

  async function submit(e) {
    e.preventDefault(); setError(''); setMessage('');
    if (scheduleError) { setError(scheduleError); return; }
    if (!getToken() || user?.role !== 'farmer') { setError('Mag-login gamit ang Farmer account para makapag-submit ng booking.'); return; }
    if (!await window.agrileaseDialog.confirm('Submit this booking request? The owner will review it after you submit.', { title: 'Submit booking', confirmText: 'Submit' })) return;
    const payload = { equipment_id: Number(id), start_date: form.start_date, start_time: form.start_time, end_date: form.end_date, end_time: form.end_time, quantity: Number(form.quantity), payment_method: form.payment_method };
    if (equipment.rate_type === 'hectare') payload.farm_area = Number(form.farm_area);
    setSubmitting(true);
    const requestId = newRequestId();
    const pendingSyncMessage = 'Booking saved on this device as PENDING SYNC. Hindi pa ito naipapadala sa Owner at hindi pa reserved ang equipment. Ise-send ito kapag bumalik ang internet, pagkatapos ay ive-validate ng server.';
    try {
      if (!navigator.onLine) {
        if (form.payment_method !== 'cash') throw new Error('Offline booking is currently available for Cash payment only. Please reconnect to submit other payment methods.');
        await queueOfflineBooking(payload, getToken(), requestId);
        setMessage(pendingSyncMessage);
      } else {
        const data = new FormData();
        Object.entries(payload).forEach(([key,value]) => data.append(key, String(value)));
        if (form.payment_method !== 'cash') { data.append('payment_reference', form.payment_reference); if (proof) data.append('payment_proof', proof); }
        try {
          const result = await api('/rentals', { method: 'POST', formData: data, headers: { 'X-Idempotency-Key': requestId } });
          setMessage(`Booking #${result.data?.id || result.booking_id || ''} submitted. Waiting for owner approval.`);
        } catch (requestError) {
          // Server unreachable: Cash bookings are kept on this device (same request id, so no duplicate if it did arrive).
          if (form.payment_method === 'cash' && isNetworkFailure(requestError)) {
            await queueOfflineBooking(payload, getToken(), requestId);
            setMessage(pendingSyncMessage);
          } else throw requestError;
        }
      }
      // Reset the form so the same request cannot be sent twice by clicking Submit again.
      setForm(EMPTY_FORM); setProof(null); setFileKey(k => k + 1);
    } catch (err) { setError(err.message); }
    finally { setSubmitting(false); }
  }

  if (loading) return <p>Loading equipment details...</p>;
  if (!equipment) return <section className="booking-page"><p className="error">{error || 'Equipment not found.'}</p><Link className="booking-back-button" to={user?.role === 'farmer' ? '/farmer/equipment' : '/browse'}>Back to equipment</Link></section>;
  const image = equipment.image_path ? assetUrl(`/uploads/${equipment.image_path.replace(/^\/+/, '')}`) : '';
  const rateType = equipment.rate_type === 'hour' ? 'per hour' : equipment.rate_type === 'hectare' ? 'per hectare' : 'per day';

  return <section className="booking-page">
    <Link className="booking-back-button" to={user?.role === 'farmer' ? '/farmer/equipment' : '/browse'}>Back to equipment</Link>
    <div className="booking-detail-grid">
      <article className="booking-equipment-card eq-detail-card">
        <div className="eq-detail-media">
          {image ? <img className="booking-equipment-image" src={image} alt={equipment.equipment_name} /> : <div className="booking-image-placeholder">No equipment image</div>}
        </div>
        <div className="booking-equipment-info eq-detail-info">
          <div className="eq-detail-head">
            <div>
              <h1>{equipment.equipment_name}</h1>
              <p className="booking-muted">{equipment.category_name || 'Agricultural equipment'} · {equipment.brand_model || 'No brand/model specified'}</p>
            </div>
            <span className={`eq-detail-status ${equipment.availability_status === 'available' ? 'is-available' : 'is-unavailable'}`}>
              {equipment.availability_status === 'available' ? 'Available' : equipment.availability_status === 'unavailable' ? 'Unavailable' : String(equipment.availability_status || 'Not specified').replaceAll('_', ' ')}
            </span>
          </div>
          <p className="booking-description eq-detail-description">{equipment.description || 'No description provided.'}</p>
          <dl className="booking-specs eq-detail-grid">
            <div><dt>Rate</dt><dd>{money.format(Number(equipment.rental_rate))} {rateType}</dd></div>
            <div><dt>Total units</dt><dd>{equipment.available_quantity ?? 1}</dd></div>
            <div><dt>Condition</dt><dd>{equipment.condition_status || 'Not specified'}</dd></div>
            <div><dt>Location</dt><dd>{equipment.location || 'Not specified'}</dd></div>
            <div><dt>Equipment owner</dt><dd>{equipment.owner_name || 'AgriLease owner'}</dd></div>
            <div><dt>Category</dt><dd>{equipment.category_name || 'Agricultural equipment'}</dd></div>
          </dl>
        </div>
      </article>

      <form className="booking-form-card" onSubmit={submit}>
        <div className="booking-form-heading"><h2>Rental Booking Form</h2><p>Choose your rental schedule and payment method, then submit your request.</p></div>
        <div className="booking-columns"><section className="booking-column"><h3>Rental Details</h3>
        <div className="booking-form-grid">
          <label>Start date<input type="date" name="start_date" min={new Date().toLocaleDateString('en-CA')} value={form.start_date} onChange={change} required /></label>
          <label>Start time<input type="time" name="start_time" value={form.start_time} onChange={change} required /></label>
          <label>End date<input type="date" name="end_date" min={form.start_date || new Date().toLocaleDateString('en-CA')} value={form.end_date} onChange={change} required /></label>
          <label>End time<input type="time" name="end_time" value={form.end_time} onChange={change} required /></label>
          <label>Rental quantity<input type="number" name="quantity" min="1" max={equipment.available_quantity ?? 1} step="1" value={form.quantity} onChange={change} required /></label>
          {equipment.rate_type === 'hectare' && <label>Farm area (hectares)<input type="number" name="farm_area" min="0.01" step="0.01" value={form.farm_area} onChange={change} required /></label>}
        </div>
        <div className="booking-estimate">
          <span>Estimated total (preview only)</span>
          <strong>{estimate == null ? 'Complete rental details' : money.format(estimate)}</strong>
          {equipment.rate_type === 'day' && <small>Per-day rate: minimum charge is 1 day (24 hours).</small>}
          <small>Final amount is calculated and validated by the server.</small>
        </div>
        {scheduleError && <p className="booking-error">{scheduleError}</p>}
        </section><section className="booking-column"><h3>Payment Details</h3>
        <label>Payment method<select name="payment_method" value={form.payment_method} onChange={change} required>
          <option value="cash">Cash</option><option value="gcash">GCash</option><option value="bank_transfer">Bank Transfer</option><option value="other">Other</option>
        </select></label>
        {form.payment_method !== 'cash' && <div className="booking-payment-fields">
          <p>Payment instructions from this equipment's owner. Verify the account details before sending payment.</p>
          {paymentLoading && <p>Loading owner payment details...</p>}
          {paymentLoadError && <p className="booking-error">{paymentLoadError}</p>}
          {!paymentLoading && !paymentLoadError && ownerPayment && <div className="booking-owner-payment-info">
            {form.payment_method === 'gcash' && <>
              {ownerPayment.gcash_number && <p><strong>GCash Number:</strong> {ownerPayment.gcash_number}</p>}
              {ownerPayment.gcash_account_name && <p><strong>Account Name:</strong> {ownerPayment.gcash_account_name}</p>}
              {ownerPayment.gcash_qr_url && <img className="booking-owner-qr" src={assetUrl(ownerPayment.gcash_qr_url)} alt="Equipment owner's GCash QR code" />}
              {!ownerPayment.gcash_number || !ownerPayment.gcash_account_name ? <p className="booking-error">Hindi pa kumpleto ang GCash details ng owner.</p> : null}
            </>}
            {form.payment_method === 'bank_transfer' && <>
              {ownerPayment.bank_name && <p><strong>Bank:</strong> {ownerPayment.bank_name}</p>}
              {ownerPayment.bank_account_name && <p><strong>Account Name:</strong> {ownerPayment.bank_account_name}</p>}
              {ownerPayment.bank_account_number && <p><strong>Account Number:</strong> {ownerPayment.bank_account_number}</p>}
              {!ownerPayment.bank_name || !ownerPayment.bank_account_name || !ownerPayment.bank_account_number ? <p className="booking-error">Hindi pa kumpleto ang bank details ng owner.</p> : null}
            </>}
            {form.payment_method === 'other' && <>
              {ownerPayment.other_payment_instructions ? <p>{ownerPayment.other_payment_instructions}</p> : <p className="booking-error">Wala pang Other payment instructions ang owner.</p>}
            </>}
          </div>}
          <label>Payment reference number<input name="payment_reference" value={form.payment_reference} onChange={change} required maxLength="100" /></label>
          <label>Proof of payment (JPG, PNG, WEBP; max 5 MB)<input key={fileKey} type="file" accept="image/jpeg,image/png,image/webp" onChange={e => setProof(e.target.files?.[0] || null)} required /></label>
        </div>}
        </section></div>
        {error && <p className="booking-error">{error}</p>}
        {message && <p className="booking-success">{message} <Link to="/farmer/rentals">View my bookings</Link></p>}
        {equipment.availability_status && equipment.availability_status !== 'available' && <p className="booking-error">This equipment is currently {String(equipment.availability_status).replaceAll('_', ' ')} and cannot be booked.</p>}
        <div className="booking-submit-row"><button className="booking-submit" disabled={submitting || Boolean(scheduleError) || !ownerDetailsOk || (equipment.availability_status && equipment.availability_status !== 'available')}>{submitting ? 'Submitting...' : 'Submit Booking Request'}</button></div>
        {!getToken() && <p className="booking-muted">You must <Link to="/login">log in</Link> as a farmer to submit a booking.</p>}
      </form>
    </div>
  </section>;
}
