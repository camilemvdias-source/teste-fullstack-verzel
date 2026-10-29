import crypto from 'node:crypto';

// Primeiro lance de cada lote: não existe lance anterior, então usamos 64 zeros.
export const GENESIS_HASH = '0'.repeat(64);

const MIN_SECRET_LENGTH = 16;

// A chave fica só no ambiente do servidor (AUDIT_SECRET), nunca no banco nem no código.
// Lida a cada chamada (e não na importação) para os testes poderem definir a variável.
function getAuditSecret() {
  const secret = process.env.AUDIT_SECRET;
  if (!secret || secret.length < MIN_SECRET_LENGTH) {
    throw new Error(`AUDIT_SECRET não definida (mínimo ${MIN_SECRET_LENGTH} caracteres). Confira o backend/.env`);
  }
  return secret;
}

// Falha na subida do servidor, em vez de falhar só no primeiro lance.
export function assertAuditSecret() {
  getAuditSecret();
}

// Cada lance guarda um selo calculado com HMAC-SHA256 (chave secreta fora do banco)
// sobre os dados dele + o selo do lance anterior. Quem só tem acesso ao banco
// consegue alterar os dados, mas não consegue recalcular selos válidos.
export function computeBidHash({ lotId, seq, publicCode, amount, createdAt, prevHash }) {
  const data = [lotId, seq, publicCode, amount, createdAt.toISOString(), prevHash].join('|');
  return crypto.createHmac('sha256', getAuditSecret()).update(data).digest('hex');
}
