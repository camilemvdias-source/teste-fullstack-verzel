import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, ApiError } from '../api/client.js';
import ArtImage from '../components/ArtImage.jsx';
import { brl, formatDateTime } from '../lib/format.js';
import { copyLink } from '../lib/share.js';

// Página pública: qualquer pessoa com o link vê o comprovante (sem nome nem e-mail).
export default function Receipt() {
  const { token } = useParams();
  const [receipt, setReceipt] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    api(`/receipts/${token}`, { auth: false })
      .then((d) => setReceipt(d.receipt))
      .catch((err) => {
        if (err instanceof ApiError && err.status === 404) setNotFound(true);
        else setError(err.message);
      });
  }, [token]);

  if (notFound) return <p className="center muted">Comprovante não encontrado. <Link to="/">Voltar à vitrine</Link></p>;
  if (error) return <div className="alert alert-error" role="alert">{error}</div>;
  if (!receipt) return <p className="center muted">Carregando…</p>;

  const { lot } = receipt;

  return (
    <div className="lot-detail">
      <div className="lot-frame"><ArtImage className="lot-image" lotId={lot.id} alt={lot.title} /></div>
      <div className="card">
        <span className="eyebrow">Comprovante de arremate · Lote {lot.id}</span>
        {lot.attributes?.artistName && <p className="lot-artist" style={{ marginTop: 8 }}>{lot.attributes.artistName}</p>}
        <h1 className="title-art">{lot.title}</h1>

        <dl className="attrs" style={{ marginTop: 16 }}>
          <div><dt>Valor final</dt><dd><strong className="lot-price-big">{brl(receipt.amount)}</strong></dd></div>
          <div><dt>Vencedor</dt><dd>Licitante #{receipt.winnerCode}</dd></div>
          <div><dt>Leilão encerrado em</dt><dd>{formatDateTime(lot.endedAt)}</dd></div>
          <div><dt>Emitido em</dt><dd>{formatDateTime(receipt.issuedAt)}</dd></div>
          <div><dt>Selo final (HMAC-SHA256)</dt><dd className="hash">{receipt.finalHash}</dd></div>
        </dl>

        <p style={{ marginTop: 16 }}>
          <Link to={`/auditoria/${lot.id}`}>Ver auditoria do lote</Link>
        </p>
        <div className="section-tools no-print" style={{ marginTop: 16 }}>
          <button type="button" className="btn btn-dark" onClick={async () => setCopied(await copyLink(`/comprovante/${token}`))}>{copied ? 'Link copiado' : 'Copiar link'}</button>
          <button type="button" className="btn" onClick={() => window.print()}>Imprimir</button>
        </div>
      </div>
    </div>
  );
}
