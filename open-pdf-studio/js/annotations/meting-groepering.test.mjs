import test from 'node:test';
import assert from 'node:assert/strict';

import { groepsNaam, somVan, groepeerMetingen } from './meting-groepering.js';

const M = (o) => ({ type: 'measureDistance', measureUnit: 'mm', ...o });

test('de naam komt uit label, dan subject, dan measureName', () => {
  assert.equal(groepsNaam(M({ label: 'SM-01' })), 'SM-01');
  assert.equal(groepsNaam(M({ subject: 'SM-02' })), 'SM-02');
  assert.equal(groepsNaam(M({ measureName: 'SM-03' })), 'SM-03');
  assert.equal(groepsNaam(M({ label: '  SM-04  ' })), 'SM-04');
  assert.equal(groepsNaam(M({ label: '   ' })), null, 'spaties zijn geen naam');
  assert.equal(groepsNaam(M({})), null);
  assert.equal(groepsNaam(null), null);
});

test('label wint van subject — het gereedschap zet allebei', () => {
  assert.equal(groepsNaam(M({ label: 'SM-01', subject: 'iets anders' })), 'SM-01');
});

test('optellen trekt de eenheden eerst gelijk', () => {
  assert.deepEqual(somVan([M({ measureValue: 4360 }), M({ measureValue: 12, measureUnit: 'm' })]),
    { waarde: 16360, eenheid: 'mm' }, '4360 mm + 12 m = 16,36 m');
  assert.equal(somVan([]), null);
  assert.equal(somVan([M({})]), null, 'zonder waarde geen som');
});

test('een niet-omrekenbare eenheid geeft geen getal in plaats van een fout getal', () => {
  const som = somVan([M({ measureValue: 5 }), M({ measureValue: 3, measureUnit: 'graden' })]);
  assert.equal(som.waarde, null);
});

test('hetzelfde gereedschap op twee bladen is één groep', () => {
  const g = groepeerMetingen([
    M({ page: 60, label: 'SM-01 Pertvaros', measureValue: 12000 }),
    M({ page: 61, label: 'SM-01 Pertvaros', measureValue: 8000 }),
  ]);
  assert.equal(g.length, 1);
  assert.equal(g[0].naam, 'SM-01 Pertvaros');
  assert.equal(g[0].items.length, 2);
  assert.deepEqual(g[0].som, { waarde: 20000, eenheid: 'mm' });
});

test('naamloze metingen vallen terug op hun type en staan achteraan', () => {
  const g = groepeerMetingen([
    M({ measureValue: 100 }),
    M({ label: 'SM-02 Fasadas', measureValue: 500 }),
    M({ label: 'SM-01 Pertvaros', measureValue: 300 }),
  ], (t) => (t === 'measureDistance' ? 'Lengte' : t));

  assert.deepEqual(g.map((x) => x.naam), ['SM-01 Pertvaros', 'SM-02 Fasadas', 'Lengte']);
  assert.deepEqual(g.map((x) => x.benoemd), [true, true, false]);
});

test('dezelfde naam op verschillende meetsoorten blijft één regel', () => {
  // Bewust: de calculator gaf ze dezelfde naam, dus hij ziet ze als één post.
  const g = groepeerMetingen([
    M({ label: 'X', measureValue: 2 }),
    M({ type: 'measureArea', label: 'X', measureValue: 3, measureUnit: 'mm' }),
  ]);
  assert.equal(g.length, 1);
  assert.equal(g[0].items.length, 2);
});
