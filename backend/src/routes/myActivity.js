import { Router } from 'express';
import { pool } from '../db/pool.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();

// Montado em /me  ->  GET /me/bids  e  GET /me/wins  (só licitante)

// Lotes em que eu dei lance, com a minha situação em cada um
router.get('/bids', requireAuth, requireRole('bidder'), async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT l.id, l.title, l.image_url, l.status, l.ends_at, l.current_bid,
              l.current_leader_id, l.winner_id, l.final_price,
              s.my_best_bid, s.my_bid_count,
              (CASE
                 WHEN l.status = 'ended' THEN 'ended'
                 WHEN now() < l.starts_at THEN 'scheduled'
                 WHEN now() < l.ends_at THEN 'live'
                 ELSE 'ended'
               END) AS effective_status
       FROM (
         SELECT lot_id, MAX(amount) AS my_best_bid, COUNT(*) AS my_bid_count
         FROM bids WHERE bidder_id = $1 GROUP BY lot_id
       ) s
       JOIN lots l ON l.id = s.lot_id
       WHERE l.status <> 'cancelled'
       ORDER BY l.ends_at DESC`,
      [req.user.id]
    );

    const items = result.rows.map((row) => {
      const iAmLeader = Number(row.current_leader_id) === req.user.id;
      let position;

      if (row.effective_status === 'ended') {
        if (row.winner_id != null) {
          position = Number(row.winner_id) === req.user.id ? 'won' : 'lost';
        } else {
          // Já passou do horário, mas a liquidação ainda não rodou (leva segundos)
          position = 'settling';
        }
      } else {
        position = iAmLeader ? 'winning' : 'outbid';
      }

      return {
        lotId: row.id,
        title: row.title,
        imageUrl: row.image_url,
        status: row.effective_status,
        endsAt: row.ends_at,
        currentBid: row.current_bid == null ? null : Number(row.current_bid),
        myBestBid: Number(row.my_best_bid),
        myBidCount: Number(row.my_bid_count),
        position, // winning | outbid | won | lost | settling
      };
    });

    res.json({ items });
  } catch (err) {
    console.error('Erro em /me/bids:', err.code, err.message);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// Lotes que eu arrematei, com o link do comprovante
router.get('/wins', requireAuth, requireRole('bidder'), async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT r.public_token, r.amount, r.created_at,
              l.id AS lot_id, l.title, l.image_url
       FROM receipts r
       JOIN lots l ON l.id = r.lot_id
       WHERE r.winner_id = $1
       ORDER BY r.created_at DESC, r.id DESC`,
      [req.user.id]
    );

    res.json({
      items: result.rows.map((row) => ({
        lotId: row.lot_id,
        title: row.title,
        imageUrl: row.image_url,
        amount: Number(row.amount),
        wonAt: row.created_at,
        receiptToken: row.public_token,
        receiptPath: `/receipts/${row.public_token}`,
      })),
    });
  } catch (err) {
    console.error('Erro em /me/wins:', err.code, err.message);
    res.status(500).json({ error: 'Erro interno' });
  }
});

export default router;
