import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../db/pool.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { GENESIS_HASH, computeBidHash } from '../services/hashChain.js';

const router = Router();

// Anti-sniping: lance nos últimos 2 minutos empurra o fim em +2 minutos
const ANTI_SNIPING_MS = 2 * 60 * 1000;

const idSchema = z.coerce.number().int().positive();

// Valores em centavos: 100000 = R$ 1.000,00
const bidSchema = z.object({
  amount: z
    .number({ error: 'Informe o valor do lance (em centavos)' })
    .int('O lance deve ser inteiro (em centavos)')
    .positive('O lance deve ser maior que zero'),
});

function brl(cents) {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

router.post('/:id/bids', requireAuth, requireRole('bidder'), async (req, res) => {
  const id = idSchema.safeParse(req.params.id);
  if (!id.success) {
    return res.status(400).json({ error: 'Id inválido', code: 'INVALID_ID' });
  }

  const parsed = bidSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: parsed.error.issues[0]?.message ?? 'Dados inválidos',
      code: 'INVALID_AMOUNT',
    });
  }

  const amount = parsed.data.amount;
  const bidderId = req.user.id;
  let client;

  try {
    client = await pool.connect();
    await client.query('BEGIN');

    // Desfaz a transação e responde com o motivo da recusa
    const refuse = async (status, code, error, extra = {}) => {
      await client.query('ROLLBACK');
      return res.status(status).json({ error, code, ...extra });
    };

    // 1) Trava o lote. Dois lances ao mesmo tempo entram em fila: o segundo só
    //    continua depois que o primeiro terminar e já enxerga o lance atual novo.
    //    clock_timestamp() é lido DEPOIS da trava, então já é a hora real.
    const lotResult = await client.query(
      `SELECT id, status, starting_bid, min_increment, starts_at, ends_at,
              current_bid, current_leader_id, last_hash, bid_count,
              clock_timestamp() AS db_now
       FROM lots WHERE id = $1 FOR UPDATE`,
      [id.data]
    );
    const lot = lotResult.rows[0];

    if (!lot) {
      return await refuse(404, 'LOT_NOT_FOUND', 'Lote não encontrado');
    }

    // 2) Validações, uma por vez, cada uma com a sua mensagem
    const now = new Date(lot.db_now);

    if (lot.status === 'cancelled') {
      return await refuse(409, 'LOT_CANCELLED', 'Este lote foi cancelado.');
    }
    if (lot.status === 'ended' || now >= new Date(lot.ends_at)) {
      return await refuse(409, 'LOT_ENDED', 'Este lote já foi encerrado.');
    }
    if (now < new Date(lot.starts_at)) {
      return await refuse(409, 'LOT_NOT_STARTED', 'Este lote ainda não começou.');
    }

    const prevLeaderId =
      lot.current_leader_id == null ? null : Number(lot.current_leader_id);

    if (prevLeaderId === bidderId) {
      return await refuse(409, 'ALREADY_LEADER', 'Você já está liderando este lote.');
    }

    const startingBid = Number(lot.starting_bid);
    const increment = Number(lot.min_increment);
    const hasBids = lot.current_bid != null;
    const minimumBid = hasBids ? Number(lot.current_bid) + increment : startingBid;

    if (amount < minimumBid) {
      return await refuse(
        422,
        'BID_TOO_LOW',
        `Lance abaixo do mínimo. O menor lance aceito agora é ${brl(minimumBid)}.`,
        { minimumBid }
      );
    }

    // 3) Trava as carteiras (a sua e a do líder anterior). Sempre em ordem de id,
    //    para duas transações nunca ficarem esperando uma pela outra (deadlock).
    const walletIds = [
      ...new Set([bidderId, prevLeaderId].filter((v) => v != null)),
    ].sort((a, b) => a - b);

    const wallets = await client.query(
      `SELECT id, balance_total, balance_committed, public_code
       FROM users WHERE id = ANY($1::int[]) ORDER BY id FOR UPDATE`,
      [walletIds]
    );
    const bidder = wallets.rows.find((w) => Number(w.id) === bidderId);

    if (!bidder) {
      return await refuse(401, 'USER_NOT_FOUND', 'Usuário não encontrado.');
    }
    if (!bidder.public_code) {
      throw new Error(`Usuário ${bidderId} sem public_code`);
    }

    const available = Number(bidder.balance_total) - Number(bidder.balance_committed);
    if (amount > available) {
      return await refuse(
        422,
        'INSUFFICIENT_BALANCE',
        `Saldo insuficiente. Você tem ${brl(available)} disponível.`,
        { available }
      );
    }

    // 4) Devolve o dinheiro comprometido do líder anterior (ele foi superado)
    if (prevLeaderId != null) {
      await client.query(
        'UPDATE users SET balance_committed = balance_committed - $1 WHERE id = $2',
        [Number(lot.current_bid), prevLeaderId]
      );
    }

    // 5) Compromete o valor do novo lance
    const updatedBidder = await client.query(
      `UPDATE users SET balance_committed = balance_committed + $1
       WHERE id = $2
       RETURNING balance_total, balance_committed`,
      [amount, bidderId]
    );

    // 6) Grava o lance com o selo encadeado (hash)
    const seq = lot.bid_count + 1;
    const prevHash = lot.last_hash || GENESIS_HASH;
    const createdAt = now;
    const hash = computeBidHash({
      lotId: lot.id,
      seq,
      publicCode: bidder.public_code,
      amount,
      createdAt,
      prevHash,
    });

    await client.query(
      `INSERT INTO bids (lot_id, bidder_id, amount, created_at, seq, prev_hash, hash)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [lot.id, bidderId, amount, createdAt, seq, prevHash, hash]
    );

    // 7) Anti-sniping: faltando 2 minutos ou menos, o fim é empurrado em +2 minutos
    const endsAt = new Date(lot.ends_at);
    const extended = endsAt.getTime() - now.getTime() <= ANTI_SNIPING_MS;
    const newEndsAt = extended ? new Date(endsAt.getTime() + ANTI_SNIPING_MS) : endsAt;

    await client.query(
      `UPDATE lots
       SET current_bid = $1, current_leader_id = $2, last_hash = $3,
           bid_count = $4, ends_at = $5
       WHERE id = $6`,
      [amount, bidderId, hash, seq, newEndsAt, lot.id]
    );

    await client.query('COMMIT');

    const total = Number(updatedBidder.rows[0].balance_total);
    const committed = Number(updatedBidder.rows[0].balance_committed);

    res.status(201).json({
      bid: { lotId: lot.id, seq, amount, createdAt: createdAt.toISOString() },
      lot: {
        currentBid: amount,
        nextMinBid: amount + increment,
        bidCount: seq,
        endsAt: newEndsAt.toISOString(),
        extended,
      },
      balance: { total, committed, available: total - committed },
    });
  } catch (err) {
    if (client) await client.query('ROLLBACK').catch(() => {});
    console.error('Erro ao registrar lance:', err.code, err.message);
    res.status(500).json({ error: 'Erro interno', code: 'INTERNAL_ERROR' });
  } finally {
    if (client) client.release();
  }
});

export default router;
