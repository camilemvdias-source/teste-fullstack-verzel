import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { pool } from './db/pool.js';

const app = express();

app.use(cors());
app.use(express.json());

app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ ok: true, db: 'conectado' });
  } catch (err) {
    res.status(500).json({ ok: false, db: 'erro' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`API rodando na porta ${PORT}`);
});