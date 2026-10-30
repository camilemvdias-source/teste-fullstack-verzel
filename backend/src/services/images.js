// Imagens das obras. O museu bloqueia imagens pedidas direto pelo navegador de outros
// sites, então o servidor busca com os cabeçalhos certos e GUARDA uma cópia no banco
// (tabela artwork_images): depois da primeira busca, vitrine, sala, auditoria e
// comprovante continuam com imagem mesmo se a API do museu cair ou o servidor reiniciar.
import { pool } from '../db/pool.js';
import { HEADERS } from './artic.js';

const MEMORY_MAX = 200;
const memory = new Map();

function remember(url, img) {
  if (memory.size >= MEMORY_MAX) memory.delete(memory.keys().next().value);
  memory.set(url, img);
}

// Só imagens do servidor IIIF do museu: não é um proxy aberto
export function isMuseumUrl(url) {
  try {
    const host = new URL(url).hostname;
    return host === 'artic.edu' || host.endsWith('.artic.edu');
  } catch {
    return false;
  }
}

// Busca no museu. Com { store: false } não grava no banco (miniaturas da busca do leiloeiro).
export async function fetchMuseumImage(url, { store = true } = {}) {
  if (!isMuseumUrl(url)) return null;

  const upstream = await fetch(url, { headers: HEADERS, signal: AbortSignal.timeout(10000) });
  const type = upstream.headers.get('content-type') || '';
  if (!upstream.ok || !type.startsWith('image/')) {
    throw new Error(`museu respondeu ${upstream.status} (${type || 'sem tipo'})`);
  }

  const img = { type, body: Buffer.from(await upstream.arrayBuffer()) };
  if (store) {
    await pool.query(
      `INSERT INTO artwork_images (image_url, content_type, data) VALUES ($1, $2, $3)
       ON CONFLICT (image_url) DO NOTHING`,
      [url, img.type, img.body]
    );
  }
  remember(url, img);
  return img;
}

// Memória → banco → museu (e guarda no banco para a próxima vez)
export async function getArtworkImage(url) {
  const cached = memory.get(url);
  if (cached) return cached;

  const stored = await pool.query(
    'SELECT content_type, data FROM artwork_images WHERE image_url = $1',
    [url]
  );
  if (stored.rows[0]) {
    const img = { type: stored.rows[0].content_type, body: stored.rows[0].data };
    remember(url, img);
    return img;
  }

  return fetchMuseumImage(url);
}
