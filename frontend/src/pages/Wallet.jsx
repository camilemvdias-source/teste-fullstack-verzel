import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client.js';
import { useAuth } from '../auth/useAuth.js';
import { brl, formatDateTime, parseBrlToCents } from '../lib/format.js';
import { BalanceBar } from '../components/Charts.jsx';
import { EmptyState, ErrorState, Notice, PageHeader } from '../components/States.jsx';
import { RowSkeletons } from '../components/Skeleton.jsx';

const TYPE_LABEL = {
  deposit: 'Depósito',
  settlement_debit: 'Arremate',
  settlement_credit: 'Venda',
};
const PRESETS = [50000, 100000, 500000];

export default function Wallet() {
  const { user, refreshUser } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [depositError, setDepositError] = useState('');
  const [ok, setOk] = useState('');
  const [amountText, setAmountText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const isBidder = user?.role === 'bidder';

  const load = useCallback(async () => {
    try {
      setData(await api('/wallet'));
      setError('');
    } catch (err) {
      setError(err.message);
    }
  }, []);

  useEffect(() => {
    const first = setTimeout(load, 0);
    return () => clearTimeout(first);
  }, [load]);

  async function handleDeposit(e) {
    e.preventDefault();
    setDepositError('');
    setOk('');
    const cents = parseBrlToCents(amountText);
    if (cents == null) return setDepositError('Digite um valor válido, por exemplo 1.000,00.');
    setSubmitting(true);
    try {
      await api('/wallet/deposit', { method: 'POST', body: { amount: cents } });
      setOk(`Depósito de ${brl(cents)} realizado.`);
      setAmountText('');
      await Promise.all([load(), refreshUser()]);
    } catch (err) {
      setDepositError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  const b = data?.balance;

  return (
    <div className="page">
      <PageHeader eyebrow="Sua conta" title="Carteira">
        {isBidder
          ? 'Ao dar um lance, o valor fica reservado. Se alguém cobrir, ele volta na hora para o seu disponível.'
          : 'O valor de cada lote vendido entra aqui quando o leilão é liquidado.'}
      </PageHeader>

      {error && !data && <ErrorState message={error} onRetry={load} />}
      {!data && !error && <RowSkeletons count={2} />}

      {b && (
        <div className="wallet">
          <div>
            <div className="stats">
              <div className="stat"><span className="eyebrow"><span className="swatch" style={{ background: 'var(--ok)' }} />Disponível</span><strong>{brl(b.available)}</strong></div>
              {isBidder && <div className="stat"><span className="eyebrow"><span className="swatch" style={{ background: 'var(--warn)' }} />Reservado em lances</span><strong>{brl(b.committed)}</strong></div>}
              <div className="stat"><span className="eyebrow">Total</span><strong>{brl(b.total)}</strong></div>
            </div>
            {isBidder && <BalanceBar available={b.available} committed={b.committed} />}

            <h2 style={{ marginBottom: 16 }}>Extrato</h2>
            {data.transactions.length === 0
              ? <EmptyState title="Nenhuma movimentação ainda">{isBidder ? 'Faça um depósito para começar a dar lances.' : 'As vendas aparecem aqui quando seus lotes forem arrematados.'}</EmptyState>
              : (
                <div className="table-wrap">
                  <table className="table">
                    <thead><tr><th>Data</th><th>Movimento</th><th>Lote</th><th className="num">Valor</th></tr></thead>
                    <tbody>
                      {data.transactions.map((t) => (
                        <tr key={t.id}>
                          <td className="muted">{formatDateTime(t.createdAt)}</td>
                          <td>{TYPE_LABEL[t.type] ?? t.type}</td>
                          <td>{t.lotId ? <Link to={`/lotes/${t.lotId}`} className="mono">Nº {String(t.lotId).padStart(3, '0')}</Link> : <span className="muted">—</span>}</td>
                          <td className={`num ${t.type === 'settlement_debit' ? 'neg' : 'pos'}`}>
                            {t.type === 'settlement_debit' ? '−' : '+'}{brl(t.amount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
          </div>

          {isBidder && (
            <form className="panel" onSubmit={handleDeposit} noValidate>
              <div className="panel-sec">
                <h2 style={{ fontSize: '1.3rem', marginBottom: 6 }}>Depositar</h2>
                <p className="small muted" style={{ margin: 0 }}>Ambiente de demonstração: o valor entra na hora, sem cobrança.</p>
              </div>
              <div className="panel-sec">
                {ok && <Notice kind="success">{ok}</Notice>}
                {depositError && <Notice kind="error">{depositError}</Notice>}
                <label htmlFor="deposit" className="eyebrow" style={{ marginBottom: 8 }}>Valor</label>
                <div className="money">
                  <span className="cur">R$</span>
                  <input id="deposit" inputMode="decimal" placeholder="1.000,00" value={amountText} onChange={(e) => setAmountText(e.target.value)} />
                </div>
                <div className="chips" style={{ margin: '12px 0 16px' }}>
                  {PRESETS.map((v) => (
                    <button key={v} type="button" className="chip mono" onClick={() => setAmountText((v / 100).toFixed(2).replace('.', ','))}>+{brl(v)}</button>
                  ))}
                </div>
                <button className="btn btn-primary btn-block" type="submit" disabled={submitting}>{submitting ? 'Depositando…' : 'Depositar'}</button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
