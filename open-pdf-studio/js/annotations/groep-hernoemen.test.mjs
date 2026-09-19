import test from 'node:test';
import assert from 'node:assert/strict';

import { hernoemMetingen, elementenVanGroep } from './groep-hernoemen.js';

test('één keer typen hernoemt elke meting in de groep', () => {
  const a = { label: 'SM-01', subject: 'SM-01', page: 60 };
  const b = { label: 'SM-01', subject: 'SM-01', page: 61 };
  assert.equal(hernoemMetingen([a, b], 'SM-01 Pertvaros'), 2);
  assert.equal(a.label, 'SM-01 Pertvaros');
  assert.equal(b.subject, 'SM-01 Pertvaros', 'subject gaat mee, anders lopen de lijsten uiteen');
});

test('spaties eraf, en een lege naam verandert niets', () => {
  const a = { label: 'X', subject: 'X' };
  assert.equal(hernoemMetingen([a], '  GR-01  '), 1);
  assert.equal(a.label, 'GR-01');

  assert.equal(hernoemMetingen([a], '   '), 0);
  assert.equal(hernoemMetingen([a], null), 0);
  assert.equal(a.label, 'GR-01', 'de oude naam blijft staan');
});

test('wat al goed staat wordt niet geteld', () => {
  const a = { label: 'GR-01', subject: 'GR-01' };
  const b = { label: 'anders', subject: 'anders' };
  assert.equal(hernoemMetingen([a, b], 'GR-01'), 1, 'alleen b veranderde');
});

test('een meting zonder naam krijgt er een', () => {
  const a = {};
  assert.equal(hernoemMetingen([a], 'SM-09'), 1);
  assert.equal(a.label, 'SM-09');
  assert.equal(a.subject, 'SM-09');
});

test('lege invoer loopt niet stuk', () => {
  assert.equal(hernoemMetingen([], 'X'), 0);
  assert.equal(hernoemMetingen(null, 'X'), 0);
  assert.equal(hernoemMetingen([null, undefined], 'X'), 0);
});

test('de elementen achter een groep', () => {
  const el1 = { label: 'A' };
  const el2 = { label: 'A' };
  assert.deepEqual(elementenVanGroep({ rows: [{ el: el1 }, { el: el2 }, { el: null }] }), [el1, el2]);
  assert.deepEqual(elementenVanGroep(null), []);
});
