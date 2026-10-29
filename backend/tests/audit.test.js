import test from 'node:test';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import { GENESIS_HASH, computeBidHash } from '../src/services/hashChain.js';
import { verifyChain } from '../src/services/audit.js';

// Chave só para os testes (não é um segredo real).
process.env.AUDIT_SECRET = 'chave-somente-para-testes-1234';

const LOT_ID = 7;

// Monta uma cadeia válida de lances, do mesmo jeito que POST /lots/:id/bids faz.
function buildChain() {
  const inputs = [
    { code: 'A3F9C1D2', amount: 100000, at: '2026-10-28T12:00:00.000Z' },
    { code: 'B7E41A90', amount: 110000, at: '2026-10-28T12:01:10.500Z' },
    { code: 'A3F9C1D2', amount: 125000, at: '2026-10-28T12:02:30.250Z' },
  ];
  let prevHash = GENESIS_HASH;
  const bids = inputs.map((b, i) => {
    const seq = i + 1;
    const createdAt = new Date(b.at);
    const hash = computeBidHash({
      lotId: LOT_ID, seq, publicCode: b.code, amount: b.amount, createdAt, prevHash,
    });
    const row = {
      seq, public_code: b.code, amount: b.amount, created_at: createdAt,
      prev_hash: prevHash, hash,
    };
    prevHash = hash;
    return row;
  });
  return { bids, lastHash: prevHash };
}

// Copia profunda para cada teste mexer sem afetar os outros.
function fresh() {
  const { bids, lastHash } = buildChain();
  return {
    lotId: LOT_ID,
    bidCount: bids.length,
    lastHash,
    receiptFinalHash: lastHash,
    bids: bids.map((b) => ({ ...b })),
  };
}

test('cadeia sem alterações é considerada íntegra', () => {
  const r = verifyChain(fresh());
  assert.equal(r.intact, true);
  assert.equal(r.brokenAt, null);
});

test('primeiro lance usa 64 zeros como prev_hash', () => {
  assert.equal(fresh().bids[0].prev_hash, '0'.repeat(64));
});

test('lote sem lances (e sem comprovante) é íntegro', () => {
  const r = verifyChain({
    lotId: LOT_ID, bidCount: 0, lastHash: null, bids: [], receiptFinalHash: null,
  });
  assert.equal(r.intact, true);
});

test('ALTERAR o valor de um lance é detectado e aponta o lance', () => {
  const d = fresh();
  d.bids[1].amount = 1; // UPDATE bids SET amount = 1 WHERE seq = 2
  const r = verifyChain(d);
  assert.equal(r.intact, false);
  assert.equal(r.brokenAt, 2);
  assert.equal(r.code, 'BID_ALTERED');
});

test('ALTERAR a data de um lance é detectado', () => {
  const d = fresh();
  d.bids[0].created_at = new Date('2026-10-28T11:00:00.000Z');
  const r = verifyChain(d);
  assert.equal(r.intact, false);
  assert.equal(r.brokenAt, 1);
});

test('ALTERAR o licitante de um lance é detectado', () => {
  const d = fresh();
  d.bids[2].public_code = 'FFFFFFFF';
  const r = verifyChain(d);
  assert.equal(r.intact, false);
  assert.equal(r.brokenAt, 3);
});

test('APAGAR um lance do MEIO é detectado (buraco na sequência)', () => {
  const d = fresh();
  d.bids.splice(1, 1); // DELETE FROM bids WHERE seq = 2
  const r = verifyChain(d);
  assert.equal(r.intact, false);
  assert.equal(r.brokenAt, 2);
  assert.equal(r.code, 'MISSING_BID');
});

test('APAGAR o ÚLTIMO lance é detectado (bid_count e last_hash)', () => {
  const d = fresh();
  d.bids.pop(); // DELETE FROM bids WHERE seq = 3
  const r = verifyChain(d);
  assert.equal(r.intact, false);
  assert.equal(r.brokenAt, 3);
  assert.equal(r.code, 'LAST_BIDS_MISSING');
});

test('INSERIR um lance depois do fim é detectado', () => {
  const d = fresh();
  const last = d.bids[d.bids.length - 1];
  const createdAt = new Date('2026-10-28T12:05:00.000Z');
  // Atacante até calcula um hash válido para o lance falso...
  const hash = computeBidHash({
    lotId: LOT_ID, seq: 4, publicCode: 'C0FFEE00', amount: 130000,
    createdAt, prevHash: last.hash,
  });
  d.bids.push({
    seq: 4, public_code: 'C0FFEE00', amount: 130000, created_at: createdAt,
    prev_hash: last.hash, hash,
  });
  // ...mas o lote ainda diz que teve 3 lances e guarda o last_hash antigo.
  const r = verifyChain(d);
  assert.equal(r.intact, false);
  assert.equal(r.code, 'EXTRA_BIDS');
  assert.equal(r.brokenAt, 4);
});

test('adulterar o final_hash do comprovante é detectado', () => {
  const d = fresh();
  d.receiptFinalHash = 'a'.repeat(64);
  const r = verifyChain(d);
  assert.equal(r.intact, false);
  assert.equal(r.code, 'RECEIPT_MISMATCH');
});

test('adulterar só o last_hash do lote é detectado', () => {
  const d = fresh();
  d.lastHash = 'b'.repeat(64);
  const r = verifyChain(d);
  assert.equal(r.intact, false);
  assert.equal(r.code, 'LAST_HASH_MISMATCH');
});

// Refaz cadeia + last_hash + comprovante com a função de hash que o atacante tiver.
function rebuildAll(d, hashFn) {
  let prev = GENESIS_HASH;
  for (const b of d.bids) {
    b.prev_hash = prev;
    b.hash = hashFn({
      lotId: LOT_ID, seq: b.seq, publicCode: b.public_code,
      amount: b.amount, createdAt: b.created_at, prevHash: prev,
    });
    prev = b.hash;
  }
  d.lastHash = prev;
  d.receiptFinalHash = prev;
}

function dataOf({ lotId, seq, publicCode, amount, createdAt, prevHash }) {
  return [lotId, seq, publicCode, amount, createdAt.toISOString(), prevHash].join('|');
}

// SHA-256 simples, como era o formato antigo (sem chave).
const plainSha256 = (i) => crypto.createHash('sha256').update(dataOf(i)).digest('hex');

test('REFAZER a cadeia inteira com SHA-256 público (sem a chave) é detectado', () => {
  const d = fresh();
  d.bids[1].amount = 999999;
  rebuildAll(d, plainSha256);
  const r = verifyChain(d);
  assert.equal(r.intact, false);
  assert.equal(r.code, 'BID_ALTERED');
  assert.equal(r.brokenAt, 1);
});

test('REFAZER a cadeia inteira com uma chave errada é detectado', () => {
  const d = fresh();
  d.bids[1].amount = 999999;
  rebuildAll(d, (i) =>
    crypto.createHmac('sha256', 'chave-do-atacante-1234567').update(dataOf(i)).digest('hex'));
  assert.equal(verifyChain(d).intact, false);
});

test('com a chave correta a cadeia refeita seria aceita (limite residual: vazamento da chave)', () => {
  // Documenta o risco que sobra: quem obtém AUDIT_SECRET do servidor consegue forjar.
  const d = fresh();
  d.bids[1].amount = 999999;
  rebuildAll(d, computeBidHash);
  assert.equal(verifyChain(d).intact, true);
});

test('alterar o prev_hash de um lance é detectado', () => {
  const d = fresh();
  d.bids[1].prev_hash = 'c'.repeat(64);
  const r = verifyChain(d);
  assert.equal(r.intact, false);
  assert.equal(r.code, 'CHAIN_LINK_BROKEN');
  assert.equal(r.brokenAt, 2);
});

test('alterar o hash de um lance é detectado', () => {
  const d = fresh();
  d.bids[2].hash = 'd'.repeat(64);
  const r = verifyChain(d);
  assert.equal(r.intact, false);
  assert.equal(r.code, 'BID_ALTERED');
});

test('cadeia no formato antigo (SHA-256) NÃO é aceita pelo verificador público', () => {
  // Evita ataque de rebaixamento: o verificador só conhece HMAC.
  const d = fresh();
  rebuildAll(d, plainSha256);
  assert.equal(verifyChain(d).intact, false);
});

test('migração: cadeia antiga é lida com a função antiga e refeita com HMAC', () => {
  const legacy = fresh();
  rebuildAll(legacy, plainSha256);
  assert.equal(verifyChain(legacy, plainSha256).intact, true);
  rebuildAll(legacy, computeBidHash);
  assert.equal(verifyChain(legacy).intact, true);
});

test('sem AUDIT_SECRET a geração do selo falha em vez de usar chave vazia', () => {
  const saved = process.env.AUDIT_SECRET;
  delete process.env.AUDIT_SECRET;
  try {
    assert.throws(() => computeBidHash({
      lotId: 1, seq: 1, publicCode: 'AAAA0000', amount: 1,
      createdAt: new Date(), prevHash: GENESIS_HASH,
    }), /AUDIT_SECRET/);
  } finally {
    process.env.AUDIT_SECRET = saved;
  }
});
