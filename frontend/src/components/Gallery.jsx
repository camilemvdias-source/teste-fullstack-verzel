import { useEffect, useState } from 'react';
import { lotImageUrl } from '../lib/images.js';

// Galeria do lote: a obra inteira e detalhes ampliados, com setas, miniaturas,
// teclado (← →) e deslizar no celular.
export default function Gallery({ lotId, title, views = ['Obra inteira'], sold = false }) {
  const [index, setIndex] = useState(0);
  const [failed, setFailed] = useState({});
  const [touchX, setTouchX] = useState(null);
  const count = views.length;
  const go = (step) => setIndex((i) => (i + step + count) % count);

  useEffect(() => {
    // Pré-carrega as outras vistas para a troca ser instantânea
    views.forEach((_, v) => { if (v) new Image().src = lotImageUrl(lotId, v); });
  }, [lotId, views]);

  function onKey(e) {
    if (e.key === 'ArrowRight') go(1);
    if (e.key === 'ArrowLeft') go(-1);
  }

  return (
    <div className="gallery" role="region" aria-roledescription="carrossel" aria-label={`Imagens de ${title}`}>
      <div
        className={`gallery-main ${index > 0 ? 'detail' : ''}`}
        tabIndex={0}
        onKeyDown={onKey}
        onTouchStart={(e) => setTouchX(e.touches[0].clientX)}
        onTouchEnd={(e) => {
          if (touchX == null) return;
          const dx = e.changedTouches[0].clientX - touchX;
          if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1);
          setTouchX(null);
        }}
      >
        {failed[index]
          ? <div className="img-fallback" role="img" aria-label={title}>Imagem indisponível</div>
          : <img key={index} src={lotImageUrl(lotId, index)} alt={`${title} · ${views[index]}`} onError={() => setFailed((f) => ({ ...f, [index]: true }))} />}
        {sold && <span className="sold-dot" title="Arrematado" aria-label="Arrematado" />}
        {count > 1 && (
          <>
            <button type="button" className="gallery-arrow prev" aria-label="Imagem anterior" onClick={() => go(-1)}>←</button>
            <button type="button" className="gallery-arrow next" aria-label="Próxima imagem" onClick={() => go(1)}>→</button>
          </>
        )}
        <span className="gallery-count" aria-live="polite">{index + 1} / {count} · {views[index]}</span>
      </div>

      {count > 1 && (
        <div className="gallery-thumbs">
          {views.map((label, v) => (
            <button key={label} type="button" aria-label={label} aria-current={v === index} onClick={() => setIndex(v)}>
              <img src={lotImageUrl(lotId, v)} alt="" loading="lazy" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
