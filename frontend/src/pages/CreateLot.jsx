import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, ApiError, API_URL } from '../api/client.js';
import ArtImage from '../components/ArtImage.jsx';
import { EmptyState, Notice, PageHeader } from '../components/States.jsx';
import { brl, formatDateTime, parseBrlToCents } from '../lib/format.js';

function firstMessage(err) {
  if (err instanceof ApiError && err.details) {
    const first = Object.values(err.details).flat()[0];
    if (first) return first;
  }
  return err.message;
}

// Valor para <input type="datetime-local"> (hora local, sem fuso)
function toLocalInput(date) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

const SUGGESTIONS = ['monet', 'van gogh', 'landscape', 'portrait', 'still life'];

export default function CreateLot() {
  const navigate = useNavigate();

  const [q, setQ] = useState('');
  const [results, setResults] = useState(null);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [artwork, setArtwork] = useState(null);

  const [startingBid, setStartingBid] = useState('');
  const [minIncrement, setMinIncrement] = useState('');
  const [startsAt, setStartsAt] = useState(() => toLocalInput(new Date(Date.now() + 60 * 1000)));
  const [endsAt, setEndsAt] = useState(() => toLocalInput(new Date(Date.now() + 60 * 60 * 1000)));
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function search(term) {
    setSearchError('');
    setSearching(true);
    try {
      const data = await api(`/external/search?q=${encodeURIComponent(term.trim())}`);
      setResults(data.items);
    } catch (err) {
      setResults(null);
      setSearchError(firstMessage(err));
    } finally {
      setSearching(false);
    }
  }

  function handleSearch(e) {
    e.preventDefault();
    search(q);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    const starting = parseBrlToCents(startingBid);
    const increment = parseBrlToCents(minIncrement);
    if (!artwork) return setError('Escolha uma obra no passo 1.');
    if (starting == null) return setError('Informe um lance inicial válido, por exemplo 1.000,00.');
    if (increment == null) return setError('Informe um incremento mínimo válido, por exemplo 50,00.');

    setSubmitting(true);
    try {
      const lot = await api('/lots', {
        method: 'POST',
        body: {
          externalId: artwork.id,
          startingBid: starting,
          minIncrement: increment,
          startsAt: new Date(startsAt).toISOString(),
          endsAt: new Date(endsAt).toISOString(),
        },
      });
      navigate(`/lotes/${lot.id}`);
    } catch (err) {
      setError(firstMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  const starting = parseBrlToCents(startingBid);
  const increment = parseBrlToCents(minIncrement);

  return (
    <div className="page">
      <PageHeader eyebrow="Leiloeiro" title="Novo lote" actions={<Link to="/meus-lotes" className="btn btn-ghost btn-sm">Voltar</Link>}>
        Pinturas em domínio público do Art Institute of Chicago. Os dados e a imagem são copiados para a casa ao publicar.
      </PageHeader>

      <div className="create">
        <div>
          <section className="step" aria-labelledby="step1">
            <div className="step-head"><span className="step-no">01</span><h2 id="step1">Escolha a obra</h2></div>
            <form onSubmit={handleSearch} className="search-row">
              <input
                className="input" value={q} onChange={(e) => setQ(e.target.value)} minLength={2} required
                placeholder="Artista ou título" aria-label="Buscar pintura no acervo do museu"
              />
              <button className="btn btn-primary" type="submit" disabled={searching}>{searching ? 'Buscando…' : 'Buscar'}</button>
            </form>
            <div className="chips" style={{ marginTop: 12 }}>
              {SUGGESTIONS.map((s) => <button key={s} type="button" className="chip" onClick={() => { setQ(s); search(s); }}>{s}</button>)}
            </div>

            {searchError && <div style={{ marginTop: 16 }}><Notice kind="error">{searchError}</Notice></div>}
            {searching && (
              <ul className="pick-grid" aria-busy="true">{Array.from({ length: 6 }, (_, i) => <li key={i}><div className="skeleton" style={{ aspectRatio: '1' }} /></li>)}</ul>
            )}
            {!searching && results?.length === 0 && (
              <div style={{ marginTop: 20 }}><EmptyState title="Nenhuma pintura encontrada">Tente o nome de um artista (ex.: monet) ou um tema em inglês (ex.: landscape).</EmptyState></div>
            )}
            {!searching && results?.length > 0 && (
              <ul className="pick-grid">
                {results.map((a) => (
                  <li key={a.id}>
                    <button type="button" className={`pick ${artwork?.id === a.id ? 'selected' : ''}`} aria-pressed={artwork?.id === a.id} onClick={() => setArtwork(a)}>
                      <ArtImage src={`${API_URL}/external/images/${a.imageId}`} alt="" />
                      <small>{a.artist}</small>
                      <strong>{a.title}</strong>
                      <small>{a.date}</small>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <form className="step" onSubmit={handleSubmit} aria-labelledby="step2" noValidate>
            <div className="step-head"><span className="step-no">02</span><h2 id="step2">Defina o leilão</h2></div>
            {error && <Notice kind="error">{error}</Notice>}
            <div className="form-grid">
              <div className="field">
                <label htmlFor="starting">Lance inicial (R$)</label>
                <input id="starting" inputMode="decimal" placeholder="1.000,00" value={startingBid} onChange={(e) => setStartingBid(e.target.value)} required />
              </div>
              <div className="field">
                <label htmlFor="increment">Incremento mínimo (R$)</label>
                <input id="increment" inputMode="decimal" placeholder="50,00" value={minIncrement} onChange={(e) => setMinIncrement(e.target.value)} required />
                <span className="hint">Quanto cada lance precisa superar o anterior.</span>
              </div>
              <div className="field">
                <label htmlFor="starts">Início</label>
                <input id="starts" type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} required />
              </div>
              <div className="field">
                <label htmlFor="ends">Fim</label>
                <input id="ends" type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} required />
              </div>
            </div>
            <button className="btn btn-primary btn-lg" type="submit" disabled={submitting || !artwork}>
              {submitting ? 'Publicando…' : 'Publicar lote'}
            </button>
            {!artwork && <p className="fine">Escolha uma obra para habilitar a publicação.</p>}
          </form>
        </div>

        <aside className="preview" aria-label="Prévia do lote">
          <span className="eyebrow">Prévia no catálogo</span>
          {artwork ? (
            <div className="lot-card">
              <ArtImage src={`${API_URL}/external/images/${artwork.imageId}`} alt={artwork.title} />
              <div className="lot-card-head"><span className="lot-no">Nº —</span><span className="status status-scheduled">Agendado</span></div>
              <div className="lot-card-body">
                <span className="lot-artist">{artwork.artist}</span>
                <h3 className="lot-title">{artwork.title}</h3>
                <div className="lot-card-foot">
                  <div className="lot-card-figs">
                    <span className="lot-price"><small>Lance inicial</small>{starting ? brl(starting) : '—'}</span>
                    <span className="lot-clock"><small>Abre em</small>{startsAt ? formatDateTime(startsAt) : '—'}</span>
                  </div>
                  {increment && <span className="fine" style={{ margin: 0 }}>Incremento <span className="mono">{brl(increment)}</span></span>}
                </div>
              </div>
            </div>
          ) : (
            <EmptyState title="Nenhuma obra escolhida">A prévia aparece aqui assim que você escolher uma pintura.</EmptyState>
          )}
        </aside>
      </div>
    </div>
  );
}
