import test from 'node:test';
import assert from 'node:assert/strict';
import {
  AANBIEDERS, VORMEN, aanbieder, bouwVerzoek, leesAntwoord,
  leesInstellingen, bewaarInstellingen, KEUZE_LS, SLEUTELS_LS, OUDE_ANTHROPIC_LS,
} from './ai-providers.js';

const basis = { sleutel: 'K', model: 'M', messages: [{ role: 'user', content: 'hoi' }] };

test('elke aanbieder heeft een bekende vorm en een uniek id', () => {
  const ids = new Set();
  for (const a of AANBIEDERS) {
    assert.ok(VORMEN.includes(a.vorm), `onbekende vorm bij ${a.id}`);
    assert.ok(a.label, `label ontbreekt bij ${a.id}`);
    assert.equal(ids.has(a.id), false, `dubbel id ${a.id}`);
    ids.add(a.id);
  }
  // Alleen 'custom' mag leeg beginnen; de rest moet meteen werken.
  for (const a of AANBIEDERS.filter((x) => x.id !== 'custom')) {
    assert.ok(a.basis && a.model, `${a.id} mist basis of model`);
  }
});

test('aanbieder() vindt op id, en geeft null bij onzin', () => {
  assert.equal(aanbieder('groq').vorm, 'openai');
  assert.equal(aanbieder('bestaat-niet'), null);
});

test('anthropic-vorm: sleutel in de header, system apart', () => {
  const v = bouwVerzoek({ ...basis, vorm: 'anthropic', basis: 'https://api.anthropic.com/', system: 'S' });
  assert.equal(v.url, 'https://api.anthropic.com/v1/messages');
  assert.equal(v.headers['x-api-key'], 'K');
  assert.equal(v.headers['anthropic-version'], '2023-06-01');
  assert.equal(v.headers['anthropic-dangerous-direct-browser-access'], 'true');
  assert.equal(v.body.system, 'S');
  assert.deepEqual(v.body.messages, basis.messages);
});

test('openai-vorm: bearer-token, system als eerste bericht', () => {
  const v = bouwVerzoek({ ...basis, vorm: 'openai', basis: 'https://api.groq.com/openai/v1', system: 'S' });
  assert.equal(v.url, 'https://api.groq.com/openai/v1/chat/completions');
  assert.equal(v.headers.Authorization, 'Bearer K');
  assert.equal(v.body.messages[0].role, 'system');
  assert.equal(v.body.messages[1].content, 'hoi');
});

test('openai-vorm zonder system houdt het gesprek zoals het is', () => {
  const v = bouwVerzoek({ ...basis, vorm: 'openai', basis: 'https://x/v1' });
  assert.deepEqual(v.body.messages, basis.messages);
});

test('een onbekende vorm valt terug op OpenAI, want dat spreekt bijna iedereen', () => {
  const v = bouwVerzoek({ ...basis, vorm: 'iets-nieuws', basis: 'https://x/v1' });
  assert.ok(v.url.endsWith('/chat/completions'));
});

test('gemini-vorm: sleutel in de URL, assistent heet model', () => {
  const v = bouwVerzoek({
    vorm: 'gemini', basis: 'https://generativelanguage.googleapis.com/v1beta',
    sleutel: 'AIza 1', model: 'gemini-2.0-flash', system: 'S',
    messages: [{ role: 'user', content: 'a' }, { role: 'assistant', content: 'b' }],
  });
  assert.equal(
    v.url,
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=AIza%201'
  );
  assert.equal(v.headers['Content-Type'], 'application/json');
  assert.deepEqual(v.body.system_instruction, { parts: [{ text: 'S' }] });
  assert.deepEqual(v.body.contents.map((c) => c.role), ['user', 'model']);
  assert.equal(v.body.contents[1].parts[0].text, 'b');
});

test('maxTokens is instelbaar en heeft een redelijke standaard', () => {
  assert.equal(bouwVerzoek({ ...basis, vorm: 'openai', basis: 'https://x/v1' }).body.max_tokens, 1024);
  assert.equal(
    bouwVerzoek({ ...basis, vorm: 'anthropic', basis: 'https://x', maxTokens: 64 }).body.max_tokens,
    64
  );
});

test('zonder sleutel, adres, model of bericht wordt er niets verstuurd', () => {
  const heel = { ...basis, vorm: 'openai', basis: 'https://x/v1' };
  assert.equal(bouwVerzoek({ ...heel, sleutel: '  ' }), null);
  assert.equal(bouwVerzoek({ ...heel, sleutel: undefined }), null);
  assert.equal(bouwVerzoek({ ...heel, basis: '' }), null);
  assert.equal(bouwVerzoek({ ...heel, model: '  ' }), null);
  assert.equal(bouwVerzoek({ ...heel, messages: [] }), null);
  assert.equal(bouwVerzoek({ ...heel, messages: undefined }), null);
  // Lege berichten tellen niet mee: een verzoek van niets levert een fout op.
  assert.equal(bouwVerzoek({ ...heel, messages: [{ role: 'user', content: '' }] }), null);
});

test('spaties rond sleutel, adres en model gaan eraf', () => {
  const v = bouwVerzoek({ vorm: 'openai', basis: ' https://x/v1// ', sleutel: ' K ', model: ' M ', messages: basis.messages });
  assert.equal(v.url, 'https://x/v1/chat/completions');
  assert.equal(v.headers.Authorization, 'Bearer K');
  assert.equal(v.body.model, 'M');
});

test('leesAntwoord haalt de tekst uit elk van de drie vormen', () => {
  assert.equal(leesAntwoord('anthropic', { content: [{ type: 'text', text: 'A' }] }), 'A');
  assert.equal(
    leesAntwoord('anthropic', { content: [{ type: 'thinking' }, { type: 'text', text: 'A' }] }),
    'A'
  );
  assert.equal(
    leesAntwoord('gemini', { candidates: [{ content: { parts: [{ text: 'G' }, { text: '1' }] } }] }),
    'G1'
  );
  assert.equal(leesAntwoord('openai', { choices: [{ message: { content: 'O' } }] }), 'O');
});

test('leesAntwoord geeft null als er geen tekst in het antwoord zit', () => {
  for (const vorm of VORMEN) {
    assert.equal(leesAntwoord(vorm, null), null);
    assert.equal(leesAntwoord(vorm, {}), null);
    assert.equal(leesAntwoord(vorm, { error: { message: 'mis' } }), null);
  }
  assert.equal(leesAntwoord('gemini', { candidates: [{ content: { parts: [] } }] }), null);
  assert.equal(leesAntwoord('openai', { choices: [] }), null);
});

// Een localStorage-dubbelganger; genoeg voor de instellingen.
function nepOpslag(start = {}) {
  const d = { ...start };
  return {
    d,
    getItem: (k) => (k in d ? d[k] : null),
    setItem: (k, v) => { d[k] = String(v); },
    removeItem: (k) => { delete d[k]; },
  };
}

test('zonder instellingen krijg je de eerste aanbieder, kant en klaar op zijn model', () => {
  const s = leesInstellingen(nepOpslag());
  assert.equal(s.id, AANBIEDERS[0].id);
  assert.equal(s.model, AANBIEDERS[0].model);
  assert.equal(s.basis, AANBIEDERS[0].basis);
  assert.equal(s.sleutel, '');
});

test('een kapotte of ontbrekende opslag laat de assistent niet omvallen', () => {
  const stuk = { getItem: () => { throw new Error('geblokkeerd'); }, setItem: () => {}, removeItem: () => {} };
  assert.equal(leesInstellingen(stuk).id, AANBIEDERS[0].id);
  assert.equal(leesInstellingen(undefined).id, AANBIEDERS[0].id);
  assert.equal(leesInstellingen(nepOpslag({ [SLEUTELS_LS]: 'geen json' })).sleutel, '');
  assert.equal(leesInstellingen(nepOpslag({ [SLEUTELS_LS]: '[1,2]' })).sleutel, '');
});

test('sleutel en model worden per aanbieder onthouden', () => {
  const s = nepOpslag();
  bewaarInstellingen(s, { id: 'groq', sleutel: 'gsk_1', model: 'llama-8b' });
  bewaarInstellingen(s, { id: 'deepseek', sleutel: 'sk_2' });
  let nu = leesInstellingen(s);
  assert.equal(nu.id, 'deepseek');
  assert.equal(nu.sleutel, 'sk_2');
  assert.equal(nu.model, aanbieder('deepseek').model, 'valt terug op het standaardmodel');
  // Terug naar Groq: alles staat er nog.
  bewaarInstellingen(s, { id: 'groq' });
  nu = leesInstellingen(s);
  assert.equal(nu.sleutel, 'gsk_1');
  assert.equal(nu.model, 'llama-8b');
});

test('de sleutel van vóór de adapter wordt overgenomen door Anthropic', () => {
  const s = nepOpslag({ [OUDE_ANTHROPIC_LS]: 'sk-ant-oud' });
  assert.equal(leesInstellingen(s).sleutel, 'sk-ant-oud');
  // Maar hij lekt niet naar een andere dienst.
  bewaarInstellingen(s, { id: 'groq' });
  assert.equal(leesInstellingen(s).sleutel, '');
});

test('een leeg veld wist de bewaarde waarde', () => {
  const s = nepOpslag();
  bewaarInstellingen(s, { id: 'groq', sleutel: 'gsk_1', model: 'x' });
  bewaarInstellingen(s, { id: 'groq', sleutel: '  ', model: '' });
  const nu = leesInstellingen(s);
  assert.equal(nu.sleutel, '');
  assert.equal(nu.model, aanbieder('groq').model);
  assert.equal(s.getItem(SLEUTELS_LS), null, 'een lege kaart blijft niet als rommel achter');
});

test('custom bewaart ook zijn adres, en het geheel is meteen te versturen', () => {
  const s = nepOpslag();
  bewaarInstellingen(s, { id: 'custom', sleutel: 'K', model: 'M', basis: 'https://eigen/v1' });
  const nu = leesInstellingen(s);
  assert.equal(nu.vorm, 'openai');
  assert.equal(nu.basis, 'https://eigen/v1');
  const v = bouwVerzoek({ ...nu, messages: [{ role: 'user', content: 'hoi' }] });
  assert.equal(v.url, 'https://eigen/v1/chat/completions');
});

test('een onbekende bewaarde aanbieder valt netjes terug', () => {
  assert.equal(leesInstellingen(nepOpslag({ [KEUZE_LS]: 'weggehaald' })).id, AANBIEDERS[0].id);
});
