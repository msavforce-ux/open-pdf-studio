// Schaalcontrole via de maatketting op het blad.
//
// Waarom dit bestaat: een verkeerd gekalibreerd blad geeft GEEN foutmelding.
// Elke hoeveelheid van dat blad komt er met dezelfde factor naast te liggen —
// een A1-tekening die als A3 is afgedrukt scheelt 1,41×, en dat merk je pas in
// de onderhandeling. De tekening draagt het antwoord zelf: de maatgetallen in
// de maatketting.
//
// Hoe: in een maatketting staat elk getal midden boven zijn eigen segment. De
// afstand tussen twee naast elkaar liggende getallen is dus het halve ene plus
// het halve andere segment:
//
//     |<-- 1500 -->|<----- 3400 ----->|
//           ^                ^
//           a                b          afstand(a,b) = (1500 + 3400) / 2
//
// Daaruit volgt een geschatte schaal per paar. De mediaan over alle paren is
// robuust tegen losse getallen die toevallig op één lijn staan.

/** Alleen hele maatgetallen in een aannemelijk mm-bereik tellen mee. */
export function maatWaarde(str) {
  const s = String(str == null ? '' : str).replace(/\s+/g, '').trim();
  if (!/^\d+$/.test(s)) return null;      // geen decimalen: 5.76 is een oppervlak, geen maat
  const n = Number(s);
  if (!Number.isFinite(n)) return null;
  if (n < 50 || n > 100000) return null;  // 12 is een regelnummer, 250000 geen maat
  return n;
}

const SPREIDING_MIN = 1.5;  // zie hieronder
const KETTING_MIN = 3;

/**
 * Groepeer tekstitems tot kettingen: horizontaal (zelfde y) of verticaal
 * (zelfde x). `tol` is de speling in dezelfde eenheid als de coördinaten.
 */
export function kettingen(items, tol = 2) {
  const maten = (items || [])
    .map((i) => ({ x: i.x, y: i.y, waarde: maatWaarde(i.str) }))
    .filter((i) => i.waarde != null && Number.isFinite(i.x) && Number.isFinite(i.y));

  const uit = [];
  for (const [as, zelfde, langs] of [['h', 'y', 'x'], ['v', 'x', 'y']]) {
    const rest = [...maten].sort((a, b) => a[zelfde] - b[zelfde] || a[langs] - b[langs]);
    let groep = [];
    for (const m of rest) {
      if (groep.length && Math.abs(m[zelfde] - groep[0][zelfde]) > tol) {
        if (groep.length >= KETTING_MIN) uit.push({ as, langs, items: [...groep] });
        groep = [];
      }
      groep.push(m);
    }
    if (groep.length >= KETTING_MIN) uit.push({ as, langs, items: groep });
  }
  return uit;
}

/**
 * Schatting van pixels-per-eenheid uit één ketting, of null.
 *
 * Een ketting waarin alle getallen bijna gelijk zijn wordt geweigerd: een
 * kolom ruimtenummers (301, 302, 303) staat óók op één lijn met gelijke
 * tussenafstand en zou een keurig consistente — en volstrekt verzonnen —
 * schaal opleveren. Alleen een ketting met echt verschillende maten bewijst
 * dat afstand en waarde samen oplopen.
 */
export function parenVanKetting(ketting) {
  const items = [...ketting.items].sort((a, b) => a[ketting.langs] - b[ketting.langs]);
  const waarden = items.map((i) => i.waarde);
  const spreiding = Math.max(...waarden) / Math.min(...waarden);
  if (!(spreiding >= SPREIDING_MIN)) return [];

  const schattingen = [];
  for (let i = 0; i + 1 < items.length; i += 1) {
    const afstand = Math.abs(items[i + 1][ketting.langs] - items[i][ketting.langs]);
    const verwacht = (items[i].waarde + items[i + 1].waarde) / 2;
    if (afstand <= 0 || verwacht <= 0) continue;
    schattingen.push(afstand / verwacht);
  }
  return schattingen;
}

export function schattingVanKetting(ketting) {
  const p = parenVanKetting(ketting);
  return p.length ? mediaan(p) : null;
}

export function mediaan(getallen) {
  const s = [...getallen].sort((a, b) => a - b);
  if (!s.length) return null;
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

/**
 * Controleer een gekalibreerde schaal tegen de maatketting van het blad.
 *
 * @param {Array<{str,x,y}>} items      tekstitems van de pagina, in dezelfde
 *                                      coördinaten als waarin gekalibreerd is
 * @param {number} pixelsPerUnit        de schaal die de gebruiker instelde
 * @returns {null|{gemeten, ingesteld, afwijking, kettingen}}
 *          null = niets te controleren (geen tekstlaag, gescand blad)
 */
// Hoeveel bewijs is genoeg? Niet "twee kettingen": op een echt bouwblad staat
// vaak maar één maatketting als tekst — de rest is als vectoren getekend. Wat
// telt is het aantal PAREN dat onderling overeenstemt. Acht paren die het
// binnen een procent eens zijn, zijn sterker bewijs dan twee kettingen die
// uiteenlopen.
const PAREN_MIN = 4;
const EENSGEZIND_MAX = 1.05;

export function controleerSchaal(items, pixelsPerUnit) {
  if (!(pixelsPerUnit > 0)) return null;
  const alle = kettingen(items)
    .flatMap(parenVanKetting)
    .filter((s) => s > 0)
    .sort((a, b) => a - b);
  if (alle.length < PAREN_MIN) return null;

  // Werk met de middelste helft: één uitschieter (een getal dat toevallig op
  // de lijn stond) mag het oordeel niet bepalen.
  const q = Math.floor(alle.length / 4);
  const kern = alle.slice(q, alle.length - q);
  if (kern.length < 2) return null;
  const eensgezind = kern[kern.length - 1] / kern[0];
  if (!(eensgezind <= EENSGEZIND_MAX)) return null;  // oneens: geen uitspraak

  const gemeten = mediaan(kern);
  return {
    gemeten,
    ingesteld: pixelsPerUnit,
    afwijking: Math.abs(gemeten - pixelsPerUnit) / pixelsPerUnit,
    paren: alle.length,
    eensgezind,
  };
}
