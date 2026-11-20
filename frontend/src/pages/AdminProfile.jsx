import { useEffect, useState } from 'react';
import { api, getUser, setUser } from '../api/client';

export default function AdminProfile() {
  const [form, setForm] = useState({ full_name: '', email: '', phone: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    let active = true;
    api('/admin/profile')
      .then(result => {
        if (!active) return;
        const user = result.data || getUser() || {};
        setForm({ full_name: user.full_name || '', email: user.email || '', phone: user.phone || '' });
      })
      .catch(err => { if (active) setError(err.message || 'Unable to load profile.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  function change(e) { setForm(prev => ({ ...prev, [e.target.name]: e.target.value })); }

  async function submit(e) {
    e.preventDefault();
    if (!await window.agrileaseDialog.confirm('Save your profile changes?', { title: 'Save profile', confirmText: 'Save' })) return;
    try {
      setSaving(true); setError(''); setMessage('');
      const result = await api('/admin/profile', { method: 'PATCH', body: form });
      const current = getUser() || {};
      setUser({ ...current, ...result.data });
      setMessage('Profile updated successfully.');
    } catch (err) { setError(err.message || 'Unable to update profile.'); }
    finally { setSaving(false); }
  }

  return (
    <div className="am-page">
      <div className="admin-page-heading"><div><h1>Admin Profile</h1><p>View and update your administrator account details.</p></div></div>
      <section className="um-panel am-form-panel">
        <div className="um-panel-heading"><div><h2>Personal Information</h2><p>Your admin account information.</p></div></div>
        {loading ? <div className="am-empty">Loading profile...</div> : <form className="am-form" onSubmit={submit}>
          {message && <div className="um-message success">{message}</div>}
          {error && <div className="um-message error">{error}</div>}
          <label>Full Name<input name="full_name" value={form.full_name} onChange={change} required maxLength="120" /></label>
          <label>Email Address<input type="email" name="email" value={form.email} onChange={change} required maxLength="190" /></label>
          <label>Phone Number<input name="phone" value={form.phone} onChange={change} maxLength="20" /></label>
          <label>Role<input value="Administrator" disabled /></label>
          <div className="am-form-actions"><button className="am-button approve" type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</button></div>
        </form>}
      </section>
    </div>
  );
}
