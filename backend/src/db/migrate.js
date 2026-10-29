import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool } from './pool.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');

try {
  await pool.query(sql);
  console.log('Schema aplicado com sucesso');
} catch (err) {
  console.error('Erro ao aplicar schema:', err.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}