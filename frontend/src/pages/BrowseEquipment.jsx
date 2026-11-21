import { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import EquipmentCard from '../components/EquipmentCard.jsx';
import { assetUrl } from '../api/config';

export default function BrowseEquipment() {
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [result, setResult] = useState({ data: [], totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [siteContent, setSiteContent] = useState({ homepage: [], announcements: [] });

  useEffect(() => {
    api('/content/public').then(setSiteContent).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    setError('');
    // Maliit na delay para hindi tumawag sa backend sa bawat letra.
    const timer = setTimeout(() => {
      api(`/equipment?page=${page}&q=${encodeURIComponent(q)}`)
        .then(setResult)
        .catch((e) => setError(e.message))
        .finally(() => setLoading(false));
    }, 300);
    return () => clearTimeout(timer);
  }, [q, page]);

  return (
    <section>
      {siteContent.homepage?.length > 0 && <div className="site-content-sections">{siteContent.homepage.map(item => <article key={item.id} className="site-content-card">{item.image_path && <img src={item.image_path.startsWith('http') ? item.image_path : assetUrl(item.image_path)} alt=""/>}<div><h2>{item.title}</h2><p>{item.body}</p></div></article>)}</div>}
      {siteContent.announcements?.length > 0 && <div className="site-announcements"><h2>Announcements</h2>{siteContent.announcements.map(item => <article key={item.id}><strong>{item.title}</strong><p>{item.body}</p></article>)}</div>}
      <h1>Browse equipment</h1>

      <input
        className="search"
        type="search"
        placeholder="Search equipment..."
        value={q}
        onChange={(e) => { setQ(e.target.value); setPage(1); }}
      />

      {error && <p className="error">{error}</p>}
      {loading && <p className="muted">Loading...</p>}
      {!loading && !error && result.data.length === 0 && (
        <p className="muted">No equipment found.</p>
      )}

      <div className="grid">
        {result.data.map((item) => <EquipmentCard key={item.id} item={item} />)}
      </div>

      {result.totalPages > 1 && (
        <div className="pager">
          <button disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button>
          <span>Page {page} of {result.totalPages}</span>
          <button disabled={page >= result.totalPages} onClick={() => setPage(page + 1)}>Next</button>
        </div>
      )}
    </section>
  );
}
