// AI-aanbieders: één adapter, veel diensten.
//
// Het assistentievenster kon alleen bij Anthropic terecht: adres, header en
// body stonden vast in de code. Wie een sleutel van een andere dienst
// invulde, kreeg een authenticatiefout — niet omdat de sleutel fout was,
// maar omdat er naar de verkeerde deur werd geklopt.
//
// Vrijwel elke dienst spreekt tegenwoordig het OpenAI-formaat: Groq,
// OpenRouter, NVIDIA NIM, DeepSeek, Mistral, Cohere, Cloudflare, ModelScope,
// GitHub Models. Eén adapter voor dat formaat opent ze allemaal tegelijk.
// Anthropic en Google hebben hun eigen vorm en krijgen die apart.

/** De vormen die we kennen. */
export const VORMEN = ['openai', 'anthropic', 'gemini'];

/**
 * Kant-en-klare aanbieders. `model` is een vertrekpunt, geen wet: modellen
 * komen en gaan, dus het veld is in de instellingen te overschrijven.
 */
export const AANBIEDERS = [
  { id: 'anthropic', label: 'Anthropic (Claude)', vorm: 'anthropic',
    basis: 'https://api.anthropic.com', model: 'claude-sonnet-5',
    sleutelHint: 'sk-ant-…' },
  // llama-3.3-70b-versatile is op 16-08-2026 door Groq afgevoerd; wie hem nog
  // aanroept krijgt een 404 die eruitziet als een sleutelprobleem.
  { id: 'groq', label: 'Groq', vorm: 'openai',
    basis: 'https://api.groq.com/openai/v1', model: 'openai/gpt-oss-120b',
    sleutelHint: 'gsk_…' },
  { id: 'openrouter', label: 'OpenRouter', vorm: 'openai',
    basis: 'https://openrouter.ai/api/v1', model: 'meta-llama/llama-3.3-70b-instruct:free',
    sleutelHint: 'sk-or-…' },
  { id: 'nvidia', label: 'NVIDIA NIM', vorm: 'openai',
    basis: 'https://integrate.api.nvidia.com/v1', model: 'meta/llama-3.3-70b-instruct',
    sleutelHint: 'nvapi-…' },
  { id: 'deepseek', label: 'DeepSeek', vorm: 'openai',
    basis: 'https://api.deepseek.com/v1', model: 'deepseek-chat',
    sleutelHint: 'sk-…' },
  { id: 'mistral', label: 'Mistral', vorm: 'openai',
    basis: 'https://api.mistral.ai/v1', model: 'mistral-small-latest',
    sleutelHint: '…' },
  { id: 'github', label: 'GitHub Models', vorm: 'openai',
    basis: 'https://models.inference.ai.azure.com', model: 'gpt-4o-mini',
    sleutelHint: 'github_pat_…' },
  { id: 'openai', label: 'OpenAI', vorm: 'openai',
    basis: 'https://api.openai.com/v1', model: 'gpt-4o-mini',
    sleutelHint: 'sk-…' },
  { id: 'gemini', label: 'Google Gemini', vorm: 'gemini',
    basis: 'https://generativelanguage.googleapis.com/v1beta', model: 'gemini-2.0-flash',
    sleutelHint: 'AIza…' },
  { id: 'custom', label: 'Other (OpenAI-compatible)', vorm: 'openai',
    basis: '', model: '', sleutelHint: '…' },
];

export function aanbieder(id) {
  return AANBIEDERS.find((a) => a.id === id) || null;
}

const schoon = (s) => String(s == null ? '' : s).trim().replace(/\/+$/, '');

/**
 * Bouw het HTTP-verzoek voor deze aanbieder.
 * @returns {null|{url:string, headers:object, body:object}}
 */
export function bouwVerzoek({ vorm, basis, sleutel, model, system, messages, maxTokens = 1024 }) {
  const url0 = schoon(basis);
  const key = String(sleutel == null ? '' : sleutel).trim();
  const mdl = String(model == null ? '' : model).trim();
  if (!url0 || !key || !mdl) return null;
  const msgs = (messages || []).filter((m) => m && m.content);
  if (msgs.length === 0) return null;

  if (vorm === 'anthropic') {
    return {
      url: `${url0}/v1/messages`,
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
        // Zonder deze header weigert Anthropic een aanroep vanuit een webview.
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: { model: mdl, max_tokens: maxTokens, system: system || undefined, messages: msgs },
    };
  }

  if (vorm === 'gemini') {
    return {
      // Google hangt de sleutel aan de URL in plaats van aan een header.
      url: `${url0}/models/${encodeURIComponent(mdl)}:generateContent?key=${encodeURIComponent(key)}`,
      headers: { 'Content-Type': 'application/json' },
      body: {
        system_instruction: system ? { parts: [{ text: system }] } : undefined,
        contents: msgs.map((m) => ({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: m.content }],
        })),
      },
    };
  }

  // OpenAI-vorm: het systeembericht is gewoon de eerste regel van het gesprek.
  return {
    url: `${url0}/chat/completions`,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: {
      model: mdl,
      max_tokens: maxTokens,
      messages: system ? [{ role: 'system', content: system }, ...msgs] : msgs,
    },
  };
}

/** Haal de tekst uit het antwoord, of null als er geen tekst in zit. */
export function leesAntwoord(vorm, data) {
  if (!data) return null;
  if (vorm === 'anthropic') {
    const blok = Array.isArray(data.content) ? data.content.find((c) => c && c.type === 'text') : null;
    return (blok && blok.text) || data.content?.[0]?.text || null;
  }
  if (vorm === 'gemini') {
    const delen = data.candidates?.[0]?.content?.parts;
    if (!Array.isArray(delen)) return null;
    const tekst = delen.map((p) => p && p.text).filter(Boolean).join('');
    return tekst || null;
  }
  return data.choices?.[0]?.message?.content || null;
}

// ---------------------------------------------------------------------------
// Instellingen. De sleutel, het model en (bij 'custom') het adres worden per
// aanbieder bewaard, zodat wisselen van dienst niet betekent dat je je sleutel
// opnieuw moet plakken.
// ---------------------------------------------------------------------------

export const KEUZE_LS = 'opds-ai-aanbieder';
export const SLEUTELS_LS = 'opds-ai-sleutels';
export const MODELLEN_LS = 'opds-ai-modellen';
export const BASISSEN_LS = 'opds-ai-basissen';
/** De sleutel van vóór deze adapter; wordt eenmalig overgenomen. */
export const OUDE_ANTHROPIC_LS = 'opds-anthropic-key';

function leesKaart(opslag, naam) {
  try {
    const rauw = opslag?.getItem(naam);
    const o = rauw ? JSON.parse(rauw) : null;
    return o && typeof o === 'object' && !Array.isArray(o) ? o : {};
  } catch (_) {
    return {};
  }
}

function schrijfKaart(opslag, naam, kaart) {
  try {
    if (Object.keys(kaart).length === 0) opslag?.removeItem(naam);
    else opslag?.setItem(naam, JSON.stringify(kaart));
  } catch (_) { /* privémodus: niets aan te doen */ }
}

/**
 * Wat staat er klaar? Geeft altijd een bruikbaar geheel terug, ook als er nog
 * nooit iets is ingesteld.
 * @returns {{id:string,label:string,vorm:string,sleutelHint:string,basis:string,model:string,sleutel:string}}
 */
export function leesInstellingen(opslag) {
  let id = '';
  try { id = String(opslag?.getItem(KEUZE_LS) || '').trim(); } catch (_) { /* leeg */ }
  const a = aanbieder(id) || AANBIEDERS[0];
  const sleutels = leesKaart(opslag, SLEUTELS_LS);
  const modellen = leesKaart(opslag, MODELLEN_LS);
  const basissen = leesKaart(opslag, BASISSEN_LS);
  let sleutel = String(sleutels[a.id] || '').trim();
  if (!sleutel && a.id === 'anthropic') {
    // Wie de assistent al gebruikte, hoeft zijn sleutel niet opnieuw te plakken.
    try { sleutel = String(opslag?.getItem(OUDE_ANTHROPIC_LS) || '').trim(); } catch (_) { /* leeg */ }
  }
  return {
    id: a.id,
    label: a.label,
    vorm: a.vorm,
    sleutelHint: a.sleutelHint || '…',
    basis: String(basissen[a.id] || a.basis || '').trim(),
    model: String(modellen[a.id] || a.model || '').trim(),
    sleutel,
  };
}

/** Bewaar wat er is ingevuld; lege velden wissen de eerdere waarde. */
export function bewaarInstellingen(opslag, { id, sleutel, model, basis } = {}) {
  const a = aanbieder(id) || AANBIEDERS[0];
  try { opslag?.setItem(KEUZE_LS, a.id); } catch (_) { /* leeg */ }
  const zet = (naam, waarde, standaard) => {
    const kaart = leesKaart(opslag, naam);
    const v = String(waarde == null ? '' : waarde).trim();
    if (!v || v === standaard) delete kaart[a.id];
    else kaart[a.id] = v;
    schrijfKaart(opslag, naam, kaart);
  };
  if (sleutel !== undefined) zet(SLEUTELS_LS, sleutel, null);
  if (model !== undefined) zet(MODELLEN_LS, model, a.model);
  if (basis !== undefined) zet(BASISSEN_LS, basis, a.basis);
  return leesInstellingen(opslag);
}
// ---------------------------------------------------------------------------
// De modellenlijst. Modelnamen zijn geen constanten: Groq voerde
// llama-3.3-70b-versatile af, en de 404 die je daarna kreeg las als een
// sleutelprobleem. Elke dienst kan zelf vertellen wat hij vandaag aankan, dus
// dat vragen we gewoon in plaats van het te raden.
// ---------------------------------------------------------------------------

/**
 * Bouw het GET-verzoek voor de modellenlijst.
 * @returns {null|{url:string, headers:object}}
 */
export function bouwModellenVerzoek({ vorm, basis, sleutel }) {
  const url0 = schoon(basis);
  const key = String(sleutel == null ? '' : sleutel).trim();
  if (!url0 || !key) return null;

  if (vorm === 'anthropic') {
    return {
      url: `${url0}/v1/models?limit=100`,
      headers: {
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
    };
  }
  if (vorm === 'gemini') {
    return {
      url: `${url0}/models?pageSize=200&key=${encodeURIComponent(key)}`,
      headers: {},
    };
  }
  return { url: `${url0}/models`, headers: { Authorization: `Bearer ${key}` } };
}

/** Haal de modelnamen uit het antwoord; gesorteerd en zonder dubbelen. */
export function leesModellen(vorm, data) {
  if (!data) return [];
  let rauw = [];
  if (vorm === 'gemini') {
    // Google geeft 'models/gemini-2.0-flash'; alleen het laatste stuk telt.
    rauw = (data.models || []).map((m) => String(m?.name || '').replace(/^models\//, ''));
  } else {
    // Anthropic en de OpenAI-vorm zetten het allebei onder 'data'.
    rauw = (data.data || []).map((m) => String(m?.id || ''));
  }
  return [...new Set(rauw.filter(Boolean))].sort();
}
