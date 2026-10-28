import 'dotenv/config';
import pg from 'pg';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL não definida. Confira o backend/.env');
}

export const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  // Banco local (Docker) não usa SSL: defina DATABASE_SSL=false
  ssl: process.env.DATABASE_SSL === 'false' ? false : { rejectUnauthorized: false },
});