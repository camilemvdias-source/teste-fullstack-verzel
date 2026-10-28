import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, ApiError } from '../api/client.js';
import { brl, formatDateTime } from '../lib/format.js';

const short = (h) => (h ? `${h.slice(0, 10)}…${h.slice(-6)}` : '—');

// Página pública: refaz a cadeia de selos e mostra se o histórico está íntegro.
export default function Audit() {
  const { lotId } = useParams();
  const [data, setData] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api(`/audit/${lotId}`, { auth: false })
      .then(setData)
      .catch((err) => {
        if (err instanceof ApiError && err.status === 404) setNotFound(true);
        else setError(err.message);
      });
  }, [lotId]);

  if (notFound) return <p className="center muted">Lote não encontrado. <Link to="/">Voltar à vitrine</Link></p>;
  if (error) return <div className="alert alert-error" role="alert">{error}</div>;
  if (!data) return <p className="center muted">Verificando…</p>;

  const { lot, verification, bids } = data;

  return (
    <>
      <h1>Auditoria · {lot.title}</h1>
      <p><Link to={`/lotes/${lot.id}`}>Ver lote</Link></p>

      {verification.intact ? (
        <div className="alert alert-success" role="status">
          ✔ Histórico íntegro: {verification.checkedBids} {verification.checkedBids === 1 ? 'lance verificado' : 'lances verificados'}, a cadeia de selos confere.
        </div>
      ) : (
        <div className="alert alert-error" role="alert">
          ✘ Adulteração detectada{verification.brokenAt ? ` no lance ${verification.brokenAt}` : ''}.
          {verification.reason ? ` ${verification.reason}` : ''}
        </div>
      )}

      <div className="balance-grid" style={{ marginBottom: 16 }}>
        <div className="card"><span className="muted">Lances</span><strong>{lot.bidCount}</strong></div>
        <div className="card"><span className="muted">Valor final</span><strong>{lot.finalPrice == null ? '—' : brl(lot.finalPrice)}</strong></div>
        <div className="card"><span className="muted">Vencedor</span><strong>{lot.winnerCode ? `#${lot.winnerCode}` : '—'}</strong></div>
      </div>

      <div className="card" style={{ overflowX: 'auto' }}>
        <h3>Histórico de lances</h3>
        {bids.length === 0 && <p className="muted">Este lote não recebeu lances.</p>}
        {bids.length > 0 && (
          <table className="table">
            <thead>
              <tr><th>#</th><th>Licitante</th><th className="num">Valor</th><th>Data</th><th>Selo anterior</th><th>Selo</th></tr>
            </thead>
            <tbody>
              {bids.map((b) => (
                <tr key={b.seq} className={verification.brokenAt === b.seq ? 'row-broken' : ''}>
                  <td>{b.seq}</td>
                  <td>#{b.bidderCode}</td>
                  <td className="num">{brl(b.amount)}</td>
                  <td>{formatDateTime(b.createdAt)}</td>
                  <td className="hash" title={b.prevHash}>{short(b.prevHash)}</td>
                  <td className="hash" title={b.hash}>{short(b.hash)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
