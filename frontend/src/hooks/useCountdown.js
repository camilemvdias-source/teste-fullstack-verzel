import { useEffect, useRef, useState } from 'react';

// Contagem regressiva até "endIso". O relógio do servidor manda: calculamos a
// diferença entre ele e o do navegador (offset) para não depender da hora do PC.
export function useCountdown(endIso, serverTimeIso) {
  // "now" já é a hora do servidor (hora do navegador + offset)
  const offset = useRef(0);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (serverTimeIso) offset.current = Date.parse(serverTimeIso) - Date.now();
    const tick = () => setNow(Date.now() + offset.current);
    const first = setTimeout(tick, 0);
    const t = setInterval(tick, 1000);
    return () => { clearTimeout(first); clearInterval(t); };
  }, [serverTimeIso]);

  const ms = endIso ? Math.max(0, Date.parse(endIso) - now) : 0;
  return { ms, label: formatRemaining(ms), parts: splitRemaining(ms) };
}

const pad = (n) => String(n).padStart(2, '0');

export function splitRemaining(ms) {
  const total = Math.floor(ms / 1000);
  return {
    d: Math.floor(total / 86400),
    h: Math.floor((total % 86400) / 3600),
    m: Math.floor((total % 3600) / 60),
    s: total % 60,
  };
}

export function formatRemaining(ms) {
  const { d, h, m, s } = splitRemaining(ms);
  const hms = [h, m, s].map(pad).join(':');
  return d > 0 ? `${d}d ${hms}` : hms;
}
