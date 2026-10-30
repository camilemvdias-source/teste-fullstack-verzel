import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, ApiError } from '../api/client.js';
import { useAuth } from '../auth/AuthContext.jsx';
import ArtImage from '../components/ArtImage.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import LotCard from '../components/LotCard.jsx';
import { HeartIcon } from '../components/Icons.jsx';
import { TimeBar, BidChart } from '../components/Charts.jsx';
import { useFavorites } from '../hooks/useFavorites.js';
import { useCountdown } from '../hooks/useCountdown.js';
import { brl, formatDateTime, parseBrlToCents } from '../lib/format.js';

const ATTR_LABEL = {
  artist: 'Artista', date: 'Data', medium: 'Técnica', dimensions: 'Dimensões',
  placeOfOrigin: 'Origem', source: 'Acervo',
};
const SOON_MS = 2 * 60 * 1000;
const toInput = (cents) => (cents / 100).toFixed(2).replace('.', ',');

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
    load();
    // Lance novo de outra pessoa aparece em poucos segundos (polling de 2s)
    const t = setInterval(load, 2000);
    return () => clearInterval(t);
  }, [load]);

  useEffect(() => {
    window.scrollTo(0, 0);
    api('/lots?status=live', { auth: false })
      .then((d) => setOthers(d.items.filter((l) => String(l.id) !== String(id)).slice(0, 4)))
      .catch(() => {});
  }, [id]);

  const { ms, parts } = useCountdown(lot?.endsAt ?? new Date().toISOString(), lot?.serverTime);

  if (notFound) return <p className="center muted">Lote não encontrado. <Link to="/">Voltar aos leilões</Link></p>;
  if (!lot) {
    return loadError
      ? <div className="alert alert-error">{loadError}</div>
      : <div className="lot-detail" aria-busy="true"><div className="skeleton" style={{ aspectRatio: '4 / 3' }} /><div><div className="skeleton sk-line" style={{ width: '50%' }} /><div className="skeleton sk-line" style={{ height: 32 }} /><div className="skeleton" style={{ height: 220, marginTop: 20 }} /></div></div>;
  }

  // O status vem do servidor; a contagem só trava o botão no instante exato
  const isLive = lot.status === 'live' && ms > 0;
  const canBid = user?.role === 'bidder';
  const available = user?.balance?.available;
  const a = lot.attributes || {};
  const artistLines = a.artist ? a.artist.split('\n') : [];
  const attrs = Object.entries(a).filter(([k, v]) => v && ATTR_LABEL[k]);
  const quick = [0, 1, 2].map((n) => lot.nextMinBid + n * lot.minIncrement);

  async function handleBid(e) {
    e.preventDefault();
    setBidError('');
    setBidOk('');
    // Sem digitar nada, vale o lance mínimo que já aparece no campo (em centavos, sem conversão)
    const cents = touched ? parseBrlToCents(amountText) : lot.nextMinBid;
    if (cents == null) return setBidError('Digite um valor válido.');

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

  return (
    <div className="lot-page">
      <p className="crumbs"><Link to="/">Leilões</Link> / Lote {lot.id}</p>

      <div className="lot-detail">
        <div className="lot-frame">
          <ArtImage className="lot-image" lotId={lot.id} alt={lot.title} />
        </div>

        <div className="lot-info">
          <span className="lot-meta-line">Lote {lot.id} <StatusBadge status={lot.status} /></span>
          {artistLines[0] && <p className="lot-artist">{a.artistName || artistLines[0]}</p>}
          {a.artistName && artistLines[0] !== a.artistName && <p className="muted small" style={{ margin: 0 }}>{artistLines[0].replace(a.artistName, '').replace(/^[\s(]+|[)\s]+$/g, '')}</p>}
          <h1>{lot.title}</h1>
          <p className="lot-meta">
            {[a.date, a.medium].filter(Boolean).join(' · ')}
            {a.dimensions && <><br />{a.dimensions.split(';')[0]}</>}
          </p>

          {position === 'winning' && <div className="status-flag winning" role="status">Você está ganhando este lote.</div>}
          {position === 'outbid' && <div className="status-flag outbid" role="status">Você foi superado. Dê um novo lance para voltar à disputa.</div>}
          {position === 'won' && <div className="status-flag won" role="status">Você arrematou este lote. O comprovante está em <Link to="/meus-lances">Meus lances</Link>.</div>}
          {position === 'lost' && <p className="muted small">Você deu lances neste lote, mas outro licitante arrematou.</p>}

          <div className="bid-box">
            <div className="bid-row">
              <div>
                <span className="eyebrow">{lot.status === 'ended' ? (lot.finalPrice != null ? 'Arrematado por' : 'Encerrado') : lot.currentBid == null ? 'Lance inicial' : 'Lance atual'}</span>
                <span className="lot-price-big">{lot.status === 'ended' && lot.finalPrice == null && lot.bidCount === 0 ? 'Sem lances' : brl(lot.finalPrice ?? lot.currentBid ?? lot.startingBid)}</span>
              </div>
              <a href="#historico" className="small">{lot.bidCount} {lot.bidCount === 1 ? 'lance' : 'lances'}</a>
            </div>

            {lot.status === 'live' && (
              <div className="bid-row" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
                <div className={`clock-blocks ${ms < SOON_MS ? 'soon' : ''}`} title={`Termina em ${formatDateTime(lot.endsAt)}`}>
                  {[['d', 'dias'], ['h', 'horas'], ['m', 'min'], ['s', 'seg']].map(([k, l]) => (
                    <div key={k}><b>{String(parts[k]).padStart(2, '0')}</b><small>{l}</small></div>
                  ))}
                </div>
                <TimeBar startsAt={lot.startsAt} endsAt={lot.endsAt} urgent={ms < SOON_MS} />
              </div>
            )}
            {lot.status === 'scheduled' && <p className="muted" style={{ marginTop: 0 }}>Abre para lances em {formatDateTime(lot.startsAt)}. Lance inicial {brl(lot.startingBid)}.</p>}
            {lot.status === 'ended' && <p className="muted" style={{ marginTop: 0 }}>Encerrado em {formatDateTime(lot.endsAt)}.</p>}

            {bidOk && <div className="alert alert-success" role="status">{bidOk}</div>}
            {bidError && <div className="alert alert-error" role="alert">{bidError}</div>}

            {isLive && canBid && (
              <form onSubmit={handleBid} className="bid-form">
                <div className="field">
                  <label htmlFor="amount">Seu lance (mínimo {brl(lot.nextMinBid)})</label>
                  <div className="money">
                    <span>R$</span>
                    <input
                      id="amount" inputMode="decimal" autoComplete="off"
                      value={touched ? amountText : toInput(lot.nextMinBid)}
                      onChange={(e) => { setTouched(true); setAmountText(e.target.value); }}
                    />
                  </div>
                </div>
                <div className="quick" aria-label="Valores rápidos">
                  {quick.map((v) => (
                    <button key={v} type="button" className="btn btn-sm" onClick={() => { setTouched(true); setAmountText(toInput(v)); }}>{brl(v)}</button>
                  ))}
                </div>
                <button className="btn btn-dark btn-block btn-lg" type="submit" disabled={submitting}>
                  {submitting ? 'Enviando…' : 'Dar lance'}
                </button>
                {available != null && <p className="fine">Disponível: {brl(available)}</p>}
              </form>
            )}

            {isLive && !user && (
              <Link to="/login" state={{ from: `/lotes/${lot.id}` }} className="btn btn-dark btn-block btn-lg">Entrar para dar lance</Link>
            )}
            {isLive && user && !canBid && <p className="muted" style={{ marginBottom: 0 }}>Leiloeiros não dão lances.</p>}
            {lot.status === 'live' && ms < SOON_MS && <p className="fine">Lances agora prorrogam o fim em 2 min.</p>}
          </div>

          <button type="button" className={`fav-btn ${isFav(lot.id) ? 'on' : ''}`} aria-pressed={isFav(lot.id)} onClick={() => toggleFav(lot.id)}>
            <HeartIcon width={16} height={16} /> {isFav(lot.id) ? 'Nos favoritos' : 'Adicionar aos favoritos'}
          </button>
        </div>
      </div>

      <div className="about about-grid">
        <section id="historico">
          <h2>Histórico de lances</h2>
          {history.length === 0 && <p className="muted">Nenhum lance até agora.</p>}
          <BidChart startingBid={lot.startingBid} bids={[...history].reverse().map((b) => ({ ...b, mine: user?.publicCode && b.bidderCode === user.publicCode }))} />
          {history.length > 0 && (
            <div className="table-wrap">
              <table className="table">
                <thead><tr><th>#</th><th>Licitante</th><th className="num">Valor</th><th>Data</th></tr></thead>
                <tbody>
                  {history.map((b) => {
                    const mine = user?.publicCode && b.bidderCode === user.publicCode;
                    return (
                      <tr key={b.seq} className={mine ? 'you' : ''}>
                        <td>{b.seq}</td>
                        <td>{mine ? 'Você' : `Licitante #${b.bidderCode}`}</td>
                        <td className="num">{brl(b.amount)}</td>
                        <td>{formatDateTime(b.createdAt)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          <p className="fine"><Link to={`/auditoria/${lot.id}`}>Auditoria pública do lote</Link></p>
        </section>

        <section>
          <h2>Detalhes da obra</h2>
          {attrs.length > 0 && (
            <dl className="attrs">
              {attrs.map(([k, v]) => (
                <div key={k} style={{ display: 'contents' }}>
                  <dt>{ATTR_LABEL[k]}</dt>
                  <dd>
                    {k === 'source' && a.sourceUrl
                      ? <a href={a.sourceUrl} target="_blank" rel="noreferrer">{String(v)}</a>
                      : String(v).split('\n')[0]}
                  </dd>
                </div>
              ))}
            </dl>
          )}
        </section>
      </div>

      {others.length > 0 && (
        <section className="about">
          <h2>Outros lotes ao vivo</h2>
          <div className="lot-grid">
            {others.map((o) => <LotCard key={o.id} lot={o} />)}
          </div>
        </section>
      )}
    </div>
  );
}
