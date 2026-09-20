// Vervoer voor de AI-verzoeken.
//
// De webview draait op tauri://localhost, dus elk verzoek aan een AI-dienst
// is cross-origin. Anthropic staat dat uitdrukkelijk toe met een eigen
// header, maar Groq, OpenRouter, DeepSeek, Mistral en de rest sturen geen
// CORS-header terug. WebKit weigert het antwoord dan met niet meer dan
// "Load failed": een sleutel die prima werkt lijkt zo kapot, en er valt niets
// aan te zien waar het misging.
//
// Daarom loopt het verzoek langs Rust (ai_http_post). Daar bestaat de
// same-origin-regel niet. In de browser (npm run dev zonder Tauri) is er geen
// commando, en daar valt hij terug op fetch.

import { invoke, isTauri } from './core/platform.js';

/**
 * Verstuur het verzoek dat bouwVerzoek() heeft opgeleverd.
 * @returns {Promise<{status:number, data:any, tekst:string}>}
 */
export async function verstuur(verzoek) {
  const lichaam = JSON.stringify(verzoek.body);
  let status;
  let tekst;

  if (isTauri()) {
    const res = await invoke('ai_http_post', {
      url: verzoek.url,
      headers: verzoek.headers,
      body: lichaam,
    });
    status = Number(res?.status);
    tekst = String(res?.body ?? '');
  } else {
    const res = await fetch(verzoek.url, {
      method: 'POST',
      headers: verzoek.headers,
      body: lichaam,
    });
    status = res.status;
    tekst = await res.text().catch(() => '');
  }

  let data = null;
  try { data = tekst ? JSON.parse(tekst) : null; } catch (_) { /* geen json */ }
  return { status, data, tekst };
}
