import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../db/pool.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();
const depositSchema = z.object({
  amount: z.number({ error: 'Informe o valor do depósito em centavos' })
    .int('O depósito deve ser inteiro (em centavos)')
    .positive('O depósito deve ser maior que zero')
    .max(100000000, 'O depósito excede o limite permitido'),
});

router.post('/deposit', requireAuth, requireRole('bidder'), async (req, res) => {
  const parsed = depositSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message || 'Depósito inválido' });
  const amount = parsed.data.amount;
  let client;
  try {
    client = await pool.connect();
    await client.query('BEGIN');
    const locked = await client.query(
      'SELECT id, balance_total, balance_committed FROM users WHERE id = $1 FOR UPDATE',
      [req.user.id]
    );
    if (!locked.rows[0]) {
      await client.query('ROLLBACK');
      return res.status(401).json({ error: 'Usuário não encontrado' });
    }
    const updated = await client.query(
      'UPDATE users SET balance_total = balance_total + $1 WHERE id = $2 RETURNING balance_total, balance_committed',
      [amount, req.user.id]
    );
    const wallet = updated.rows[0];
    const ledger = await client.query(
      "INSERT INTO ledger (user_id, type, amount) VALUES ($1, 'deposit', $2) RETURNING id, created_at",
      [req.user.id, amount]
    );
    await client.query('COMMIT');
    return res.status(201).json({
      transaction: { id: ledger.rows[0].id, type: 'deposit', amount, createdAt: ledger.rows[0].created_at },
      balance: { total: Number(wallet.balance_total), committed: Number(wallet.balance_committed), available: Number(wallet.balance_total) - Number(wallet.balance_committed) },
    });
  } catch (err) {
    if (client) await client.query('ROLLBACK').catch(() => {});
    console.error('Erro no depósito:', err.code, err.message);
    return res.status(500).json({ error: 'Erro interno ao realizar depósito' });
  } finally { if (client) client.release(); }
});

router.get('/', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, balance_total, balance_committed FROM users WHERE id = $1`, [req.user.id]
    );
    const user = result.rows[0];
    if (!user) return res.status(401).json({ error: 'Usuário não encontrado' });
    const ledger = await pool.query(
      `SELECT id, type, amount, lot_id AS "lotId", created_at AS "createdAt"
       FROM ledger WHERE user_id = $1 ORDER BY created_at DESC, id DESC LIMIT 100`, [req.user.id]
    );
    const total = Number(user.balance_total);
    const committed = Number(user.balance_committed);
    return res.json({ balance: { total, committed, available: total - committed }, transactions: ledger.rows.map((row) => ({ ...row, amount: Number(row.amount) })) });
  } catch (err) {
    console.error('Erro ao consultar carteira:', err.code, err.message);
    return res.status(500).json({ error: 'Erro interno ao consultar carteira' });
  }
});

export default router;
