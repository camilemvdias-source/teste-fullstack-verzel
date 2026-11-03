// Estados padronizados das telas: vazio e erro (o carregando fica em Skeleton.jsx).
// Toda tela usa os mesmos, para a interface se comportar igual em todo lugar.

export function EmptyState({ title, children, action }) {
  return (
    <div className="state" role="status">
      <span className="state-mark" aria-hidden="true" />
      <h3>{title}</h3>
      {children && <p>{children}</p>}
      {action}
    </div>
  );
}

export function ErrorState({ message, onRetry }) {
  return (
    <div className="state state-error" role="alert">
      <span className="state-mark" aria-hidden="true" />
      <h3>Não foi possível carregar</h3>
      <p>{message}</p>
      {onRetry && <button type="button" className="btn" onClick={onRetry}>Tentar de novo</button>}
    </div>
  );
}

// Aviso dentro da página (sucesso, erro de uma ação, alerta)
export function Notice({ kind = 'error', children, action }) {
  return (
    <div className={`notice notice-${kind}`} role={kind === 'error' ? 'alert' : 'status'}>
      <p>{children}</p>
      {action}
    </div>
  );
}

export function PageHeader({ eyebrow, title, children, actions }) {
  return (
    <header className="page-head">
      <div>
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        <h1>{title}</h1>
        {children && <p>{children}</p>}
      </div>
      {actions && <div className="row-actions">{actions}</div>}
    </header>
  );
}

// "Lote 004": numeração de catálogo
export function LotNumber({ id }) {
  return <span className="lot-no">Lote {String(id).padStart(3, '0')}</span>;
}
