import crypto from 'node:crypto';
import { pool } from '../db/pool.js';

// Cada lote é liquidado isoladamente. O lock e o status terminal tornam o job idempotente.
export async function settleExpiredLots() {
  const candidates = await pool.query(
    "SELECT id FROM lots WHERE status IN ('live', 'scheduled') AND starts_at <= now() AND ends_at <= now() ORDER BY ends_at LIMIT 50"
  );
  for (const candidate of candidates.rows) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const result = await client.query(
        `SELECT id, auctioneer_id, status, current_bid, current_leader_id, last_hash,
                (starts_at <= clock_timestamp() AND ends_at <= clock_timestamp()) AS expired
         FROM lots WHERE id = $1 FOR UPDATE`, [candidate.id]
      );
      const lot = result.rows[0];
      if (!lot || !['live', 'scheduled'].includes(lot.status) || !lot.expired) {
        await client.query('ROLLBACK');
        continue;
      }

      if (lot.current_leader_id != null && lot.current_bid != null) {
        const winnerId = Number(lot.current_leader_id);
        const amount = Number(lot.current_bid);
        const ids = [...new Set([winnerId, Number(lot.auctioneer_id)])].sort((a, b) => a - b);
        const usersResult = await client.query(
          'SELECT id, balance_total, balance_committed FROM users WHERE id = ANY($1::int[]) ORDER BY id FOR UPDATE', [ids]
        );
        const users = new Map(usersResult.rows.map((u) => [Number(u.id), u]));
        const winner = users.get(winnerId);
        const auctioneer = users.get(Number(lot.auctioneer_id));
        if (!winner || !auctioneer) throw new Error(`Carteira ausente ao liquidar lote ${lot.id}`);
        if (Number(winner.balance_total) < amount || Number(winner.balance_committed) < amount) {
          throw new Error(`Saldo comprometido inconsistente no lote ${lot.id}`);
        }

        await client.query(
          'UPDATE users SET balance_total = balance_total - $1, balance_committed = balance_committed - $1 WHERE id = $2', [amount, winnerId]
        );
        await client.query('UPDATE users SET balance_total = balance_total + $1 WHERE id = $2', [amount, Number(lot.auctioneer_id)]);
        await client.query(
          "INSERT INTO ledger (user_id, type, amount, lot_id) VALUES ($1, 'settlement_debit', $2, $3), ($4, 'settlement_credit', $2, $3)",
          [winnerId, amount, lot.id, Number(lot.auctioneer_id)]
        );
        await client.query(
          `INSERT INTO receipts (lot_id, winner_id, amount, public_token, final_hash)
           VALUES ($1, $2, $3, $4, $5)`,
          [lot.id, winnerId, amount, crypto.randomUUID(), lot.last_hash || '0'.repeat(64)]
        );
        await client.query(
          "UPDATE lots SET status = 'ended', winner_id = $1, final_price = $2 WHERE id = $3", [winnerId, amount, lot.id]
        );
      } else {
        await client.query("UPDATE lots SET status = 'ended', winner_id = NULL, final_price = NULL WHERE id = $1", [lot.id]);
      }
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK').catch(() => {});
      console.error(`Falha ao liquidar lote ${candidate.id}:`, err.code, err.message);
    } finally { client.release(); }
  }
}
