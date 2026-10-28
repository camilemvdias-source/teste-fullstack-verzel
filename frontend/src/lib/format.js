// A API guarda dinheiro em centavos inteiros. Aqui convertemos só para exibir.
export function brl(cents) {
  return (Number(cents) / 100).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

// "R$ 1.234,56" digitado → 123456 centavos (ou null se for inválido)
export function parseBrlToCents(text) {
  const clean = String(text).replace(/[^\d,.-]/g, '').replace(/\./g, '').replace(',', '.');
  const value = Number(clean);
  if (!Number.isFinite(value) || value <= 0) return null;
  return Math.round(value * 100);
}

export function formatDateTime(iso) {
  return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}
