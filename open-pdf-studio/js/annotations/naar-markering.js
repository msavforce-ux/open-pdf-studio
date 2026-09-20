// Van een regel in een lijst naar de markering op de tekening.
//
// Een staat zonder deze stap is een dood overzicht: je ziet 340 m² staan en
// moet zelf gaan zoeken wélke vlakken dat waren. Aanklikken hoort je naar het
// blad te brengen met die ene markering geselecteerd.

/**
 * Wat er moet gebeuren om bij deze markering te komen. Puur, zodat het te
 * testen is los van canvas en DOM.
 *
 * @returns {null|{page:number, wisselPagina:boolean}}
 */
export function sprongNaar(annotatie, huidigePagina) {
  if (!annotatie) return null;
  const page = Number(annotatie.page);
  if (!Number.isFinite(page) || page < 1) return null;
  return { page, wisselPagina: page !== huidigePagina };
}
