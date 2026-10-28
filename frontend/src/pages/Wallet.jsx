import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client.js';
import { useAuth } from '../auth/AuthContext.jsx';
import { brl, formatDateTime, parseBrlToCents } from '../lib/format.js';

const TYPE_LABEL = {
  deposit: 'Depósito',
  settlement_debit: 'Arremate (débito)',
  settlement_credit: 'Venda (crédito)',
};

export default function Wallet() {
  const { user, refreshUser } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');
  const [amountText, setAmountText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    try {
      setData(await api('/wallet'));
    } catch (err) {
      setError(err.message);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleDeposit(e) {
    e.preventDefault();
    setError('');
    setOk('');
    const cents = parseBrlToCents(amountText);
    if (cents == null) return setError('Digite um valor válido.');
    setSubmitting(true);
    try {
      await api('/wallet/deposit', { method: 'POST', body: { amount: cents } });
      setOk(`Depósito de ${brl(cents)} realizado.`);
      setAmountText('');
      await Promise.all([load(), refreshUser()]);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  const b = data?.balance;

  return (
    <>
      <h1>Carteira</h1>
      {error && <div className="alert alert-error" role="alert">{error}</div>}
      {ok && <div className="alert alert-success" role="status">{ok}</div>}

      {b && (
        <div className="balance-grid">
          <div className="card"><span className="muted">Disponível</span><strong>{brl(b.available)}</strong></div>
          <div className="card"><span className="muted">Comprometido em lances</span><strong>{brl(b.committed)}</strong></div>
          <div className="card"><span className="muted">Total</span><strong>{brl(b.total)}</strong></div>
        </div>
      )}

      {user?.role === 'bidder' && (
        <form className="card" onSubmit={handleDeposit} style={{ margin: '16px 0' }}>
          <h3>Depositar</h3>
          <div className="field">
            <label htmlFor="deposit">Valor (R$)</label>
            <input id="deposit" inputMode="decimal" placeholder="1.000,00" value={amountText} onChange={(e) => setAmountText(e.target.value)} />
          </div>
          <button className="btn btn-primary" type="submit" disabled={submitting}>{submitting ? 'Aguarde…' : 'Depositar'}</button>
        </form>
      )}

      <div className="card">
        <h3>Extrato</h3>
        {!data && !error && <p className="muted">Carregando…</p>}
        {data?.transactions.length === 0 && <p className="muted">Nenhuma movimentação ainda.</p>}
        {data?.transactions.length > 0 && (
          <table className="table">
            <thead><tr><th>Data</th><th>Tipo</th><th>Lote</th><th className="num">Valor</th></tr></thead>
            <tbody>
              {data.transactions.map((t) => (
                <tr key={t.id}>
                  <td>{formatDateTime(t.createdAt)}</td>
                  <td>{TYPE_LABEL[t.type] ?? t.type}</td>
                  <td>{t.lotId ? <Link to={`/lotes/${t.lotId}`}>#{t.lotId}</Link> : '—'}</td>
                  <td className={`num ${t.type === 'settlement_debit' ? 'neg' : 'pos'}`}>
                    {t.type === 'settlement_debit' ? '−' : '+'}{brl(t.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
