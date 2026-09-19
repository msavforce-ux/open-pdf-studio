// Een staat mag pas optellen nadat de waarden in dezelfde eenheid staan.
//
// De kolom toont bewust de tekeneenheid van het blad — millimeters blijven
// millimeters. Maar een set waarin het ene blad in mm en het andere in m
// gekalibreerd is, leverde in de som de ruwe getallen bij elkaar op:
// 4360 (mm) + 12 (m) = 4372, met één eenheid erboven. Dat getal ziet er
// normaal uit en is fout, en zo'n fout valt pas in de calculatie op.

import test from 'node:test';
import assert from 'node:assert/strict';

import { buildSchedule } from './engine.js';
import { omrekenen } from './categories.js';

const kolom = (res, key) => res.columns.find(c => c.key === key);

test('omrekenen doet lengte en oppervlak, en weigert de rest', () => {
  assert.equal(omrekenen(4360, 'mm', 'm'), 4.36);
  assert.equal(omrekenen(2, 'm', 'mm'), 2000);
  assert.equal(omrekenen(100, 'cm', 'm'), 1);
  assert.equal(omrekenen(20_000_000, 'mm²', 'm²'), 20);
  // Gelijke eenheid en ontbrekende eenheid gaan ongewijzigd door.
  assert.equal(omrekenen(7, 'm', 'm'), 7);
  assert.equal(omrekenen(7, null, 'm'), 7);
  // Lengte tegen oppervlak, en een eenheid die geen maat is: geen getal.
  assert.equal(omrekenen(5, 'm', 'm²'), null);
  assert.equal(omrekenen(5, 'pt', 'm'), null);
});

test('lengtes uit een mm-blad en een m-blad tellen op in de kolomeenheid', () => {
  const res = buildSchedule(
    [
      { type: 'measureDistance', page: 1, measureValue: 4360, measureUnit: 'mm' },
      { type: 'measureDistance', page: 2, measureValue: 12, measureUnit: 'm' },
    ],
    { categories: ['line-based'], fields: ['length'] },
  );
  // De kolom volgt het eerste element: millimeters.
  assert.equal(kolom(res, 'length').unit, 'mm');
  // 4360 mm + 12 m = 16 360 mm, niet 4372.
  assert.equal(res.grandTotals.length, 16_360);
});

test('oppervlaktes uit een mm-blad en een m-blad tellen op', () => {
  const res = buildSchedule(
    [
      { type: 'measureArea', page: 1, measureValue: 20_000_000, measureUnit: 'mm²' },
      { type: 'measureArea', page: 2, measureValue: 5, measureUnit: 'm²' },
    ],
    { categories: ['area'], fields: ['area'] },
  );
  // measureArea normaliseert mm² al naar m², dus beide rijen staan in m².
  assert.equal(kolom(res, 'area').unit, 'm²');
  assert.equal(res.grandTotals.area, 25);
});

test('een blad in voet telt mee met een blad in meters', () => {
  const res = buildSchedule(
    [
      { type: 'measureDistance', page: 1, measureValue: 10, measureUnit: 'm' },
      { type: 'measureDistance', page: 2, measureValue: 10, measureUnit: 'ft' },
    ],
    { categories: ['line-based'], fields: ['length'] },
  );
  assert.equal(kolom(res, 'length').unit, 'm');
  assert.equal(Math.round(res.grandTotals.length * 1000) / 1000, 13.048);
});

test('een groep telt per eenheid van de kolom, niet per blad', () => {
  const res = buildSchedule(
    [
      { type: 'measureDistance', page: 1, measureValue: 1000, measureUnit: 'mm', label: 'SM-01' },
      { type: 'measureDistance', page: 9, measureValue: 2, measureUnit: 'm', label: 'SM-01' },
      { type: 'measureDistance', page: 9, measureValue: 5, measureUnit: 'm', label: 'SM-02' },
    ],
    {
      categories: ['line-based'],
      fields: ['label', 'length'],
      sort: [{ field: 'label', dir: 'asc', group: true }],
    },
  );
  const groep = (key) => res.groups.find(g => g.key === key);
  // SM-01: 1000 mm + 2 m = 3000 mm.
  assert.equal(groep('SM-01').subtotals.length, 3000);
  assert.equal(groep('SM-02').subtotals.length, 5000);
  assert.equal(res.grandTotals.length, 8000);
});
