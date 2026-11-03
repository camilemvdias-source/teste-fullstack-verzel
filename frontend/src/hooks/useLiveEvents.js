import { useEffect, useRef, useState } from 'react';
import { API_URL } from '../api/client.js';

// Assina um fluxo de eventos em tempo real (SSE) da API.
// O EventSource reconecta sozinho se a conexão cair (o servidor manda "retry: 3000").
// Devolve se está conectado, para a tela decidir se ainda precisa do polling de reserva.
export function useLiveEvents(path, onEvent) {
  const [connected, setConnected] = useState(false);
  const handler = useRef(onEvent);

  useEffect(() => {
    handler.current = onEvent;
  }, [onEvent]);

  useEffect(() => {
    if (!path || typeof EventSource === 'undefined') return undefined;
    const source = new EventSource(`${API_URL}${path}`);
    source.addEventListener('ready', () => setConnected(true));
    source.onmessage = (e) => {
      try {
        handler.current?.(JSON.parse(e.data));
      } catch {
        /* evento malformado: ignora */
      }
    };
    source.onerror = () => setConnected(false); // o navegador tenta reconectar sozinho
    return () => source.close();
  }, [path]);

  return connected;
}
