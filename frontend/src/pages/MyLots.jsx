import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client.js';
import ArtImage from '../components/ArtImage.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import { RowSkeletons } from '../components/Skeleton.jsx';
import { EmptyState, ErrorState, LotNumber, Notice, PageHeader } from '../components/States.jsx';
import { brl, formatDateTime } from '../lib/format.js';

export default function MyLots() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [ok, setOk] = useState('');
  const [cancelingId, setCancelingId] = useState(null);

  const load = useCallback(async () => {
    try {
      setData(await api('/my-lots'));
      setError('');
    } catch (err) {
      setError(err.message);
    }
  }, []);

  useEffect(() => {
    const first = setTimeout(load, 0);
    const t = setInterval(load, 10000);
    return () => { clearTimeout(first); clearInterval(t); };
  }, [load]);

  async function handleCancel(lot) {
    if (!window.confirm(`Cancelar o lote "${lot.title}"? Isso não pode ser desfeito.`)) return;
    setActionError('');
    setOk('');
    setCancelingId(lot.id);
    try {
      await api(`/lots/${lot.id}/cancel`, { method: 'POST' });
      setOk(`Lote Nº ${String(lot.id).padStart(3, '0')} cancelado.`);
      await load();
    } catch (err) {
      setActionError(err.message);
      load(); // pode ter recebido um lance neste instante
    } finally {
      setCancelingId(null);
    }
  }

  return (
    <div className="page">
      <PageHeader
        eyebrow="Leiloeiro"
        title="Meus lotes"
        actions={<Link to="/meus-lotes/novo" className="btn btn-primary">+ Novo lote</Link>}
      >
        Lotes só podem ser cancelados antes do primeiro lance.
      </PageHeader>

      {ok && <Notice kind="success">{ok}</Notice>}
      {actionError && <Notice kind="error">{actionError}</Notice>}

      {data && (
        <div className="stats">
          <div className="stat"><span className="eyebrow">Total recebido</span><strong>{brl(data.summary.totalReceived)}</strong></div>
          <div className="stat"><span className="eyebrow">Lotes vendidos</span><strong>{data.summary.soldCount}</strong></div>
          <div className="stat"><span className="eyebrow">Lotes publicados</span><strong>{data.items.length}</strong></div>
        </div>
      )}

      {error && !data && <ErrorState message={error} onRetry={load} />}
      {!data && !error && <RowSkeletons />}
      {data?.items.length === 0 && (
        <EmptyState title="Você ainda não criou nenhum lote" action={<Link to="/meus-lotes/novo" className="btn btn-primary">Criar o primeiro lote</Link>}>
          Escolha uma pintura do acervo do museu, defina o lance inicial e as datas.
        </EmptyState>
      )}

      <div className="rows">
        {data?.items.map((lot) => (
          <div key={lot.id} className="row">
            <ArtImage lotId={lot.id} alt="" sold={lot.result?.sold} />
            <div className="row-main">
              <div className="row-top"><LotNumber id={lot.id} /><StatusBadge status={lot.status} /></div>
              {lot.status === 'cancelled'
                ? <span className="row-title muted">{lot.title}</span>
                : <Link to={`/lotes/${lot.id}`} className="row-title" style={{ textDecoration: 'none' }}>{lot.title}</Link>}
              <div className="row-figs">
                {lot.result?.sold
                  ? <span>Vendido por<b>{brl(lot.result.finalPrice)}</b> para <b className="mono">#{lot.result.winnerCode}</b></span>
                  : <span>{lot.currentBid == null ? 'Lance inicial' : 'Lance atual'}<b>{brl(lot.currentBid ?? lot.startingBid)}</b></span>}
                <span>Lances<b>{lot.bidCount}</b></span>
                <span>Período<b>{formatDateTime(lot.startsAt)} → {formatDateTime(lot.endsAt)}</b></span>
              </div>
              {lot.result && !lot.result.sold && (
                <span className="small muted">{lot.bidCount > 0 ? 'Encerrado · liquidando…' : 'Encerrado sem lances'}</span>
              )}
            </div>
            <div className="row-actions">
              {lot.status !== 'cancelled' && <Link to={`/lotes/${lot.id}`} className="btn btn-ghost btn-sm">Ver sala</Link>}
              {lot.canCancel && (
                <button className="btn btn-sm btn-danger" onClick={() => handleCancel(lot)} disabled={cancelingId === lot.id}>
                  {cancelingId === lot.id ? 'Cancelando…' : 'Cancelar'}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
