import { useEffect, useMemo, useState } from 'react';
import { api } from '../api/client.js';
import { Link } from 'react-router-dom';
import LotCard from '../components/LotCard.jsx';
import ArtImage from '../components/ArtImage.jsx';
import { TimeBar } from '../components/Charts.jsx';
import { brl } from '../lib/format.js';
import { useCountdown } from '../hooks/useCountdown.js';
import { CardSkeletons } from '../components/Skeleton.jsx';
import { HeartIcon, SearchIcon, ClockIcon, PaddleIcon } from '../components/Icons.jsx';
import { useFavorites } from '../hooks/useFavorites.js';

const TABS = [
  { key: 'live', label: 'Ao vivo', empty: 'Nenhum leilão ao vivo agora.' },
  { key: 'scheduled', label: 'Agendados', empty: 'Nenhum leilão agendado.' },
  { key: 'ended', label: 'Encerrados', empty: 'Nenhum leilão encerrado ainda.' },
];

export default function Home() {
  const [tab, setTab] = useState('live');
  const [lots, setLots] = useState(null);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [onlyFavs, setOnlyFavs] = useState(false);
  const { ids: favIds } = useFavorites();

  // Uma lista só (até 100 lotes) separada por aba no navegador: as contagens das abas
  // ficam certas e trocar de aba não depende de outra requisição.
  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const data = await api('/lots', { auth: false });
        if (!active) return;
        setLots(data.items);
        setError('');
      } catch (err) {
        if (active) setError(err.message);
      }
    }
    load();
    // Atualiza sozinho: o preço e os lotes mudam enquanto a pessoa olha
    const t = setInterval(load, 10000);
    window.addEventListener('api:ready', load);
    return () => {
      active = false;
      clearInterval(t);
      window.removeEventListener('api:ready', load);
    };
  }, []);

  const counts = useMemo(() => {
    const c = { live: 0, scheduled: 0, ended: 0 };
    for (const l of lots ?? []) c[l.status] = (c[l.status] ?? 0) + 1;
    return c;
  }, [lots]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (lots ?? []).filter((l) =>
      l.status === tab &&
      (!q || l.title.toLowerCase().includes(q) || (l.artist ?? '').toLowerCase().includes(q)) &&
      (!onlyFavs || favIds.includes(l.id))
    );
  }, [lots, tab, query, onlyFavs, favIds]);

  const current = TABS.find((t) => t.key === tab);
  const live = (lots ?? []).filter((l) => l.status === 'live');
  // Destaque: o lote ao vivo mais disputado; "encerram em breve": os próximos a fechar
  const featured = [...live].sort((a, b) => b.bidCount - a.bidCount || (b.currentBid ?? 0) - (a.currentBid ?? 0))[0];
  const endingSoon = live.filter((l) => l !== featured).slice(0, 4);

  return (
    <>
      {featured && <Featured lot={featured} />}

      {endingSoon.length > 0 && (
        <section className="strip">
          <div className="section-title"><h2>Encerram em breve</h2></div>
          <div className="lot-grid">{endingSoon.map((lot) => <LotCard key={lot.id} lot={lot} />)}</div>
        </section>
      )}

      <div className="section-title"><h2>Catálogo</h2></div>

      <div className="toolbar">
        <div className="tabs" role="tablist">
          {TABS.map((t) => (
            <button key={t.key} type="button" role="tab" aria-selected={tab === t.key} className={`tab ${tab === t.key ? 'active' : ''}`} onClick={() => setTab(t.key)}>
              {t.label}{lots && <span className="count">{counts[t.key]}</span>}
            </button>
          ))}
        </div>
        <div className="section-tools">
          <label className="search">
            <SearchIcon width={18} height={18} />
            <input type="search" placeholder="Buscar obra ou artista" aria-label="Buscar obra ou artista" value={query} onChange={(e) => setQuery(e.target.value)} />
          </label>
          <button type="button" className="chip" aria-pressed={onlyFavs} onClick={() => setOnlyFavs((v) => !v)}>
            <HeartIcon width={16} height={16} /> Favoritos
          </button>
        </div>
      </div>

      {error && <div className="alert alert-error" role="alert">{error}</div>}
      {lots === null && !error && <CardSkeletons />}
      {lots && filtered.length === 0 && (
        <p className="center muted">{onlyFavs ? 'Nenhum favorito nesta aba. Use o coração de uma obra para salvá-la.' : query ? 'Nenhuma obra encontrada para a busca.' : current.empty}</p>
      )}
      {filtered.length > 0 && (
        <div className="lot-grid">
          {filtered.map((lot) => <LotCard key={lot.id} lot={lot} />)}
        </div>
      )}
    </>
  );
}

function Featured({ lot }) {
  const { label } = useCountdown(lot.endsAt);
  return (
    <Link to={`/lotes/${lot.id}`} className="feature">
      <div className="feature-media"><ArtImage lotId={lot.id} alt={lot.title} /></div>
      <div className="feature-body">
        <span className="feature-kicker">Lote {lot.id} · em destaque</span>
        {lot.artist && <span className="feature-artist">{lot.artist}</span>}
        <h1 className="feature-title">{lot.title}</h1>
        {lot.date && <span style={{ color: '#b9ae9f' }}>{lot.date.split(',')[0]}</span>}
        <div className="feature-stats">
          <div><b style={{ fontSize: '1.8rem' }}>{brl(lot.currentBid ?? lot.startingBid)}</b></div>
          <div className="card-stats" style={{ color: '#d8cfc3', fontSize: '1rem' }}>
            <span><PaddleIcon width={17} height={17} /> {lot.bidCount}</span>
            <span><ClockIcon width={17} height={17} /> {label}</span>
          </div>
        </div>
        <TimeBar startsAt={lot.startsAt} endsAt={lot.endsAt} />
        <span className="btn btn-dark btn-lg" style={{ marginTop: 20 }}>Dar lance</span>
      </div>
    </Link>
  );
}
