import { useEffect, useState } from 'react';
import { api, getUser, setUser } from '../api/client';

const empty = { full_name: '', email: '', phone: '', business_name: '', address: '' };
const VERIFICATION = { verified: 'Verified', pending: 'Pending review', rejected: 'Rejected' };

function memberSince(value) {
  const date = new Date(String(value || '').replace(' ', 'T'));
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

export default function OwnerProfile() {
  const [form, setForm] = useState(empty);
  const [info, setInfo] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    let active = true;
    api('/profile/owner')
      .then(r => { if (active) { setForm({ ...empty, ...(r.data || {}) }); setInfo(r.data || {}); } })
      .catch(e => { if (active) setError(e.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  function change(e) { setForm(v => ({ ...v, [e.target.name]: e.target.value })); }

  async function submit(e) {
    e.preventDefault();
    if (!await window.agrileaseDialog.confirm('Save your profile changes?', { title: 'Save profile', confirmText: 'Save' })) return;
    setSaving(true); setError(''); setMessage('');
    try {
      const r = await api('/profile/owner', { method: 'PATCH', body: form });
      setForm({ ...empty, ...(r.data || {}) });
      setInfo(r.data || {});
      const { full_name, email, phone } = r.data || {};
      setUser({ ...(getUser() || {}), full_name, email, phone });
      setMessage(r.message || 'Profile updated.');
    } catch (e) { setError(e.message || 'Unable to update profile.'); }
    finally { setSaving(false); }
  }

  const field = { display: 'grid', gap: 6, color: '#47534a', fontSize: 13 };
  const input = { width: '100%', minHeight: 42, padding: '10px 12px', border: '1px solid #dce3dc', borderRadius: 8, font: 'inherit', color: '#26332a', boxSizing: 'border-box' };
  const verification = info.verification_status || 'pending';

  return <section className="am-page" style={{ maxWidth: 900, margin: '0 auto' }}>
    <div className="admin-page-heading"><div><h1>My Profile</h1><p>Manage your Equipment Owner account information.</p></div></div>

    {!loading && <div className="owner-profile-summary">
      <div><small>Account Role</small><strong>Equipment Owner</strong></div>
      <div><small>Account Status</small><strong className={`owner-profile-badge ${info.status === 'active' ? 'ok' : 'warn'}`}>{info.status ? info.status[0].toUpperCase() + info.status.slice(1) : '—'}</strong></div>
      <div><small>Verification</small><strong className={`owner-profile-badge ${verification === 'verified' ? 'ok' : verification === 'rejected' ? 'bad' : 'warn'}`}>{VERIFICATION[verification] || verification}</strong></div>
      <div><small>Member Since</small><strong>{memberSince(info.created_at)}</strong></div>
    </div>}

    <form className="um-panel" onSubmit={submit} style={{ padding: 22, display: 'grid', gap: 16 }}>
      {loading ? <p>Loading profile...</p> : <>
        {error && <div className="um-message error">{error}</div>}{message && <div className="um-message success">{message}</div>}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(230px,1fr))', gap: 15 }}>
          <label style={field}>Full Name<input style={input} name="full_name" value={form.full_name} onChange={change} required maxLength={120} /></label>
          <label style={field}>Email Address<input style={input} type="email" name="email" value={form.email} onChange={change} required maxLength={190} /></label>
          <label style={field}>Phone Number<input style={input} name="phone" value={form.phone || ''} onChange={change} maxLength={30} /></label>
          <label style={field}>Business Name<input style={input} name="business_name" value={form.business_name || ''} onChange={change} maxLength={150} /></label>
        </div>
        <label style={field}>Business Address<textarea style={{ ...input, minHeight: 90, resize: 'vertical' }} name="address" value={form.address || ''} onChange={change} maxLength={1000} /></label>
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}><button className="um-refresh um-save-button" disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</button></div>
      </>}
    </form>
  </section>;
}
