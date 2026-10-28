import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, ApiError } from '../api/client.js';
import { parseBrlToCents } from '../lib/format.js';

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

  async function handleSearch(e) {
    e.preventDefault();
    setSearchError('');
    setSearching(true);
    try {
      const data = await api(`/external/search?q=${encodeURIComponent(q.trim())}`);
      setResults(data.items);
    } catch (err) {
      setResults(null);
      setSearchError(firstMessage(err));
    } finally {
      setSearching(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    const starting = parseBrlToCents(startingBid);
    const increment = parseBrlToCents(minIncrement);
    if (!artwork) return setError('Escolha uma obra primeiro.');
    if (starting == null) return setError('Informe um lance inicial válido.');
    if (increment == null) return setError('Informe um incremento mínimo válido.');

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

  return (
    <>
      <div className="page-head">
        <h1>Novo lote</h1>
        <Link to="/meus-lotes">Voltar</Link>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <h3>1. Escolha a obra</h3>
        <form onSubmit={handleSearch} className="search-row">
          <input
            value={q} onChange={(e) => setQ(e.target.value)} minLength={2} required
            placeholder="Ex.: monet, water lilies, van gogh" aria-label="Buscar obra no museu"
          />
          <button className="btn btn-primary" type="submit" disabled={searching}>
            {searching ? 'Buscando…' : 'Buscar'}
          </button>
        </form>
        {searchError && <div className="alert alert-error" role="alert" style={{ marginTop: 12 }}>{searchError}</div>}
        {results?.length === 0 && <p className="muted">Nenhuma obra com imagem encontrada.</p>}
        {results?.length > 0 && (
          <ul className="pick-list">
            {results.map((a) => (
              <li key={a.id}>
                <button
                  type="button" className={`pick ${artwork?.id === a.id ? 'selected' : ''}`}
                  onClick={() => setArtwork(a)}
                >
                  <strong>{a.title}</strong>
                  <small className="muted">{[a.artist, a.date].filter(Boolean).join(' · ')}</small>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <form className="card" onSubmit={handleSubmit}>
        <h3>2. Defina o leilão</h3>
        {artwork && <p>Obra escolhida: <strong>{artwork.title}</strong></p>}
        {error && <div className="alert alert-error" role="alert">{error}</div>}

        <div className="form-grid">
          <div className="field">
            <label htmlFor="starting">Lance inicial (R$)</label>
            <input id="starting" inputMode="decimal" placeholder="1.000,00" value={startingBid} onChange={(e) => setStartingBid(e.target.value)} required />
          </div>
          <div className="field">
            <label htmlFor="increment">Incremento mínimo (R$)</label>
            <input id="increment" inputMode="decimal" placeholder="50,00" value={minIncrement} onChange={(e) => setMinIncrement(e.target.value)} required />
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

        <button className="btn btn-primary" type="submit" disabled={submitting || !artwork}>
          {submitting ? 'Criando…' : 'Criar lote'}
        </button>
      </form>
    </>
  );
}
