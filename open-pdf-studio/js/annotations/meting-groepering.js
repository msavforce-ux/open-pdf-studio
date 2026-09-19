// Metingen groeperen zoals een calculator ze leest.
//
// Het paneel groepeerde op TYPE ("lengte", "oppervlak"). Dat is de vraag van
// de tekenaar, niet die van de calculator: die wil "SM-01 Binnenwanden" zien,
// over alle bladen heen, want dat is de regel die straks in de begroting komt.
// Groeperen gebeurt daarom op de NAAM die het gereedschap meegaf (label /
// subject / measureName). Metingen zonder naam vallen terug op hun type, zodat
// losse, snelle metingen niet verdwijnen maar ook niet tussen de benoemde
// regels gaan zitten.

import { omrekenen } from '../quantities/categories.js';

/** De naam waarop gegroepeerd wordt, of null als de meting er geen heeft. */
export function groepsNaam(m) {
  if (!m) return null;
  for (const veld of [m.label, m.subject, m.measureName]) {
    const naam = typeof veld === 'string' ? veld.trim() : '';
    if (naam) return naam;
  }
  return null;
}

/**
 * Tel op binnen één groep. Eenheden worden eerst gelijkgetrokken (4360 mm +
 * 12 m = 16,36 m); de eenheid van de eerste meting met een waarde is leidend.
 * Kan er ook maar één waarde niet omgerekend worden, dan is de som niet
 * eerlijk te tonen en geven we null terug — liever geen getal dan een fout
 * getal in een begroting.
 */
export function somVan(items) {
  const metWaarde = (items || []).filter((m) => typeof m?.measureValue === 'number' && !Number.isNaN(m.measureValue));
  if (metWaarde.length === 0) return null;
  const eenheid = metWaarde[0].measureUnit || null;
  let som = 0;
  for (const m of metWaarde) {
    const waarde = omrekenen(m.measureValue, m.measureUnit || null, eenheid);
    if (waarde == null) return { waarde: null, eenheid };
    som += waarde;
  }
  return { waarde: som, eenheid };
}

/**
 * Groepeer metingen op naam. Benoemde groepen komen eerst (alfabetisch), de
 * naamloze type-groepen daarna — de calculator kijkt naar zijn eigen regels.
 *
 * @param {Array} metingen
 * @param {(type: string) => string} typeNaam  vertaalt een type naar een label
 * @returns {Array<{key, naam, benoemd, items, som}>}
 */
export function groepeerMetingen(metingen, typeNaam = (t) => t) {
  const groepen = new Map();
  for (const m of metingen || []) {
    const naam = groepsNaam(m);
    const key = naam ? `naam:${naam}` : `type:${m?.type}`;
    let g = groepen.get(key);
    if (!g) {
      g = { key, naam: naam || typeNaam(m?.type), benoemd: Boolean(naam), items: [] };
      groepen.set(key, g);
    }
    g.items.push(m);
  }
  const lijst = [...groepen.values()];
  for (const g of lijst) g.som = somVan(g.items);
  lijst.sort((a, b) => {
    if (a.benoemd !== b.benoemd) return a.benoemd ? -1 : 1;
    return a.naam.localeCompare(b.naam);
  });
  return lijst;
}
