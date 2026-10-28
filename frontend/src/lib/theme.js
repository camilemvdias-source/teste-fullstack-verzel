const KEY = 'leilao_theme';

function readStored() {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null; // localStorage pode estar bloqueado
  }
}

// Qual tema está valendo agora: o escolhido ou, se nunca escolheu, o do sistema
export function currentTheme() {
  const stored = readStored();
  if (stored === 'light' || stored === 'dark') return stored;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

// Chamado antes de desenhar a tela, para não piscar branco
export function applyStoredTheme() {
  const stored = readStored();
  if (stored === 'light' || stored === 'dark') {
    document.documentElement.setAttribute('data-theme', stored);
  }
}

export function setTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  try {
    localStorage.setItem(KEY, theme);
  } catch {
    /* sem problema: o tema vale só nesta visita */
  }
}
