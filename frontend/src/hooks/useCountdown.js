import { useEffect, useState } from 'react';

// Contagem regressiva até "endIso". O relógio do servidor manda: calculamos a
// diferença entre ele e o do navegador (offset) para não depender da hora do PC.
export function useCountdown(endIso, serverTimeIso) {
  const [offset, setOffset] = useState(0);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (serverTimeIso) setOffset(Date.parse(serverTimeIso) - Date.now());
  }, [serverTimeIso]);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const ms = Math.max(0, Date.parse(endIso) - (now + offset));
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
