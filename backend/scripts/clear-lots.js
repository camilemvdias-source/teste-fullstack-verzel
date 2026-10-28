// Apaga os lotes cadastrados e tudo que depende deles (lances, comprovantes e
// movimentações ligadas a lote). Os USUÁRIOS e os depósitos são mantidos.
// Os saldos são recalculados a partir do extrato restante e o valor
// comprometido em lances volta a zero.
//
// Uso (dentro de backend):
//   node scripts/clear-lots.js             -> só mostra o que seria apagado
//   node scripts/clear-lots.js --confirm   -> apaga de verdade
//   node scripts/clear-lots.js --confirm --email=leiloeiro@teste.com
//                                          -> apaga só os lotes desse leiloeiro
import 'dotenv/config';
import { pool } from '../src/db/pool.js';

const confirm = process.argv.includes('--confirm');
const emailArg = process.argv.find((a) => a.startsWith('--email='));
const email = emailArg ? emailArg.split('=')[1] : null;

const client = await pool.connect();
try {
  await client.query('BEGIN');

  const lots = await client.query(
    `SELECT l.id, l.title, l.status, l.bid_count, u.email
       FROM lots l JOIN users u ON u.id = l.auctioneer_id
      WHERE ($1::text IS NULL OR u.email = $1)
      ORDER BY l.id`,
    [email]
  );
  const ids = lots.rows.map((l) => l.id);

  console.log(`Lotes encontrados: ${ids.length}`);
  for (const l of lots.rows) {
    console.log(`  #${l.id} ${l.title} [${l.status}] ${l.bid_count} lance(s) — ${l.email}`);
  }

  if (ids.length === 0) {
    await client.query('ROLLBACK');
    console.log('Nada para apagar.');
  } else {
    const r = await client.query('DELETE FROM receipts WHERE lot_id = ANY($1::int[])', [ids]);
    const b = await client.query('DELETE FROM bids WHERE lot_id = ANY($1::int[])', [ids]);
    const g = await client.query('DELETE FROM ledger WHERE lot_id = ANY($1::int[])', [ids]);
    await client.query('DELETE FROM lots WHERE id = ANY($1::int[])', [ids]);

    // Saldo = soma do extrato que sobrou; nada fica preso em lance
    await client.query(`
      UPDATE users u SET
        balance_committed = 0,
        balance_total = COALESCE((
          SELECT SUM(CASE WHEN type = 'settlement_debit' THEN -amount ELSE amount END)
            FROM ledger WHERE user_id = u.id
        ), 0)`);

    console.log(`Comprovantes: ${r.rowCount} | Lances: ${b.rowCount} | Movimentações: ${g.rowCount}`);

    if (confirm) {
      await client.query('COMMIT');
      console.log('Pronto: registros apagados e saldos recalculados.');
    } else {
      await client.query('ROLLBACK');
      console.log('Simulação: nada foi alterado. Rode de novo com --confirm para apagar.');
    }
  }
} catch (err) {
  await client.query('ROLLBACK').catch(() => {});
  console.error('Erro:', err.code, err.message);
  process.exitCode = 1;
} finally {
  client.release();
  await pool.end();
}