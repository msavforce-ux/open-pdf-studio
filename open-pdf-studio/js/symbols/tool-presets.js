// Gereedschapskist — zuivere logica (geen state, geen opslag).
//
// Een bewaard gereedschap is een naam plus het uiterlijk waarmee je meet:
// "SM-01 Binnenwanden", lengte, rood, lijndikte 3. Kies je het, dan staat het
// meetgereedschap klaar MET die naam — en op die naam groepeert de
// hoeveelhedenstaat de kiekiai, over alle bladen heen. Dat is het hele punt:
// zonder de naam is "gereedschap kiezen" en "de meting benoemen" twee losse
// handelingen, en de tweede vergeet je.
//
// Opslag: de voorkeuren, niet het document. Een gereedschapskist hoort bij de
// CALCULATOR, niet bij één tekeningenset — precies zoals de bestaande
// `customSymbolGroups` van het symbolenpalet.

/** Meetgereedschappen die een bewaard gereedschap mag activeren. */
export const PRESET_TOOLS = ['measureDistance', 'measureArea', 'measurePerimeter', 'count'];

// ─── Zuivere helpers (los van state, zodat ze te testen zijn) ───────────────

/** Normaliseert invoer tot een geldig gereedschap, of null. */
export function maakPreset({ id, naam, tool, strokeColor, lineWidth, fillColor } = {}) {
  const schoneNaam = String(naam ?? '').trim();
  if (!schoneNaam) return null;
  if (!PRESET_TOOLS.includes(tool)) return null;
  const preset = {
    id: id || `tp_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
    naam: schoneNaam,
    tool,
  };
  if (strokeColor) preset.strokeColor = String(strokeColor);
  if (Number.isFinite(lineWidth) && lineWidth > 0) preset.lineWidth = lineWidth;
  if (fillColor !== undefined) preset.fillColor = fillColor;
  return preset;
}

/**
 * Voegt toe of vervangt. Dezelfde naam + hetzelfde gereedschap is hetzelfde
 * gereedschap: anders groeit de kist vol bijna-dubbelen die in de staat als
 * één regel samenvallen, en weet je niet meer welke je koos.
 */
export function voegToe(lijst, preset) {
  if (!preset) return Array.isArray(lijst) ? [...lijst] : [];
  const bestaande = Array.isArray(lijst) ? lijst : [];
  const zelfde = (p) =>
    p.tool === preset.tool && p.naam.toLowerCase() === preset.naam.toLowerCase();
  const index = bestaande.findIndex(zelfde);
  if (index < 0) return [...bestaande, preset];
  const kopie = [...bestaande];
  kopie[index] = { ...preset, id: bestaande[index].id };
  return kopie;
}

export function verwijder(lijst, id) {
  return (Array.isArray(lijst) ? lijst : []).filter((p) => p.id !== id);
}

/** De sleutels die `applyToolPreset` in annotation-creators.js uitleest. */
export function naarToolOverrides(preset) {
  if (!preset) return {};
  const o = { presetLabel: preset.naam };
  if (preset.strokeColor) o.presetStrokeColor = preset.strokeColor;
  if (preset.lineWidth != null) o.presetLineWidth = preset.lineWidth;
  if (preset.fillColor !== undefined) o.presetFillColor = preset.fillColor;
  return o;
}

/**
 * Wijzig een bewaard gereedschap op zijn plek.
 *
 * Zonder dit was de kist eenrichtingsverkeer: een tikfout in de naam of een
 * kleur die op dit blad niet leesbaar is, betekende verwijderen en opnieuw
 * maken — en dan raakt de koppeling met wat je al gemeten hebt zoek. Het id
 * blijft daarom staan, ook als de naam verandert.
 *
 * Alleen meegegeven velden veranderen. `lineWidth: null` of `strokeColor: ''`
 * wist het veld; weglaten laat het staan.
 */
export function bewerk(lijst, id, velden = {}) {
  const bestaande = Array.isArray(lijst) ? lijst : [];
  const index = bestaande.findIndex((p) => p.id === id);
  if (index < 0) return [...bestaande];

  const oud = bestaande[index];
  const nieuw = { ...oud };

  if (velden.naam !== undefined) {
    const schoon = String(velden.naam).trim();
    if (!schoon) return [...bestaande];   // naamloos gereedschap bestaat niet
    nieuw.naam = schoon;
  }
  if (velden.tool !== undefined) {
    if (!PRESET_TOOLS.includes(velden.tool)) return [...bestaande];
    nieuw.tool = velden.tool;
  }
  if (velden.strokeColor !== undefined) {
    if (velden.strokeColor) nieuw.strokeColor = String(velden.strokeColor);
    else delete nieuw.strokeColor;
  }
  if (velden.lineWidth !== undefined) {
    if (Number.isFinite(velden.lineWidth) && velden.lineWidth > 0) nieuw.lineWidth = velden.lineWidth;
    else delete nieuw.lineWidth;
  }
  if (velden.fillColor !== undefined) {
    if (velden.fillColor === null) delete nieuw.fillColor;
    else nieuw.fillColor = velden.fillColor;
  }

  // Botst de nieuwe naam met een ánder gereedschap van dezelfde soort, dan
  // zouden er twee regels met dezelfde naam in de staat komen. Dat is precies
  // wat voegToe() voorkomt, dus hier ook: de wijziging gaat niet door.
  const botst = bestaande.some((p, i) =>
    i !== index && p.tool === nieuw.tool && p.naam.toLowerCase() === nieuw.naam.toLowerCase());
  if (botst) return [...bestaande];

  const kopie = [...bestaande];
  kopie[index] = nieuw;
  return kopie;
}

/** De velden die een gereedschap van een meting overneemt. */
const OVERNEEMBAAR = { color: 'strokeColor', strokeColor: 'strokeColor', lineWidth: 'lineWidth', fillColor: 'fillColor' };

/**
 * Welk bewaard gereedschap hoort bij deze meting?
 *
 * De koppeling loopt via de NAAM: het gereedschap zet zijn naam in
 * label/subject, dus een meting met die naam is met dat gereedschap gemaakt.
 * Het meetgereedschap moet ook kloppen — "SM-01" als lengte en als aantal
 * zijn twee verschillende posten.
 */
export function presetVanMeting(lijst, meting) {
  if (!meting) return null;
  const naam = String(meting.label || meting.subject || meting.measureName || '').trim().toLowerCase();
  if (!naam) return null;
  return (Array.isArray(lijst) ? lijst : [])
    .find((p) => p.tool === meting.type && p.naam.toLowerCase() === naam) || null;
}

/**
 * Verander je aan één meting de kleur of de lijndikte, dan is dat een
 * correctie op het GEREEDSCHAP, niet op die ene meting: de volgende meting
 * met hetzelfde gereedschap hoort er meteen zo uit te zien. Zonder dit zet je
 * de kleur telkens opnieuw en loopt de kist uit de pas met de tekening.
 *
 * @returns {{id: string, velden: object}|null} wat er bijgewerkt moet worden
 */
export function kistBijwerkingVoor(lijst, meting, sleutel, waarde) {
  const veld = OVERNEEMBAAR[sleutel];
  if (!veld) return null;
  const preset = presetVanMeting(lijst, meting);
  if (!preset) return null;
  if (veld === 'lineWidth' && !(Number.isFinite(waarde) && waarde > 0)) return null;
  if (veld !== 'lineWidth' && veld !== 'fillColor' && !waarde) return null;
  if (preset[veld] === waarde) return null;      // al goed, niets te doen
  return { id: preset.id, velden: { [veld]: waarde } };
}
