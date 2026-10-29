import { useState } from 'react';
import { API_URL } from '../api/client.js';

// Imagem da obra, servida pela nossa API (GET /lots/:id/image), porque o museu
// bloqueia imagens pedidas direto pelo navegador. Se falhar, mostra um aviso.
export default function ArtImage({ lotId, alt, className }) {
  const [failed, setFailed] = useState(false);

  if (!lotId || failed) {
    return (
      <div className={`img-fallback ${className ?? ''}`} role="img" aria-label={alt}>
        🖼️ <span>Imagem indisponível</span>
      </div>
    );
  }

  return (
    <img
      className={className}
      src={`${API_URL}/lots/${lotId}/image`}
      alt={alt}
      loading="lazy"
      onError={() => setFailed(true)}
    />
  );
}
