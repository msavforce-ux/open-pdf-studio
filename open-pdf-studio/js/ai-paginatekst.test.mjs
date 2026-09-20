import test from 'node:test';
import assert from 'node:assert/strict';
import { voegItemsSamen, kortIn, bouwDocumentContext, leesPaginaContext, MAX_TEKENS } from './ai-paginatekst.js';

test('losse tekstfragmenten worden leesbare tekst', () => {
  assert.equal(
    voegItemsSamen([{ str: 'Durys' }, { str: 'D-1', hasEOL: true }, { str: 'Plotis' }, { str: '900' }]),
    'Durys D-1\nPlotis 900'
  );
});

test('fragmenten zonder str tellen niet mee', () => {
  assert.equal(voegItemsSamen([{ str: 'a' }, {}, null, { foo: 1 }, { str: 'b' }]), 'a b');
  assert.equal(voegItemsSamen([]), '');
  assert.equal(voegItemsSamen(undefined), '');
});

test('overtollige witruimte van tekeningen wordt opgeruimd', () => {
  assert.equal(voegItemsSamen([{ str: 'a   ' }, { str: '   b' }]), 'a b');
  assert.equal(
    voegItemsSamen([{ str: 'a', hasEOL: true }, { str: '', hasEOL: true }, { str: '', hasEOL: true }, { str: 'b' }]),
    'a\n\nb'
  );
});

test('kortIn laat korte tekst met rust', () => {
  assert.equal(kortIn('kort', 100), 'kort');
  assert.equal(kortIn('', 100), '');
  assert.equal(kortIn(null, 100), '');
});

test('kortIn knipt op een woordgrens en zegt dat er meer was', () => {
  const lang = 'woord '.repeat(100);
  const uit = kortIn(lang, 50);
  assert.ok(uit.length < lang.length);
  assert.ok(uit.endsWith('[…truncated]'));
  assert.ok(!uit.includes('woor\n'), 'niet middenin een woord');
});

test('zonder document is er geen context', () => {
  assert.equal(bouwDocumentContext({}), '');
  assert.equal(bouwDocumentContext(), '');
});

test('de context noemt bestand, pagina en de tekst zelf', () => {
  const c = bouwDocumentContext({ bestand: 'SK.pdf', pagina: 3, paginas: 132, tekst: 'Durys D-1' });
  assert.ok(c.includes('SK.pdf'));
  assert.ok(c.includes('page 3 of 132'));
  assert.ok(c.includes('Durys D-1'));
});

test('een pagina zonder tekst is een scan, en dat hoort het model te weten', () => {
  const c = bouwDocumentContext({ bestand: 'scan.pdf', pagina: 1, tekst: '' });
  assert.ok(/scan/i.test(c));
  assert.ok(!c.includes('---'), 'geen lege bijlage');
});

test('een enorme pagina wordt ingekort tot de limiet', () => {
  const c = bouwDocumentContext({ bestand: 'x.pdf', pagina: 1, tekst: 'a '.repeat(50000) });
  assert.ok(c.length < MAX_TEKENS + 500);
  assert.ok(c.includes('[…truncated]'));
});

// Een pdf.js-dubbelganger: genoeg om leesPaginaContext te laten lopen.
function nepDoc({ items = [{ str: 'Durys D-1' }], fileName = 'SA.pdf', pagina = 60, paginas = 73, stuk = null } = {}) {
  return {
    fileName,
    currentPage: pagina,
    pdfDoc: {
      numPages: paginas,
      getPage: async (n) => {
        if (stuk === 'getPage') throw new Error('kapot');
        assert.equal(n, pagina, 'de pagina waar de gebruiker naar kijkt');
        return {
          getTextContent: async () => {
            if (stuk === 'getTextContent') throw new Error('kapot');
            return { items };
          },
          cleanup: () => {},
        };
      },
    },
  };
}

test('de context bevat de tekst van de pagina die open staat', async () => {
  const c = await leesPaginaContext(nepDoc());
  assert.ok(c.includes('Durys D-1'), 'de paginatekst hoort erin');
  assert.ok(c.includes('SA.pdf'));
  assert.ok(c.includes('page 60 of 73'));
});

test('zonder open document is er geen context', async () => {
  assert.equal(await leesPaginaContext(null), '');
  assert.equal(await leesPaginaContext({}), '');
  assert.equal(await leesPaginaContext({ pdfDoc: null }), '');
});

test('een struikelende pdf.js houdt de vraag niet tegen', async () => {
  assert.equal(await leesPaginaContext(nepDoc({ stuk: 'getPage' })), '');
  assert.equal(await leesPaginaContext(nepDoc({ stuk: 'getTextContent' })), '');
});

test('een pagina zonder tekstlaag wordt als scan gemeld', async () => {
  const c = await leesPaginaContext(nepDoc({ items: [] }));
  assert.ok(/scan/i.test(c));
});

test('een pagina zonder cleanup() valt niet om', async () => {
  const doc = nepDoc();
  const oud = doc.pdfDoc.getPage;
  doc.pdfDoc.getPage = async (n) => { const p = await oud(n); delete p.cleanup; return p; };
  assert.ok((await leesPaginaContext(doc)).includes('Durys D-1'));
});
