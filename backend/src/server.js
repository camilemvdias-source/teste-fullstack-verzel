import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { pool } from './db/pool.js';
import authRoutes from './routes/auth.js';
import meRoutes from './routes/me.js';
import { requireAuth, requireRole } from './middleware/auth.js';

const app = express();

// FRONTEND_URL aceita um ou mais endereços separados por vírgula.
// Se não estiver definida, o CORS fica aberto (útil no desenvolvimento).
const allowedOrigins = process.env.FRONTEND_URL
  ? process.env.FRONTEND_URL.split(',').map((url) => url.trim().replace(/\/$/, ''))
  : true;

app.use(cors({ origin: allowedOrigins }));
app.use(express.json());

app.use('/auth', authRoutes);
app.use('/me', meRoutes);

// TEMPORÁRIO: só para testar os papéis (remover no Dia 3)
app.get('/teste/leiloeiro', requireAuth, requireRole('auctioneer'), (req, res) => {
  res.json({ ok: true, mensagem: 'Área do leiloeiro' });
});
app.get('/teste/licitante', requireAuth, requireRole('bidder'), (req, res) => {
  res.json({ ok: true, mensagem: 'Área do licitante' });
});

app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ ok: true, db: 'conectado' });
  } catch (err) {
    console.error('Erro no /health:', err.code, err.message);
    res.status(500).json({ ok: false, db: 'erro' });
  }
});

// Tratamento de erros: sempre responde em JSON
app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'JSON inválido' });
  }
  console.error('Erro não tratado:', err.message);
  res.status(500).json({ error: 'Erro interno' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`API rodando na porta ${PORT}`);
});