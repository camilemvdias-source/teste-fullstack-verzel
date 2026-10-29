import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client.js';
import LotCard from '../components/LotCard.jsx';
import ArtImage from '../components/ArtImage.jsx';
import { ArrowIcon, HeartIcon, SearchIcon } from '../components/Icons.jsx';
import { useFavorites } from '../hooks/useFavorites.js';

const TABS = [
  { key: 'live', label: 'Em leilão', empty: 'Nenhum leilão ao vivo agora.' },
  { key: 'scheduled', label: 'Agendados', empty: 'Nenhum leilão agendado.' },
  { key: 'ended', label: 'Encerrados', empty: 'Nenhum leilão encerrado ainda.' },
];

export default function Home() {
  const [tab, setTab] = useState('live');
  const [items, setItems] = useState(null);
  const [featured, setFeatured] = useState([]);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [onlyFavs, setOnlyFavs] = useState(false);
  const { ids: favIds } = useFavorites();

  const load = useCallback(async () => {
    try {
      const data = await api(`/lots?status=${tab}`, { auth: false });
      setItems(data.items);
      if (tab === 'live') setFeatured(data.items);
      setError('');
    } catch (err) {
      setError(err.message);
    }
  }, [tab]);

  useEffect(() => {
    setItems(null);
    load();
    // Atualiza sozinho: o preço e os lotes mudam enquanto a pessoa olha
    const t = setInterval(load, 10000);
    return () => clearInterval(t);
  }, [load]);

  // O destaque precisa dos lotes ao vivo mesmo quando a aba é outra
  useEffect(() => {
    if (tab !== 'live') api('/lots?status=live', { auth: false }).then((d) => setFeatured(d.items)).catch(() => {});
  }, [tab]);

  const current = TABS.find((t) => t.key === tab);
  const hero = featured[0];
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = items;
    if (q) list = list?.filter((l) => l.title.toLowerCase().includes(q));
    if (onlyFavs) list = list?.filter((l) => favIds.includes(l.id));
    return list;
  }, [items, query, onlyFavs, favIds]);

  return (
    <>
      <section className="hero">
        <div className="hero-text">
          <h1>Grandes mestres.<br />Obras atemporais.</h1>
          <p>Leilões exclusivos de arte, com lances em tempo real e histórico auditável de cada lote.</p>
          <a href="#obras" className="btn btn-dark btn-lg">Explorar leilões <ArrowIcon width={18} height={18} /></a>
        </div>
        <div className="hero-art">
          {hero
            ? <Link to={`/lotes/${hero.id}`} aria-label={`Ver ${hero.title}`}><ArtImage lotId={hero.id} alt={hero.title} /></Link>
            : <div className="hero-placeholder" aria-hidden="true" />}
        </div>
      </section>

      {featured.length > 0 && (
        <section className="section">
          <div className="section-head">
            <h2>Leilões em destaque</h2>
            <a href="#obras" className="link-arrow">Ver todos <ArrowIcon width={16} height={16} /></a>
          </div>
          <div className="lot-grid">
            {featured.slice(0, 4).map((lot) => <LotCard key={lot.id} lot={lot} />)}
          </div>
        </section>
      )}

      <section className="section" id="obras">
        <div className="section-head">
          <div>
            <h2>Todas as obras</h2>
            {filtered && <small className="muted">{filtered.length} {filtered.length === 1 ? 'resultado' : 'resultados'}</small>}
          </div>
          <div className="section-tools">
            <button type="button" className="chip" aria-pressed={onlyFavs} onClick={() => setOnlyFavs((v) => !v)}>
              <HeartIcon width={16} height={16} /> Favoritos
            </button>
            <label className="search">
              <SearchIcon width={18} height={18} />
              <input type="search" placeholder="Buscar obra pelo título" value={query} onChange={(e) => setQuery(e.target.value)} />
            </label>
          </div>
        </div>

        <div className="tabs" role="tablist">
          {TABS.map((t) => (
            <button key={t.key} type="button" role="tab" aria-selected={tab === t.key} className={`tab ${tab === t.key ? 'active' : ''}`} onClick={() => setTab(t.key)}>
              {t.label}
            </button>
          ))}
        </div>

        {error && <div className="alert alert-error" role="alert">{error}</div>}
        {items === null && !error && <p className="center muted">Carregando…</p>}
        {filtered?.length === 0 && <p className="center muted">{onlyFavs ? 'Você ainda não favoritou obras nesta aba. Toque no coração de uma obra para salvá-la.' : query ? 'Nenhuma obra encontrada para a busca.' : current.empty}</p>}
        {filtered?.length > 0 && (
          <div className="lot-grid">
            {filtered.map((lot) => <LotCard key={lot.id} lot={lot} />)}
          </div>
        )}
      </section>
    </>
  );
}
