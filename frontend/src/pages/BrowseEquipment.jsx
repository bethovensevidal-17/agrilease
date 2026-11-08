import { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import EquipmentCard from '../components/EquipmentCard.jsx';

export default function BrowseEquipment() {
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [result, setResult] = useState({ data: [], totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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
      <h1>Browse equipment</h1>

      <input
        className="search"
        type="search"
        placeholder="Hanapin ang equipment..."
        value={q}
        onChange={(e) => { setQ(e.target.value); setPage(1); }}
      />

      {error && <p className="error">{error}</p>}
      {loading && <p className="muted">Naglo-load...</p>}
      {!loading && !error && result.data.length === 0 && (
        <p className="muted">Walang nahanap na equipment.</p>
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
