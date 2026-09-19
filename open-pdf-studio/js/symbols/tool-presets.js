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
