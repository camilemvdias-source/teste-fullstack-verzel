import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client.js';
import ArtImage from '../components/ArtImage.jsx';
import { brl, formatDateTime } from '../lib/format.js';

const POSITION = {
  winning: { label: 'Liderando', cls: 'badge-live' },
  outbid: { label: 'Superado', cls: 'badge-scheduled' },
  won: { label: 'Arrematado', cls: 'badge-live' },
  lost: { label: 'Perdeu', cls: 'badge-ended' },
  settling: { label: 'Encerrando…', cls: 'badge-ended' },
};

export default function MyBids() {
  const [tab, setTab] = useState('bids');
  const [bids, setBids] = useState(null);
  const [wins, setWins] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const [b, w] = await Promise.all([api('/me/bids'), api('/me/wins')]);
      setBids(b.items);
      setWins(w.items);
      setError('');
    } catch (err) {
      setError(err.message);
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, [load]);

  const loading = bids === null && !error;

  return (
    <>
      <h1>Meus lances</h1>
      <div className="tabs" role="tablist">
        <button type="button" className={`tab ${tab === 'bids' ? 'active' : ''}`} onClick={() => setTab('bids')}>
          Lances{bids ? ` (${bids.length})` : ''}
        </button>
        <button type="button" className={`tab ${tab === 'wins' ? 'active' : ''}`} onClick={() => setTab('wins')}>
          Arremates{wins ? ` (${wins.length})` : ''}
        </button>
      </div>

      {error && <div className="alert alert-error" role="alert">{error}</div>}
      {loading && <p className="center muted">Carregando…</p>}

      {tab === 'bids' && bids?.length === 0 && <p className="center muted">Você ainda não deu nenhum lance.</p>}
      {tab === 'bids' && bids?.length > 0 && (
        <div className="stack">
          {bids.map((b) => {
            const pos = POSITION[b.position];
            return (
              <div key={b.lotId} className="card row-lot">
                <ArtImage className="row-thumb" lotId={b.lotId} alt={b.title} />
                <div className="row-lot-info">
                  <span className={`badge ${pos.cls}`}>{pos.label}</span>
                  <h3>{b.title}</h3>
                  <small className="muted">
                    Seu melhor lance {brl(b.myBestBid)} · lance atual {b.currentBid == null ? '—' : brl(b.currentBid)} ·{' '}
                    {b.status === 'live' ? `termina ${formatDateTime(b.endsAt)}` : `encerrou ${formatDateTime(b.endsAt)}`}
                  </small>
                </div>
                <div className="row-lot-actions">
                  <Link to={`/lotes/${b.lotId}`}>{b.position === 'outbid' ? 'Cobrir lance' : 'Ver lote'}</Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {tab === 'wins' && wins?.length === 0 && <p className="center muted">Você ainda não arrematou nenhum lote.</p>}
      {tab === 'wins' && wins?.length > 0 && (
        <div className="stack">
          {wins.map((w) => (
            <div key={w.receiptToken} className="card row-lot">
              <ArtImage className="row-thumb" lotId={w.lotId} alt={w.title} />
              <div className="row-lot-info">
                <h3>{w.title}</h3>
                <strong>{brl(w.amount)}</strong>
                <small className="muted">Arrematado em {formatDateTime(w.wonAt)}</small>
              </div>
              <div className="row-lot-actions">
                <Link to={`/comprovante/${w.receiptToken}`}>Ver comprovante</Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
