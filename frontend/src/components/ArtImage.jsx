import { useState } from 'react';
import { API_URL } from '../api/client.js';

// Imagem da obra servida pela nossa API (cópia guardada no banco). Se falhar, mostra um aviso.
export default function ArtImage({ lotId, src, alt, className }) {
  const [failed, setFailed] = useState(false);
  const url = src ?? (lotId ? `${API_URL}/lots/${lotId}/image` : null);

  if (!url || failed) {
    return <div className={`img-fallback ${className ?? ''}`} role="img" aria-label={alt}>Imagem indisponível</div>;
  }
  return <img className={className} src={url} alt={alt} loading="lazy" onError={() => setFailed(true)} />;
}
