import { createSignal } from 'solid-js';
import { state } from '../../core/state.js';
import { savePreferences } from '../../core/preferences.js';

// Metingen staan open bij het starten: dat is waar een calculator naar kijkt.
// Miniaturen zijn één klik verderop in de tabstrip.
const [activeTab, setActiveTab] = createSignal('measurements');
const [collapsed, setCollapsed] = createSignal(false);

// Het navigatiepaneel (met o.a. de metingenlijst) staat rechts, tegenover de
// gereedschapskist links: links kies je waarmee je meet, rechts lees je wat je
// gemeten hebt. Wie het liever links heeft, zet het terug — de keuze staat in
// de voorkeuren.
const [panelSide, setPanelSideRaw] = createSignal('right');

/**
 * Eenmalige omzetting naar de meet-indeling: gereedschapskist links, metingen
 * rechts. Zonder dit zou een bestaande installatie niets merken — de oude
 * `symbolPaletteMode: 'docked-right'` staat al in de voorkeuren en wint van de
 * nieuwe standaard. Alleen wie het palet op de OUDE standaard had staan wordt
 * verplaatst; wie het zelf zwevend of links zette, houdt zijn keuze. Draait
 * precies één keer.
 */
export function migreerMeetIndeling() {
  const prefs = state.preferences;
  if (!prefs || prefs.meetIndelingToegepast) return;
  if (prefs.symbolPaletteMode == null || prefs.symbolPaletteMode === 'docked-right') {
    prefs.symbolPaletteMode = 'docked-left';
  }
  if (prefs.navigationPanelSide == null) prefs.navigationPanelSide = 'right';
  prefs.meetIndelingToegepast = true;
  savePreferences();
}

export function initLeftPanelSide() {
  const kant = state.preferences?.navigationPanelSide;
  if (kant === 'left' || kant === 'right') setPanelSideRaw(kant);
}

export function setPanelSide(kant) {
  if (kant !== 'left' && kant !== 'right') return;
  setPanelSideRaw(kant);
  state.preferences.navigationPanelSide = kant;
  savePreferences();
}

export function switchToLeftPanelTab(panelId) {
  setActiveTab(panelId);
  if (collapsed()) {
    setCollapsed(false);
  }
}

export function toggleLeftPanelCollapsed() {
  const willCollapse = !collapsed();
  setCollapsed(willCollapse);
  // Clear inline width set by resize handler so CSS class takes effect
  const panel = document.getElementById('left-panel');
  if (panel) {
    if (willCollapse) {
      panel.dataset.prevWidth = panel.style.width || '';
      panel.style.width = '';
    } else if (panel.dataset.prevWidth) {
      panel.style.width = panel.dataset.prevWidth;
    }
  }
}

export {
  activeTab, setActiveTab,
  collapsed, setCollapsed,
  panelSide
};
