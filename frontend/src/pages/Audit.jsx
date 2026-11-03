import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, ApiError } from '../api/client.js';
import { brl, formatDateTime } from '../lib/format.js';
import { ShieldIcon } from '../components/Icons.jsx';
import { RowSkeletons } from '../components/Skeleton.jsx';
import { EmptyState, ErrorState, LotNumber } from '../components/States.jsx';

const short = (h) => (h ? `${h.slice(0, 10)}…${h.slice(-6)}` : '—');

// Página pública: refaz a cadeia de selos e mostra se o histórico está íntegro.
// A cadeia é desenhada como uma corrente: cada lance aponta para o selo do anterior.
export default function Audit() {
  const { lotId } = useParams();
  const [data, setData] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    setError('');
    api(`/audit/${lotId}`, { auth: false })
      .then(setData)
      .catch((err) => {
        if (err instanceof ApiError && err.status === 404) setNotFound(true);
        else setError(err.message);
      });
  }, [lotId]);

  useEffect(() => {
    const first = setTimeout(load, 0);
    return () => clearTimeout(first);
  }, [load]);

  if (notFound) {
    return <div className="page"><EmptyState title="Lote não encontrado" action={<Link to="/" className="btn">Voltar ao catálogo</Link>} /></div>;
  }
  if (error) return <div className="page"><ErrorState message={error} onRetry={load} /></div>;
  if (!data) return <div className="page"><p className="eyebrow">Conferindo a cadeia de selos…</p><RowSkeletons /></div>;

  const { lot, verification, bids } = data;

  return (
    <div className="page">
      <nav className="crumbs" aria-label="Você está em"><Link to="/">Catálogo</Link><span>/</span><Link to={`/lotes/${lot.id}`}>Lote {lot.id}</Link><span>/</span><span>Auditoria</span></nav>
      <header className="page-head">
        <div>
          <span className="eyebrow">Auditoria pública · <LotNumber id={lot.id} /></span>
          <h1 className="serif-it">{lot.title}</h1>
        </div>
      </header>

      {verification.intact ? (
        <div className="verdict ok" role="status">
          <span className="verdict-seal" aria-hidden="true"><ShieldIcon width={30} height={30} /></span>
          <div>
            <h2>Histórico íntegro</h2>
            <p>{verification.checkedBids} {verification.checkedBids === 1 ? 'lance conferido' : 'lances conferidos'}: todos os selos batem com os dados gravados.</p>
          </div>
        </div>
      ) : (
        <div className="verdict bad" role="alert">
          <span className="verdict-seal" aria-hidden="true" style={{ fontSize: 28, fontWeight: 600 }}>!</span>
          <div>
            <h2>Adulteração detectada{verification.brokenAt ? ` no lance ${verification.brokenAt}` : ''}</h2>
            <p>{verification.reason}</p>
          </div>
        </div>
      )}

      <div className="stats">
        <div className="stat"><span className="eyebrow">Lances</span><strong>{lot.bidCount}</strong></div>
        <div className="stat"><span className="eyebrow">Valor final</span><strong>{lot.finalPrice == null ? '—' : brl(lot.finalPrice)}</strong></div>
        <div className="stat"><span className="eyebrow">Vencedor</span><strong>{lot.winnerCode ? `#${lot.winnerCode}` : '—'}</strong></div>
      </div>

      <section aria-labelledby="chain-title">
        <div className="section-head"><h2 id="chain-title">Cadeia de selos</h2></div>
        <p className="muted" style={{ maxWidth: 680, marginBottom: 24 }}>
          Cada selo é um HMAC-SHA256 dos dados do lance junto com o selo anterior. Mudar, apagar ou inserir
          um lance, mesmo direto no banco, quebra a corrente a partir dali.
        </p>
        {bids.length === 0 ? (
          <EmptyState title="Sem lances">Este lote não recebeu lances, então não há selos para conferir.</EmptyState>
        ) : (
          <ol className="chain">
            <li className="chain-genesis">início da cadeia · 0000…0000</li>
            {bids.map((b) => (
              <li key={b.seq} className={`chain-node ${verification.brokenAt === b.seq ? 'broken' : ''}`}>
                <span className="chain-seq">{String(b.seq).padStart(2, '0')}</span>
                <div className="chain-body">
                  <div><span>Licitante</span><b className="mono">#{b.bidderCode}</b></div>
                  <div><span>Valor</span><b className="mono">{brl(b.amount)}</b></div>
                  <div className="hash"><span>Data</span>{formatDateTime(b.createdAt)}</div>
                  <div className="hash" title={b.prevHash}><span>Selo anterior</span>{short(b.prevHash)}</div>
                  <div className="hash" title={b.hash}><span>Selo deste lance</span>{short(b.hash)}</div>
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
