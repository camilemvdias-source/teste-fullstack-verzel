// Migração única: converte os selos antigos (SHA-256 sem chave) para HMAC-SHA256.
// Uso (com DATABASE_URL e AUDIT_SECRET definidos):
//   node scripts/reseal-audit.js            # simulação, não altera nada
//   node scripts/reseal-audit.js --confirm  # aplica
// Só refaz um lote se a cadeia ANTIGA estiver íntegra hoje; lotes já em HMAC são ignorados;
// lotes inconsistentes são apenas listados (nada é apagado). Rode UMA vez, logo após o deploy,
// confiando no estado atual do banco: depois disso o verificador só aceita HMAC.
import 'dotenv/config';
import crypto from 'node:crypto';
import { pool } from '../src/db/pool.js';
import { GENESIS_HASH, computeBidHash, assertAuditSecret } from '../src/services/hashChain.js';
import { verifyChain } from '../src/services/audit.js';

assertAuditSecret();
const confirm = process.argv.includes('--confirm');

function legacyHash({ lotId, seq, publicCode, amount, createdAt, prevHash }) {
  const data = [lotId, seq, publicCode, amount, createdAt.toISOString(), prevHash].join('|');
  return crypto.createHash('sha256').update(data).digest('hex');
}

const lots = (await pool.query('SELECT id FROM lots WHERE bid_count > 0 ORDER BY id')).rows;
let resealed = 0, already = 0, skipped = 0;

for (const { id } of lots) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const lot = (await client.query(
      'SELECT id, bid_count, last_hash FROM lots WHERE id = $1 FOR UPDATE', [id])).rows[0];
    const bids = (await client.query(
      `SELECT b.id, b.seq, b.amount, b.created_at, b.prev_hash, b.hash, u.public_code
       FROM bids b JOIN users u ON u.id = b.bidder_id WHERE b.lot_id = $1 ORDER BY b.seq`, [id])).rows;
    const receipt = (await client.query(
      'SELECT final_hash FROM receipts WHERE lot_id = $1', [id])).rows[0];
    const input = {
      lotId: lot.id, bidCount: lot.bid_count, lastHash: lot.last_hash,
      bids, receiptFinalHash: receipt ? receipt.final_hash : null,
    };

    if (verifyChain(input).intact) { already++; await client.query('ROLLBACK'); continue; }
    const legacy = verifyChain(input, legacyHash);
    if (!legacy.intact) {
      console.log(`lote ${id}: PULADO (cadeia antiga inconsistente: ${legacy.code})`);
      skipped++; await client.query('ROLLBACK'); continue;
    }

    let prev = GENESIS_HASH;
    for (const b of bids) {
      const hash = computeBidHash({
        lotId: lot.id, seq: b.seq, publicCode: b.public_code,
        amount: Number(b.amount), createdAt: new Date(b.created_at), prevHash: prev,
      });
      await client.query('UPDATE bids SET prev_hash = $1, hash = $2 WHERE id = $3', [prev, hash, b.id]);
      prev = hash;
    }
    await client.query('UPDATE lots SET last_hash = $1 WHERE id = $2', [prev, lot.id]);
    if (receipt) await client.query('UPDATE receipts SET final_hash = $1 WHERE lot_id = $2', [prev, lot.id]);
    if (confirm) await client.query('COMMIT'); else await client.query('ROLLBACK');
    console.log(`lote ${id}: ${confirm ? 'refeito' : 'seria refeito'} (${bids.length} lances)`);
    resealed++;
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error(`lote ${id}: ERRO`, err.message); skipped++;
  } finally { client.release(); }
}
console.log(`\nrefeitos: ${resealed} | já em HMAC: ${already} | pulados: ${skipped}${confirm ? '' : ' (simulação)'}`);
await pool.end();
