// Busca de obras na API pública do Art Institute of Chicago.
// Se a API cair, a aplicação continua funcionando: usamos um cache em memória.

const API_URL = process.env.ARTIC_API_URL || 'https://api.artic.edu/api/v1';
const DEFAULT_IIIF_URL = 'https://www.artic.edu/iiif/2';
const TIMEOUT_MS = 5000;

// O museu usa uma proteção anti-robô (Cloudflare). Sem identificar o app, a API
// responde 403 ("Just a moment..."). Com estes cabeçalhos a busca passa.
export const HEADERS = {
  'User-Agent': 'CasaDeLeiloes/1.0 (teste tecnico Verzel)',
  'AIC-User-Agent': 'CasaDeLeiloes (teste tecnico Verzel)',
};
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutos
const CACHE_MAX_ENTRIES = 100;

const cache = new Map();

export class ExternalApiError extends Error {}

export async function searchArtworks(query) {
  const key = query.toLowerCase();
  const cached = cache.get(key);

  // 1) Busca recente: responde direto do cache, sem chamar a API
  if (cached && Date.now() - cached.savedAt < CACHE_TTL_MS) {
    return { items: cached.items, source: 'cache' };
  }

  try {
    const params = new URLSearchParams({
      q: query,
      limit: '12',
      fields: 'id,title,artist_display,date_display,image_id',
    });

    const response = await fetch(`${API_URL}/artworks/search?${params}`, {
      headers: HEADERS,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!response.ok) {
      throw new Error(`A API respondeu com status ${response.status}`);
    }

    const json = await response.json();
    const iiifUrl = json.config?.iiif_url || DEFAULT_IIIF_URL;

    // Só obras que têm imagem, com poucos campos
    const items = (json.data || [])
      .filter((art) => art.image_id)
      .map((art) => ({
        id: art.id,
        title: art.title,
        artist: art.artist_display,
        date: art.date_display,
        imageUrl: `${iiifUrl}/${art.image_id}/full/843,/0/default.jpg`,
      }));

    if (cache.size >= CACHE_MAX_ENTRIES) {
      cache.delete(cache.keys().next().value); // remove a mais antiga
    }
    cache.set(key, { items, savedAt: Date.now() });

    return { items, source: 'api' };
  } catch (err) {
    // 2) API fora do ar ou lenta: usa o cache antigo, se existir
    if (cached) {
      return { items: cached.items, source: 'cache-antigo' };
    }
    throw new ExternalApiError(err.message);
  }
}

// Busca os detalhes de UMA obra, para copiar os dados para o nosso banco
// na hora de criar o lote. Devolve null se a obra não existe ou não tem imagem.
export async function getArtwork(id) {
  try {
    const params = new URLSearchParams({
      fields:
        'id,title,artist_display,date_display,medium_display,dimensions,place_of_origin,image_id',
    });

    const response = await fetch(`${API_URL}/artworks/${id}?${params}`, {
      headers: HEADERS,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    if (response.status === 404) return null;
    if (!response.ok) {
      throw new Error(`A API respondeu com status ${response.status}`);
    }

    const json = await response.json();
    const art = json.data;
    if (!art || !art.image_id) return null;

    const iiifUrl = json.config?.iiif_url || DEFAULT_IIIF_URL;

    return {
      externalId: String(art.id),
      title: art.title,
      imageUrl: `${iiifUrl}/${art.image_id}/full/843,/0/default.jpg`,
      attributes: {
        artist: art.artist_display ?? null,
        date: art.date_display ?? null,
        medium: art.medium_display ?? null,
        dimensions: art.dimensions ?? null,
        placeOfOrigin: art.place_of_origin ?? null,
        source: 'Art Institute of Chicago',
        sourceUrl: `https://www.artic.edu/artworks/${art.id}`,
      },
    };
  } catch (err) {
    throw new ExternalApiError(err.message);
  }
}