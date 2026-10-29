import { GENESIS_HASH, computeBidHash } from './hashChain.js';

// Recalcula a cadeia de selos (hash) de um lote, do primeiro ao último lance,
// e compara com o que está gravado. Devolve { intact, brokenAt, code, reason }.
// "brokenAt" é o número (seq) do lance onde a cadeia deixou de bater.
// hashFn só é trocado pelo script de migração (reseal-audit.js) para ler selos antigos.
export function verifyChain(
  { lotId, bidCount, lastHash, bids, receiptFinalHash },
  hashFn = computeBidHash
) {
  const broken = (brokenAt, code, reason) => ({ intact: false, brokenAt, code, reason });

  let prevHash = GENESIS_HASH;
  let expectedSeq = 1;

  for (const bid of bids) {
    // 1) A numeração tem que ser 1, 2, 3... sem buracos (pega lance apagado do meio)
    if (bid.seq !== expectedSeq) {
      return broken(
        expectedSeq,
        'MISSING_BID',
        'Falta um lance nesta posição: a sequência do histórico foi interrompida.'
      );
    }

    // 2) O lance tem que apontar para o selo do lance anterior
    if (bid.prev_hash !== prevHash) {
      return broken(
        bid.seq,
        'CHAIN_LINK_BROKEN',
        'O vínculo deste lance com o lance anterior foi quebrado.'
      );
    }

    // 3) Recalcula o selo com os dados que estão no banco agora. Se alguém mudou
    //    valor, data ou licitante, o resultado deixa de bater com o selo gravado.
    const expectedHash = hashFn({
      lotId,
      seq: bid.seq,
      publicCode: bid.public_code,
      amount: Number(bid.amount),
      createdAt: new Date(bid.created_at),
      prevHash,
    });
    if (expectedHash !== bid.hash) {
      return broken(
        bid.seq,
        'BID_ALTERED',
        'Os dados deste lance foram alterados depois de gravados.'
      );
    }

    prevHash = bid.hash;
    expectedSeq += 1;
  }

  const count = bids.length;

  // 4) O lote guarda quantos lances recebeu (pega lance apagado no FIM ou lance a mais)
  if (count < bidCount) {
    return broken(
      count + 1,
      'LAST_BIDS_MISSING',
      'Há lance(s) faltando no final do histórico.'
    );
  }
  if (count > bidCount) {
    return broken(
      bidCount + 1,
      'EXTRA_BIDS',
      'Há lance(s) a mais do que o lote registrou.'
    );
  }

  // 5) O lote guarda o selo do último lance
  const chainEnd = count === 0 ? null : prevHash;
  if ((lastHash ?? null) !== chainEnd) {
    return broken(
      Math.max(count, 1),
      'LAST_HASH_MISMATCH',
      'O selo final guardado no lote não confere com o histórico.'
    );
  }

  // 6) O comprovante guarda o mesmo selo final (pega alteração só no lote)
  if (receiptFinalHash != null && receiptFinalHash !== (chainEnd ?? GENESIS_HASH)) {
    return broken(
      Math.max(count, 1),
      'RECEIPT_MISMATCH',
      'O selo final do comprovante não confere com o histórico.'
    );
  }

  return { intact: true, brokenAt: null, code: null, reason: null };
}