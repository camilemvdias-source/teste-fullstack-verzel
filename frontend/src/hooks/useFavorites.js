import { useCallback, useEffect, useState } from 'react';

// Favoritos ficam guardados neste navegador (localStorage), sem precisar de login.
const KEY = 'leilao_favorites';

function read() {
  try {
    const value = JSON.parse(localStorage.getItem(KEY));
    return Array.isArray(value) ? value : [];
  } catch {
    return []; // localStorage bloqueado ou conteúdo inválido
  }
}

function persist(ids) {
  try {
    localStorage.setItem(KEY, JSON.stringify(ids));
  } catch {
    /* sem problema: o favorito vale só nesta visita */
  }
  // Avisa os outros corações da tela para se atualizarem
  window.dispatchEvent(new Event('favorites:changed'));
}

export function useFavorites() {
  const [ids, setIds] = useState(read);

  useEffect(() => {
    const sync = () => setIds(read());
    window.addEventListener('favorites:changed', sync);
    window.addEventListener('storage', sync); // outra aba
    return () => {
      window.removeEventListener('favorites:changed', sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  const toggle = useCallback((id) => {
    const current = read();
    const next = current.includes(id) ? current.filter((x) => x !== id) : [...current, id];
    setIds(next);
    persist(next);
  }, []);

  const isFav = useCallback((id) => ids.includes(id), [ids]);

  return { ids, isFav, toggle };
}
