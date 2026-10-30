import { Link } from 'react-router-dom';
import { brl, formatDateTime } from '../lib/format.js';
import { useCountdown } from '../hooks/useCountdown.js';
import { useFavorites } from '../hooks/useFavorites.js';
import ArtImage from './ArtImage.jsx';
import StatusBadge from './StatusBadge.jsx';
import { HeartIcon, ClockIcon, PaddleIcon } from './Icons.jsx';
import { TimeBar } from './Charts.jsx';

const HOUR = 3600 * 1000;

function Foot({ lot, ms, label }) {
  if (lot.status === 'live') {
    return (
      <>
        <span className="price">{brl(lot.currentBid ?? lot.startingBid)}</span>
        <TimeBar startsAt={lot.startsAt} endsAt={lot.endsAt} urgent={ms < HOUR} />
        <div className="card-stats">
          <span title="Lances"><PaddleIcon width={15} height={15} /> {lot.bidCount}</span>
          <span className={ms < HOUR ? 'soon' : ''} title="Tempo restante"><ClockIcon width={15} height={15} /> {label}</span>
        </div>
      </>
    );
  }
  if (lot.status === 'scheduled') {
    return (
      <>
        <span className="price">{brl(lot.startingBid)}</span>
        <div className="card-stats"><span title="Abre em"><ClockIcon width={15} height={15} /> {formatDateTime(lot.startsAt)}</span></div>
      </>
    );
  }
  return (
    <>
      <span className="price">{lot.finalPrice != null ? brl(lot.finalPrice) : lot.bidCount > 0 ? brl(lot.currentBid) : '—'}</span>
      <div className="card-stats"><span>{lot.finalPrice != null ? 'Arrematado' : lot.bidCount > 0 ? 'Liquidando…' : 'Sem lances'}</span></div>
    </>
  );
}

export default function LotCard({ lot }) {
  const { ms, label } = useCountdown(lot.endsAt);
  const { isFav, toggle } = useFavorites();
  const fav = isFav(lot.id);

  return (
    <div className="lot-wrap">
      <Link to={`/lotes/${lot.id}`} className={`lot-card lot-${lot.status}`}>
        <div className="lot-card-media">
          <ArtImage lotId={lot.id} alt={`${lot.title}${lot.artist ? `, de ${lot.artist}` : ''}`} />
        </div>
        <div className="lot-card-body">
          <span className="lot-meta-line">Lote {lot.id} <StatusBadge status={lot.status} /></span>
          {lot.artist && <span className="lot-artist-name">{lot.artist}</span>}
          <h3>{lot.title}{lot.date ? <span className="muted">, {lot.date.split(',')[0]}</span> : null}</h3>
          <div className="lot-card-foot lot-card-foot-col"><Foot lot={lot} ms={ms} label={label} /></div>
        </div>
      </Link>
      <button
        type="button"
        className={`heart ${fav ? 'on' : ''}`}
        aria-pressed={fav}
        aria-label={fav ? `Remover ${lot.title} dos favoritos` : `Favoritar ${lot.title}`}
        onClick={() => toggle(lot.id)}
      >
        <HeartIcon width={18} height={18} />
      </button>
    </div>
  );
}
