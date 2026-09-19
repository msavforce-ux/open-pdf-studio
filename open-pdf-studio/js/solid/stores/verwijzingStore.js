// Bladverwijzingen: van de code op de tekening naar het blad dat hem beschrijft.
//
// De index zelf is pure logica (js/pdf/verwijzing-index.js). Deze store haalt
// de tekst op, bouwt de index één keer per document en opent de split view op
// het juiste blad.

import { createSignal } from 'solid-js';
import { state, getActiveDocument } from '../../core/state.js';
import { extractAllText } from '../../search/find-controller.js';
import { bouwIndex } from '../../pdf/verwijzing-index.js';
import { startSplitView } from '../../compare/compare-store.js';

const [verwijzingen, setVerwijzingen] = createSignal([]);
const [bezig, setBezig] = createSignal(false);
const [gebouwdVoor, setGebouwdVoor] = createSignal(null);

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
  try {
    const paginas = await extractAllText(doc.pdfDoc);
    const bladen = [];
    for (const p of paginas) {
      const page = await doc.pdfDoc.getPage(p.pageNum);
      const vp = page.getViewport({ scale: 1 });
      bladen.push({
        page: p.pageNum,
        groot: vp.width >= GROOT_VANAF,
        items: p.items
          .filter((i) => i.transform)
          .map((i) => ({ str: i.str, x: i.transform[4], y: vp.height - i.transform[5] })),
      });
    }
    const index = bouwIndex(bladen);
    setVerwijzingen([...index.values()].sort((a, b) => a.code.localeCompare(b.code)));
    setGebouwdVoor(doc.id);
  } finally {
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

export { verwijzingen, bezig, gebouwdVoor };
