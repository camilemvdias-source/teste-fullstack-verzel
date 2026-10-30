import 'dotenv/config';
import { assertAuditSecret } from './services/hashChain.js';
assertAuditSecret();
import express from 'express';
import cors from 'cors';
import { pool } from './db/pool.js';
import authRoutes from './routes/auth.js';
import meRoutes from './routes/me.js';
import externalRoutes from './routes/external.js';
import lotsRoutes from './routes/lots.js';
import lotActionsRoutes from './routes/lotActions.js';
import bidsRoutes from './routes/bids.js';
import walletRoutes from './routes/wallet.js';
import auditRoutes from './routes/audit.js';
import receiptsRoutes from './routes/receipts.js';
import myActivityRoutes from './routes/myActivity.js';
import myLotsRoutes from './routes/myLots.js';
import { settleExpiredLots } from './services/settlement.js';
import { ensureLiveDemoLots } from './services/demo.js';

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
app.use('/me', myActivityRoutes);
app.use('/my-lots', myLotsRoutes);
app.use('/external', externalRoutes);
app.use('/lots', lotsRoutes);
app.use('/lots', lotActionsRoutes);
app.use('/lots', bidsRoutes);
app.use('/wallet', walletRoutes);
app.use('/audit', auditRoutes);
app.use('/receipts', receiptsRoutes);

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

// Job de liquidação: a cada 5 segundos fecha os lotes que já terminaram.
// "running" impede duas rodadas ao mesmo tempo se uma demorar mais que 5s.
const SETTLEMENT_INTERVAL_MS = 5000;
let running = false;

async function runSettlement() {
  if (running) return;
  running = true;
  try {
    await settleExpiredLots();
  } catch (err) {
    console.error('Erro no job de liquidação:', err.message);
  } finally {
    running = false;
  }
}

// Vitrine viva (opcional, DEMO_KEEPALIVE=true): na subida e a cada hora, abre lotes
// de demonstração novos se a vitrine ficou com menos de 3 lotes ao vivo.
async function runKeepAlive() {
  try {
    const created = await ensureLiveDemoLots();
    if (created > 0) console.log(`Vitrine viva: ${created} lote(s) de demonstração aberto(s)`);
  } catch (err) {
    console.error('Erro na vitrine viva:', err.message);
  }
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`API rodando na porta ${PORT}`);
  runSettlement();
  setInterval(runSettlement, SETTLEMENT_INTERVAL_MS);
  if (process.env.DEMO_KEEPALIVE === 'true') {
    runKeepAlive();
    setInterval(runKeepAlive, 60 * 60 * 1000);
  }
});
