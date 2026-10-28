import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, ApiError } from '../api/client.js';
import ArtImage from '../components/ArtImage.jsx';
import { brl, formatDateTime } from '../lib/format.js';

// Página pública: qualquer pessoa com o link vê o comprovante (sem nome nem e-mail).
export default function Receipt() {
  const { token } = useParams();
  const [receipt, setReceipt] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState('');

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
      <ArtImage className="lot-image" lotId={lot.id} alt={lot.title} />
      <div className="card">
        <span className="badge badge-live">Comprovante de arremate</span>
        <h1>{lot.title}</h1>

        <dl className="attrs">
          <div><dt>Valor final</dt><dd><strong className="lot-price-big">{brl(receipt.amount)}</strong></dd></div>
          <div><dt>Vencedor</dt><dd>Licitante #{receipt.winnerCode}</dd></div>
          <div><dt>Leilão encerrado em</dt><dd>{formatDateTime(lot.endedAt)}</dd></div>
          <div><dt>Emitido em</dt><dd>{formatDateTime(receipt.issuedAt)}</dd></div>
          <div><dt>Selo final (SHA-256)</dt><dd className="hash">{receipt.finalHash}</dd></div>
        </dl>

        <p style={{ marginTop: 16 }}>
          <Link to={`/auditoria/${lot.id}`}>Ver auditoria do lote</Link>
        </p>
      </div>
    </div>
  );
}
