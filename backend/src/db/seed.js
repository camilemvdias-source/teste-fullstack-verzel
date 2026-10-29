import 'dotenv/config';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import { pool } from './pool.js';

if (!process.env.PUBLIC_CODE_SECRET) {
  throw new Error('PUBLIC_CODE_SECRET não definida. Confira o backend/.env');
}

// Senha das contas de teste (pode trocar com SEED_PASSWORD no .env)
const SEED_PASSWORD = process.env.SEED_PASSWORD || 'Leilao@2026';

// Valores em centavos: 1000000 = R$ 10.000,00
const users = [
  { name: 'Leiloeiro Teste', email: 'leiloeiro@teste.com', role: 'auctioneer', balance: 0 },
  { name: 'Licitante Um', email: 'licitante1@teste.com', role: 'bidder', balance: 1000000 },
  { name: 'Licitante Dois', email: 'licitante2@teste.com', role: 'bidder', balance: 1000000 },
];

const client = await pool.connect();

try {
  await client.query('BEGIN');
  const passwordHash = await bcrypt.hash(SEED_PASSWORD, 10);

  for (const u of users) {
    // Se o e-mail já existe, não faz nada. Assim o seed pode rodar várias
    // vezes sem duplicar usuário nem zerar saldos de uma demonstração.
    const inserted = await client.query(
      `INSERT INTO users (name, email, password_hash, role, balance_total)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (email) DO NOTHING
       RETURNING id`,
      [u.name, u.email, passwordHash, u.role, u.balance]
    );

    if (inserted.rowCount === 0) {
      console.log(`já existe: ${u.email}`);
      continue;
    }

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

    if (u.balance > 0) {
      await client.query(
        `INSERT INTO ledger (user_id, type, amount) VALUES ($1, 'deposit', $2)`,
        [id, u.balance]
      );
    }

    console.log(`criado: ${u.email} (${u.role})`);
  }

  await client.query('COMMIT');
  console.log('Seed concluído');
} catch (err) {
  await client.query('ROLLBACK').catch(() => {});
  console.error('Erro no seed:', err.code, err.message);
  process.exitCode = 1;
} finally {
  client.release();
  await pool.end();
}