// Codes op de tekening aanklikbaar maken.
//
// De tekstlaag ligt al pixelnauwkeurig over de pagina — elk tekstfragment is
// een span op zijn eigen plek. Daar hoeft dus niets bijgetekend te worden: de
// span die "L-1" bevat wordt gemarkeerd, krijgt een aanwijzer, en een klik
// erop opent het blad dat de code beschrijft.

import { isCode, normaliseerCode } from './verwijzing-index.js';

/** De indexsleutel van een stuk tekst, of null als het geen code is. */
export function sleutelVanTekst(tekst) {
  const t = String(tekst == null ? '' : tekst).trim();
  return isCode(t) ? normaliseerCode(t) : null;
}

/**
 * Markeer in één tekstlaag elke span die een code draagt waarvoor een
 * verwijzing bestaat.
 *
 * @param {Element} textLayerDiv
 * @param {(sleutel: string) => boolean} heeftVerwijzing
 * @returns {number} aantal gemarkeerde spans
 */
export function markeerVerwijzingen(textLayerDiv, heeftVerwijzing) {
  if (!textLayerDiv || typeof heeftVerwijzing !== 'function') return 0;
  let n = 0;
  for (const span of textLayerDiv.querySelectorAll('span:not(.markedContent)')) {
    const sleutel = sleutelVanTekst(span.textContent);
    if (sleutel && heeftVerwijzing(sleutel)) {
      span.dataset.verwijzing = sleutel;
      span.classList.add('is-verwijzing');
      // De tekstlaag zelf staat op pointer-events:none zolang je niet met het
      // selectiegereedschap werkt. Een kind mag dat wél omzetten, dus de code
      // blijft aanklikbaar terwijl meten en pannen ongestoord doorgaan.
      span.style.pointerEvents = 'auto';
      span.style.cursor = 'pointer';
      n += 1;
    } else if (span.dataset.verwijzing) {
      delete span.dataset.verwijzing;
      span.classList.remove('is-verwijzing');
      span.style.cursor = '';
    }
  }
  return n;
}
