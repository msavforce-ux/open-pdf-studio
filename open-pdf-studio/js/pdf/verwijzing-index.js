// Verwijzingen tussen bladen: L-1, BS-2, GD-3, BST-1.
//
// Op een plattegrond staat alleen de code. Wat die code betekent — welk raam,
// welke deur, welk detail — staat in een staat op een heel ander blad. Nu
// betekent dat bladeren en onthouden. Met een index erachter wordt de code
// aanklikbaar: links de tekening, rechts het blad waar hij beschreven staat.
//
// Getoetst op een echte set (73 bladen): 44 codes gevonden, o.a. L-1 op de
// bouwbladen 56/60/61/62/65 met zijn beschrijving op blad 73.

// Bouwcodes zijn letters + één of twee cijfers: L-1, BS-2, BST-1, GD-3, F10.
// Kale getallen bewust NIET: 556 en 250 zijn maten. Drie cijfers ook niet:
// A947 is een certificaatnummer uit het stempel.
const CODE = /^[A-ZŠŽĮČĘĖŲŪ]{1,4}-?\d{1,2}$/;

// Stempeltekst staat op élk tekeningblad — daaraan herken je het, niet aan het
// aandeel van alle bladen: een echte code staat ook maar op een handvol.
const STEMPEL_MIN_BLADEN = 5;
const STEMPEL_AANDEEL_GROOT = 0.9;

export function isCode(str) {
  const s = String(str == null ? '' : str).trim();
  return CODE.test(s);
}

/**
 * De sleutel waaronder twee schrijfwijzen dezelfde code zijn.
 *
 * In de echte set staat op de architectuurbladen T-1, T-4, T-5 en op de
 * constructiebladen T1, T4, T5 — hetzelfde element, alleen het streepje
 * verschilt. Zonder deze normalisatie zijn dat zes codes in plaats van drie,
 * en valt de verwijzing tussen de twee delen stil weg.
 */
export function normaliseerCode(str) {
  return String(str == null ? '' : str).trim().toUpperCase().replace(/[-\s]/g, '');
}

/**
 * Bouw de index.
 *
 * @param {Array<{page:number, groot:boolean, items:Array<{str,x,y}>}>} bladen
 * @returns {Map<string, {code, voorkomens, bladen, definitie}>}
 *   definitie = het blad waar de code beschreven staat, of null
 */
export function bouwIndex(bladen) {
  const perCode = new Map();
  const codesPerBlad = new Map();
  const schrijfwijzen = new Map();

  for (const blad of bladen || []) {
    for (const it of blad.items || []) {
      const geschreven = String(it.str == null ? '' : it.str).trim();
      if (!isCode(geschreven)) continue;
      const code = normaliseerCode(geschreven);
      if (!perCode.has(code)) perCode.set(code, new Map());
      if (!schrijfwijzen.has(code)) schrijfwijzen.set(code, new Map());
      const sw = schrijfwijzen.get(code);
      sw.set(geschreven, (sw.get(geschreven) || 0) + 1);
      const m = perCode.get(code);
      if (!m.has(blad.page)) m.set(blad.page, []);
      m.get(blad.page).push({ x: it.x, y: it.y });
      if (!codesPerBlad.has(blad.page)) codesPerBlad.set(blad.page, new Set());
      codesPerBlad.get(blad.page).add(code);
    }
  }

  const grote = (bladen || []).filter((b) => b.groot).map((b) => b.page);
  const uit = new Map();
  for (const [code, perBlad] of perCode) {
    if (perBlad.size < 2) continue;                                // nergens heen
    if (perBlad.size >= STEMPEL_MIN_BLADEN && grote.length) {
      const opGrote = grote.filter((p) => perBlad.has(p)).length / grote.length;
      if (opGrote >= STEMPEL_AANDEEL_GROOT) continue;              // stempeltekst
    }
    // Toon de schrijfwijze die het vaakst op de tekeningen staat: "T-1" als
    // de architect die zo schrijft, ook al heet hij in de index T1.
    const sw = [...(schrijfwijzen.get(code) || new Map())].sort((a, b) => b[1] - a[1]);
    uit.set(code, {
      code: sw.length ? sw[0][0] : code,
      sleutel: code,
      bladen: [...perBlad.keys()].sort((a, b) => a - b),
      voorkomens: perBlad,
      ...kiesDefinitie(code, perBlad, bladen, codesPerBlad),
    });
  }
  return uit;
}

/**
 * Welk blad beschríjft de code?
 *
 * Een statenblad is codedicht: blad 73 draagt L-1, L-2, L-3, BS-1, BS-2, BS-3
 * naast elkaar in één tabel. Een plattegrond draagt dezelfde code juist vaak,
 * maar weinig verschillende. Daarom: het blad met de meeste VERSCHILLENDE
 * codes wint, en bij gelijke stand het kleine blad (een staat is A4/A3, geen
 * A1-tekening).
 */
function kiesDefinitie(code, perBlad, bladen, codesPerBlad) {
  const grootVan = new Map((bladen || []).map((b) => [b.page, Boolean(b.groot)]));
  const paginas = [...perBlad.keys()];

  // Een code wordt beschreven in een STAAT, en een staat is geen tekening.
  // Daarom eerst de kleine bladen; alleen als de code nergens op een klein
  // blad staat, kijken we naar de tekeningbladen. Zonder deze voorrang wint
  // het gevelblad: dat draagt alle raam- en deurcodes naast elkaar en lijkt
  // daardoor het meest op een staat, terwijl het er juist naar verwijst.
  const kleine = paginas.filter((p) => !grootVan.get(p));
  const kandidaten = kleine.length ? kleine : paginas;

  let beste = null;
  for (const page of kandidaten) {
    const verschillend = (codesPerBlad.get(page) || new Set()).size;
    if (!beste || verschillend > beste.verschillend) beste = { page, verschillend };
  }
  // Staat de code overal even los, dan wijzen we niets aan: liever geen
  // verwijzing dan een verkeerde.
  if (!beste || beste.verschillend < 2) return { definitie: null, definitieIsStaat: false };
  // Een STAAT (klein blad) beschrijft de code echt. Een groot tekeningblad —
  // de gevel draagt alle raamcodes naast elkaar — gebruikt hem alleen. Dat
  // onderscheid bepaalt of een detail in een ánder projectdeel voorgaat.
  return { definitie: beste.page, definitieIsStaat: !grootVan.get(beste.page) };
}

/** Vind de code onder de aanwijzer, of null. `marge` in dezelfde eenheid als x/y. */
export function codeOnder(items, x, y, marge = 6) {
  let beste = null;
  for (const it of items || []) {
    if (!isCode(it.str)) continue;
    const dx = it.x - x;
    const dy = it.y - y;
    const d2 = dx * dx + dy * dy;
    if (d2 <= marge * marge && (!beste || d2 < beste.d2)) beste = { code: String(it.str).trim(), d2 };
  }
  return beste ? beste.code : null;
}
