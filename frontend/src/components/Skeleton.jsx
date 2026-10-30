// Esqueleto exibido enquanto a lista carrega (no lugar de "Carregando…")
export function CardSkeletons({ count = 8 }) {
  return (
    <div className="lot-grid" aria-busy="true" aria-label="Carregando lotes">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="sk-card">
          <div className="skeleton" />
          <div className="skeleton sk-line" style={{ width: '40%' }} />
          <div className="skeleton sk-line" style={{ width: '75%' }} />
          <div className="skeleton sk-line" style={{ width: '55%' }} />
        </div>
      ))}
    </div>
  );
}

export function RowSkeletons({ count = 3 }) {
  return (
    <div aria-busy="true" aria-label="Carregando">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="skeleton" style={{ height: 96, margin: '16px 0' }} />
      ))}
    </div>
  );
}
