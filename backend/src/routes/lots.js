import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../db/pool.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { getArtwork, ExternalApiError } from '../services/artic.js';

const router = Router();

// O status é calculado pelo horário (agendado, ao vivo ou encerrado).
// Só "cancelled" e "ended" ficam gravados na coluna status.
const STATUS_SQL = `CASE
  WHEN status = 'cancelled' THEN 'cancelled'
  WHEN status = 'ended' THEN 'ended'
  WHEN now() < starts_at THEN 'scheduled'
  WHEN now() < ends_at THEN 'live'
  ELSE 'ended'
END`;

// Valores em centavos: 100000 = R$ 1.000,00
const createLotSchema = z
  .object({
    externalId: z.coerce
      .number({ error: 'Informe o id da obra' })
      .int()
      .positive('Id da obra inválido'),
    startingBid: z
      .number({ error: 'Informe o lance inicial (em centavos)' })
      .int('O lance inicial deve ser inteiro (em centavos)')
      .positive('O lance inicial deve ser maior que zero'),
    minIncrement: z
      .number({ error: 'Informe o incremento mínimo (em centavos)' })
      .int('O incremento deve ser inteiro (em centavos)')
      .positive('O incremento mínimo deve ser maior que zero'),
    startsAt: z.coerce.date({ error: 'Data de início inválida' }),
    endsAt: z.coerce.date({ error: 'Data de fim inválida' }),
  })
  .refine((d) => d.startsAt < d.endsAt, {
    message: 'O início precisa ser antes do fim',
    path: ['endsAt'],
  })
  .refine((d) => d.endsAt > new Date(), {
    message: 'O fim precisa estar no futuro',
    path: ['endsAt'],
  });

const listSchema = z.object({
  status: z.enum(['live', 'scheduled', 'ended']).optional(),
});

const idSchema = z.coerce.number().int().positive();

// Não expõe nada do leiloeiro (nome, e-mail) nem do líder: só dados do lote.
function formatLot(row, { detail = false } = {}) {
  const startingBid = Number(row.starting_bid);
  const minIncrement = Number(row.min_increment);
  const currentBid = row.current_bid == null ? null : Number(row.current_bid);

  const lot = {
    id: row.id,
    title: row.title,
    imageUrl: row.image_url,
    status: row.effective_status,
    startingBid,
    minIncrement,
    currentBid,
    nextMinBid: currentBid == null ? startingBid : currentBid + minIncrement,
    bidCount: row.bid_count,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
  };

  if (detail) {
    lot.externalId = row.external_id;
    lot.attributes = row.attributes;
    lot.serverTime = row.server_time;
  }

  return lot;
}

router.post('/', requireAuth, requireRole('auctioneer'), async (req, res) => {
  const parsed = createLotSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: 'Dados inválidos',
      details: parsed.error.flatten().fieldErrors,
    });
  }

  const { externalId, startingBid, minIncrement, startsAt, endsAt } = parsed.data;

  try {
    // Busca a obra no museu e COPIA os dados para o nosso banco.
    // Depois disso, o lote não depende mais da API externa.
    const artwork = await getArtwork(externalId);
    if (!artwork) {
      return res
        .status(404)
        .json({ error: 'Obra não encontrada na API do museu (ou sem imagem).' });
    }

    const result = await pool.query(
      `INSERT INTO lots
         (auctioneer_id, external_id, title, image_url, attributes,
          starting_bid, min_increment, starts_at, ends_at)
       VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7, $8, $9)
       RETURNING *, ${STATUS_SQL} AS effective_status, now() AS server_time`,
      [
        req.user.id,
        artwork.externalId,
        artwork.title,
        artwork.imageUrl,
        JSON.stringify(artwork.attributes),
        startingBid,
        minIncrement,
        startsAt,
        endsAt,
      ]
    );

    res.status(201).json(formatLot(result.rows[0], { detail: true }));
  } catch (err) {
    if (err instanceof ExternalApiError) {
      console.error('API externa indisponível ao criar lote:', err.message);
      return res.status(503).json({
        error: 'Não foi possível buscar os dados da obra agora. Tente novamente em instantes.',
      });
    }
    console.error('Erro ao criar lote:', err.code, err.message);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// Vitrine pública (sem login). Nunca devolve lotes cancelados.
router.get('/', async (req, res) => {
  const parsed = listSchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({
      error: 'Status inválido. Use live, scheduled ou ended.',
    });
  }

  const { status } = parsed.data;
  const params = [];
  let where = `effective_status <> 'cancelled'`;
  if (status) {
    params.push(status);
    where += ' AND effective_status = $1';
  }

  try {
    // Ordem: ao vivo (quem termina antes primeiro), agendados (quem começa
    // antes primeiro) e encerrados (os mais recentes primeiro).
    const result = await pool.query(
      `SELECT * FROM (
         SELECT lots.*, ${STATUS_SQL} AS effective_status FROM lots
       ) AS t
       WHERE ${where}
       ORDER BY
         CASE effective_status WHEN 'live' THEN 0 WHEN 'scheduled' THEN 1 ELSE 2 END,
         (CASE WHEN effective_status = 'ended' THEN ends_at END) DESC NULLS LAST,
         ends_at ASC
       LIMIT 100`,
      params
    );

    res.json({ items: result.rows.map((row) => formatLot(row)) });
  } catch (err) {
    console.error('Erro ao listar lotes:', err.code, err.message);
    res.status(500).json({ error: 'Erro interno' });
  }
});

router.get('/:id', async (req, res) => {
  const id = idSchema.safeParse(req.params.id);
  if (!id.success) {
    return res.status(400).json({ error: 'Id inválido' });
  }

  try {
    const result = await pool.query(
      `SELECT *, ${STATUS_SQL} AS effective_status, now() AS server_time
       FROM lots WHERE id = $1`,
      [id.data]
    );
    const row = result.rows[0];

    if (!row || row.effective_status === 'cancelled') {
      return res.status(404).json({ error: 'Lote não encontrado' });
    }

    res.json(formatLot(row, { detail: true }));
  } catch (err) {
    console.error('Erro ao buscar lote:', err.code, err.message);
    res.status(500).json({ error: 'Erro interno' });
  }
});

export default router;