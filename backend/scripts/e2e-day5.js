// Teste ponta a ponta (Dias 4 e 5) contra uma API que já está rodando.
//
// Pré-requisitos: banco migrado + seed rodado (npm run migrate && npm run seed)
// e a API no ar (npm run dev). Precisa de internet: criar lote consulta a API do museu.
//
//   node scripts/e2e.js start           cria um lote ao vivo e testa os lances
//   node scripts/e2e.js check <lotId>   depois de ENCERRAR o lote: testa liquidação e comprovante
//
// Variáveis opcionais: API_URL (padrão http://localhost:3000), SEED_PASSWORD, ARTWORK_ID

const BASE = (process.env.API_URL || 'http://localhost:3000').replace(/\/$/, '');
const PASSWORD = process.env.SEED_PASSWORD || 'Leilao@2026';
const ARTWORK_ID = Number(process.env.ARTWORK_ID || 27992);

let passed = 0;
let failed = 0;

function check(name, condition, extra = '') {
  if (condition) {
    passed += 1;
    console.log(`  ✅ ${name}`);
  } else {
    failed += 1;
    console.log(`  ❌ ${name} ${extra}`);
  }
}

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
  let data = null;
  try {
    data = JSON.parse(text);
  } catch {
    data = { raw: text };
  }
  return { status: res.status, data, text };
}

async function login(email) {
  const r = await api('POST', '/auth/login', { body: { email, password: PASSWORD } });
  if (r.status !== 200) {
    throw new Error(`Login falhou para ${email} (${r.status}): ${r.text}. Rodou o seed? A senha está certa?`);
  }
  return r.data.token;
}

async function loginAll() {
  return {
    auc: await login('leiloeiro@teste.com'),
    b1: await login('licitante1@teste.com'),
    b2: await login('licitante2@teste.com'),
  };
}

const bid = (token, lotId, amount) =>
  api('POST', `/lots/${lotId}/bids`, { token, body: { amount } });

async function start() {
  console.log(`API: ${BASE}\n`);
  const t = await loginAll();
  console.log('Login das 3 contas de teste: ok\n');

  // Saldo comprometido de b1 antes do teste (pode haver outros lotes em andamento)
  const baseline = (await api('GET', '/wallet', { token: t.b1 })).data.balance?.committed ?? 0;

  console.log('1) Criar lote ao vivo (leiloeiro)');
  const now = Date.now();
  const created = await api('POST', '/lots', {
    token: t.auc,
    body: {
      externalId: ARTWORK_ID,
      startingBid: 100000, // R$ 1.000,00
      minIncrement: 10000, // R$ 100,00
      startsAt: new Date(now - 60_000).toISOString(),
      endsAt: new Date(now + 10 * 60_000).toISOString(),
    },
  });
  check('POST /lots devolve 201', created.status === 201, `(veio ${created.status}: ${created.text})`);
  if (created.status !== 201) {
    console.log('\nSem lote não dá para continuar. Se for 503, a API do museu não respondeu: tente de novo.');
    process.exit(1);
  }
  const lotId = created.data.id;
  console.log(`  → lote #${lotId}\n`);

  console.log('2) Regras de lance');
  let r = await bid(t.auc, lotId, 100000);
  check('leiloeiro não pode dar lance (403)', r.status === 403, `(veio ${r.status})`);

  r = await bid(t.b1, lotId, 50000);
  check('primeiro lance abaixo do inicial é recusado', r.status === 422 && r.data.code === 'BID_TOO_LOW', `(veio ${r.status} ${r.data.code})`);

  r = await bid(t.b1, lotId, 100000);
  check('primeiro lance = lance inicial é aceito (201)', r.status === 201, `(veio ${r.status}: ${r.text})`);

  r = await bid(t.b1, lotId, 110000);
  check('líder não cobre o próprio lance (ALREADY_LEADER)', r.status === 409 && r.data.code === 'ALREADY_LEADER', `(veio ${r.status} ${r.data.code})`);

  r = await bid(t.b2, lotId, 105000);
  check('abaixo de atual + incremento é recusado', r.status === 422 && r.data.code === 'BID_TOO_LOW', `(veio ${r.status} ${r.data.code})`);

  r = await bid(t.b2, lotId, 99_999_999_999);
  check('saldo insuficiente é recusado', r.status === 422 && r.data.code === 'INSUFFICIENT_BALANCE', `(veio ${r.status} ${r.data.code})`);

  r = await bid(t.b2, lotId, 110000);
  check('lance válido do outro licitante é aceito', r.status === 201, `(veio ${r.status}: ${r.text})`);

  let w1 = await api('GET', '/wallet', { token: t.b1 });
  check('líder superado teve o saldo comprometido devolvido', w1.data.balance?.committed === baseline, `(committed=${w1.data.balance?.committed}, esperado ${baseline})`);

  r = await bid(t.b1, lotId, 120000);
  check('b1 retoma a liderança (201)', r.status === 201, `(veio ${r.status}: ${r.text})`);

  console.log('\n3) Dois lances simultâneos do mesmo licitante (trava FOR UPDATE)');
  const [x, y] = await Promise.all([bid(t.b2, lotId, 130000), bid(t.b2, lotId, 130000)]);
  const statuses = [x.status, y.status].sort();
  check('exatamente um é aceito e o outro recusado', statuses[0] === 201 && statuses[1] === 409, `(vieram ${statuses})`);

  console.log('\n4) Auditoria pública (sem login)');
  const audit = await api('GET', `/audit/${lotId}`);
  check('GET /audit/:id responde 200 sem token', audit.status === 200, `(veio ${audit.status})`);
  check('cadeia íntegra', audit.data.verification?.intact === true, JSON.stringify(audit.data.verification));
  check('4 lances no histórico', audit.data.bids?.length === 4, `(veio ${audit.data.bids?.length})`);
  check('seq vai de 1 a 4', JSON.stringify(audit.data.bids?.map((b) => b.seq)) === '[1,2,3,4]');
  check('primeiro lance aponta para 64 zeros', audit.data.bids?.[0]?.prevHash === '0'.repeat(64));
  check('cada lance aponta para o hash do anterior',
    audit.data.bids?.every((b, i, a) => i === 0 || b.prevHash === a[i - 1].hash));
  check('hash final do lote = hash do último lance', audit.data.lot?.finalHash === audit.data.bids?.at(-1)?.hash);
  check('privacidade: sem e-mail nem nome na auditoria',
    !/teste\.com|Licitante Um|Licitante Dois|Leiloeiro Teste/i.test(audit.text));
  check('privacidade: mostra código anônimo', /^[0-9A-F]{8}$/.test(audit.data.bids?.[0]?.bidderCode ?? ''));

  const notFound = await api('GET', '/audit/99999999');
  check('lote inexistente → 404', notFound.status === 404, `(veio ${notFound.status})`);

  console.log('\n5) Minhas listas');
  const mine = await api('GET', '/me/bids', { token: t.b1 });
  const item = mine.data.items?.find((i) => i.lotId === lotId);
  check('GET /me/bids lista o lote', !!item, `(veio ${mine.status})`);
  check('b1 aparece como "superado" (b2 lidera)', item?.position === 'outbid', `(position=${item?.position})`);
  const aucLots = await api('GET', '/my-lots', { token: t.auc });
  check('GET /my-lots (leiloeiro) lista o lote', aucLots.data.items?.some((i) => i.id === lotId), `(veio ${aucLots.status})`);
  const wrongRole = await api('GET', '/my-lots', { token: t.b1 });
  check('licitante em /my-lots → 403', wrongRole.status === 403);

  console.log(`
────────────────────────────────────────────────────────────
Parte 1 concluída: ${passed} ok, ${failed} falha(s).

PRÓXIMO PASSO: encerrar o lote #${lotId} sem mexer nos lances.
No SQL Editor do Neon (ou psql), rode:

  UPDATE lots SET ends_at = now() - interval '1 second' WHERE id = ${lotId};

Espere ~6 segundos (o job de liquidação roda a cada 5s) e depois:

  node scripts/e2e-day5.js check ${lotId}
────────────────────────────────────────────────────────────`);
  process.exit(failed ? 1 : 0);
}

async function checkEnded(lotId) {
  console.log(`API: ${BASE}\nLote #${lotId}\n`);
  const t = await loginAll();

  console.log('1) Auditoria depois de encerrado');
  const audit = await api('GET', `/audit/${lotId}`);
  check('lote aparece como ended', audit.data.lot?.status === 'ended', `(status=${audit.data.lot?.status} — espere o job rodar)`);
  check('cadeia íntegra (inclui conferência com o comprovante)', audit.data.verification?.intact === true, JSON.stringify(audit.data.verification));
  check('preço final = 130000', audit.data.lot?.finalPrice === 130000, `(veio ${audit.data.lot?.finalPrice})`);
  check('código do vencedor informado', /^[0-9A-F]{8}$/.test(audit.data.lot?.winnerCode ?? ''));

  console.log('\n2) Arremates do vencedor (b2)');
  const wins = await api('GET', '/me/wins', { token: t.b2 });
  const win = wins.data.items?.find((i) => i.lotId === lotId);
  check('GET /me/wins lista o lote', !!win, `(veio ${wins.status})`);
  check('valor arrematado = 130000', win?.amount === 130000);

  const winsLoser = await api('GET', '/me/wins', { token: t.b1 });
  check('quem perdeu (b1) não vê o lote em /me/wins', !winsLoser.data.items?.some((i) => i.lotId === lotId));

  const mineLoser = await api('GET', '/me/bids', { token: t.b1 });
  check('b1 aparece como "lost"', mineLoser.data.items?.find((i) => i.lotId === lotId)?.position === 'lost');
  const mineWinner = await api('GET', '/me/bids', { token: t.b2 });
  check('b2 aparece como "won"', mineWinner.data.items?.find((i) => i.lotId === lotId)?.position === 'won');

  console.log('\n3) Comprovante público (sem login)');
  if (win) {
    const rec = await api('GET', `/receipts/${win.receiptToken}`);
    check('GET /receipts/:token responde 200 sem token', rec.status === 200, `(veio ${rec.status})`);
    check('valor do comprovante = 130000', rec.data.receipt?.amount === 130000);
    check('hash final do comprovante = hash final da auditoria', rec.data.receipt?.finalHash === audit.data.lot?.finalHash);
    check('privacidade: sem e-mail nem nome no comprovante',
      !/teste\.com|Licitante Um|Licitante Dois|Leiloeiro Teste/i.test(rec.text));
    check('aponta para a auditoria do lote', rec.data.receipt?.auditPath === `/audit/${lotId}`);
    console.log(`  → link: ${BASE}/receipts/${win.receiptToken}`);
  }
  const badToken = await api('GET', '/receipts/00000000-0000-4000-8000-000000000000');
  check('token inexistente → 404', badToken.status === 404);

  console.log('\n4) Dinheiro (liquidação)');
  const w2 = await api('GET', '/wallet', { token: t.b2 });
  check('extrato do vencedor tem settlement_debit deste lote',
    w2.data.transactions?.some((x) => x.type === 'settlement_debit' && x.lotId === lotId && x.amount === 130000));
  const wa = await api('GET', '/wallet', { token: t.auc });
  // O leiloeiro não tem rota própria de carteira restrita a licitante em GET /wallet (só requireAuth), então funciona.
  check('extrato do leiloeiro tem settlement_credit deste lote',
    wa.data.transactions?.some((x) => x.type === 'settlement_credit' && x.lotId === lotId && x.amount === 130000),
    `(veio ${wa.status})`);

  console.log('\n5) Painel do leiloeiro');
  const my = await api('GET', '/my-lots', { token: t.auc });
  const row = my.data.items?.find((i) => i.id === lotId);
  check('resultado: vendido por 130000', row?.result?.sold === true && row?.result?.finalPrice === 130000);
  check('total recebido ≥ 130000', my.data.summary?.totalReceived >= 130000);
  check('lote encerrado não pode ser cancelado (canCancel=false)', row?.canCancel === false);

  console.log(`
────────────────────────────────────────────────────────────
Resultado: ${passed} ok, ${failed} falha(s).

PRÓXIMO PASSO: teste de adulteração. Veja o passo a passo no README
(seção "Teste de adulteração") ou peça a sequência de SQLs.
────────────────────────────────────────────────────────────`);
  process.exit(failed ? 1 : 0);
}

const [cmd, arg] = process.argv.slice(2);
try {
  if (cmd === 'start') await start();
  else if (cmd === 'check' && Number(arg) > 0) await checkEnded(Number(arg));
  else {
    console.log('Uso:\n  node scripts/e2e-day5.js start\n  node scripts/e2e-day5.js check <lotId>');
    process.exit(2);
  }
} catch (err) {
  console.error('\nErro:', err.message);
  process.exit(1);
}
