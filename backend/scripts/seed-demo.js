// Cria os lotes de demonstração (com lances) chamando a própria API.
// Rode DEPOIS do seed de usuários (npm run seed) e com a API no ar.
//
//   node scripts/seed-demo.js                       -> API local (http://localhost:3000)
//   API_URL=https://sua-api.onrender.com node scripts/seed-demo.js   -> API publicada
//
// Precisa de internet: criar lote consulta o Art Institute of Chicago.
// Para apagar tudo e recomeçar: node scripts/clear-lots.js --confirm
const BASE = (process.env.API_URL || 'http://localhost:3000').replace(/\/$/, '');
const PASSWORD = process.env.SEED_PASSWORD || 'Leilao@2026';

const DAY = 24 * 60 * 60 * 1000;
const iso = (ms) => new Date(Date.now() + ms).toISOString();

// Valores em centavos. externalId = id da obra no Art Institute of Chicago.
const LOTS = [
  { externalId: 27992, startingBid: 150000, minIncrement: 10000, startsAt: iso(-60_000), endsAt: iso(7 * DAY), bids: [['b1', 150000], ['b2', 160000], ['b1', 180000]] },
  { externalId: 16568, startingBid: 120000, minIncrement: 5000, startsAt: iso(-60_000), endsAt: iso(5 * DAY), bids: [['b2', 120000]] },
  { externalId: 28560, startingBid: 90000, minIncrement: 5000, startsAt: iso(-60_000), endsAt: iso(6 * DAY), bids: [] },
  { externalId: 111628, startingBid: 200000, minIncrement: 10000, startsAt: iso(-60_000), endsAt: iso(4 * DAY), bids: [['b1', 200000], ['b2', 210000]] },
  { externalId: 20684, startingBid: 80000, minIncrement: 5000, startsAt: iso(2 * DAY), endsAt: iso(9 * DAY), bids: [] },
  { externalId: 6565, startingBid: 100000, minIncrement: 5000, startsAt: iso(3 * DAY), endsAt: iso(10 * DAY), bids: [] },
];

async function api(method, path, { token, body } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = { raw: text }; }
  return { status: res.status, data };
}

async function login(email) {
  const r = await api('POST', '/auth/login', { body: { email, password: PASSWORD } });
  if (r.status !== 200) throw new Error(`Login falhou para ${email} (${r.status}). Rodou o seed de usuários?`);
  return r.data.token;
}

console.log(`API: ${BASE} (a primeira chamada pode demorar se a API estiver "dormindo")`);
const tokens = {
  auc: await login('leiloeiro@teste.com'),
  b1: await login('licitante1@teste.com'),
  b2: await login('licitante2@teste.com'),
};

for (const lot of LOTS) {
  const { bids, ...payload } = lot;
  const created = await api('POST', '/lots', { token: tokens.auc, body: payload });
  if (created.status !== 201) {
    console.log(`✘ obra ${lot.externalId}: ${created.status} ${created.data.error ?? ''}`);
    continue;
  }
  const id = created.data.id;
  console.log(`✔ lote #${id} "${created.data.title}" (${created.data.status})`);

  for (const [who, amount] of bids) {
    const r = await api('POST', `/lots/${id}/bids`, { token: tokens[who], body: { amount } });
    console.log(`    lance de ${who}: R$ ${(amount / 100).toFixed(2)} -> ${r.status === 201 ? 'ok' : r.data.error}`);
  }
}
console.log('Pronto. Abra o site e confira a vitrine.');
