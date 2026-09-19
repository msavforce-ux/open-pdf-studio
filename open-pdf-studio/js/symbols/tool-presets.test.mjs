// De gereedschapskist bewaart een naam plus uiterlijk. De naam is het
// belangrijkste veld: daarop groepeert de hoeveelhedenstaat de kiekiai, dus
// een gereedschap zonder naam heeft geen nut en twee gereedschappen met
// dezelfde naam zijn hetzelfde gereedschap.

import test from 'node:test';
import assert from 'node:assert/strict';

import { maakPreset, voegToe, verwijder, bewerk, naarToolOverrides, PRESET_TOOLS } from './tool-presets.js';

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

test('een bewaard gereedschap is te wijzigen zonder zijn id te verliezen', () => {
  const a = maakPreset({ naam: 'SM-01', tool: 'measureDistance', strokeColor: '#000000', lineWidth: 2 });
  const lijst = voegToe([], a);

  const hernoemd = bewerk(lijst, a.id, { naam: '  SM-01 Pertvaros  ' });
  assert.equal(hernoemd[0].naam, 'SM-01 Pertvaros');
  assert.equal(hernoemd[0].id, a.id, 'het id blijft, anders raakt de koppeling zoek');
  assert.equal(hernoemd[0].strokeColor, '#000000', 'de rest blijft staan');

  const gekleurd = bewerk(hernoemd, a.id, { strokeColor: '#e11d48', lineWidth: 4 });
  assert.equal(gekleurd[0].strokeColor, '#e11d48');
  assert.equal(gekleurd[0].lineWidth, 4);
  assert.equal(gekleurd[0].naam, 'SM-01 Pertvaros', 'de naam blijft');
});

test('wissen kan, maar een naam wegpoetsen niet', () => {
  const a = maakPreset({ naam: 'GR-01', tool: 'measureArea', strokeColor: '#111111', lineWidth: 3 });
  let lijst = voegToe([], a);

  lijst = bewerk(lijst, a.id, { lineWidth: null, strokeColor: '' });
  assert.equal(lijst[0].lineWidth, undefined);
  assert.equal(lijst[0].strokeColor, undefined);

  lijst = bewerk(lijst, a.id, { naam: '   ' });
  assert.equal(lijst[0].naam, 'GR-01', 'een lege naam verandert niets');
});

test('hernoemen naar een naam die al bestaat gaat niet door', () => {
  const a = maakPreset({ naam: 'SM-01', tool: 'measureDistance' });
  const b = maakPreset({ naam: 'SM-02', tool: 'measureDistance' });
  const lijst = voegToe(voegToe([], a), b);

  const na = bewerk(lijst, b.id, { naam: 'sm-01' });
  assert.deepEqual(na.map((p) => p.naam), ['SM-01', 'SM-02'], 'twee regels met dezelfde naam mag niet');

  // Een ander gereedschap met die naam mag wel: lengte en aantal zijn
  // verschillende posten.
  const c = maakPreset({ naam: 'X', tool: 'count' });
  const lijst2 = voegToe(lijst, c);
  assert.equal(bewerk(lijst2, c.id, { naam: 'SM-01' })[2].naam, 'SM-01');
});

test('een onbekend id verandert niets', () => {
  const a = maakPreset({ naam: 'A', tool: 'count' });
  const lijst = voegToe([], a);
  assert.deepEqual(bewerk(lijst, 'bestaat-niet', { naam: 'B' }), lijst);
});
