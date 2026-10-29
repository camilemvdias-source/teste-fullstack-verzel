import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../db/pool.js';

const router = Router();

const tokenSchema = z.string().uuid();

// Comprovante público (sem login), aberto por um link com o token.
// Privacidade: aparece só o código anônimo do vencedor, nunca nome ou e-mail.
router.get('/:publicToken', async (req, res) => {
  const token = tokenSchema.safeParse(req.params.publicToken);
  if (!token.success) {
    return res.status(404).json({ error: 'Comprovante não encontrado' });
  }

  try {
    const result = await pool.query(
      `SELECT r.amount, r.final_hash, r.created_at,
              l.id AS lot_id, l.title, l.image_url, l.attributes, l.ends_at,
              w.public_code AS winner_code
       FROM receipts r
       JOIN lots l ON l.id = r.lot_id
       JOIN users w ON w.id = r.winner_id
       WHERE r.public_token = $1`,
      [token.data]
    );
    const row = result.rows[0];

    if (!row) {
      return res.status(404).json({ error: 'Comprovante não encontrado' });
    }

    res.json({
      receipt: {
        lot: {
          id: row.lot_id,
          title: row.title,
          imageUrl: row.image_url,
          attributes: row.attributes,
          endedAt: row.ends_at,
        },
        amount: Number(row.amount),
        winnerCode: row.winner_code,
        issuedAt: row.created_at,
        finalHash: row.final_hash,
        // O front usa este caminho para o link "ver auditoria do lote"
        auditPath: `/audit/${row.lot_id}`,
      },
    });
  } catch (err) {
    console.error('Erro ao buscar comprovante:', err.code, err.message);
    res.status(500).json({ error: 'Erro interno' });
  }
});

export default router;
