import { Link } from 'react-router-dom';
import { brl, formatDateTime } from '../lib/format.js';
import { useCountdown } from '../hooks/useCountdown.js';
import { useFavorites } from '../hooks/useFavorites.js';
import ArtImage from './ArtImage.jsx';
import StatusBadge from './StatusBadge.jsx';
import { HeartIcon } from './Icons.jsx';

export default function LotCard({ lot }) {
  const price = lot.currentBid ?? lot.startingBid;
  const { label } = useCountdown(lot.endsAt);
  const { isFav, toggle } = useFavorites();
  const fav = isFav(lot.id);

  return (
    <div className="lot-wrap">
      <Link to={`/lotes/${lot.id}`} className={`lot-card lot-${lot.status}`}>
        <div className="lot-card-media">
          <ArtImage lotId={lot.id} alt={lot.title} />
          <StatusBadge status={lot.status} />
        </div>
        <div className="lot-card-body">
          <h3>{lot.title}</h3>
          <small className="muted">{lot.bidCount} {lot.bidCount === 1 ? 'lance' : 'lances'}</small>
          <div className="lot-card-foot">
            <span className="eyebrow">{lot.currentBid == null ? 'Lance inicial' : 'Lance atual'}</span>
            <strong className="price">{brl(price)}</strong>
            {lot.status === 'live' && <span className="time">{label}</span>}
            {lot.status === 'scheduled' && <span className="time">Começa {formatDateTime(lot.startsAt)}</span>}
            {lot.status === 'ended' && <span className="time muted">Encerrou {formatDateTime(lot.endsAt)}</span>}
          </div>
        </div>
      </Link>
      {/* Fora do <Link> para não navegar ao favoritar */}
      <button
        type="button"
        className={`heart ${fav ? 'on' : ''}`}
        aria-pressed={fav}
        aria-label={fav ? `Remover ${lot.title} dos favoritos` : `Favoritar ${lot.title}`}
        onClick={() => toggle(lot.id)}
      >
        <HeartIcon width={20} height={20} />
      </button>
    </div>
  );
}
