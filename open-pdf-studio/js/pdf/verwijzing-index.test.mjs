import test from 'node:test';
import assert from 'node:assert/strict';

import { isCode, normaliseerCode, bouwIndex, codeOnder } from './verwijzing-index.js';

const T = (str, x = 0, y = 0) => ({ str, x, y });

test('een bouwcode is letters plus cijfer, een maat niet', () => {
  for (const c of ['L-1', 'BS-2', 'BST-1', 'GD-3', 'R-1', 'T2', 'SP-4']) {
    assert.ok(isCode(c), `${c} moet een code zijn`);
  }
  for (const n of ['556', '250', '1500', '', 'Pertvaros', '23.02.119', 'A947']) {
    assert.equal(isCode(n), false, `${n} mag geen code zijn`);
  }
});

test('de staat wint als definitie, niet de plattegrond', () => {
  // Blad 73 is de ramenstaat: veel VERSCHILLENDE codes, klein blad.
  // Blad 60 is een plattegrond: dezelfde code vaak, weinig verschillende.
  const index = bouwIndex([
    { page: 60, groot: true, items: [T('L-1'), T('L-1'), T('L-1'), T('BS-1')] },
    { page: 61, groot: true, items: [T('L-1'), T('L-1')] },
    { page: 73, groot: false, items: [T('L-1'), T('L-2'), T('L-3'), T('BS-1'), T('BS-2')] },
  ]);

  const l1 = index.get('L1');
  assert.ok(l1, 'L-1 moet in de index staan');
  assert.deepEqual(l1.bladen, [60, 61, 73]);
  assert.equal(l1.definitie, 73, 'de staat beschrijft de code, de plattegrond gebruikt hem');
});

test('stempeltekst verwijst nergens heen', () => {
  // Een codevormig stempel (KV-1) staat op élk tekeningblad; L-1 op een deel.
  const bladen = [1, 2, 3, 4, 5, 6].map((page) => ({
    page, groot: true, items: page <= 2 ? [T('KV-1'), T('L-1')] : [T('KV-1')],
  }));
  bladen.push({ page: 9, groot: false, items: [T('L-1'), T('L-2'), T('L-3')] });
  const index = bouwIndex(bladen);
  assert.equal(index.has('KV1'), false, 'op elk tekeningblad = stempel');
  assert.ok(index.has('L1'), 'een echte code staat maar op een deel');
  assert.equal(index.get('L1').definitie, 9);
});

test('een code op maar één blad verwijst nergens heen', () => {
  const index = bouwIndex([
    { page: 60, groot: true, items: [T('XX-9'), T('XX-9')] },
    { page: 73, groot: false, items: [T('L-1'), T('L-2')] },
  ]);
  assert.equal(index.has('XX9'), false);
});

test('liever geen verwijzing dan een verkeerde', () => {
  // Overal even los: geen blad dat zich als staat gedraagt.
  const index = bouwIndex([
    { page: 60, groot: true, items: [T('L-1')] },
    { page: 61, groot: true, items: [T('L-1')] },
  ]);
  assert.equal(index.get('L1').definitie, null);
});

test('de code onder de aanwijzer', () => {
  const items = [T('L-1', 100, 200), T('BS-2', 300, 200), T('1500', 102, 201)];
  assert.equal(codeOnder(items, 101, 201), 'L-1');
  assert.equal(codeOnder(items, 299, 203), 'BS-2');
  assert.equal(codeOnder(items, 200, 200), null, 'niets in de buurt');
  assert.equal(codeOnder(items, 102, 201), 'L-1', 'een maat is geen verwijzing');
});

test('T-1 en T1 zijn dezelfde code', () => {
  assert.equal(normaliseerCode('T-1'), 'T1');
  assert.equal(normaliseerCode(' t 1 '), 'T1');
  assert.equal(normaliseerCode('BST-1'), 'BST1');
  assert.notEqual(normaliseerCode('T-1'), normaliseerCode('T-2'));
});

test('twee schrijfwijzen vallen samen, en de vaakste wint als naam', () => {
  // Zo staat het in de echte set: op de architectuurbladen met streepje,
  // op de constructiebladen zonder.
  const index = bouwIndex([
    { page: 60, groot: true, items: [T('T-1'), T('T-1'), T('T-2'), T('T-3')] },
    { page: 61, groot: true, items: [T('T-1')] },
    { page: 105, groot: true, items: [T('T1')] },
    { page: 130, groot: false, items: [T('T-1'), T('T-2'), T('T-3')] },
  ]);

  assert.equal(index.size, 3, 'T-1 en T1 tellen als één');
  const t1 = index.get('T1');
  assert.ok(t1, 'de sleutel is de genormaliseerde vorm');
  assert.equal(t1.code, 'T-1', 'getoond wordt de vaakste schrijfwijze');
  assert.deepEqual(t1.bladen, [60, 61, 105, 130]);
  assert.equal(t1.definitie, 130);
});

test('de index zegt of het beschrijvende blad een staat is of een tekening', () => {
  // Blad 9 is een staat (klein, codedicht) → echte beschrijving.
  const metStaat = bouwIndex([
    { page: 1, groot: true, items: [T('L-1')] },
    { page: 9, groot: false, items: [T('L-1'), T('L-2'), T('L-3')] },
  ]);
  assert.equal(metStaat.get('L1').definitie, 9);
  assert.equal(metStaat.get('L1').definitieIsStaat, true);

  // Alleen grote tekeningbladen: het gevelblad draagt de codes wel, maar
  // beschrijft ze niet.
  const alleenTekening = bouwIndex([
    { page: 56, groot: true, items: [T('L-1'), T('L-2'), T('L-3')] },
    { page: 60, groot: true, items: [T('L-1')] },
  ]);
  assert.equal(alleenTekening.get('L1').definitie, 56);
  assert.equal(alleenTekening.get('L1').definitieIsStaat, false,
    'een tekening beschrijft niet — een ander projectdeel mag voorgaan');
});
