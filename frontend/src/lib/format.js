// A API guarda dinheiro em centavos inteiros. Aqui convertemos só para exibir.
export function brl(cents) {
  return (Number(cents) / 100).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

// "R$ 1.234,56" digitado → 123456 centavos (ou null se for inválido).
// A vírgula separa os centavos e o ponto separa o milhar ("1.500" = mil e quinhentos).
// Sem vírgula, um ponto seguido de 1 ou 2 dígitos também vale como centavos
// ("1500.50", comum em teclado em inglês). Formato ambíguo ("10,555") vira null.
export function parseBrlToCents(text) {
  const clean = String(text).replace(/[^\d,.-]/g, '');
  const match =
    clean.match(/^(\d{1,3}(?:\.\d{3})+|\d*),(\d{0,2})$/) || // 1.234,56 | 1500,5
    clean.match(/^(\d*)\.(\d{1,2})$/) || // 1500.50
    clean.match(/^(\d{1,3}(?:\.\d{3})+|\d*)()$/); // 1.500 | 1500
  if (!match) return null;
  const cents = Number(match[1].replace(/\./g, '') || 0) * 100 + Number(match[2].padEnd(2, '0'));
  return Number.isSafeInteger(cents) && cents > 0 ? cents : null;
}

export function formatDateTime(iso) {
  return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}
