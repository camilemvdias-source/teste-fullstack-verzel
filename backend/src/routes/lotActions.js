import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../db/pool.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();

const idSchema = z.coerce.number().int().positive();

// Cancela um lote. Só o leiloeiro dono, só antes de encerrar e só se ainda não recebeu lances
// (regra do enunciado). Sem lances não há valor comprometido, então não há o que estornar.
router.post('/:id/cancel', requireAuth, requireRole('auctioneer'), async (req, res) => {
  const id = idSchema.safeParse(req.params.id);
  if (!id.success) {
    return res.status(400).json({ error: 'Id inválido' });
  }

  let client;

  try {
    client = await pool.connect();
    await client.query('BEGIN');

    // Desfaz a transação e responde com o erro
    const refuse = async (status, error) => {
      await client.query('ROLLBACK');
      return res.status(status).json({ error });
    };

    // FOR UPDATE trava a linha do lote: enquanto cancelamos, ninguém consegue
    // dar um lance neste lote (e vice-versa). Sem isso, um lance poderia
    // entrar no mesmo instante e o lote seria cancelado COM lance.
    const result = await client.query(
      `SELECT id, auctioneer_id, status, bid_count, current_bid, current_leader_id, (now() >= ends_at) AS time_over
       FROM lots WHERE id = $1 FOR UPDATE`,
      [id.data]
    );
    const lot = result.rows[0];

    if (!lot) {
      return await refuse(404, 'Lote não encontrado');
    }
    if (lot.auctioneer_id !== req.user.id) {
      return await refuse(403, 'Você só pode cancelar os seus próprios lotes');
    }
    if (lot.status === 'cancelled') {
      return await refuse(409, 'Este lote já foi cancelado');
    }
    if (lot.status === 'ended' || lot.time_over) {
      return await refuse(409, 'Este lote já foi encerrado');
    }

    // bid_count é lido com o lote travado: um lance que chegou antes do cancelamento já aparece aqui.
    if (lot.bid_count > 0 || lot.current_leader_id != null) {
      return await refuse(409, 'Este lote já recebeu lances e não pode mais ser cancelado');
    }

    await client.query(`UPDATE lots SET status = 'cancelled' WHERE id = $1`, [lot.id]);
    await client.query('COMMIT');

    res.json({ id: lot.id, status: 'cancelled', refunded: 0 });
  } catch (err) {
    if (client) await client.query('ROLLBACK').catch(() => {});
    console.error('Erro ao cancelar lote:', err.code, err.message);
    res.status(500).json({ error: 'Erro interno' });
  } finally {
    if (client) client.release();
  }
});

export default router;