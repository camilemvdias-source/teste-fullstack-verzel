import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, ApiError } from '../api/client.js';
import ArtImage from '../components/ArtImage.jsx';
import Logo from '../components/Logo.jsx';
import { EmptyState, ErrorState, LotNumber } from '../components/States.jsx';
import { brl, formatDateTime } from '../lib/format.js';
import { copyLink } from '../lib/share.js';

// Página pública: qualquer pessoa com o link vê o comprovante (sem nome nem e-mail).
export default function Receipt() {
  const { token } = useParams();
  const [receipt, setReceipt] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const load = useCallback(() => {
    setError('');
    api(`/receipts/${token}`, { auth: false })
      .then((d) => setReceipt(d.receipt))
      .catch((err) => {
        if (err instanceof ApiError && err.status === 404) setNotFound(true);
        else setError(err.message);
      });
  }, [token]);

  useEffect(() => {
    const first = setTimeout(load, 0);
    return () => clearTimeout(first);
  }, [load]);

  if (notFound) {
    return <div className="page"><EmptyState title="Comprovante não encontrado" action={<Link to="/" className="btn">Voltar ao catálogo</Link>}>Confira se o link foi copiado inteiro.</EmptyState></div>;
  }
  if (error) return <div className="page"><ErrorState message={error} onRetry={load} /></div>;
  if (!receipt) return <div className="page"><div className="skeleton" style={{ height: 420, maxWidth: 860, margin: '0 auto' }} /></div>;

  const { lot } = receipt;

  return (
    <div className="page">
      <article className="certificate">
        <div className="certificate-inner">
          <ArtImage lotId={lot.id} alt={lot.title} sold eager />
          <div className="certificate-body">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
              <Logo />
              <LotNumber id={lot.id} />
            </div>
            <hr className="rule" style={{ margin: '18px 0' }} />
            <span className="eyebrow">Comprovante de arremate</span>
            {lot.attributes?.artistName && <p className="lot-artist" style={{ margin: '12px 0 0' }}>{lot.attributes.artistName}</p>}
            <h1>{lot.title}</h1>

            <span className="eyebrow">Valor final</span>
            <p className="certificate-total">{brl(receipt.amount)}</p>

            <dl className="facts">
              <div><dt>Vencedor</dt><dd className="mono">Licitante #{receipt.winnerCode}</dd></div>
              <div><dt>Encerrado</dt><dd>{formatDateTime(lot.endedAt)}</dd></div>
              <div><dt>Emitido</dt><dd>{formatDateTime(receipt.issuedAt)}</dd></div>
              <div><dt>Selo final</dt><dd className="hash">{receipt.finalHash}</dd></div>
            </dl>

            <div className="certificate-foot no-print">
              <button type="button" className="btn btn-primary" onClick={async () => setCopied(await copyLink(`/comprovante/${token}`))}>{copied ? 'Link copiado' : 'Copiar link'}</button>
              <button type="button" className="btn btn-ghost" onClick={() => window.print()}>Imprimir</button>
              <Link to={`/auditoria/${lot.id}`} className="btn btn-quiet">Conferir na auditoria →</Link>
            </div>
          </div>
        </div>
      </article>
    </div>
  );
}
