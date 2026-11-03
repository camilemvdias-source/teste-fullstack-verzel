// Eventos em tempo real (Server-Sent Events).
//
// Quando algo muda num lote (lance, encerramento, cancelamento), o servidor publica um
// evento; quem está com a sala do lote ou a vitrine aberta recebe na hora, sem precisar
// perguntar a cada 2 segundos (polling).
//
// O canal fica em memória, então vale para um processo só (o plano do Render roda um).
// Com várias instâncias, a troca seria publicar via Redis ou LISTEN/NOTIFY do Postgres.
// O evento só é publicado DEPOIS do COMMIT: ninguém recebe um lance que acabou desfeito.

const channels = new Map(); // "lot:12" ou "all" -> Set de funções que recebem o evento
const MAX_CLIENTS = 1000; // proteção simples contra conexões demais abertas
const HEARTBEAT_MS = 25000; // proxies (Render, Vercel) fecham conexões paradas
let clients = 0;

export function subscribe(key, send) {
  if (!channels.has(key)) channels.set(key, new Set());
  channels.get(key).add(send);
  return () => {
    const set = channels.get(key);
    if (!set) return;
    set.delete(send);
    if (set.size === 0) channels.delete(key);
  };
}

// Manda para quem acompanha o lote e para quem acompanha todos (vitrine)
export function publish(lotId, event) {
  const payload = { ...event, lotId: Number(lotId), at: new Date().toISOString() };
  for (const key of [`lot:${lotId}`, 'all']) {
    for (const send of channels.get(key) ?? []) {
      try {
        send(payload);
      } catch {
        /* cliente que caiu é removido quando a conexão fecha */
      }
    }
  }
}

export function subscriberCount(key) {
  return channels.get(key)?.size ?? 0;
}

// Rota Express que abre o fluxo SSE para um canal
export function sseHandler(key) {
  return (req, res) => {
    if (clients >= MAX_CLIENTS) {
      return res.status(503).json({ error: 'Muitas conexões abertas. Tente de novo em instantes.' });
    }

    res.set({
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no', // não deixa proxy segurar os eventos em buffer
    });
    res.flushHeaders();
    // "retry": se cair, o navegador reconecta sozinho em 3 s
    res.write(`retry: 3000\nevent: ready\ndata: {}\n\n`);

    clients += 1;
    const send = (event) => res.write(`data: ${JSON.stringify(event)}\n\n`);
    const unsubscribe = subscribe(key, send);
    const heartbeat = setInterval(() => res.write(': ping\n\n'), HEARTBEAT_MS);

    req.on('close', () => {
      clearInterval(heartbeat);
      unsubscribe();
      clients -= 1;
    });
  };
}
