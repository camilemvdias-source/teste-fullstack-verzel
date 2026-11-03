// Esqueletos com o formato do conteúdo, exibidos enquanto a lista carrega
export function CardSkeletons({ count = 8 }) {
  return (
    <div className="lot-grid" aria-busy="true" aria-label="Carregando lotes">
      {Array.from({ length: count }, (_, i) => (
        <div key={i}>
          <div className="skeleton" style={{ aspectRatio: '4 / 5' }} />
          <div className="skeleton sk-line" style={{ width: '30%', marginTop: 16 }} />
          <div className="skeleton sk-line" style={{ width: '50%' }} />
          <div className="skeleton sk-line" style={{ width: '80%', height: 18 }} />
        </div>
      ))}
    </div>
  );
}

export function RowSkeletons({ count = 3 }) {
  return (
    <div aria-busy="true" aria-label="Carregando">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="row">
          <div className="skeleton" style={{ width: 96, height: 110 }} />
          <div>
            <div className="skeleton sk-line" style={{ width: '20%' }} />
            <div className="skeleton sk-line" style={{ width: '60%', height: 18 }} />
            <div className="skeleton sk-line" style={{ width: '40%' }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export function RoomSkeleton() {
  return (
    <div className="room" aria-busy="true" aria-label="Carregando lote">
      <div className="skeleton" style={{ minHeight: 480 }} />
      <div>
        <div className="skeleton sk-line" style={{ width: '30%' }} />
        <div className="skeleton sk-line" style={{ width: '80%', height: 40 }} />
        <div className="skeleton" style={{ height: 320, marginTop: 24 }} />
      </div>
    </div>
  );
}
