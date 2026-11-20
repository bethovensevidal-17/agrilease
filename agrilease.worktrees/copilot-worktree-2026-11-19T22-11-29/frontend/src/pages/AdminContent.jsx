import { useEffect, useState } from 'react';
import { api } from '../api/client';

const emptyHome = { section_key: '', title: '', body: '', image_path: '', is_published: true, sort_order: 0 };
const emptyAnnouncement = { title: '', body: '', image_path: '', is_published: true, published_at: '' };
export default function AdminContent() {
  const [data, setData] = useState({ homepage: [], announcements: [] });
  const [home, setHome] = useState(emptyHome);
  const [announcement, setAnnouncement] = useState(emptyAnnouncement);
  const [homeId, setHomeId] = useState(null);
  const [announcementId, setAnnouncementId] = useState(null);
  const [tab, setTab] = useState('homepage');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  async function load() { setLoading(true); setError(''); try { const r = await api('/content/admin'); setData({ homepage: r.homepage || [], announcements: r.announcements || [] }); } catch(e) { setError(e.message); } finally { setLoading(false); } }
  useEffect(() => { load(); }, []);
  function editHome(row) { setHomeId(row.id); setHome({ section_key: row.section_key || '', title: row.title || '', body: row.body || '', image_path: row.image_path || '', is_published: Boolean(row.is_published), sort_order: row.sort_order || 0 }); window.scrollTo({ top: 0, behavior: 'smooth' }); }
  function editAnnouncement(row) { setAnnouncementId(row.id); setAnnouncement({ title: row.title || '', body: row.body || '', image_path: row.image_path || '', is_published: Boolean(row.is_published), published_at: row.published_at ? String(row.published_at).slice(0,16).replace(' ', 'T') : '' }); window.scrollTo({ top: 0, behavior: 'smooth' }); }
  async function saveHome(e) { e.preventDefault(); setBusy(true); setError(''); setMessage(''); try { await api(homeId ? `/content/homepage/${homeId}` : '/content/homepage', { method: homeId ? 'PUT' : 'POST', body: home }); setHome(emptyHome); setHomeId(null); setMessage('Homepage content saved.'); await load(); } catch(e) { setError(e.message); } finally { setBusy(false); } }
  async function saveAnnouncement(e) { e.preventDefault(); setBusy(true); setError(''); setMessage(''); try { await api(announcementId ? `/content/announcements/${announcementId}` : '/content/announcements', { method: announcementId ? 'PUT' : 'POST', body: announcement }); setAnnouncement(emptyAnnouncement); setAnnouncementId(null); setMessage('Announcement saved.'); await load(); } catch(e) { setError(e.message); } finally { setBusy(false); } }
  async function remove(path) { if (!window.confirm('Delete this content permanently?')) return; try { await api(path, { method: 'DELETE' }); setMessage('Content deleted.'); await load(); } catch(e) { setError(e.message); } }
  const field = { display: 'grid', gap: 6, fontSize: 13, color: '#47534a' };
  const input = { width: '100%', padding: '10px 12px', border: '1px solid #dce3dc', borderRadius: 8, font: 'inherit' };
  const button = { border: '1px solid #d7e1d7', borderRadius: 7, padding: '8px 12px', background: '#fff', cursor: 'pointer', color: '#285b37' };
  return <section className="am-page" style={{ maxWidth: 1100, margin: '0 auto' }}>
    <div className="admin-page-heading"><div><h1>CMS / Website Content</h1><p>Manage homepage sections and public announcements using the AgriLease Node.js and MySQL system.</p></div><button className="um-refresh" onClick={load}>Refresh</button></div>
    <div className="am-warning">Content marked as Published is available through the public website content API. Image paths must point to an image already uploaded to the application.</div>
    {error && <div className="um-message error">{error}</div>}{message && <div className="um-message success">{message}</div>}
    <div style={{ display: 'flex', gap: 8, margin: '15px 0' }}><button style={{ ...button, background: tab === 'homepage' ? '#eaf4eb' : '#fff' }} onClick={() => setTab('homepage')}>Homepage Content</button><button style={{ ...button, background: tab === 'announcements' ? '#eaf4eb' : '#fff' }} onClick={() => setTab('announcements')}>Announcements</button></div>
    {tab === 'homepage' ? <>
      <form className="um-panel" onSubmit={saveHome} style={{ padding: 18, display: 'grid', gap: 12 }}><h2 style={{ margin: 0 }}>{homeId ? 'Edit Homepage Section' : 'Add Homepage Section'}</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 12 }}>
          <label style={field}>Section Key<input style={input} value={home.section_key} onChange={e => setHome(v => ({ ...v, section_key: e.target.value }))} placeholder="hero, about, how-it-works" required maxLength={60}/></label>
          <label style={field}>Title<input style={input} value={home.title} onChange={e => setHome(v => ({ ...v, title: e.target.value }))} required maxLength={180}/></label>
          <label style={field}>Image Path (optional)<input style={input} value={home.image_path} onChange={e => setHome(v => ({ ...v, image_path: e.target.value }))} placeholder="/uploads/content/hero.jpg"/></label>
          <label style={field}>Display Order<input style={input} type="number" value={home.sort_order} onChange={e => setHome(v => ({ ...v, sort_order: e.target.value }))}/></label>
        </div>
        <label style={field}>Content<textarea style={{ ...input, minHeight: 90 }} value={home.body} onChange={e => setHome(v => ({ ...v, body: e.target.value }))}/></label>
        <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}><input type="checkbox" checked={home.is_published} onChange={e => setHome(v => ({ ...v, is_published: e.target.checked }))}/> Published</label>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>{homeId && <button type="button" style={button} onClick={() => { setHome(emptyHome); setHomeId(null); }}>Cancel Edit</button>}<button className="um-refresh" disabled={busy}>{busy ? 'Saving...' : 'Save Section'}</button></div>
      </form>
      <div className="um-panel" style={{ marginTop: 16, padding: 18 }}><h2>Homepage Sections</h2>{loading ? 'Loading...' : data.homepage.length ? data.homepage.map(row => <div key={row.id} style={{ borderTop: '1px solid #edf0ed', padding: '13px 0', display: 'flex', gap: 12, justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}><div><strong>{row.title}</strong><div className="am-note">{row.section_key} · {row.is_published ? 'Published' : 'Draft'}</div></div><div style={{ display: 'flex', gap: 7 }}><button style={button} onClick={() => editHome(row)}>Edit</button><button style={button} onClick={() => remove(`/content/homepage/${row.id}`)}>Delete</button></div></div>) : <p>No homepage sections yet.</p>}</div>
    </> : <>
      <form className="um-panel" onSubmit={saveAnnouncement} style={{ padding: 18, display: 'grid', gap: 12 }}><h2 style={{ margin: 0 }}>{announcementId ? 'Edit Announcement' : 'Create Announcement'}</h2>
        <label style={field}>Title<input style={input} value={announcement.title} onChange={e => setAnnouncement(v => ({ ...v, title: e.target.value }))} required maxLength={180}/></label>
        <label style={field}>Announcement<textarea style={{ ...input, minHeight: 100 }} value={announcement.body} onChange={e => setAnnouncement(v => ({ ...v, body: e.target.value }))} required/></label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 12 }}><label style={field}>Image Path (optional)<input style={input} value={announcement.image_path} onChange={e => setAnnouncement(v => ({ ...v, image_path: e.target.value }))}/></label><label style={field}>Publish Date (optional)<input style={input} type="datetime-local" value={announcement.published_at} onChange={e => setAnnouncement(v => ({ ...v, published_at: e.target.value }))}/></label></div>
        <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}><input type="checkbox" checked={announcement.is_published} onChange={e => setAnnouncement(v => ({ ...v, is_published: e.target.checked }))}/> Published</label>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>{announcementId && <button type="button" style={button} onClick={() => { setAnnouncement(emptyAnnouncement); setAnnouncementId(null); }}>Cancel Edit</button>}<button className="um-refresh" disabled={busy}>{busy ? 'Saving...' : 'Save Announcement'}</button></div>
      </form>
      <div className="um-panel" style={{ marginTop: 16, padding: 18 }}><h2>Announcements</h2>{loading ? 'Loading...' : data.announcements.length ? data.announcements.map(row => <div key={row.id} style={{ borderTop: '1px solid #edf0ed', padding: '13px 0', display: 'flex', gap: 12, justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}><div><strong>{row.title}</strong><div className="am-note">{row.is_published ? 'Published' : 'Draft'} · {row.published_at || 'No scheduled date'}</div><p style={{ margin: '5px 0' }}>{row.body}</p></div><div style={{ display: 'flex', gap: 7 }}><button style={button} onClick={() => editAnnouncement(row)}>Edit</button><button style={button} onClick={() => remove(`/content/announcements/${row.id}`)}>Delete</button></div></div>) : <p>No announcements yet.</p>}</div>
    </>}
  </section>;
}
