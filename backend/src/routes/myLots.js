import { Router } from 'express';
import { pool } from '../db/pool.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();

// Painel do leiloeiro: os meus lotes e o resultado de cada um
router.get('/', requireAuth, requireRole('auctioneer'), async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT l.id, l.title, l.image_url, l.status, l.starts_at, l.ends_at,
              l.starting_bid, l.current_bid, l.bid_count, l.winner_id,
              l.final_price, w.public_code AS winner_code,
              (CASE
                 WHEN l.status IN ('cancelled', 'ended') THEN l.status
                 WHEN now() < l.starts_at THEN 'scheduled'
                 WHEN now() < l.ends_at THEN 'live'
                 ELSE 'ended'
               END) AS effective_status
       FROM lots l
       LEFT JOIN users w ON w.id = l.winner_id
       WHERE l.auctioneer_id = $1
       ORDER BY l.id DESC`,
      [req.user.id]
    );

    let totalReceived = 0;
    let soldCount = 0;

    const items = result.rows.map((row) => {
      const status = row.effective_status;
      const sold = row.winner_id != null;

      if (sold) {
        totalReceived += Number(row.final_price);
        soldCount += 1;
      }

      return {
        id: row.id,
        title: row.title,
        imageUrl: row.image_url,
        status,
        startsAt: row.starts_at,
        endsAt: row.ends_at,
        startingBid: Number(row.starting_bid),
        currentBid: row.current_bid == null ? null : Number(row.current_bid),
        bidCount: row.bid_count,
        // O botão "cancelar" só aparece quando ainda é possível
        canCancel: status !== 'cancelled' && status !== 'ended',
        // Resultado só faz sentido para lote encerrado
        result:
          status === 'ended'
            ? sold
              ? { sold: true, finalPrice: Number(row.final_price), winnerCode: row.winner_code }
              : { sold: false, finalPrice: null, winnerCode: null }
            : null,
      };
    });

    res.json({ items, summary: { totalReceived, soldCount } });
  } catch (err) {
    console.error('Erro em /my-lots:', err.code, err.message);
    res.status(500).json({ error: 'Erro interno' });
  }
});

export default router;
