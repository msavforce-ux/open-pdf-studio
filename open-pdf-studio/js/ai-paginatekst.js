// De tekst van de open pagina, klaar om aan het model mee te geven.
//
// Een assistent die niets van het document ziet, kan er ook niets over
// zeggen. Bij de MCP-relay lost de cliënt dat zelf op met een schermafdruk;
// bij een eigen sleutel gaat er geen enkel gereedschap mee, dus moet de tekst
// van de pagina gewoon in de opdracht staan.

/** Hoeveel tekens van de pagina we meesturen. Ruim genoeg voor een tekening
 *  of een bladzijde tekst, en klein genoeg voor een gratis abonnement. */
export const MAX_TEKENS = 12000;

/**
 * Plak de tekstfragmenten van pdf.js aan elkaar. pdf.js levert losse stukjes
 * in leesvolgorde; de regelovergangen zitten in item.hasEOL.
 */
export function voegItemsSamen(items) {
  let uit = '';
  for (const item of items || []) {
    if (!item || typeof item.str !== 'string') continue;
    uit += item.str;
    if (item.hasEOL) uit += '\n';
    else if (item.str && !item.str.endsWith(' ')) uit += ' ';
  }
  // Tekeningen leveren bergen losse woorden met veel witruimte ertussen.
  return uit.replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
}

/** Kort in op een woordgrens, met een merkteken zodat het model weet dat er
 *  meer was. */
export function kortIn(tekst, maxTekens = MAX_TEKENS) {
  const t = String(tekst == null ? '' : tekst);
  if (t.length <= maxTekens) return t;
  const stuk = t.slice(0, maxTekens);
  const spatie = stuk.lastIndexOf(' ');
  return `${spatie > maxTekens * 0.8 ? stuk.slice(0, spatie) : stuk}\n\n[…truncated]`;
}

/**
 * De beschrijving van wat er open staat, voor in de systeemopdracht.
 * Zonder document of zonder tekst blijft hij leeg — dan liever niets zeggen
 * dan een lege bijlage meesturen.
 */
export function bouwDocumentContext({ bestand, pagina, paginas, tekst } = {}, maxTekens = MAX_TEKENS) {
  const schoon = kortIn(tekst, maxTekens);
  if (!bestand && !schoon) return '';
  const kop = [
    bestand ? `file: ${bestand}` : null,
    Number.isFinite(pagina) ? `page ${pagina}${Number.isFinite(paginas) ? ` of ${paginas}` : ''}` : null,
  ].filter(Boolean).join(', ');

  if (!schoon) {
    return `\n\nThe user has a document open (${kop}), but this page has no extractable text `
      + '(it is probably a scan). Say so if they ask about its contents.';
  }
  return `\n\nThe user has a document open (${kop}). This is the text of the page they are `
    + `looking at — answer questions about the document from it:\n\n---\n${schoon}\n---`;
}

/**
 * Haal de context op voor het document dat nu open staat.
 *
 * Neemt het documentobject aan in plaats van het zelf op te halen, zodat dit
 * te testen is zonder pdf.js en zonder scherm. Geeft een lege string bij geen
 * document, en ook als pdf.js struikelt: een magerder antwoord is beter dan
 * een vraag die niet doorgaat.
 */
export async function leesPaginaContext(doc, maxTekens = MAX_TEKENS) {
  if (!doc || !doc.pdfDoc) return '';
  try {
    const nr = doc.currentPage || 1;
    const page = await doc.pdfDoc.getPage(nr);
    const tc = await page.getTextContent();
    const context = bouwDocumentContext({
      bestand: doc.fileName,
      pagina: nr,
      paginas: doc.pdfDoc.numPages,
      tekst: voegItemsSamen(tc?.items),
    }, maxTekens);
    page.cleanup?.();
    return context;
  } catch (e) {
    console.warn('[assistant] paginatekst ophalen faalde:', e?.message ?? e);
    return '';
  }
}
