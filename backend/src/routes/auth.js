import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import { z } from 'zod';
import { pool } from '../db/pool.js';

if (!process.env.PUBLIC_CODE_SECRET) {
  throw new Error('PUBLIC_CODE_SECRET não definida. Confira o backend/.env');
}

if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET não definida. Confira o backend/.env');
}

const router = Router();

const registerSchema = z.object({
  name: z.string().trim().min(2, 'Nome muito curto'),
  email: z.string().trim().toLowerCase().email('E-mail inválido'),
  password: z.string().min(6, 'A senha precisa ter ao menos 6 caracteres'),
  role: z.enum(['auctioneer', 'bidder']),
});

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('E-mail inválido'),
  password: z.string().min(1, 'Informe a senha'),
});

router.post('/register', async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: 'Dados inválidos',
      details: parsed.error.flatten().fieldErrors,
    });
  }

  const { name, email, password, role } = parsed.data;
  let client;

  try {
    client = await pool.connect();
    await client.query('BEGIN');

    const passwordHash = await bcrypt.hash(password, 10);
    const inserted = await client.query(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [name, email, passwordHash, role]
    );
    const id = inserted.rows[0].id;

    const publicCode = crypto
      .createHmac('sha256', process.env.PUBLIC_CODE_SECRET)
      .update(String(id))
      .digest('hex')
      .slice(0, 8)
      .toUpperCase();

    await client.query('UPDATE users SET public_code = $1 WHERE id = $2', [
      publicCode,
      id,
    ]);

    await client.query('COMMIT');
    res.status(201).json({ id, name, email, role });
  } catch (err) {
    if (client) await client.query('ROLLBACK').catch(() => {});
    if (err.code === '23505') {
      return res.status(409).json({ error: 'E-mail já cadastrado' });
    }
    console.error('Erro no cadastro:', err.code, err.message);
    res.status(500).json({ error: 'Erro interno' });
  } finally {
    if (client) client.release();
  }
});

router.post('/login', async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: 'Dados inválidos',
      details: parsed.error.flatten().fieldErrors,
    });
  }

  const { email, password } = parsed.data;

  try {
    const result = await pool.query(
      'SELECT id, name, email, role, password_hash FROM users WHERE email = $1',
      [email]
    );
    const user = result.rows[0];

    // Mesma mensagem para e-mail inexistente e senha errada,
    // para não revelar quais e-mails estão cadastrados.
    const passwordOk =
      user && (await bcrypt.compare(password, user.password_hash));
    if (!passwordOk) {
      return res.status(401).json({ error: 'E-mail ou senha incorretos' });
    }

    const token = jwt.sign(
      { sub: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });
  } catch (err) {
    console.error('Erro no login:', err.code, err.message);
    res.status(500).json({ error: 'Erro interno' });
  }
});

export default router;