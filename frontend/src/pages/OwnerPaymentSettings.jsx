import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { assetUrl } from '../api/config';
import { Smartphone, Landmark, Wallet, Info } from 'lucide-react';

const emptySettings = {
  gcash_number: '',
  gcash_account_name: '',
  bank_name: '',
  bank_account_name: '',
  bank_account_number: '',
  other_payment_instructions: '',
  gcash_qr_url: null,
};

export default function OwnerPaymentSettings() {
  const [form, setForm] = useState(emptySettings);
  const [qrFile, setQrFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  async function loadSettings() {
    setLoading(true);
    setError('');
    try {
      const result = await api('/owner/payment-settings');
      setForm({ ...emptySettings, ...(result.data || {}) });
    } catch (err) {
      setError(err.message || 'Unable to load payment settings.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadSettings(); }, []);

  function updateField(event) {
    const { name, value } = event.target;
    setForm(current => ({ ...current, [name]: value }));
  }

  async function saveSettings(event) {
    event.preventDefault();
    if (!await window.agrileaseDialog.confirm('Save your payment settings? Farmers will see these details when they book.', { title: 'Save payment settings', confirmText: 'Save' })) return;
    setBusy(true);
    setError('');
    setMessage('');
    const payload = new FormData();
    [
      'gcash_number',
      'gcash_account_name',
      'bank_name',
      'bank_account_name',
      'bank_account_number',
      'other_payment_instructions',
    ].forEach(key => payload.append(key, form[key] || ''));
    if (qrFile) payload.append('gcash_qr', qrFile);

    try {
      const result = await api('/owner/payment-settings', { method: 'PUT', formData: payload });
      setForm(current => ({ ...current, ...(result.data || {}) }));
      setQrFile(null);
      const input = document.getElementById('owner-gcash-qr');
      if (input) input.value = '';
      setMessage(result.message || 'Payment settings saved.');
    } catch (err) {
      setError(err.message || 'Unable to save payment settings.');
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <section className="ps-page"><p>Loading payment settings...</p></section>;

  return (
    <section className="ps-page">
      {error && <div className="um-message error">{error}</div>}
      {message && <div className="um-message success">{message}</div>}

      <div className="ps-notice"><Info size={18} /><span>Use only payment accounts owned or authorized by your business. These details will be used by Farmers for payments related to your equipment rentals. Do not enter passwords, PINs, or OTPs.</span></div>

      <form className="ps-form" onSubmit={saveSettings}>
        <section className="ps-card">
          <header className="ps-card-head">
            <span className="ps-icon"><Smartphone size={22} strokeWidth={1.8} /></span>
            <div><h2>GCash</h2><p>Provide your GCash number, account name, and optional QR code.</p></div>
          </header>
          <div className="ps-grid ps-grid-2">
            <label>GCash Number<input name="gcash_number" value={form.gcash_number || ''} onChange={updateField} maxLength={30} placeholder="09XXXXXXXXX" /></label>
            <label>GCash Account Name<input name="gcash_account_name" value={form.gcash_account_name || ''} onChange={updateField} maxLength={150} placeholder="Account holder name" /></label>
          </div>
          <div className="ps-qr-row">
            <label className="ps-qr-upload">GCash QR Image (JPG, PNG, WEBP; max 5 MB)
              <input id="owner-gcash-qr" type="file" accept="image/jpeg,image/png,image/webp" onChange={e => setQrFile(e.target.files?.[0] || null)} />
              {qrFile && <small>Selected: {qrFile.name}</small>}
            </label>
            {form.gcash_qr_url && !qrFile && <figure className="ps-qr-preview">
              <img src={assetUrl(form.gcash_qr_url)} alt="Saved GCash QR code" />
              <figcaption>Current GCash QR code</figcaption>
            </figure>}
          </div>
        </section>

        <section className="ps-card">
          <header className="ps-card-head">
            <span className="ps-icon"><Landmark size={22} strokeWidth={1.8} /></span>
            <div><h2>Bank Transfer</h2><p>Enter the bank account where rental payments should be sent.</p></div>
          </header>
          <div className="ps-grid ps-grid-3">
            <label>Bank Name<input name="bank_name" value={form.bank_name || ''} onChange={updateField} maxLength={100} placeholder="Bank name" /></label>
            <label>Account Name<input name="bank_account_name" value={form.bank_account_name || ''} onChange={updateField} maxLength={150} placeholder="Account holder name" /></label>
            <label>Account Number<input name="bank_account_number" value={form.bank_account_number || ''} onChange={updateField} maxLength={50} placeholder="Bank account number" /></label>
          </div>
        </section>

        <section className="ps-card">
          <header className="ps-card-head">
            <span className="ps-icon"><Wallet size={22} strokeWidth={1.8} /></span>
            <div><h2>Other Payment Method</h2><p>Add instructions for another payment method you accept.</p></div>
          </header>
          <label className="ps-field">Payment Instructions
            <textarea name="other_payment_instructions" value={form.other_payment_instructions || ''} onChange={updateField} maxLength={5000} placeholder="Enter payment instructions..." />
          </label>
        </section>

        <div className="ps-actions">
          <button className="um-refresh" type="submit" disabled={busy}>{busy ? 'Saving...' : 'Save Payment Settings'}</button>
        </div>
      </form>
    </section>
  );
}
