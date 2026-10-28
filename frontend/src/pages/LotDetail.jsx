import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, ApiError } from '../api/client.js';
import { useAuth } from '../auth/AuthContext.jsx';
import ArtImage from '../components/ArtImage.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import { BackIcon, ShieldIcon, PinIcon, ClockIcon, ArrowIcon } from '../components/Icons.jsx';
import { useCountdown } from '../hooks/useCountdown.js';
import { brl, formatDateTime, parseBrlToCents } from '../lib/format.js';

const ATTR_LABEL = {
  artist: 'Artista', date: 'Data', medium: 'Técnica', dimensions: 'Dimensões',
  placeOfOrigin: 'Origem', source: 'Acervo',
};
const pad = (n) => String(n).padStart(2, '0');

// Texto descritivo montado com os dados reais da obra
function describe(lot) {
  const a = lot.attributes || {};
  const artist = a.artist ? a.artist.split('\n')[0] : null;
  const parts = [];
  if (artist) parts.push(`“${lot.title}” é uma obra atribuída a ${artist}${a.date ? `, datada de ${a.date}` : ''}.`);
  else parts.push(`“${lot.title}” integra o acervo de obras desta casa de leilões.`);
  if (a.medium) parts.push(`Executada em ${a.medium.toLowerCase()}${a.dimensions ? `, a peça mede ${a.dimensions.split('\n')[0]}` : ''}.`);
  if (a.placeOfOrigin) parts.push(`Sua origem é ${a.placeOfOrigin}.`);
  parts.push('Cada lance é registrado em uma cadeia de selos verificável, e o histórico completo pode ser consultado na auditoria do lote.');
  return parts.join(' ');
}

export default function LotDetail() {
  const { id } = useParams();
  const { user, refreshUser } = useAuth();
  const [lot, setLot] = useState(null);
  const [others, setOthers] = useState([]);
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
  }, [id]);

  useEffect(() => {
    load();
    // Lance novo de outra pessoa aparece em poucos segundos
    const t = setInterval(load, 3000);
    return () => clearInterval(t);
  }, [load]);

  useEffect(() => {
    window.scrollTo(0, 0);
    api('/lots?status=live', { auth: false })
      .then((d) => setOthers(d.items.filter((l) => String(l.id) !== String(id)).slice(0, 3)))
      .catch(() => {});
  }, [id]);

  const { ms, parts } = useCountdown(lot?.endsAt ?? new Date().toISOString(), lot?.serverTime);

  if (notFound) return <p className="center muted">Lote não encontrado. <Link to="/">Voltar aos leilões</Link></p>;
  if (!lot) return loadError ? <div className="alert alert-error">{loadError}</div> : <p className="center muted">Carregando…</p>;

  // O status vem do servidor; a contagem só trava o botão no instante exato
  const isLive = lot.status === 'live' && ms > 0;
  const canBid = user?.role === 'bidder';
  const available = user?.balance?.available;
  const a = lot.attributes || {};
  const artistLines = a.artist ? a.artist.split('\n') : [];
  const attrs = Object.entries(a).filter(([k, v]) => v && ATTR_LABEL[k]);

  async function handleBid(e) {
    e.preventDefault();
    setBidError('');
    setBidOk('');
    const cents = parseBrlToCents(amountText || String(lot.nextMinBid / 100));
    if (cents == null) return setBidError('Digite um valor válido.');

    setSubmitting(true);
    try {
      const data = await api(`/lots/${lot.id}/bids`, { method: 'POST', body: { amount: cents } });
      setBidOk(data.lot.extended
        ? `Lance de ${brl(cents)} registrado! O leilão foi prorrogado em 2 minutos.`
        : `Lance de ${brl(cents)} registrado! Você está liderando.`);
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
      <Link to="/" className="back"><BackIcon width={16} height={16} /> Voltar aos leilões</Link>

      <div className="lot-detail">
        <div className="lot-frame">
          <ArtImage className="lot-image" lotId={lot.id} alt={lot.title} />
        </div>

        <div className="lot-info">
          {artistLines[0] && <p className="lot-artist">{artistLines[0]}</p>}
          {artistLines[1] && <p className="muted small">{artistLines.slice(1).join(' · ')}</p>}
          <h1>{lot.title}</h1>
          <p className="lot-meta">
            {[a.date, a.medium].filter(Boolean).join(' · ')}
            {a.dimensions && <><br />{a.dimensions.split('\n')[0]}</>}
          </p>
          <div className="tags">
            <StatusBadge status={lot.status} />
            {a.placeOfOrigin && <span className="tag">{a.placeOfOrigin}</span>}
          </div>

          <div className="price-box">
            <div>
              <span className="eyebrow">{lot.currentBid == null ? 'Lance inicial' : 'Lance atual'}</span>
              <strong className="lot-price-big">{brl(lot.currentBid ?? lot.startingBid)}</strong>
            </div>
            <div>
              <span className="eyebrow">Próximo lance mínimo</span>
              <strong className="lot-price-next">{brl(lot.nextMinBid)}</strong>
            </div>
          </div>
          <p className="muted small">
            {lot.bidCount} {lot.bidCount === 1 ? 'lance' : 'lances'} · incremento mínimo {brl(lot.minIncrement)}
          </p>

          {lot.status === 'live' && (
            <div className="countdown-box">
              <span className="eyebrow">Leilão encerra em</span>
              <div className="countdown">
                <div><b>{pad(parts.h + parts.d * 24)}</b><small>horas</small></div><i>:</i>
                <div><b>{pad(parts.m)}</b><small>min</small></div><i>:</i>
                <div><b>{pad(parts.s)}</b><small>seg</small></div>
              </div>
            </div>
          )}
          {lot.status === 'scheduled' && <p className="muted">Começa em {formatDateTime(lot.startsAt)}</p>}
          {lot.status === 'ended' && <p className="muted">Encerrado em {formatDateTime(lot.endsAt)}</p>}

          {bidOk && <div className="alert alert-success" role="status">{bidOk}</div>}
          {bidError && <div className="alert alert-error" role="alert">{bidError}</div>}

          {isLive && canBid && (
            <form onSubmit={handleBid} className="bid-form">
              <div className="field">
                <label htmlFor="amount">Seu lance (mínimo {brl(lot.nextMinBid)})</label>
                <input
                  id="amount" inputMode="decimal" autoComplete="off"
                  value={touched ? amountText : (amountText || (lot.nextMinBid / 100).toFixed(2).replace('.', ','))}
                  onChange={(e) => { setTouched(true); setAmountText(e.target.value); }}
                />
                {available != null && <small className="muted">Saldo disponível: {brl(available)}</small>}
              </div>
              <button className="btn btn-dark btn-block btn-lg" type="submit" disabled={submitting}>
                {submitting ? 'Enviando…' : 'Dar lance'}
              </button>
            </form>
          )}

          {isLive && !user && (
            <Link to="/login" state={{ from: `/lotes/${lot.id}` }} className="btn btn-dark btn-block btn-lg">Entre para dar lance</Link>
          )}
          {isLive && user && !canBid && <p className="muted">Apenas licitantes podem dar lances.</p>}
        </div>
      </div>

      <div className="trust">
        <div>
          <ShieldIcon />
          <span><b>Autenticidade</b><small>{a.source ? `Dados do acervo ${a.source}` : 'Certificado e procedência'}</small></span>
        </div>
        <div>
          <PinIcon />
          <span><b>Proveniência</b><small>{a.placeOfOrigin ? `Origem: ${a.placeOfOrigin}` : 'Coleção particular'}</small></span>
        </div>
        <div>
          <ClockIcon />
          <span>
            <b>Histórico de lances</b>
            <small>
              {lot.bidCount > 0
                ? <>{lot.bidCount} {lot.bidCount === 1 ? 'lance' : 'lances'} · <Link to={`/auditoria/${lot.id}`}>ver auditoria</Link></>
                : 'Nenhum lance até agora'}
            </small>
          </span>
        </div>
      </div>

      <section className="about">
        <h2>Sobre a obra</h2>
        <p>{describe(lot)}</p>
        {attrs.length > 0 && (
          <dl className="attrs">
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
        )}
      </section>

      {others.length > 0 && (
        <section className="about">
          <div className="section-head">
            <h2>Mais obras em leilão</h2>
            <Link to="/" className="link-arrow">Ver todos <ArrowIcon width={16} height={16} /></Link>
          </div>
          <div className="more-grid">
            {others.map((o) => (
              <Link key={o.id} to={`/lotes/${o.id}`} className="more-item">
                <ArtImage lotId={o.id} alt={o.title} />
                <span>{o.title}</span>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
