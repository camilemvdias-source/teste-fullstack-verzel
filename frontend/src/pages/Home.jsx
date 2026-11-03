import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client.js';
import { useAuth } from '../auth/useAuth.js';
import LotCard from '../components/LotCard.jsx';
import ArtImage from '../components/ArtImage.jsx';
import { lotImageUrl } from '../lib/images.js';
import { brl } from '../lib/format.js';
import { useCountdown } from '../hooks/useCountdown.js';
import { CardSkeletons } from '../components/Skeleton.jsx';
import { EmptyState, ErrorState, LotNumber } from '../components/States.jsx';
import { HeartIcon, SearchIcon, GavelIcon, CalendarIcon, FrameIcon, ShieldIcon, UserIcon, SealIcon, WalletIcon, ClockIcon, ScrollIcon } from '../components/Icons.jsx';
import { useFavorites } from '../hooks/useFavorites.js';

const TABS = [
  { key: 'live', label: 'Em leilão', empty: 'Nenhum lote em leilão agora', hint: 'Veja os próximos: eles abrem para lances em breve.' },
  { key: 'scheduled', label: 'Em breve', empty: 'Nenhum lote agendado', hint: 'Novos lotes aparecem aqui assim que um leiloeiro publica.' },
  { key: 'ended', label: 'Encerrados', empty: 'Nenhum leilão encerrado ainda', hint: 'Os resultados aparecem aqui quando um leilão termina.' },
];
const HOUR = 3600 * 1000;

const PILLARS = [
  { icon: SealIcon, title: 'Lances selados', text: 'Cada lance recebe um selo criptográfico ligado ao anterior. Qualquer alteração no histórico aparece na auditoria.' },
  { icon: WalletIcon, title: 'Saldo reservado', text: 'Ao dar um lance, o valor fica reservado. Se alguém cobrir, ele volta na hora para a sua carteira.' },
  { icon: ClockIcon, title: 'Sem lance de última hora', text: 'Um lance nos dois minutos finais prorroga o leilão. Quem está disputando sempre tem tempo de responder.' },
  { icon: ScrollIcon, title: 'Comprovante público', text: 'O arremate gera um comprovante com link próprio, pronto para compartilhar e imprimir.' },
];

export default function Home() {
  const { user } = useAuth();
  const [tab, setTab] = useState('live');
  const [lots, setLots] = useState(null);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [onlyFavs, setOnlyFavs] = useState(false);
  const { ids: favIds } = useFavorites();
  const catalogRef = useRef(null);

  // Uma lista só (até 100 lotes) separada por aba no navegador: as contagens das abas
  // ficam certas e trocar de aba não depende de outra requisição.
  const load = useCallback(async () => {
    try {
      setLots((await api('/lots', { auth: false })).items);
      setError('');
    } catch (err) {
      setError(err.message);
    }
  }, []);

  useEffect(() => {
    const first = setTimeout(load, 0);
    // Atualiza sozinho: o preço e os lotes mudam enquanto a pessoa olha
    const t = setInterval(load, 10000);
    window.addEventListener('api:ready', load);
    return () => { clearTimeout(first); clearInterval(t); window.removeEventListener('api:ready', load); };
  }, [load]);

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
  // Destaque: o lote ao vivo mais disputado; o carrossel mostra os outros, do que fecha primeiro
  const featured = [...live].sort((a, b) => b.bidCount - a.bidCount || (b.currentBid ?? 0) - (a.currentBid ?? 0))[0];
  const onAuction = live.filter((l) => l !== featured).sort((a, b) => Date.parse(a.endsAt) - Date.parse(b.endsAt));

  function openTab(key) {
    setTab(key);
    catalogRef.current?.scrollIntoView({ behavior: 'smooth' });
  }

  return (
    <>
      {lots === null && !error && <div className="skeleton" style={{ height: 'min(78vh, 720px)' }} aria-hidden="true" />}
      {featured ? <Hero lot={featured} /> : lots && (
        <section className="hero-empty">
          <div className="wrap">
            <span className="eyebrow" style={{ color: 'var(--gold-soft)' }}>Aurelia · Casa de leilões de arte</span>
            <h1>Obras-primas em domínio público, a um lance de distância.</h1>
            <p>Nenhum lote está em leilão neste momento. Confira os próximos no catálogo.</p>
          </div>
          <div className="hero-rails" aria-hidden="true"><i /><i /><i /></div>
        </section>
      )}

      <nav className="band" aria-label="Atalhos">
        <div className="wrap band-grid">
          <button type="button" className="band-item" onClick={() => openTab('live')}><GavelIcon width={30} height={30} />Em leilão<small>{lots ? `${counts.live} lotes` : '—'}</small></button>
          <button type="button" className="band-item" onClick={() => openTab('scheduled')}><CalendarIcon width={30} height={30} />Em breve<small>{lots ? `${counts.scheduled} lotes` : '—'}</small></button>
          <button type="button" className="band-item" onClick={() => openTab('ended')}><FrameIcon width={30} height={30} />Encerrados<small>{lots ? `${counts.ended} resultados` : '—'}</small></button>
          <a className="band-item" href="#como-funciona"><ShieldIcon width={30} height={30} />Como funciona<small>Lances auditáveis</small></a>
          {user
            ? <Link className="band-item" to={user.role === 'bidder' ? '/meus-lances' : '/meus-lotes'}><UserIcon width={30} height={30} />Minha conta<small>{user.role === 'bidder' ? 'Meus lances' : 'Meus lotes'}</small></Link>
            : <Link className="band-item" to="/login"><UserIcon width={30} height={30} />Participar<small>Criar conta</small></Link>}
        </div>
      </nav>

      {featured && <Story lot={featured} />}

      {error && !lots && <div className="wrap" style={{ paddingTop: 56 }}><ErrorState message={error} onRetry={load} /></div>}

      {onAuction.length > 0 && <Carousel lots={onAuction} />}

      <section className="pillars" id="como-funciona" aria-labelledby="pillars-title">
        <h2 id="pillars-title" className="visually-hidden">Como funciona</h2>
        <div className="wrap pillars-grid">
          {PILLARS.map(({ icon: Icon, title, text }) => (
            <div key={title} className="pillar">
              <Icon width={34} height={34} />
              <h3>{title}</h3>
              <p>{text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="wrap section" id="catalogo" ref={catalogRef} style={{ paddingTop: 88, scrollMarginTop: 90 }} aria-labelledby="catalog-title">
        <div className="section-head">
          <div>
            <span className="eyebrow">Acervo</span>
            <h2 id="catalog-title">Catálogo{lots && <span className="count">{lots.length} lotes</span>}</h2>
          </div>
        </div>

        <div className="toolbar">
          <div className="segmented tabs-scroll" role="tablist" aria-label="Situação dos leilões">
            {TABS.map((t) => (
              <button key={t.key} type="button" role="tab" aria-selected={tab === t.key} onClick={() => setTab(t.key)}>
                {t.label}{lots && <span className="n">{counts[t.key]}</span>}
              </button>
            ))}
          </div>
          <div className="toolbar-right">
            <label className="search">
              <SearchIcon width={17} height={17} />
              <input type="search" placeholder="Buscar obra ou artista" aria-label="Buscar obra ou artista" value={query} onChange={(e) => setQuery(e.target.value)} />
            </label>
            <button type="button" className="chip" aria-pressed={onlyFavs} onClick={() => setOnlyFavs((v) => !v)}>
              <HeartIcon width={15} height={15} /> Favoritos
            </button>
          </div>
        </div>

        {lots === null && !error && <CardSkeletons />}
        {lots && filtered.length === 0 && (
          query || onlyFavs
            ? <EmptyState title="Nada encontrado" action={<button type="button" className="btn" onClick={() => { setQuery(''); setOnlyFavs(false); }}>Limpar filtros</button>}>
                {onlyFavs ? 'Nenhum favorito nesta aba. Toque no coração de uma obra para salvá-la.' : `Nenhuma obra ou artista corresponde a “${query}”.`}
              </EmptyState>
            : <EmptyState title={current.empty}>{current.hint}</EmptyState>
        )}
        {filtered.length > 0 && <div className="lot-grid">{filtered.map((lot) => <LotCard key={lot.id} lot={lot} />)}</div>}
      </section>

      <section className="quote wrap" aria-label="Citação">
        <blockquote>
          A arte não reproduz o visível; torna visível.
          <cite>Paul Klee</cite>
        </blockquote>
      </section>

      {!user && (
        <section className="cta-band">
          <div className="wrap cta-band-inner">
            <div>
              <h2>Participe dos próximos leilões</h2>
              <p>Crie sua conta de licitante e receba saldo de demonstração para dar lances.</p>
            </div>
            <Link to="/login" className="btn btn-light btn-lg">Criar conta</Link>
          </div>
        </section>
      )}
    </>
  );
}

// Abertura: a obra mais disputada ocupa a tela inteira, com preço e tempo por cima
function Hero({ lot }) {
  const { ms, label } = useCountdown(lot.endsAt);
  const year = lot.date?.split(/[,–-]/)[0]?.trim();
  return (
    <section className="hero" aria-label="Lote em destaque">
      <div className="hero-bg"><img src={lotImageUrl(lot.id)} alt="" /></div>
      <div className="wrap hero-inner">
        <div className="hero-copy">
          <span className="eyebrow"><span className="live-dot" aria-hidden="true" />Em destaque · o lote mais disputado</span>
          <h1>{lot.title}</h1>
          <p className="hero-artist">{[lot.artist, year].filter(Boolean).join(', ')}</p>
          <div className="hero-figs">
            <div>
              <span className="eyebrow">{lot.bidCount > 0 ? `Lance atual · ${lot.bidCount} ${lot.bidCount === 1 ? 'lance' : 'lances'}` : 'Lance inicial'}</span>
              <strong>{brl(lot.currentBid ?? lot.startingBid)}</strong>
            </div>
            <div>
              <span className="eyebrow" style={ms < HOUR ? { color: '#f0a79b' } : undefined}>Encerra em</span>
              <strong>{label}</strong>
            </div>
          </div>
          <div className="hero-actions">
            <Link to={`/lotes/${lot.id}`} className="btn btn-primary btn-lg">Entrar na sala de lances</Link>
            <a href="#catalogo" className="btn btn-light btn-lg">Ver catálogo</a>
          </div>
        </div>
      </div>
      <div className="hero-rails" aria-hidden="true"><i /><i /><i /></div>
    </section>
  );
}

// "Detalhes que contam histórias": recortes ampliados da obra em destaque
function Story({ lot }) {
  const parts = ['Composição', 'Textura', 'Pinceladas'];
  return (
    <section className="wrap story" aria-labelledby="story-title">
      <div>
        <span className="eyebrow">Olhar de perto</span>
        <h2 id="story-title">Detalhes que contam a história</h2>
        <p>
          Cada lote traz detalhes ampliados da obra a partir das imagens em alta resolução do museu.
          É assim que um colecionador examina uma peça antes de dar o lance.
        </p>
        <Link to={`/lotes/${lot.id}`} className="link-arrow">Examinar <span className="serif-it" style={{ textTransform: 'none', letterSpacing: 0, fontSize: '1rem' }}>{lot.title}</span></Link>
      </div>
      <div className="story-images">
        {[1, 2, 3].map((v, i) => (
          <figure key={v}>
            <ArtImage lotId={lot.id} view={v} cover alt={`Detalhe de ${lot.title}`} />
            <figcaption>{parts[i]} · <LotNumber id={lot.id} /></figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}

// Carrossel com setas, como o de exposições dos museus
function Carousel({ lots }) {
  const rail = useRef(null);
  const scroll = (dir) => {
    const el = rail.current;
    if (el) el.scrollBy({ left: dir * el.clientWidth * 0.9, behavior: 'smooth' });
  };
  return (
    <section className="wrap section" aria-labelledby="live-title">
      <div className="section-head">
        <div>
          <span className="eyebrow">Encerram primeiro</span>
          <h2 id="live-title">Em leilão agora</h2>
        </div>
        <div className="rail-nav">
          <button type="button" className="rail-btn" aria-label="Lotes anteriores" onClick={() => scroll(-1)}>←</button>
          <button type="button" className="rail-btn" aria-label="Próximos lotes" onClick={() => scroll(1)}>→</button>
        </div>
      </div>
      <div className="rail" ref={rail}>{lots.map((lot) => <LotCard key={lot.id} lot={lot} />)}</div>
    </section>
  );
}
