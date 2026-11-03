import { API_URL } from '../api/client.js';

// URL da imagem do lote servida pela nossa API. view 0 = obra inteira; 1..3 = detalhes ampliados.
export function lotImageUrl(lotId, view = 0) {
  return `${API_URL}/lots/${lotId}/image${view ? `?v=${view}` : ''}`;
}
