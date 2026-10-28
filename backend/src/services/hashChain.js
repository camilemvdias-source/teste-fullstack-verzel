import crypto from 'node:crypto';

// Primeiro lance de cada lote: não existe lance anterior, então usamos 64 zeros.
export const GENESIS_HASH = '0'.repeat(64);

// Cada lance guarda um "selo" (hash) calculado com os dados dele + o selo do lance
// anterior. Mudar qualquer dado antigo muda o selo e quebra toda a cadeia.
export function computeBidHash({ lotId, seq, publicCode, amount, createdAt, prevHash }) {
  const data = [lotId, seq, publicCode, amount, createdAt.toISOString(), prevHash].join('|');
  return crypto.createHash('sha256').update(data).digest('hex');
}

