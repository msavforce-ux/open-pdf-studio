// Bladverwijzingen: van de code op de tekening naar het blad dat hem beschrijft.
//
// De index zelf is pure logica (js/pdf/verwijzing-index.js). Deze store haalt
// de tekst op, bouwt de index één keer per document en opent de split view op
// het juiste blad.

import { createSignal } from 'solid-js';
import { state, getActiveDocument } from '../../core/state.js';
import { bouwIndex, isCode } from '../../pdf/verwijzing-index.js';
import { startSplitView } from '../../compare/compare-store.js';

const [verwijzingen, setVerwijzingen] = createSignal([]);
const [bezig, setBezig] = createSignal(false);
const [gebouwdVoor, setGebouwdVoor] = createSignal(null);
const [voortgang, setVoortgang] = createSignal(null);   // {blad, totaal}
const [fout, setFout] = createSignal(null);

// Een tekeningblad is breed; een staat staat op A4/A3. Dat onderscheid bepaalt
// welk blad de code BESCHRIJFT — zie kiesDefinitie in verwijzing-index.js.
const GROOT_VANAF = 900;

/**
 * Bouw de index voor het actieve document. Hergebruikt de tekstcache van de
 * zoekfunctie, dus een tweede keer kost vrijwel niets.
 */
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
        // Alleen de codes bewaren, niet de hele tekstlaag. Een grote set heeft
        // honderdduizenden tekstfragmenten; die allemaal vasthouden blies het
        // geheugen op en nam de webview mee. Codes zijn er een paar honderd.
        const items = [];
        for (const it of tc.items) {
          if (!it || !it.transform || !isCode(it.str)) continue;
          items.push({ str: String(it.str).trim(), x: it.transform[4], y: vp.height - it.transform[5] });
        }
        bladen.push({ page: n, groot: vp.width >= GROOT_VANAF, items });
      } finally {
        // Zonder dit houdt pdf.js elke pagina open tot het document sluit.
        page.cleanup?.();
      }
      // Adem halen: een lus van honderden bladen zonder onderbreking laat de
      // interface bevriezen, en een bevroren webview wordt afgeschoten.
      if (n % 5 === 0) await new Promise((r) => setTimeout(r, 0));
    }
    const index = bouwIndex(bladen);
    setVerwijzingen([...index.values()].sort((a, b) => a.code.localeCompare(b.code)));
    setGebouwdVoor(doc.id);
  } catch (e) {
    // Liever een zichtbare melding dan een stille of harde crash.
    setFout(String(e && e.message ? e.message : e));
    setVerwijzingen([]);
    setGebouwdVoor(null);
  } finally {
    setVoortgang(null);
    setBezig(false);
  }
}

/** Open de tekening links en het blad dat de code beschrijft rechts. */
export function openVerwijzing(code) {
  const doc = getActiveDocument();
  const v = verwijzingen().find((x) => x.code === code);
  if (!doc?.filePath || !v || v.definitie == null) return;
  // Links blijf je waar je was — je wilt de tekening zien waar je mee bezig
  // bent, niet ergens anders heen springen.
  startSplitView(doc.filePath, doc.currentPage || v.bladen[0], v.definitie);
}

export { verwijzingen, bezig, gebouwdVoor, voortgang, fout };
