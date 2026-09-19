import test from 'node:test';
import assert from 'node:assert/strict';

import { maatWaarde, kettingen, schattingVanKetting, controleerSchaal } from './schaal-controle.js';

// Bouw een horizontale maatketting: elk getal midden boven zijn eigen segment.
function ketting(waarden, schaal, y = 100, x0 = 0) {
  const items = [];
  let x = x0;
  for (const w of waarden) {
    items.push({ str: String(w), x: x + (w * schaal) / 2, y });
    x += w * schaal;
  }
  return items;
}

test('alleen hele maatgetallen in een aannemelijk bereik tellen mee', () => {
  assert.equal(maatWaarde('1500'), 1500);
  assert.equal(maatWaarde(' 3400 '), 3400);
  assert.equal(maatWaarde('5.76'), null, 'een oppervlak uit een tabel is geen maat');
  assert.equal(maatWaarde('12'), null, 'te klein: regelnummer');
  assert.equal(maatWaarde('250000'), null, 'te groot voor een maat op een blad');
  assert.equal(maatWaarde('A-12'), null);
  assert.equal(maatWaarde(''), null);
  assert.equal(maatWaarde(null), null);
});

test('een echte maatketting levert de schaal terug', () => {
  const schaal = 0.05;  // 0,05 px per mm
  const k = kettingen(ketting([1500, 3400, 2100, 4800], schaal));
  assert.ok(k.length >= 1);
  const geschat = schattingVanKetting(k.find(x => x.as === 'h'));
  assert.ok(Math.abs(geschat - schaal) / schaal < 0.001, `kreeg ${geschat}`);
});

test('een kolom ruimtenummers wordt geweigerd, niet "gecontroleerd"', () => {
  // 301, 302, 303, 304 onder elkaar met gelijke tussenafstand: consistent én
  // volstrekt zinloos als schaalbewijs.
  const items = [301, 302, 303, 304].map((n, i) => ({ str: String(n), x: 500, y: 100 + i * 12 }));
  const k = kettingen(items).find(x => x.as === 'v');
  assert.ok(k, 'de kolom vormt wel een ketting');
  assert.equal(schattingVanKetting(k), null, 'maar levert geen schatting');
});

test('een verkeerd gekalibreerd blad valt op', () => {
  const echt = 0.05;
  const items = ketting([1500, 3400, 2100, 4800], echt)
    .concat(ketting([2400, 900, 3600], echt, 300));

  const goed = controleerSchaal(items, echt);
  assert.ok(goed, 'genoeg overeenstemmende paren');
  assert.ok(goed.afwijking < 0.01, `afwijking ${goed.afwijking}`);

  // A1 als A3 afgedrukt: 1,41× ernaast.
  const fout = controleerSchaal(items, echt * 1.41);
  assert.ok(fout.afwijking > 0.25, `moet opvallen, kreeg ${fout.afwijking}`);
});

test('één lange ketting is wel bewijs — zo ziet een echt bouwblad eruit', () => {
  // Blad 60 van de echte set: acht maten op één lijn, de rest van de
  // maatvoering is als vectoren getekend. Eisen dat er een tweede ketting is,
  // zou hier betekenen: nooit een oordeel.
  const echt = 0.1866;
  const items = ketting([602, 249, 1754, 255, 1754, 250, 1739, 258, 598], echt);
  const r = controleerSchaal(items, echt);
  assert.ok(r, 'moet wel degelijk een uitspraak doen');
  assert.ok(r.paren >= 8, `kreeg ${r && r.paren} paren`);
  assert.ok(r.afwijking < 0.01);
});

test('losse getallen die het oneens zijn geven geen groen vinkje', () => {
  const items = [
    { str: '1500', x: 0, y: 50 }, { str: '3400', x: 40, y: 50 },
    { str: '900', x: 300, y: 50 }, { str: '5200', x: 310, y: 50 },
    { str: '2100', x: 700, y: 50 },
  ];
  assert.equal(controleerSchaal(items, 0.05), null, 'oneens = geen uitspraak');
});

test('geen tekstlaag of te weinig bewijs: geen uitspraak, geen groen vinkje', () => {
  assert.equal(controleerSchaal([], 0.05), null);
  assert.equal(controleerSchaal(ketting([1500, 3400], 0.05), 0.05), null,
    'te weinig paren');
  assert.equal(controleerSchaal(ketting([1500, 3400, 2100], 0.05), 0), null);
});
