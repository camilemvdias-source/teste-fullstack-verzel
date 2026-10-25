import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { searchArtworks, ExternalApiError } from '../services/artic.js';

const router = Router();

const searchSchema = z.object({
  q: z.string().trim().min(2, 'Digite ao menos 2 letras').max(100),
});

router.get('/search', requireAuth, requireRole('auctioneer'), async (req, res) => {
  const parsed = searchSchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({
      error: 'Dados inválidos',
      details: parsed.error.flatten().fieldErrors,
    });
  }

  try {
    const { items, source } = await searchArtworks(parsed.data.q);
    res.json({ items, source });
  } catch (err) {
    if (err instanceof ExternalApiError) {
      console.error('API externa indisponível:', err.message);
      return res.status(503).json({
        error: 'A busca de obras está indisponível no momento. Tente novamente em instantes.',
      });
    }
    console.error('Erro na busca externa:', err.message);
    res.status(500).json({ error: 'Erro interno' });
  }
});

export default router;