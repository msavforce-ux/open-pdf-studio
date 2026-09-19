// Bladverwijzingen: van de code op de tekening naar het blad dat hem beschrijft.
//
// De index zelf is pure logica (js/pdf/verwijzing-index.js). Deze store scant
// per document, bewaart de indexen van ALLE geopende documenten, en opent de
// gesplitste weergave op het juiste blad — desnoods in een ander bestand.
//
// Waarom over bestanden heen: in de echte set staat SP-1 op de
// architectuurbladen én als knooppunt in het constructiedeel. Zonder die
// koppeling klik je op de code en blijf je in het verkeerde bestand hangen.

import { createSignal } from 'solid-js';
import { state, getActiveDocument } from '../../core/state.js';
import { bouwIndex, isCode, normaliseerCode } from '../../pdf/verwijzing-index.js';
import { startCompare } from '../../compare/compare-store.js';

// docId -> { filePath, naam, index: Map<sleutel, verwijzing> }
const [indexen, setIndexen] = createSignal(new Map());
const [bezig, setBezig] = createSignal(false);
const [voortgang, setVoortgang] = createSignal(null);
const [fout, setFout] = createSignal(null);

const GROOT_VANAF = 900;

/** De verwijzingen van het ACTIEVE document, voor het paneel. */
export function verwijzingen() {
  const doc = getActiveDocument();
  const rec = doc ? indexen().get(doc.id) : null;
  return rec ? [...rec.index.values()].sort((a, b) => a.code.localeCompare(b.code)) : [];
}

export function gebouwdVoor() {
  const doc = getActiveDocument();
  return doc && indexen().has(doc.id) ? doc.id : null;
}

/** Waar staat deze code nog meer, in een ANDER geopend bestand? */
export function elders(sleutel) {
  const doc = getActiveDocument();
  const uit = [];
  for (const [docId, rec] of indexen()) {
    if (docId === doc?.id) continue;
    const v = rec.index.get(sleutel);
    if (v) uit.push({ docId, filePath: rec.filePath, naam: rec.naam, verwijzing: v });
  }
  return uit;
}

/** Bestaat er ergens een verwijzing voor deze code? (voor de tekstlaag) */
export function heeftVerwijzing(sleutel) {
  for (const rec of indexen().values()) {
    const v = rec.index.get(sleutel);
    if (v && (v.definitie != null || v.bladen.length > 1)) return true;
  }
  return false;
}

export async function bouwVerwijzingen() {
  const doc = getActiveDocument();
  if (!doc?.pdfDoc || bezig()) return;
  setBezig(true);
  setFout(null);
  try {
    const totaal = doc.pdfDoc.numPages;
    const bladen = [];
    for (let n = 1; n <= totaal; n += 1) {
      setVoortgang({ blad: n, totaal });
      const page = await doc.pdfDoc.getPage(n);
      try {
        const vp = page.getViewport({ scale: 1 });
        const tc = await page.getTextContent();
        // Alleen de codes bewaren, niet de hele tekstlaag: een grote set heeft
        // honderdduizenden fragmenten en die allemaal vasthouden is nergens
        // voor nodig — codes zijn er een paar honderd.
        const items = [];
        for (const it of tc.items) {
          if (!it || !it.transform || !isCode(it.str)) continue;
          items.push({ str: String(it.str).trim(), x: it.transform[4], y: vp.height - it.transform[5] });
        }
        bladen.push({ page: n, groot: vp.width >= GROOT_VANAF, items });
      } finally {
        page.cleanup?.();
      }
      // Adem halen, anders bevriest de interface en wordt de webview
      // afgeschoten als "niet reagerend".
      if (n % 5 === 0) await new Promise((r) => setTimeout(r, 0));
    }
    const kopie = new Map(indexen());
    kopie.set(doc.id, {
      filePath: doc.filePath,
      naam: doc.fileName || doc.filePath || '',
      index: bouwIndex(bladen),
    });
    setIndexen(kopie);
  } catch (e) {
    setFout(String(e && e.message ? e.message : e));
  } finally {
    setVoortgang(null);
    setBezig(false);
  }
}

/**
 * Open de tekening links en het blad dat de code beschrijft rechts.
 * Staat de code alleen in een ánder geopend bestand, dan komt dát rechts —
 * de architect klikt op SP-1 en ziet het constructieknooppunt.
 */
export function openVerwijzing(sleutelOfCode) {
  const sleutel = normaliseerCode(sleutelOfCode);
  const doc = getActiveDocument();
  if (!doc?.filePath) return false;

  const eigen = indexen().get(doc.id)?.index.get(sleutel);
  const links = doc.currentPage || (eigen?.bladen?.[0] ?? 1);

  // Beschrijft dit bestand de code in een STAAT, dan is dat het antwoord.
  // Anders gaat het andere projectdeel voor: staat SP-1 hier alleen op een
  // plattegrond en in het constructiedeel als knooppunt, dan wil de
  // calculator dat knooppunt zien, niet nog een plattegrond.
  const ander = elders(sleutel)[0];
  if (eigen && eigen.definitie != null && (eigen.definitieIsStaat || !ander)) {
    startCompare({
      oldFilePath: doc.filePath, newFilePath: doc.filePath, mode: 'side',
      oldPage: links, newPage: eigen.definitie, splitOnly: true,
    });
    return true;
  }
  if (ander) {
    const rechts = ander.verwijzing.definitie != null
      ? ander.verwijzing.definitie
      : ander.verwijzing.bladen[0];
    startCompare({
      oldFilePath: doc.filePath, newFilePath: ander.filePath, mode: 'side',
      oldPage: links, newPage: rechts, splitOnly: true,
    });
    return true;
  }
  return false;
}

/**
 * Eén klikafhandelaar voor de hele applicatie: de tekstlaag markeert codes
 * met data-verwijzing, hier wordt erop gereageerd. Zo hoeft er per pagina
 * niets opgehangen of opgeruimd te worden.
 */
let gekoppeld = false;
export function koppelVerwijzingKlik() {
  if (gekoppeld || typeof document === 'undefined') return;
  gekoppeld = true;
  document.addEventListener('click', (e) => {
    const el = e.target?.closest?.('[data-verwijzing]');
    if (!el) return;
    if (openVerwijzing(el.dataset.verwijzing)) {
      e.preventDefault();
      e.stopPropagation();
    }
  }, true);
}

export { indexen, bezig, voortgang, fout };
