import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { publish, subscribe, subscriberCount, sseHandler } from '../src/services/events.js';

test('evento de um lote chega a quem assina o lote e a quem assina todos', () => {
  const lot = [];
  const all = [];
  const other = [];
  const offs = [
    subscribe('lot:7', (e) => lot.push(e)),
    subscribe('all', (e) => all.push(e)),
    subscribe('lot:8', (e) => other.push(e)),
  ];

  publish(7, { type: 'bid', currentBid: 1500 });

  assert.equal(lot.length, 1);
  assert.equal(all.length, 1);
  assert.equal(other.length, 0, 'quem acompanha outro lote não recebe');
  assert.equal(lot[0].lotId, 7);
  assert.equal(lot[0].type, 'bid');
  assert.equal(lot[0].currentBid, 1500);
  offs.forEach((off) => off());
});

test('depois de cancelar a assinatura, não recebe mais e o canal é limpo', () => {
  const got = [];
  const off = subscribe('lot:9', (e) => got.push(e));
  assert.equal(subscriberCount('lot:9'), 1);
  off();
  publish(9, { type: 'bid' });
  assert.equal(got.length, 0);
  assert.equal(subscriberCount('lot:9'), 0);
});

test('um assinante com erro não impede os outros de receber', () => {
  const got = [];
  const offs = [
    subscribe('lot:10', () => { throw new Error('conexão caiu'); }),
    subscribe('lot:10', (e) => got.push(e)),
  ];
  publish(10, { type: 'ended' });
  assert.equal(got.length, 1);
  offs.forEach((off) => off());
});

// Resposta HTTP de mentira, só com o que o sseHandler usa
function fakeResponse() {
  return {
    headers: {}, chunks: [],
    set(h) { Object.assign(this.headers, h); },
    flushHeaders() {},
    write(chunk) { this.chunks.push(chunk); },
    status() { return this; },
    json() {},
  };
}

test('a rota SSE abre o fluxo, entrega eventos no formato SSE e limpa ao fechar', () => {
  const req = new EventEmitter();
  const res = fakeResponse();
  sseHandler('lot:11')(req, res);

  assert.match(res.headers['Content-Type'], /text\/event-stream/);
  assert.equal(subscriberCount('lot:11'), 1);

  publish(11, { type: 'bid', currentBid: 2000 });
  const last = res.chunks.at(-1);
  assert.match(last, /^data: /);
  assert.equal(JSON.parse(last.slice(6)).currentBid, 2000);

  req.emit('close');
  assert.equal(subscriberCount('lot:11'), 0);
});
