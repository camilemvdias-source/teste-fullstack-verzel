import { API_URL } from '../api/client.js';

// Pré-carregamento (#boot no index.html): fica na tela até a API responder ao /health.
// A API gratuita do Render "dorme" e pode levar ~50 s para acordar; a mensagem avisa.
export function hideBootWhenApiReady() {
  const boot = document.getElementById('boot');
  const msg = document.getElementById('boot-msg');
  if (!boot) return;

  const started = Date.now();
  const hide = () => {
    clearInterval(timer);
    window.dispatchEvent(new Event('api:ready')); // páginas que falharam enquanto a API dormia tentam de novo
    boot.classList.add('done');
    setTimeout(() => boot.remove(), 300);
  };
  const timer = setInterval(() => {
    const s = Math.round((Date.now() - started) / 1000);
    if (s >= 4 && msg) {
      msg.textContent = `O servidor gratuito está acordando (${s} s). Isso pode levar até 1 minuto.`;
    }
    if (s >= 90) hide(); // desiste e deixa cada página mostrar o próprio erro
  }, 1000);

  const ping = () =>
    fetch(`${API_URL}/health`, { cache: 'no-store' })
      .then(hide) // qualquer resposta HTTP: a API está de pé
      .catch(() => setTimeout(ping, 2000));
  ping();
}
