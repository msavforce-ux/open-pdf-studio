// De gereedschapskist belooft één ding: meet je op blad 60 en op blad 61 met
// hetzelfde gereedschap, dan staat er in de staat ÉÉN regel met de som. De
// standaardstaten groeperen op type ("lengte"), niet op de naam die de
// calculator gaf, en zouden die belofte dus breken.

import test from 'node:test';
import assert from 'node:assert/strict';

import { buildSchedule } from './engine.js';
import { getTemplateById } from './schedule-templates.js';

const KIST = getTemplateById('toolchest').config;
const groep = (res, naam) => res.groups.find(g => g.key === naam);
const kolom = (res, key) => res.columns.find(c => c.key === key);

test('de gereedschapskist-staat bestaat en groepeert op naam', () => {
  assert.ok(KIST, 'sjabloon moet er zijn');
  assert.equal(KIST.sort[0].field, 'label');
  assert.equal(KIST.sort[0].group, true);
  assert.equal(KIST.sort[0].footer, true, 'zonder subtotaal geen som');
});

test('hetzelfde gereedschap op twee bladen geeft één opgetelde regel', () => {
  const res = buildSchedule([
    { type: 'measureDistance', page: 60, label: 'SM-01 Pertvaros', measureValue: 12_000, measureUnit: 'mm' },
    { type: 'measureDistance', page: 61, label: 'SM-01 Pertvaros', measureValue: 8_000, measureUnit: 'mm' },
  ], KIST);

  const g = groep(res, 'SM-01 Pertvaros');
  assert.ok(g, 'er moet een groep met de gereedschapsnaam zijn');
  assert.equal(g.rows.length, 2, 'beide bladen blijven zichtbaar als regel');
  // De staat toont bewust de tekeneenheid van het blad: mm blijft mm. Wat
  // telt is dat er wordt OPGETELD over de bladen heen — 12 m + 8 m = 20 m.
  assert.equal(kolom(res, 'length').unit, 'mm');
  assert.equal(g.subtotals.length, 20_000, '12 m + 8 m, in de eenheid van het blad');
  assert.deepEqual(g.rows.map(r => r.vals.page), [60, 61]);
});

test('twee gereedschappen blijven twee regels', () => {
  const res = buildSchedule([
    { type: 'measureDistance', page: 60, label: 'SM-01 Pertvaros', measureValue: 12_000, measureUnit: 'mm' },
    { type: 'measureDistance', page: 60, label: 'SM-02 Fasadas', measureValue: 5_000, measureUnit: 'mm' },
  ], KIST);

  assert.equal(res.groups.length, 2);
  assert.equal(groep(res, 'SM-01 Pertvaros').subtotals.length, 12_000);
  assert.equal(groep(res, 'SM-02 Fasadas').subtotals.length, 5_000);
});

test('subject telt mee als er geen label is — de kist zet allebei', () => {
  const res = buildSchedule([
    { type: 'count', page: 60, subject: 'DU-01 Durys' },
    { type: 'count', page: 61, subject: 'DU-01 Durys' },
  ], KIST);

  const g = groep(res, 'DU-01 Durys');
  assert.ok(g, 'subject moet ook als naam gelden');
  assert.equal(g.subtotals.count, 2);
});
