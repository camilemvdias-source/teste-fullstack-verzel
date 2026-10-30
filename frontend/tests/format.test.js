import test from 'node:test';
import assert from 'node:assert/strict';
import { parseBrlToCents } from '../src/lib/format.js';

test('formato brasileiro: ponto de milhar e vírgula nos centavos', () => {
  assert.equal(parseBrlToCents('1.234,56'), 123456);
  assert.equal(parseBrlToCents('R$ 1.234,56'), 123456);
  assert.equal(parseBrlToCents('1.000.000,00'), 100000000);
  assert.equal(parseBrlToCents('100,50'), 10050);
  assert.equal(parseBrlToCents('100,5'), 10050);
  assert.equal(parseBrlToCents('100,'), 10000);
  assert.equal(parseBrlToCents('0,50'), 50);
  assert.equal(parseBrlToCents('1.500'), 150000);
  assert.equal(parseBrlToCents('50'), 5000);
});

test('ponto como separador decimal não multiplica o valor por 10 ou 100', () => {
  // Antes: "1500.50" virava R$ 150.050,00 e "100.5" virava R$ 1.005,00
  assert.equal(parseBrlToCents('1500.50'), 150050);
  assert.equal(parseBrlToCents('1500.5'), 150050);
  assert.equal(parseBrlToCents('100.5'), 10050);
});

test('formato ambíguo ou malformado vira null em vez de um valor adivinhado', () => {
  for (const text of ['10,555', '1,234.56', '1.234.56', '1.23,45', '1234.567']) {
    assert.equal(parseBrlToCents(text), null, text);
  }
});

test('valores vazios, zero ou negativos viram null', () => {
  for (const text of ['', 'abc', ',', '.', '0', '0,00', '-5', '-5,50', '99999999999999999999']) {
    assert.equal(parseBrlToCents(text), null, text);
  }
});
