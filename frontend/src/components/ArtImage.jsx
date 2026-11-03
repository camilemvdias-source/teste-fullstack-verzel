import { useState } from 'react';
import { lotImageUrl } from '../lib/images.js';

// Obra num passe-partout. "cover" preenche o quadro (cartões e miniaturas);
// sem ele, a obra aparece inteira, sem cortes.
export default function ArtImage({ lotId, view = 0, src, alt, className = '', cover = false, sold = false, eager = false }) {
  const [failed, setFailed] = useState(false);
  const url = src ?? (lotId ? lotImageUrl(lotId, view) : null);

  return (
    <div className={`art-mat ${cover ? 'art-cover' : ''} ${className}`}>
      {!url || failed
        ? <div className="img-fallback" role="img" aria-label={alt}>Imagem indisponível</div>
        : <img src={url} alt={alt} loading={eager ? 'eager' : 'lazy'} onError={() => setFailed(true)} />}
      {sold && <span className="sold-dot" title="Arrematado" aria-label="Arrematado" />}
    </div>
  );
}
