import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { searchArtworks, ExternalApiError, IIIF_URL } from '../services/artic.js';
import { fetchMuseumImage } from '../services/images.js';

const router = Router();

const searchSchema = z.object({
  q: z.string().trim().min(2, 'Digite ao menos 2 letras').max(100),
});

// image_id do museu (UUID): só monta URLs do servidor IIIF do próprio museu
const imageIdSchema = z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);

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

// Miniatura de um resultado da busca (o navegador não consegue pedir direto ao museu).
// Sem login porque <img> não manda o token; só aceita image_id e tamanho fixo.
router.get('/images/:imageId', async (req, res) => {
  const imageId = imageIdSchema.safeParse(req.params.imageId);
  if (!imageId.success) return res.status(404).json({ error: 'Imagem não encontrada' });

  try {
    const img = await fetchMuseumImage(`${IIIF_URL}/${imageId.data}/full/400,/0/default.jpg`, {
      store: false,
    });
    res.set('Content-Type', img.type);
    res.set('Cache-Control', 'public, max-age=86400');
    res.set('Cross-Origin-Resource-Policy', 'cross-origin');
    res.send(img.body);
  } catch (err) {
    console.error('Miniatura indisponível:', err.message);
    res.status(502).json({ error: 'Imagem indisponível no momento' });
  }
});

export default router;
