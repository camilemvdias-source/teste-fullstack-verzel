// Lotes de demonstração gravados direto no banco, com as mesmas regras da API:
// lances acima do mínimo e sem o líder cobrir o próprio lance, saldo comprometido
// do líder, selo HMAC encadeado e liquidação pelo mesmo job do servidor.
// Atende aos "dados de teste" do enunciado (um leiloeiro, dois licitantes e lote
// publicado com lances abertos) e ainda deixa agendados e encerrados na vitrine.
import { pool } from '../db/pool.js';
import { DEMO_ARTWORKS } from '../db/demo-artworks.js';
import { GENESIS_HASH, computeBidHash } from './hashChain.js';
import { settleExpiredLots } from './settlement.js';
import { fetchMuseumImage } from './images.js';

const MIN = 60 * 1000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

const ACCOUNTS = {
  auctioneer: 'leiloeiro@teste.com',
  b1: 'licitante1@teste.com',
  b2: 'licitante2@teste.com',
};

// Valores em centavos; start, end e o horário de cada lance em ms a partir de agora.
// Saldos no fim: licitante1 paga R$ 2.300,00 e lidera R$ 3.050,00; licitante2 paga
// R$ 1.500,00 e lidera R$ 3.100,00 (os dois começam com R$ 10.000,00).
const PLAN = [
  // Ao vivo com lances
  { art: '27992', start: -2 * DAY, end: 12 * DAY, startingBid: 150000, increment: 10000,
    bids: [['b1', 150000, -47 * HOUR], ['b2', 160000, -30 * HOUR], ['b1', 180000, -3 * HOUR]] },
  { art: '16568', start: -1 * DAY, end: 10 * DAY, startingBid: 120000, increment: 5000,
    bids: [['b2', 120000, -20 * HOUR], ['b1', 125000, -2 * HOUR]] },
  { art: '28560', start: -3 * DAY, end: 8 * DAY, startingBid: 90000, increment: 5000,
    bids: [['b1', 90000, -60 * HOUR], ['b2', 95000, -36 * HOUR], ['b1', 100000, -12 * HOUR], ['b2', 110000, -50 * MIN]] },
  { art: '20684', start: -6 * HOUR, end: 6 * DAY, startingBid: 200000, increment: 10000,
    bids: [['b2', 200000, -4 * HOUR]] },
  // Ao vivo ainda sem lances
  { art: '111436', start: -1 * HOUR, end: 9 * DAY, startingBid: 80000, increment: 5000, bids: [] },
  { art: '56905', start: -30 * MIN, end: 14 * DAY, startingBid: 60000, increment: 2500, bids: [] },
  // Agendados
  { art: '14655', start: 1 * DAY, end: 11 * DAY, startingBid: 110000, increment: 5000, bids: [] },
  { art: '8991', start: 2 * DAY, end: 12 * DAY, startingBid: 95000, increment: 5000, bids: [] },
  { art: '90048', start: 3 * DAY, end: 13 * DAY, startingBid: 70000, increment: 2500, bids: [] },
  // Encerrados: três vendidos (com comprovante) e um sem lances
  { art: '64818', start: -9 * DAY, end: -2 * DAY, startingBid: 100000, increment: 5000,
    bids: [['b2', 100000, -8 * DAY], ['b1', 105000, -6 * DAY], ['b2', 115000, -4 * DAY], ['b1', 130000, -3 * DAY]] },
  { art: '61128', start: -7 * DAY, end: -1 * DAY, startingBid: 140000, increment: 10000,
    bids: [['b1', 140000, -6 * DAY], ['b2', 150000, -2 * DAY]] },
  { art: '111442', start: -5 * DAY, end: -12 * HOUR, startingBid: 85000, increment: 5000,
    bids: [['b2', 85000, -4 * DAY], ['b1', 90000, -3 * DAY], ['b2', 95000, -36 * HOUR], ['b1', 100000, -20 * HOUR]] },
  { art: '154235', start: -6 * DAY, end: -3 * DAY, startingBid: 75000, increment: 5000, bids: [] },
];

const artworkById = new Map(DEMO_ARTWORKS.map((a) => [a.externalId, a]));

async function loadAccounts(db) {
  const result = await db.query(
    'SELECT id, email, role, public_code FROM users WHERE email = ANY($1::text[])',
    [Object.values(ACCOUNTS)]
  );
  const byEmail = new Map(result.rows.map((u) => [u.email, u]));
  const accounts = {};
  for (const [key, email] of Object.entries(ACCOUNTS)) {
    const user = byEmail.get(email);
    if (!user) throw new Error(`Conta de teste ${email} não existe. Rode "npm run seed" antes.`);
    accounts[key] = user;
  }
  return accounts;
}

// Grava um lote e os lances dele numa transação já aberta. Recusa um plano que
// quebre as regras de lance, em vez de gravar dados que a API nunca aceitaria.
async function insertLot(client, { auctioneer, artwork, startsAt, endsAt, startingBid, increment, bids }) {
  const { rows: [lot] } = await client.query(
    `INSERT INTO lots
       (auctioneer_id, external_id, title, image_url, attributes,
        starting_bid, min_increment, starts_at, ends_at)
     VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7, $8, $9)
     RETURNING id`,
    [auctioneer.id, artwork.externalId, artwork.title, artwork.imageUrl,
      JSON.stringify(artwork.attributes), startingBid, increment, startsAt, endsAt]
  );

  let current = null;
  let leader = null;
  let prevHash = GENESIS_HASH;
  let seq = 0;

  for (const { bidder, amount, at } of bids) {
    const minimum = current == null ? startingBid : current + increment;
    const inWindow = at >= startsAt && at < endsAt && endsAt - at > 2 * MIN; // sem anti-sniping
    if (amount < minimum || bidder.id === leader?.id || !inWindow) {
      throw new Error(`Lance de demonstração fora das regras (obra ${artwork.externalId}, seq ${seq + 1})`);
    }

    // Igual a POST /lots/:id/bids: devolve o comprometido do líder anterior e prende o do novo
    if (leader) {
      await client.query(
        'UPDATE users SET balance_committed = balance_committed - $1 WHERE id = $2',
        [current, leader.id]
      );
    }
    const committed = await client.query(
      `UPDATE users SET balance_committed = balance_committed + $1
       WHERE id = $2 AND balance_total - balance_committed >= $1`,
      [amount, bidder.id]
    );
    if (committed.rowCount === 0) {
      throw new Error(`Saldo insuficiente para o lance de demonstração de ${bidder.email}`);
    }

    seq += 1;
    const hash = computeBidHash({
      lotId: lot.id, seq, publicCode: bidder.public_code, amount, createdAt: at, prevHash,
    });
    await client.query(
      `INSERT INTO bids (lot_id, bidder_id, amount, created_at, seq, prev_hash, hash)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [lot.id, bidder.id, amount, at, seq, prevHash, hash]
    );
    current = amount;
    leader = bidder;
    prevHash = hash;
  }

  if (seq > 0) {
    await client.query(
      `UPDATE lots SET current_bid = $1, current_leader_id = $2, last_hash = $3, bid_count = $4
       WHERE id = $5`,
      [current, leader.id, prevHash, seq, lot.id]
    );
  }
  return lot.id;
}

async function insertLots(plans) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const accounts = await loadAccounts(client);
    const ids = [];
    for (const p of plans) {
      const artwork = artworkById.get(p.art);
      ids.push(await insertLot(client, {
        auctioneer: accounts.auctioneer,
        artwork,
        startsAt: new Date(p.now + p.start),
        endsAt: new Date(p.now + p.end),
        startingBid: p.startingBid,
        increment: p.increment,
        bids: p.bids
          .map(([who, amount, at]) => ({ bidder: accounts[who], amount, at: new Date(p.now + at) }))
          .sort((a, b) => a.at - b.at),
      }));
    }
    await client.query('COMMIT');
    return ids;
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

// Copia as imagens para o banco (4 por vez). Se o museu falhar, a primeira visita tenta de novo.
async function storeImages(artworks) {
  const queue = [...new Set(artworks.map((a) => a.imageUrl))];
  let failed = 0;
  const worker = async () => {
    for (let url = queue.shift(); url; url = queue.shift()) {
      await fetchMuseumImage(url).catch(() => { failed += 1; });
    }
  };
  await Promise.all([worker(), worker(), worker(), worker()]);
  return failed;
}

// Cria o catálogo de demonstração. Sem "force", não faz nada se o leiloeiro de teste já tem lotes.
export async function seedDemo({ force = false } = {}) {
  const accounts = await loadAccounts(pool);
  const existing = await pool.query('SELECT count(*)::int AS n FROM lots WHERE auctioneer_id = $1', [
    accounts.auctioneer.id,
  ]);
  if (existing.rows[0].n > 0 && !force) return { created: 0, skipped: true };

  const now = Date.now();
  const ids = await insertLots(PLAN.map((p) => ({ ...p, now })));
  await settleExpiredLots(); // liquida os encerrados: debita, credita e emite os comprovantes
  const imagesFailed = await storeImages(PLAN.map((p) => artworkById.get(p.art)));
  return { created: ids.length, skipped: false, imagesFailed };
}

// "Vitrine viva": a demonstração fica no ar por semanas e os lotes semeados acabam.
// Com DEMO_KEEPALIVE=true, sempre que houver menos de `minLive` lotes ao vivo, o
// leiloeiro de teste abre lotes novos com obras da base que não estão em leilão.
export async function ensureLiveDemoLots({ minLive = 3 } = {}) {
  const { rows: [{ live }] } = await pool.query(
    `SELECT count(*)::int AS live FROM lots
     WHERE status IN ('live', 'scheduled') AND starts_at <= now() AND ends_at > now()`
  );
  if (live >= minLive) return 0;

  const busy = await pool.query(
    `SELECT external_id FROM lots WHERE status IN ('live', 'scheduled') AND ends_at > now()`
  );
  const taken = new Set(busy.rows.map((r) => r.external_id));
  const free = DEMO_ARTWORKS.filter((a) => !taken.has(a.externalId)).slice(0, minLive - live);
  if (free.length === 0) return 0;

  const now = Date.now();
  const ids = await insertLots(free.map((artwork, i) => ({
    art: artwork.externalId,
    now,
    start: -5 * MIN,
    end: (7 + i) * DAY,
    startingBid: 50000 + i * 20000,
    increment: 5000,
    bids: [],
  })));
  await storeImages(free);
  return ids.length;
}
