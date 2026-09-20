// Gereedschapskist — opslag in de voorkeuren.
//
// Opslag: de voorkeuren, niet het document. Een gereedschapskist hoort bij de
// CALCULATOR, niet bij één tekeningenset — precies zoals de bestaande
// `customSymbolGroups` van het symbolenpalet.

import { state } from '../core/state.js';
import { savePreferences } from '../core/preferences.js';
import { maakPreset, voegToe, verwijder, bewerk, kistBijwerkingVoor } from './tool-presets.js';

export { maakPreset, voegToe, verwijder, bewerk, presetVanMeting, kistBijwerkingVoor, naarToolOverrides, PRESET_TOOLS } from './tool-presets.js';

export function getToolPresets() {
  return state.preferences?.customToolPresets || [];
}

function bewaar(lijst) {
  state.preferences.customToolPresets = lijst;
  savePreferences();
  return lijst;
}

export function addToolPreset(velden) {
  const preset = maakPreset(velden);
  if (!preset) return null;
  bewaar(voegToe(getToolPresets(), preset));
  return preset;
}

/** Wijzig naam, kleur of lijndikte van een bewaard gereedschap. */
export function updateToolPreset(id, velden) {
  bewaar(bewerk(getToolPresets(), id, velden));
  return getToolPresets().find((p) => p.id === id) || null;
}

/**
 * Neem een wijziging aan één meting over in het gereedschap waarmee ze
 * gemaakt is, zodat de volgende meting er meteen zo uitziet.
 * @returns {boolean} of er iets veranderd is
 */
export function kistVolgtMeting(meting, sleutel, waarde) {
  const b = kistBijwerkingVoor(getToolPresets(), meting, sleutel, waarde);
  if (!b) return false;
  bewaar(bewerk(getToolPresets(), b.id, b.velden));
  return true;
}

export function removeToolPreset(id) {
  bewaar(verwijder(getToolPresets(), id));
}
