import test from 'node:test';
import assert from 'node:assert/strict';

import { sleutelVanTekst } from './verwijzing-markering.js';

test('een span met een code levert de indexsleutel', () => {
  assert.equal(sleutelVanTekst('L-1'), 'L1');
  assert.equal(sleutelVanTekst('  T1 '), 'T1');
  assert.equal(sleutelVanTekst('BST-1'), 'BST1');
});

test('alles wat geen code is levert niets', () => {
  for (const t of ['1500', 'Pertvaros', '', null, undefined, '23.02.119', 'A947']) {
    assert.equal(sleutelVanTekst(t), null, `${t} mag geen sleutel geven`);
  }
});

test('de twee schrijfwijzen komen op dezelfde sleutel uit', () => {
  assert.equal(sleutelVanTekst('T-4'), sleutelVanTekst('T4'));
});
