import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../db/pool.js';
import { verifyChain } from '../services/audit.js';

const router = Router();

const idSchema = z.coerce.number().int().positive();

// Página pública de auditoria (sem login).
// Mostra o histórico completo e diz se a cadeia de selos está íntegra.
// Privacidade: aparece só o código anônimo do licitante, nunca nome ou e-mail.
router.get('/:lotId', async (req, res) => {
  const lotId = idSchema.safeParse(req.params.lotId);
  if (!lotId.success) {
    return res.status(400).json({ error: 'Id inválido' });
  }

  try {
    const lotResult = await pool.query(
      `SELECT l.id, l.title, l.status, l.starts_at, l.ends_at, l.bid_count,
              l.last_hash, l.final_price, w.public_code AS winner_code,
              (CASE
                 WHEN l.status IN ('cancelled', 'ended') THEN l.status
                 WHEN now() < l.starts_at THEN 'scheduled'
                 WHEN now() < l.ends_at THEN 'live'
                 ELSE 'ended'
               END) AS effective_status
       FROM lots l
       LEFT JOIN users w ON w.id = l.winner_id
       WHERE l.id = $1`,
      [lotId.data]
    );
    const lot = lotResult.rows[0];

    if (!lot || lot.effective_status === 'cancelled') {
      return res.status(404).json({ error: 'Lote não encontrado' });
    }

    const bidsResult = await pool.query(
      `SELECT b.seq, b.amount, b.created_at, b.prev_hash, b.hash, u.public_code
       FROM bids b
       JOIN users u ON u.id = b.bidder_id
       WHERE b.lot_id = $1
       ORDER BY b.seq ASC`,
      [lot.id]
    );
    const bids = bidsResult.rows;

    const receiptResult = await pool.query(
      'SELECT final_hash FROM receipts WHERE lot_id = $1',
      [lot.id]
    );

    const verification = verifyChain({
      lotId: lot.id,
      bidCount: lot.bid_count,
      lastHash: lot.last_hash,
      bids,
      receiptFinalHash: receiptResult.rows[0]?.final_hash ?? null,
    });

    res.json({
      lot: {
        id: lot.id,
        title: lot.title,
        status: lot.effective_status,
        startsAt: lot.starts_at,
        endsAt: lot.ends_at,
        bidCount: lot.bid_count,
        finalPrice: lot.final_price == null ? null : Number(lot.final_price),
        winnerCode: lot.winner_code ?? null,
        finalHash: lot.last_hash ?? null,
      },
      verification: { ...verification, checkedBids: bids.length },
      bids: bids.map((b) => ({
        seq: b.seq,
        bidderCode: b.public_code,
        amount: Number(b.amount),
        createdAt: b.created_at,
        prevHash: b.prev_hash,
        hash: b.hash,
      })),
    });
  } catch (err) {
    console.error('Erro na auditoria:', err.code, err.message);
    res.status(500).json({ error: 'Erro interno' });
  }
});

export default router;