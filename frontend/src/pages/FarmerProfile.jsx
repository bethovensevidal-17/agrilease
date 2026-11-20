import { useEffect, useState } from 'react';
import { api, getUser, setUser } from '../api/client';

const empty = { full_name: '', email: '', phone: '', address: '', barangay: '' };
export default function FarmerProfile() {
  const [form, setForm] = useState(empty);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  useEffect(() => {
    let active = true;
    api('/profile/farmer').then(r => { if (active) setForm({ ...empty, ...(r.data || {}) }); })
      .catch(e => { if (active) setError(e.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);
  function change(e) { setForm(v => ({ ...v, [e.target.name]: e.target.value })); }
  async function submit(e) {
<<<<<<< HEAD
    e.preventDefault(); setSaving(true); setError(''); setMessage('');
=======
    e.preventDefault();
    if (!await window.agrileaseDialog.confirm('Save your profile changes?', { title: 'Save profile', confirmText: 'Save' })) return;
    setSaving(true); setError(''); setMessage('');
>>>>>>> master
    try {
      const r = await api('/profile/farmer', { method: 'PATCH', body: form });
      setForm({ ...empty, ...(r.data || {}) });
      setUser({ ...(getUser() || {}), ...(r.data || {}) });
      setMessage(r.message || 'Profile updated.');
    } catch (e) { setError(e.message || 'Unable to update profile.'); }
    finally { setSaving(false); }
  }
  const field = { display: 'grid', gap: 6, color: '#47534a', fontSize: 13 };
  const input = { width: '100%', minHeight: 42, padding: '10px 12px', border: '1px solid #dce3dc', borderRadius: 8, font: 'inherit', color: '#26332a' };
  return <section className="am-page" style={{ maxWidth: 900, margin: '0 auto' }}>
    <div className="admin-page-heading"><div><h1>My Profile</h1><p>Manage your Farmer account information.</p></div></div>
    <form className="um-panel" onSubmit={submit} style={{ padding: 22, display: 'grid', gap: 16 }}>
      {loading ? <p>Loading profile...</p> : <>
        {error && <div className="um-message error">{error}</div>}{message && <div className="um-message success">{message}</div>}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(230px,1fr))', gap: 15 }}>
          <label style={field}>Full Name<input style={input} name="full_name" value={form.full_name} onChange={change} required maxLength={120}/></label>
          <label style={field}>Email Address<input style={input} type="email" name="email" value={form.email} onChange={change} required maxLength={190}/></label>
          <label style={field}>Phone Number<input style={input} name="phone" value={form.phone || ''} onChange={change} maxLength={30}/></label>
          <label style={field}>Barangay<input style={input} name="barangay" value={form.barangay || ''} onChange={change} maxLength={100}/></label>
        </div>
        <label style={field}>Complete Address<textarea style={{ ...input, minHeight: 90, resize: 'vertical' }} name="address" value={form.address || ''} onChange={change} maxLength={1000}/></label>
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}><button className="um-refresh" disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</button></div>
      </>}
    </form>
  </section>;
}
