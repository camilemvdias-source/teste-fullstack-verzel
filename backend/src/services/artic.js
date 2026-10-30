// Busca de obras na API pública do Art Institute of Chicago.
// Se a API cair, a aplicação continua funcionando: usamos um cache em memória.

const API_URL = process.env.ARTIC_API_URL || 'https://api.artic.edu/api/v1';
export const IIIF_URL = 'https://www.artic.edu/iiif/2';
const TIMEOUT_MS = 5000;

// O museu usa uma proteção anti-robô (Cloudflare). Sem identificar o app, a API
// responde 403 ("Just a moment..."). Com estes cabeçalhos a busca passa.
export const HEADERS = {
  'User-Agent': 'CasaDeLeiloes/1.0 (teste tecnico Verzel)',
  'AIC-User-Agent': 'CasaDeLeiloes (teste tecnico Verzel)',
};
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutos
const CACHE_MAX_ENTRIES = 100;

// A casa só leiloa pinturas em domínio público (CC0): são as únicas com imagem
// liberada em boa resolução, e o leiloeiro não vê no resultado gravuras, fotos etc.
const PAINTINGS_FILTER = {
  bool: {
    filter: [
      { term: { is_public_domain: true } },
      { term: { 'artwork_type_title.keyword': 'Painting' } },
      { exists: { field: 'image_id' } },
    ],
  },
};

const cache = new Map();

export class ExternalApiError extends Error {}

// Dados da obra no formato que o lote grava (POST /lots e a semente de demonstração)
export function toLotData(art, iiifUrl = IIIF_URL) {
  return {
    externalId: String(art.id),
    title: art.title,
    imageUrl: `${iiifUrl}/${art.image_id}/full/843,/0/default.jpg`,
    attributes: {
      artist: art.artist_display ?? null,
      artistName: art.artist_title ?? null,
      date: art.date_display ?? null,
      medium: art.medium_display ?? null,
      dimensions: art.dimensions ?? null,
      placeOfOrigin: art.place_of_origin ?? null,
      source: 'Art Institute of Chicago',
      sourceUrl: `https://www.artic.edu/artworks/${art.id}`,
    },
  };
}

export async function searchArtworks(query) {
  const key = query.toLowerCase();
  const cached = cache.get(key);

  // 1) Busca recente: responde direto do cache, sem chamar a API
  if (cached && Date.now() - cached.savedAt < CACHE_TTL_MS) {
    return { items: cached.items, source: 'cache' };
  }

  try {
    const response = await fetch(`${API_URL}/artworks/search`, {
      method: 'POST',
      headers: { ...HEADERS, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        q: query,
        query: PAINTINGS_FILTER,
        limit: 12,
        fields: ['id', 'title', 'artist_title', 'artist_display', 'date_display', 'image_id'],
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!response.ok) {
      throw new Error(`A API respondeu com status ${response.status}`);
    }

    const json = await response.json();

    const items = (json.data || [])
      .filter((art) => art.image_id)
      .map((art) => ({
        id: art.id,
        title: art.title,
        artist: art.artist_title || art.artist_display,
        date: art.date_display,
        imageId: art.image_id,
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
// na hora de criar o lote. Devolve null se a obra não existe, não tem imagem
// ou não está em domínio público.
export async function getArtwork(id) {
  try {
    const params = new URLSearchParams({
      fields:
        'id,title,artist_title,artist_display,date_display,medium_display,dimensions,place_of_origin,image_id,is_public_domain',
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
    if (!art || !art.image_id || !art.is_public_domain) return null;

    return toLotData(art, json.config?.iiif_url || IIIF_URL);
  } catch (err) {
    throw new ExternalApiError(err.message);
  }
}
