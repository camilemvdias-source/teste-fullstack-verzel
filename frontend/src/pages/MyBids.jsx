import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client.js';
import ArtImage from '../components/ArtImage.jsx';
import { brl, formatDateTime } from '../lib/format.js';
import { copyLink } from '../lib/share.js';
import { RowSkeletons } from '../components/Skeleton.jsx';
import { EmptyState, ErrorState, LotNumber, PageHeader } from '../components/States.jsx';

const POSITION = {
  winning: { label: 'Liderando', cls: 'tag-ok' },
  outbid: { label: 'Superado', cls: 'tag-warn' },
  won: { label: 'Arrematado', cls: 'tag-red' },
  lost: { label: 'Não arrematado', cls: 'tag-muted' },
  settling: { label: 'Encerrando…', cls: 'tag-muted' },
};
// Quem precisa de ação aparece primeiro
const ORDER = { outbid: 0, winning: 1, settling: 2, won: 3, lost: 4 };

export default function MyBids() {
  const [tab, setTab] = useState('bids');
  const [bids, setBids] = useState(null);
  const [wins, setWins] = useState(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(null);

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
    const first = setTimeout(load, 0);
    const t = setInterval(load, 5000);
    return () => { clearTimeout(first); clearInterval(t); };
  }, [load]);

  const loading = bids === null && !error;
  const sorted = bids ? [...bids].sort((a, b) => (ORDER[a.position] ?? 9) - (ORDER[b.position] ?? 9)) : [];
  const outbid = bids?.filter((b) => b.position === 'outbid').length ?? 0;
  const leading = bids?.filter((b) => b.position === 'winning').length ?? 0;

  return (
    <div className="page">
      <PageHeader eyebrow="Sua conta" title="Meus lances">
        Acompanhe onde você lidera, onde foi superado e os lotes que já arrematou.
      </PageHeader>

      {bids && (
        <div className="stats">
          <div className="stat"><span className="eyebrow">Liderando</span><strong>{leading}</strong></div>
          <div className="stat"><span className="eyebrow">Superado</span><strong style={outbid ? { color: 'var(--warn)' } : undefined}>{outbid}</strong></div>
          <div className="stat"><span className="eyebrow">Arrematados</span><strong>{wins?.length ?? 0}</strong></div>
        </div>
      )}

      <div className="segmented" role="tablist" aria-label="Lances ou arremates" style={{ marginBottom: 12 }}>
        <button type="button" role="tab" aria-selected={tab === 'bids'} onClick={() => setTab('bids')}>Lances{bids && <span className="n">{bids.length}</span>}</button>
        <button type="button" role="tab" aria-selected={tab === 'wins'} onClick={() => setTab('wins')}>Arremates{wins && <span className="n">{wins.length}</span>}</button>
      </div>

      {error && !bids && <ErrorState message={error} onRetry={load} />}
      {loading && <RowSkeletons />}

      {tab === 'bids' && bids?.length === 0 && (
        <EmptyState title="Você ainda não deu nenhum lance" action={<Link to="/" className="btn">Ver lotes ao vivo</Link>}>
          Escolha uma obra no catálogo e entre na sala para disputar.
        </EmptyState>
      )}
      {tab === 'bids' && sorted.length > 0 && (
        <div className="rows">
          {sorted.map((b) => {
            const pos = POSITION[b.position] ?? POSITION.settling;
            return (
              <div key={b.lotId} className="row">
                <ArtImage lotId={b.lotId} alt="" />
                <div className="row-main">
                  <div className="row-top"><LotNumber id={b.lotId} /><span className={`tag ${pos.cls}`}>{pos.label}</span></div>
                  <Link to={`/lotes/${b.lotId}`} className="row-title" style={{ textDecoration: 'none' }}>{b.title}</Link>
                  <div className="row-figs">
                    <span>Seu melhor lance<b>{brl(b.myBestBid)}</b></span>
                    <span>Lance atual<b>{b.currentBid == null ? '—' : brl(b.currentBid)}</b></span>
                    <span>{b.status === 'live' ? 'Encerra' : 'Encerrou'}<b>{formatDateTime(b.endsAt)}</b></span>
                  </div>
                </div>
                <div className="row-actions">
                  {b.position === 'outbid' && b.status === 'live'
                    ? <Link to={`/lotes/${b.lotId}`} className="btn btn-primary btn-sm">Cobrir lance</Link>
                    : <Link to={`/lotes/${b.lotId}`} className="btn btn-ghost btn-sm">Ver lote</Link>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {tab === 'wins' && wins?.length === 0 && (
        <EmptyState title="Nenhum arremate ainda">Quando você vencer um leilão, o comprovante aparece aqui.</EmptyState>
      )}
      {tab === 'wins' && wins?.length > 0 && (
        <div className="rows">
          {wins.map((w) => (
            <div key={w.receiptToken} className="row">
              <ArtImage lotId={w.lotId} alt="" sold />
              <div className="row-main">
                <div className="row-top"><LotNumber id={w.lotId} /><span className="tag tag-red">Arrematado</span></div>
                <span className="row-title">{w.title}</span>
                <div className="row-figs">
                  <span>Valor pago<b>{brl(w.amount)}</b></span>
                  <span>Em<b>{formatDateTime(w.wonAt)}</b></span>
                </div>
              </div>
              <div className="row-actions">
                <Link to={`/comprovante/${w.receiptToken}`} className="btn btn-primary btn-sm">Comprovante</Link>
                <button type="button" className="btn btn-ghost btn-sm" onClick={async () => { if (await copyLink(`/comprovante/${w.receiptToken}`)) setCopied(w.receiptToken); }}>
                  {copied === w.receiptToken ? 'Link copiado' : 'Copiar link'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
