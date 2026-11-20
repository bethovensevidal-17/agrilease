import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { assetUrl } from '../api/config';

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
<<<<<<< HEAD
=======
    if (!await window.agrileaseDialog.confirm('Save your payment settings? Farmers will see these details when they book.', { title: 'Save payment settings', confirmText: 'Save' })) return;
>>>>>>> master
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

  if (loading) return <section className="am-page"><p>Loading payment settings...</p></section>;

  const fieldStyle = { display: 'flex', flexDirection: 'column', gap: 7, fontSize: 13, color: '#47534a' };
  const inputStyle = { width: '100%', minHeight: 42, padding: '10px 12px', border: '1px solid #dce3dc', borderRadius: 7, font: 'inherit', color: '#26332a', background: '#fff' };

  return (
    <section className="am-page" style={{ maxWidth: 950, margin: '0 auto' }}>
      <div className="admin-page-heading">
        <div>
          <h1>Payment Settings</h1>
          <p>Set the payment details Farmers should use when renting your equipment.</p>
        </div>
        <button className="um-refresh" type="button" onClick={loadSettings} disabled={busy}>Refresh</button>
      </div>

      {error && <div className="um-message error">{error}</div>}
      {message && <div className="um-message success">{message}</div>}

      <div className="am-warning">
        Use only payment accounts owned or authorized by your business. These details will be used by Farmers for payments related to your equipment rentals. Do not enter passwords, PINs, or OTPs.
      </div>

      <form className="um-panel" onSubmit={saveSettings} style={{ padding: 20, display: 'grid', gap: 20 }}>
        <section style={{ display: 'grid', gap: 13 }}>
          <div><h2 style={{ margin: 0 }}>GCash</h2><p className="am-note">Provide your GCash number, account name, and optional QR code.</p></div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 14 }}>
            <label style={fieldStyle}>GCash Number<input style={inputStyle} name="gcash_number" value={form.gcash_number || ''} onChange={updateField} maxLength={30} placeholder="09XXXXXXXXX" /></label>
            <label style={fieldStyle}>GCash Account Name<input style={inputStyle} name="gcash_account_name" value={form.gcash_account_name || ''} onChange={updateField} maxLength={150} placeholder="Account holder name" /></label>
          </div>
          <label style={fieldStyle}>GCash QR Image (JPG, PNG, WEBP; max 5 MB)
            <input id="owner-gcash-qr" style={inputStyle} type="file" accept="image/jpeg,image/png,image/webp" onChange={e => setQrFile(e.target.files?.[0] || null)} />
          </label>
          {form.gcash_qr_url && !qrFile && <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
            <img src={assetUrl(form.gcash_qr_url)} alt="Saved GCash QR code" style={{ width: 150, height: 150, objectFit: 'contain', border: '1px solid #e1e7e1', borderRadius: 8, padding: 6 }} />
            <span className="am-note">Current GCash QR code</span>
          </div>}
          {qrFile && <p className="am-note">Selected: {qrFile.name}</p>}
        </section>

        <hr style={{ width: '100%', border: 0, borderTop: '1px solid #edf0ed' }} />

        <section style={{ display: 'grid', gap: 13 }}>
          <div><h2 style={{ margin: 0 }}>Bank Transfer</h2><p className="am-note">Enter the bank account where rental payments should be sent.</p></div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 14 }}>
            <label style={fieldStyle}>Bank Name<input style={inputStyle} name="bank_name" value={form.bank_name || ''} onChange={updateField} maxLength={100} placeholder="Bank name" /></label>
            <label style={fieldStyle}>Account Name<input style={inputStyle} name="bank_account_name" value={form.bank_account_name || ''} onChange={updateField} maxLength={150} placeholder="Account holder name" /></label>
            <label style={fieldStyle}>Account Number<input style={inputStyle} name="bank_account_number" value={form.bank_account_number || ''} onChange={updateField} maxLength={50} placeholder="Bank account number" /></label>
          </div>
        </section>

        <hr style={{ width: '100%', border: 0, borderTop: '1px solid #edf0ed' }} />

        <section style={{ display: 'grid', gap: 10 }}>
          <div><h2 style={{ margin: 0 }}>Other Payment Method</h2><p className="am-note">Add instructions for another payment method you accept.</p></div>
          <label style={fieldStyle}>Payment Instructions
            <textarea style={{ ...inputStyle, minHeight: 100, resize: 'vertical' }} name="other_payment_instructions" value={form.other_payment_instructions || ''} onChange={updateField} maxLength={5000} placeholder="Enter payment instructions..." />
          </label>
        </section>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button className="um-refresh" type="submit" disabled={busy}>{busy ? 'Saving...' : 'Save Payment Settings'}</button>
        </div>
      </form>
    </section>
  );
}
