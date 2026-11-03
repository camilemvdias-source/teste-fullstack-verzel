import { Link } from 'react-router-dom';
import { brl, formatDateTime } from '../lib/format.js';
import { useCountdown } from '../hooks/useCountdown.js';
import { useFavorites } from '../hooks/useFavorites.js';
import ArtImage from './ArtImage.jsx';
import { LotNumber } from './States.jsx';
import { HeartIcon } from './Icons.jsx';
import { TimeBar } from './Charts.jsx';

const HOUR = 3600 * 1000;
const RIBBON = { live: 'Em leilão', scheduled: 'Em breve', ended: 'Encerrado', cancelled: 'Cancelado' };

// O rodapé muda conforme o momento do leilão: mostra só o que importa agora
function Figures({ lot, ms, label }) {
  if (lot.status === 'live') {
    return (
      <>
        <div className="lot-card-figs">
          <span className="lot-price"><small>{lot.bidCount > 0 ? `Lance atual · ${lot.bidCount}` : 'Lance inicial'}</small>{brl(lot.currentBid ?? lot.startingBid)}</span>
          <span className={`lot-clock ${ms < HOUR ? 'soon' : ''}`}><small>Encerra em</small>{label}</span>
        </div>
        <TimeBar startsAt={lot.startsAt} endsAt={lot.endsAt} urgent={ms < HOUR} />
      </>
    );
  }
  if (lot.status === 'scheduled') {
    return (
      <div className="lot-card-figs">
        <span className="lot-price"><small>Lance inicial</small>{brl(lot.startingBid)}</span>
        <span className="lot-clock"><small>Abre em</small>{formatDateTime(lot.startsAt)}</span>
      </div>
    );
  }
  const sold = lot.finalPrice != null;
  return (
    <div className="lot-card-figs">
      <span className="lot-price"><small>{sold ? 'Arrematado por' : lot.bidCount > 0 ? 'Liquidando' : 'Resultado'}</small>{sold ? brl(lot.finalPrice) : lot.bidCount > 0 ? brl(lot.currentBid) : 'Sem lances'}</span>
    </div>
  );
}

export default function LotCard({ lot }) {
  const { ms, label } = useCountdown(lot.endsAt);
  const { isFav, toggle } = useFavorites();
  const fav = isFav(lot.id);
  const year = lot.date?.split(/[,–-]/)[0]?.trim();

  return (
    <article className={`lot-card lot-${lot.status}`}>
      <Link to={`/lotes/${lot.id}`} className="lot-card-link">
        <div style={{ position: 'relative' }}>
          <span className={`ribbon ${lot.status}`}>{lot.status === 'live' && <span className="live-dot" aria-hidden="true" />}{RIBBON[lot.status]}</span>
          <ArtImage lotId={lot.id} cover sold={lot.finalPrice != null} alt={`${lot.title}${lot.artist ? `, de ${lot.artist}` : ''}`} />
        </div>
        <div className="lot-card-body">
          <LotNumber id={lot.id} />
          <h3 className="lot-title">{lot.title}</h3>
          <span className="lot-artist">{[lot.artist, year].filter(Boolean).join(' · ')}</span>
          <div className="lot-card-foot">
            <Figures lot={lot} ms={ms} label={label} />
            <span className="link-arrow card-cta">{lot.status === 'live' ? 'Dar lance' : 'Ver lote'}</span>
          </div>
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
    </article>
  );
}
