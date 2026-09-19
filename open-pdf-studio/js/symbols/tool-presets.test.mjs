// De gereedschapskist bewaart een naam plus uiterlijk. De naam is het
// belangrijkste veld: daarop groepeert de hoeveelhedenstaat de kiekiai, dus
// een gereedschap zonder naam heeft geen nut en twee gereedschappen met
// dezelfde naam zijn hetzelfde gereedschap.

import test from 'node:test';
import assert from 'node:assert/strict';

import { maakPreset, voegToe, verwijder, naarToolOverrides, PRESET_TOOLS } from './tool-presets.js';

test('een gereedschap heeft een naam en een meetgereedschap nodig', () => {
  assert.equal(maakPreset({ naam: '', tool: 'measureArea' }), null);
  assert.equal(maakPreset({ naam: '   ', tool: 'measureArea' }), null);
  assert.equal(maakPreset({ naam: 'SM-01', tool: 'box' }), null, 'geen meetgereedschap');
  assert.equal(maakPreset({ naam: 'SM-01' }), null);
  const p = maakPreset({ naam: '  SM-01 Binnenwanden  ', tool: 'measureDistance' });
  assert.equal(p.naam, 'SM-01 Binnenwanden', 'spaties eraf');
  assert.equal(p.tool, 'measureDistance');
  assert.ok(p.id);
});

test('uiterlijk is optioneel en wordt alleen bewaard als het klopt', () => {
  const p = maakPreset({ naam: 'GR-01', tool: 'measureArea', strokeColor: '#e11d48', lineWidth: 3 });
  assert.equal(p.strokeColor, '#e11d48');
  assert.equal(p.lineWidth, 3);
  const q = maakPreset({ naam: 'GR-02', tool: 'measureArea', lineWidth: 0 });
  assert.equal(q.lineWidth, undefined, 'lijndikte 0 is geen lijndikte');
  const r = maakPreset({ naam: 'GR-03', tool: 'measureArea', lineWidth: Number.NaN });
  assert.equal(r.lineWidth, undefined);
});

test('alle vier de meetgereedschappen zijn toegestaan', () => {
  for (const tool of PRESET_TOOLS) {
    assert.ok(maakPreset({ naam: 'X', tool }), `${tool} moet mogen`);
  }
});

test('dezelfde naam én hetzelfde gereedschap vervangt, en houdt zijn id', () => {
  const eerste = maakPreset({ naam: 'SM-01', tool: 'measureDistance', strokeColor: '#000000' });
  let lijst = voegToe([], eerste);
  assert.equal(lijst.length, 1);

  const opnieuw = maakPreset({ naam: 'sm-01', tool: 'measureDistance', strokeColor: '#ff0000' });
  lijst = voegToe(lijst, opnieuw);
  assert.equal(lijst.length, 1, 'hoofdletters maken het niet tot een ander gereedschap');
  assert.equal(lijst[0].strokeColor, '#ff0000', 'het uiterlijk is bijgewerkt');
  assert.equal(lijst[0].id, eerste.id, 'het id blijft, anders raakt een verwijzing zoek');

  // Zelfde naam, ANDER gereedschap: dat is wel een apart gereedschap —
  // "SM-01" als lengte en als aantal zijn twee verschillende regels.
  lijst = voegToe(lijst, maakPreset({ naam: 'SM-01', tool: 'count' }));
  assert.equal(lijst.length, 2);
});

test('verwijderen laat de rest staan', () => {
  const a = maakPreset({ naam: 'A', tool: 'measureArea' });
  const b = maakPreset({ naam: 'B', tool: 'count' });
  const lijst = voegToe(voegToe([], a), b);
  const na = verwijder(lijst, a.id);
  assert.deepEqual(na.map((p) => p.naam), ['B']);
  assert.deepEqual(verwijder(na, 'bestaat-niet').map((p) => p.naam), ['B']);
});

test('naar toolOverrides: de naam gaat altijd mee, de rest alleen als ze er is', () => {
  const kaal = naarToolOverrides(maakPreset({ naam: 'PT-01', tool: 'measureDistance' }));
  assert.deepEqual(kaal, { presetLabel: 'PT-01' });

  const vol = naarToolOverrides(maakPreset({
    naam: 'GR-01', tool: 'measureArea', strokeColor: '#2f7fd1', lineWidth: 2.5,
  }));
  assert.deepEqual(vol, { presetLabel: 'GR-01', presetStrokeColor: '#2f7fd1', presetLineWidth: 2.5 });

  assert.deepEqual(naarToolOverrides(null), {});
});
