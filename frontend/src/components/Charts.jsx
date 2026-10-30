import { brl } from '../lib/format.js';

// Quanto do leilão já passou (0 a 1), do início ao fim
export function TimeBar({ startsAt, endsAt, now = Date.now(), urgent = false }) {
  const start = Date.parse(startsAt);
  const end = Date.parse(endsAt);
  const done = Math.min(1, Math.max(0, (now - start) / (end - start)));
  return (
    <div className={`timebar ${urgent ? 'urgent' : ''}`} role="progressbar" aria-label="Tempo de leilão decorrido" aria-valuenow={Math.round(done * 100)} aria-valuemin={0} aria-valuemax={100}>
      <i style={{ width: `${done * 100}%` }} />
    </div>
  );
}

// Evolução dos lances: degraus do lance inicial até o atual
export function BidChart({ bids, startingBid }) {
  if (bids.length === 0) return null;
  const W = 520, H = 150, P = 10;
  const values = [startingBid, ...bids.map((b) => b.amount)];
  const min = Math.min(...values), max = Math.max(...values);
  const x = (i) => P + (i * (W - 2 * P)) / Math.max(1, bids.length);
  const y = (v) => H - P - ((v - min) / (max - min || 1)) * (H - 2 * P - 18);
  let d = `M ${x(0)} ${y(startingBid)}`;
  bids.forEach((b, i) => { d += ` H ${x(i + 1)} V ${y(b.amount)}`; });
  const last = bids[bids.length - 1];
  return (
    <svg className="bidchart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Lances de ${brl(startingBid)} a ${brl(last.amount)}`}>
      <line x1={P} x2={W - P} y1={y(startingBid)} y2={y(startingBid)} className="base" />
      <path d={`${d} H ${W - P} V ${H - P} H ${x(0)} Z`} className="area" />
      <path d={`${d} H ${W - P}`} className="line" />
      {bids.map((b, i) => <circle key={b.seq} cx={x(i + 1)} cy={y(b.amount)} r="3.5" className={b.mine ? 'dot mine' : 'dot'} />)}
      <text x={W - P} y={y(last.amount) - 8} textAnchor="end" className="label">{brl(last.amount)}</text>
      <text x={P} y={y(startingBid) - 6} className="label muted">{brl(startingBid)}</text>
    </svg>
  );
}

// Carteira: disponível x comprometido numa barra só
export function BalanceBar({ available, committed }) {
  const total = available + committed || 1;
  return (
    <div className="balancebar" aria-hidden="true">
      <i className="avail" style={{ width: `${(available / total) * 100}%` }} />
      <i className="held" style={{ width: `${(committed / total) * 100}%` }} />
    </div>
  );
}
