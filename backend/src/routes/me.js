import { Router } from 'express';
import { pool } from '../db/pool.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.get('/', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, name, email, role, balance_total, balance_committed, public_code
       FROM users WHERE id = $1`,
      [req.user.id]
    );
    const user = result.rows[0];

    if (!user) {
      return res.status(401).json({ error: 'Usuário não encontrado' });
    }

    const total = Number(user.balance_total);
    const committed = Number(user.balance_committed);

    res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      publicCode: user.public_code,
      balance: { total, committed, available: total - committed },
    });
  } catch (err) {
    console.error('Erro no /me:', err.code, err.message);
    res.status(500).json({ error: 'Erro interno' });
  }
});

export default router;