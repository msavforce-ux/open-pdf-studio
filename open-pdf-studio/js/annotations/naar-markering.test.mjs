import test from 'node:test';
import assert from 'node:assert/strict';

import { sprongNaar } from './naar-markering.js';

test('een markering op een ander blad vraagt een paginawissel', () => {
  assert.deepEqual(sprongNaar({ page: 61 }, 60), { page: 61, wisselPagina: true });
});

test('staat hij op dit blad, dan alleen selecteren', () => {
  assert.deepEqual(sprongNaar({ page: 60 }, 60), { page: 60, wisselPagina: false });
});

test('zonder bruikbaar blad gebeurt er niets', () => {
  assert.equal(sprongNaar(null, 1), null);
  assert.equal(sprongNaar({}, 1), null);
  assert.equal(sprongNaar({ page: 0 }, 1), null);
  assert.equal(sprongNaar({ page: 'x' }, 1), null);
});
