import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, ApiError } from '../api/client.js';
import { useAuth } from '../auth/useAuth.js';
import Gallery from '../components/Gallery.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import LotCard from '../components/LotCard.jsx';
import { HeartIcon, ShieldIcon } from '../components/Icons.jsx';
import { TimeBar, BidChart } from '../components/Charts.jsx';
import { RoomSkeleton } from '../components/Skeleton.jsx';
import { EmptyState, ErrorState, LotNumber, Notice } from '../components/States.jsx';
import { useFavorites } from '../hooks/useFavorites.js';
import { useCountdown } from '../hooks/useCountdown.js';
import { brl, formatDateTime, parseBrlToCents } from '../lib/format.js';

const ATTR_LABEL = {
  artist: 'Artista', date: 'Data', medium: 'Técnica', dimensions: 'Dimensões',
  placeOfOrigin: 'Origem', source: 'Acervo',
};
const SOON_MS = 2 * 60 * 1000;
const toInput = (cents) => (cents / 100).toFixed(2).replace('.', ',');

const POSITION = {
  winning: { cls: 'winning', text: 'Você está liderando este lote.' },
  outbid: { cls: 'outbid', text: 'Você foi superado. Dê um novo lance para voltar à disputa.' },
  won: { cls: 'won', text: 'Você arrematou este lote.' },
  lost: { cls: 'lost', text: 'Outro licitante arrematou este lote.' },
};

// A sala é montada do zero a cada lote (key): ao navegar por "Outros lotes ao vivo",
// o valor digitado, os avisos e os dados do lote anterior não passam para o próximo.
export default function LotDetail() {
  const { id } = useParams();
  return <LotRoom key={id} id={id} />;
}

function LotRoom({ id }) {
  const { user, refreshUser } = useAuth();
  const role = user?.role;
  const { isFav, toggle: toggleFav } = useFavorites();
  const [lot, setLot] = useState(null);
  const [others, setOthers] = useState([]);
  const [history, setHistory] = useState([]);
  const [position, setPosition] = useState(null); // winning | outbid | won | lost | settling
  const [notFound, setNotFound] = useState(false);
  const [loadError, setLoadError] = useState('');

  const [amountText, setAmountText] = useState('');
  const [touched, setTouched] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [bidError, setBidError] = useState('');
  const [bidOk, setBidOk] = useState('');

  const load = useCallback(async () => {
    try {
      setLot(await api(`/lots/${id}`, { auth: false }));
      setLoadError('');
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) setNotFound(true);
      else setLoadError(err.message);
    }

    // Histórico público e posição do usuário. Se falharem, a tela continua funcionando.
    try {
      const audit = await api(`/audit/${id}`, { auth: false });
      setHistory([...audit.bids].reverse());
    } catch { /* mantém o histórico anterior */ }

    if (role === 'bidder') {
      try {
        const mine = await api('/me/bids');
        setPosition(mine.items.find((i) => String(i.lotId) === String(id))?.position ?? null);
      } catch { /* mantém a posição anterior */ }
    } else {
      setPosition(null);
    }
  }, [id, role]);

  useEffect(() => {
    // Lance novo de outra pessoa aparece em poucos segundos (polling de 2s)
    const first = setTimeout(load, 0);
    const t = setInterval(load, 2000);
    return () => { clearTimeout(first); clearInterval(t); };
  }, [load]);

  useEffect(() => {
    window.scrollTo(0, 0);
    api('/lots?status=live', { auth: false })
      .then((d) => setOthers(d.items.filter((l) => String(l.id) !== String(id)).slice(0, 4)))
      .catch(() => {});
  }, [id]);

  // O aviso de sucesso some sozinho depois de alguns segundos
  useEffect(() => {
    if (!bidOk) return;
    const t = setTimeout(() => setBidOk(''), 6000);
    return () => clearTimeout(t);
  }, [bidOk]);

  const { ms, parts } = useCountdown(lot?.endsAt, lot?.serverTime);

  if (notFound) {
    return (
      <div className="page">
        <EmptyState title="Lote não encontrado" action={<Link to="/" className="btn">Voltar ao catálogo</Link>}>
          Ele pode ter sido cancelado pelo leiloeiro ou o endereço está incorreto.
        </EmptyState>
      </div>
    );
  }
  if (!lot) {
    return <div className="page">{loadError ? <ErrorState message={loadError} onRetry={load} /> : <RoomSkeleton />}</div>;
  }

  // O status vem do servidor; a contagem só trava o botão no instante exato
  const isLive = lot.status === 'live' && ms > 0;
  const canBid = user?.role === 'bidder';
  const available = user?.balance?.available;
  const a = lot.attributes || {};
  const artistLines = a.artist ? a.artist.split('\n') : [];
  const artistName = a.artistName || artistLines[0];
  const attrs = Object.entries(a).filter(([k, v]) => v && ATTR_LABEL[k]);
  const quick = [0, 1, 2, 4].map((n) => lot.nextMinBid + n * lot.minIncrement);
  const typed = touched ? parseBrlToCents(amountText) : lot.nextMinBid;
  const pos = POSITION[position];
  const sold = lot.finalPrice != null;

  function setAmount(cents) {
    setTouched(true);
    setAmountText(toInput(Math.max(lot.nextMinBid, cents)));
  }

  async function handleBid(e) {
    e.preventDefault();
    setBidError('');
    setBidOk('');
    // Sem digitar nada, vale o lance mínimo que já aparece no campo (em centavos, sem conversão)
    const cents = typed;
    if (cents == null) return setBidError('Digite um valor válido, por exemplo 1.250,00.');

    setSubmitting(true);
    try {
      const data = await api(`/lots/${lot.id}/bids`, { method: 'POST', body: { amount: cents } });
      setBidOk(data.lot.extended
        ? `Lance de ${brl(cents)} registrado. O encerramento foi prorrogado em 2 minutos.`
        : `Lance de ${brl(cents)} registrado. Você está liderando.`);
      setTouched(false);
      setAmountText('');
      await Promise.all([load(), refreshUser()]);
    } catch (err) {
      setBidError(err.message);
      load(); // o lance atual pode ter mudado
    } finally {
      setSubmitting(false);
    }
  }

  const priceLabel = lot.status === 'ended'
    ? (sold ? 'Arrematado por' : 'Resultado')
    : lot.currentBid == null ? 'Lance inicial' : 'Lance atual';
  const priceValue = lot.status === 'ended' && !sold && lot.bidCount === 0
    ? 'Sem lances'
    : brl(lot.finalPrice ?? lot.currentBid ?? lot.startingBid);

  return (
    <div className="page">
      <nav className="crumbs" aria-label="Você está em"><Link to="/">Catálogo</Link><span>/</span><span>Lote {lot.id}</span></nav>

      <div className="room">
        <div className="room-art">
          <Gallery lotId={lot.id} title={lot.title} views={lot.views} sold={sold} />
          <div className="plaque">
            <span>{[artistName, a.date].filter(Boolean).join(', ')}</span>
            <span>{a.source || 'Art Institute of Chicago'}</span>
          </div>
        </div>

        <aside className="room-side" aria-label="Lances">
          <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}><LotNumber id={lot.id} /><StatusBadge status={lot.status} /></div>
          {artistName && <p className="lot-artist" style={{ margin: '18px 0 0' }}>{artistName}</p>}
          <h1 className="room-title">{lot.title}</h1>
          <p className="room-meta">
            {[a.date, a.medium].filter(Boolean).join(' · ')}
            {a.dimensions && <><br />{a.dimensions.split(';')[0]}</>}
          </p>

          <div className="panel">
            <div className="panel-head">
              <span>{lot.status === 'live' ? 'Sala de lances' : lot.status === 'scheduled' ? 'Leilão agendado' : 'Resultado do leilão'}</span>
              <Link to={`/auditoria/${lot.id}`}>Auditoria</Link>
            </div>
            {pos && (
              <div className={`position position-${pos.cls}`} role="status">
                <span>{pos.text}{position === 'won' && <> <Link to="/meus-lances" style={{ color: 'inherit' }}>Ver comprovante</Link></>}</span>
              </div>
            )}

            <div className="panel-sec">
              <div className="panel-price">
                <div>
                  <span className="eyebrow">{priceLabel}</span>
                  <span className="big-price">{priceValue}</span>
                </div>
                <a href="#livro">{lot.bidCount} {lot.bidCount === 1 ? 'lance' : 'lances'}</a>
              </div>
            </div>

            {lot.status === 'live' && (
              <div className="panel-sec">
                <span className="eyebrow">Encerra em</span>
                <div className={`clock ${ms < SOON_MS ? 'soon' : ''}`} role="timer" aria-label={`Encerra em ${formatDateTime(lot.endsAt)}`}>
                  {[['d', 'dias'], ['h', 'horas'], ['m', 'min'], ['s', 'seg']].map(([k, l]) => (
                    <div key={k}><b>{String(parts[k]).padStart(2, '0')}</b><small>{l}</small></div>
                  ))}
                </div>
                <TimeBar startsAt={lot.startsAt} endsAt={lot.endsAt} urgent={ms < SOON_MS} />
                {ms < SOON_MS && <p className="fine red">Reta final: cada lance agora prorroga o fim em 2 minutos.</p>}
              </div>
            )}
            {lot.status === 'scheduled' && (
              <div className="panel-sec"><p style={{ margin: 0 }}>A sala abre para lances em <b className="mono">{formatDateTime(lot.startsAt)}</b>.</p></div>
            )}
            {lot.status === 'ended' && (
              <div className="panel-sec"><p className="muted" style={{ margin: 0 }}>Leilão encerrado em {formatDateTime(lot.endsAt)}.</p></div>
            )}

            {(isLive || bidOk) && (
              <div className="panel-sec">
                {bidOk && <Notice kind="success">{bidOk}</Notice>}
                {bidError && <Notice kind="error">{bidError}</Notice>}

                {isLive && canBid && (
                  <form onSubmit={handleBid} className="bid-form" noValidate>
                    <label htmlFor="amount">Seu lance · mínimo <span className="mono">{brl(lot.nextMinBid)}</span></label>
                    <div className="money">
                      <span className="cur">R$</span>
                      <input
                        id="amount" inputMode="decimal" autoComplete="off"
                        value={touched ? amountText : toInput(lot.nextMinBid)}
                        onChange={(e) => { setTouched(true); setAmountText(e.target.value); }}
                        aria-describedby="amount-help"
                      />
                      <button type="button" className="step" aria-label="Diminuir um incremento" onClick={() => setAmount((typed ?? lot.nextMinBid) - lot.minIncrement)}>−</button>
                      <button type="button" className="step" aria-label="Aumentar um incremento" onClick={() => setAmount((typed ?? lot.nextMinBid) + lot.minIncrement)}>+</button>
                    </div>
                    <div className="chips" aria-label="Valores rápidos">
                      {quick.map((v) => (
                        <button key={v} type="button" className="chip mono" aria-pressed={typed === v} onClick={() => setAmount(v)}>{brl(v)}</button>
                      ))}
                    </div>
                    <button className="btn btn-primary btn-block btn-lg" type="submit" disabled={submitting}>
                      {submitting ? 'Registrando lance…' : `Dar lance${typed ? ` de ${brl(typed)}` : ''}`}
                    </button>
                    <p className="fine" id="amount-help">
                      Incremento mínimo <span className="mono">{brl(lot.minIncrement)}</span>
                      {available != null && <> · Disponível <span className="mono">{brl(available)}</span> · <Link to="/carteira">Depositar</Link></>}
                    </p>
                  </form>
                )}

                {isLive && !user && (
                  <>
                    <Link to="/login" state={{ from: `/lotes/${lot.id}` }} className="btn btn-primary btn-block btn-lg">Entrar para dar lance</Link>
                    <p className="fine">É grátis criar conta de licitante.</p>
                  </>
                )}
                {isLive && user && !canBid && <p className="muted" style={{ margin: 0 }}>Você está como leiloeiro: leiloeiros acompanham, mas não dão lances.</p>}
              </div>
            )}
          </div>

          <div className="room-actions">
            <button type="button" className={`btn btn-sm btn-quiet ${isFav(lot.id) ? 'on' : ''}`} aria-pressed={isFav(lot.id)} onClick={() => toggleFav(lot.id)}>
              <HeartIcon width={16} height={16} style={isFav(lot.id) ? { fill: 'var(--red)', stroke: 'var(--red)' } : undefined} /> {isFav(lot.id) ? 'Nos favoritos' : 'Favoritar'}
            </button>
            <Link to={`/auditoria/${lot.id}`} className="btn btn-sm btn-quiet"><ShieldIcon width={16} height={16} /> Auditoria pública</Link>
          </div>
        </aside>
      </div>

      <div className="ledger">
        <section id="livro" aria-labelledby="livro-title">
          <h2 id="livro-title">Livro de lances</h2>
          {history.length === 0
            ? <EmptyState title="Nenhum lance ainda">{lot.status === 'live' ? `O primeiro lance começa em ${brl(lot.startingBid)}.` : 'Este lote não recebeu lances.'}</EmptyState>
            : (
              <>
                <BidChart startingBid={lot.startingBid} bids={[...history].reverse().map((b) => ({ ...b, mine: user?.publicCode && b.bidderCode === user.publicCode }))} />
                <div className="table-wrap">
                  <table className="table">
                    <thead><tr><th>Nº</th><th>Licitante</th><th>Data</th><th className="num">Valor</th></tr></thead>
                    <tbody>
                      {history.map((b, i) => {
                        const mine = user?.publicCode && b.bidderCode === user.publicCode;
                        return (
                          <tr key={b.seq} className={mine ? 'you' : i === 0 ? 'lead' : ''}>
                            <td className="mono">{String(b.seq).padStart(2, '0')}</td>
                            <td>{mine ? 'Você' : <span className="mono">#{b.bidderCode}</span>}{i === 0 && <span className="tag tag-muted" style={{ marginLeft: 8 }}>{lot.status === 'ended' ? 'Vencedor' : 'Lidera'}</span>}</td>
                            <td className="muted">{formatDateTime(b.createdAt)}</td>
                            <td className="num">{brl(b.amount)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}
        </section>

        <section aria-labelledby="ficha-title">
          <h2 id="ficha-title">Ficha da obra</h2>
          {attrs.length > 0 ? (
            <dl className="facts">
              {attrs.map(([k, v]) => (
                <div key={k}>
                  <dt>{ATTR_LABEL[k]}</dt>
                  <dd>
                    {k === 'source' && a.sourceUrl
                      ? <a href={a.sourceUrl} target="_blank" rel="noreferrer">{String(v)}</a>
                      : String(v).split('\n')[0]}
                  </dd>
                </div>
              ))}
            </dl>
          ) : <p className="muted">Sem dados adicionais desta obra.</p>}
        </section>
      </div>

      {others.length > 0 && (
        <section className="section" style={{ marginTop: 72 }} aria-labelledby="outros-title">
          <div className="section-head"><h2 id="outros-title">Outros lotes ao vivo</h2><Link to="/" className="small">Ver catálogo</Link></div>
          <div className="lot-grid">{others.map((o) => <LotCard key={o.id} lot={o} />)}</div>
        </section>
      )}
    </div>
  );
}
