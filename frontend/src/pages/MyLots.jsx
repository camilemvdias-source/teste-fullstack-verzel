import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client.js';
import ArtImage from '../components/ArtImage.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import { RowSkeletons } from '../components/Skeleton.jsx';
import { brl, formatDateTime } from '../lib/format.js';

export default function MyLots() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');
  const [cancelingId, setCancelingId] = useState(null);

  const load = useCallback(async () => {
    try {
      setData(await api('/my-lots'));
    } catch (err) {
      setError(err.message);
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 10000);
    return () => clearInterval(t);
  }, [load]);

  async function handleCancel(lot) {
    if (!window.confirm(`Cancelar o lote "${lot.title}"? Isso não pode ser desfeito.`)) return;
    setError('');
    setOk('');
    setCancelingId(lot.id);
    try {
      const res = await api(`/lots/${lot.id}/cancel`, { method: 'POST' });
      setOk(res.refunded > 0 ? `Lote cancelado. ${brl(res.refunded)} devolvidos ao líder.` : 'Lote cancelado.');
      await load();
    } catch (err) {
      setError(err.message);
      load(); // pode ter recebido um lance neste instante
    } finally {
      setCancelingId(null);
    }
  }

  return (
    <>
      <div className="page-head">
        <h1>Meus lotes</h1>
        <Link to="/meus-lotes/novo" className="btn btn-primary" style={{ textDecoration: 'none' }}>
          Novo lote
        </Link>
      </div>

      {error && <div className="alert alert-error" role="alert">{error}</div>}
      {ok && <div className="alert alert-success" role="status">{ok}</div>}

      {data && (
        <div className="balance-grid" style={{ marginBottom: 16 }}>
          <div className="card"><span className="muted">Total recebido</span><strong>{brl(data.summary.totalReceived)}</strong></div>
          <div className="card"><span className="muted">Lotes vendidos</span><strong>{data.summary.soldCount}</strong></div>
        </div>
      )}

      {!data && !error && <RowSkeletons />}
      {data?.items.length === 0 && <p className="center muted">Você ainda não criou nenhum lote.</p>}

      <div className="stack">
        {data?.items.map((lot) => (
          <div key={lot.id} className="row-lot">
            <ArtImage className="row-thumb" lotId={lot.id} alt={lot.title} />
            <div className="row-lot-info">
              {lot.status === 'cancelled'
                ? <span className="status status-cancelled">Lote {lot.id} · Cancelado</span>
                : <span className="lot-meta-line">Lote {lot.id} <StatusBadge status={lot.status} /></span>}
              <h3>{lot.title}</h3>
              <small className="muted">
                {formatDateTime(lot.startsAt)} → {formatDateTime(lot.endsAt)} · {lot.bidCount} {lot.bidCount === 1 ? 'lance' : 'lances'}
              </small>
              <span>
                {lot.currentBid == null ? `Lance inicial ${brl(lot.startingBid)}` : `Lance atual ${brl(lot.currentBid)}`}
              </span>
              {lot.result && (
                <strong className={lot.result.sold ? 'pos' : 'muted'}>
                  {lot.result.sold
                    ? `Vendido por ${brl(lot.result.finalPrice)} · Licitante #${lot.result.winnerCode}`
                    : lot.bidCount > 0
                      ? 'Encerrado · liquidando…' // a liquidação roda a cada 5 s
                      : 'Encerrado sem lances'}
                </strong>
              )}
            </div>
            <div className="row-lot-actions">
              {lot.status !== 'cancelled' && <Link to={`/lotes/${lot.id}`}>Ver lote</Link>}
              {lot.canCancel && (
                <button className="btn" onClick={() => handleCancel(lot)} disabled={cancelingId === lot.id}>
                  {cancelingId === lot.id ? 'Cancelando…' : 'Cancelar'}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
