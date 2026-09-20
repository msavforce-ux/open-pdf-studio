// Assistant — floating chat panel (bottom-right) + launcher button. Two ways to
// answer, tried in order:
//   1. AI provider -> direct API call with a locally stored API key. Anthropic,
//      Groq, OpenRouter, NVIDIA, DeepSeek, Mistral, GitHub Models, OpenAI,
//      Gemini or any other OpenAI-compatible service (see ai-providers.js).
//   2. MCP relay   -> an external MCP client answers via the app server
import { createSignal, For, Show, createEffect } from 'solid-js';
import { registerAssistantSubmit, registerAssistantMessages, enqueueAssistantQuestion, relayClientActive } from '../../assistant-mcp-relay.js';
import { ASSISTANT_SKILLS, SKILLS_SYSTEM_PROMPT } from '../../assistant-skills.js';
import { getActiveDocument } from '../../core/state.js';
import { useTranslation } from '../../i18n/useTranslation.js';
import {
  AANBIEDERS, bouwVerzoek, leesAntwoord, leesInstellingen, bewaarInstellingen,
  bouwModellenVerzoek, leesModellen,
} from '../../ai-providers.js';
import { verstuur, haal } from '../../ai-transport.js';

const GREETING =
  'Hello. I am the **OpenAEC assistant**. I can 🌐 translate, 📝 summarise, ✏️ draw on the drawing and 🚪 detect doors. Pick a skill below or just ask.';
const opslag = () => { try { return window.localStorage; } catch (_) { return null; } };

// Minimal markdown-lite rendering (bold, inline code, line breaks). The AI text
// is HTML-escaped first so it can never inject markup.
function renderContent(text) {
  const esc = String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  return esc
    .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
    .replace(/`(.+?)`/g, '<code>$1</code>')
    .replace(/\n/g, '<br>');
}

function describeAiError(err) {
  const raw = String(err?.message ?? err ?? '').trim();
  if (/\b40[13]\b|invalid x-api-key|authentication_error|invalid_api_key|unauthorized/i.test(raw)) {
    return '⚠️ The API key was rejected. Check the provider and the key with the 🔑 button at the top right of this panel.';
  }
  if (/\b404\b|model_not_found|does not exist/i.test(raw)) {
    return `⚠️ This provider does not know that model name. Change it with the 🔑 button.\n\n_Detail: ${raw}_`;
  }
  if (/\b429\b|rate.?limit|quota/i.test(raw)) {
    return '⚠️ Rate limit reached at this provider. Wait a moment, or switch provider with the 🔑 button.';
  }
  if (/API \d\d\d/i.test(raw)) {
    return `⚠️ The AI service returned an error.\n\n_Detail: ${raw}_`;
  }
  // 'error sending request' is hoe reqwest zegt dat het verzoek de deur niet
  // uit kwam; 'load failed' is dezelfde melding uit de webview.
  if (/connection|econn|refused|failed to connect|timed out|failed to fetch|load failed|error sending request|dns|tls|certificate/i.test(raw)) {
    return `⚠️ Could not reach the AI service. Check your internet connection.\n\n_Detail: ${raw}_`;
  }
  return `⚠️ The AI call failed.\n\n_Detail: ${raw || 'unknown error'}_`;
}

export default function AssistantPanel() {
  const { t } = useTranslation('common');
  const [open, setOpen] = createSignal(false);
  const [messages, setMessages] = createSignal([{ role: 'assistant', content: GREETING }]);
  const [input, setInput] = createSignal('');
  const [loading, setLoading] = createSignal(false);
  const [ai, setAi] = createSignal(leesInstellingen(opslag()));
  const [showKey, setShowKey] = createSignal(false);
  // Wat er in de velden staat terwijl het formulier open is; pas bij Save gaat
  // het naar de opslag.
  const [concept, setConcept] = createSignal(leesInstellingen(opslag()));
  // De modellenlijst van de gekozen dienst. Modelnamen zijn geen constanten —
  // Groq voerde llama-3.3-70b-versatile af en de 404 die volgde las als een
  // sleutelprobleem — dus je kunt de dienst zelf vragen wat hij vandaag kent.
  const [modellen, setModellen] = createSignal([]);
  const [modellenStand, setModellenStand] = createSignal('');
  let messagesEnd, inputEl;

  const activeDocName = () => getActiveDocument()?.fileName || null;

  createEffect(() => {
    messages();
    queueMicrotask(() => messagesEnd?.scrollIntoView({ behavior: 'smooth' }));
  });

  function systemPrompt() {
    return 'You are the OpenAEC assistant inside Open PDF Studio (a PDF annotation editor). Help the user with questions about the open PDF document and with general tasks.\n\n' + SKILLS_SYSTEM_PROMPT;
  }

  // Van aanbieder wisselen laat het formulier meteen de sleutel, het model en
  // het adres van díe aanbieder zien — bewaard of standaard.
  function kiesAanbieder(id) {
    const vorige = concept();
    bewaarInstellingen(opslag(), {
      id: vorige.id, sleutel: vorige.sleutel, model: vorige.model, basis: vorige.basis,
    });
    const nu = bewaarInstellingen(opslag(), { id });
    setConcept(nu);
    setAi(nu);
    // De lijst hoorde bij de vorige dienst.
    setModellen([]);
    setModellenStand('');
  }

  async function haalModellen() {
    const c = concept();
    const verzoek = bouwModellenVerzoek({ vorm: c.vorm, basis: c.basis, sleutel: c.sleutel });
    if (!verzoek) { setModellenStand('fill in a key first'); return; }
    setModellenStand('loading…');
    try {
      const { status, data, tekst } = await haal(verzoek);
      if (status < 200 || status >= 300) {
        setModellenStand(`error ${status}`);
        console.warn('[assistant] modellenlijst faalde:', tekst.slice(0, 200));
        return;
      }
      const lijst = leesModellen(c.vorm, data);
      setModellen(lijst);
      setModellenStand(lijst.length ? `${lijst.length} models` : 'no models returned');
    } catch (e) {
      setModellenStand('could not reach provider');
      console.warn('[assistant] modellenlijst faalde:', e?.message ?? e);
    }
  }

  function saveKey() {
    const c = concept();
    const nu = bewaarInstellingen(opslag(), {
      id: c.id, sleutel: c.sleutel, model: c.model, basis: c.basis,
    });
    setAi(nu);
    setConcept(nu);
    setShowKey(false);
  }

  function openKey() {
    if (!showKey()) {
      setConcept(leesInstellingen(opslag()));
      setModellen([]);
      setModellenStand('');
    }
    setShowKey(!showKey());
  }

  async function send(explicitText) {
    const text = (typeof explicitText === 'string' ? explicitText : input()).trim();
    if (!text || loading()) return;
    const instel = ai();

    setMessages((m) => [...m, { role: 'user', content: text }]);
    setInput('');
    setLoading(true);
    // Direct API call to the chosen provider — the default once a key is set
    // via the 🔑 button.
    const directeAanroep = async () => {
      const msgs = messages().slice(1).map((m) => ({ role: m.role, content: m.content }));
      const verzoek = bouwVerzoek({
        vorm: instel.vorm,
        basis: instel.basis,
        sleutel: instel.sleutel,
        model: instel.model,
        system: systemPrompt(),
        messages: msgs,
      });
      if (!verzoek) throw new Error('incomplete provider settings');
      const { status, data, tekst } = await verstuur(verzoek);
      if (status < 200 || status >= 300) {
        throw new Error(`${instel.label} API ${status}: ${tekst.slice(0, 200)}`);
      }
      return leesAntwoord(instel.vorm, data) || 'No answer received.';
    };

    // MCP relay — an external MCP client (e.g. Claude Code, with working Claude
    // auth) answers via the app's MCP server (app_assistant_pending/answer).
    // Final fallback so the assistant keeps working without a local key.
    // Drie minuten is ruim voor een cliënt die echt luistert; de tien minuten
    // die de relay standaard wacht zijn alleen maar stilte op het scherm.
    const mcpRelay = async () => {
      const history = messages().slice(1)
        .map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
        .join('\n\n');
      const docName = activeDocName();
      const prompt = `${docName ? `Open document: ${docName}\n\n` : ''}${history}\n\nAssistant:`;
      return await enqueueAssistantQuestion({ prompt, system: systemPrompt(), docName }, 180000);
    };

    // Provider order. When a Claude Code/Desktop MCP client is connected (it
    // polled recently), route to the relay FIRST so it answers instantly — no
    // API, no key. Otherwise the own key does the work.
    //
    // De relay stond hier ook als achtervang áchter de eigen sleutel, en dat
    // was precies verkeerd: zonder aangesloten cliënt wacht hij tien minuten
    // op een antwoord dat nooit komt. Een afgekeurde sleutel leverde dus geen
    // foutmelding maar tien minuten 'Thinking…' — het zag eruit alsof de
    // assistent niets deed. Hij mag alleen nog als er echt iemand luistert.
    const relayActive = relayClientActive();
    const providers = [];
    if (relayActive) providers.push(mcpRelay);
    if (instel.sleutel) providers.push(directeAanroep);

    if (providers.length === 0) {
      setMessages((m) => [...m, { role: 'assistant', content:
        '⚠️ No AI provider set up yet. Press the 🔑 button at the top right of this panel, '
        + 'pick a provider and paste its API key.' }]);
      setLoading(false);
      return;
    }

    let answer = null;
    let lastErr = null;
    for (const provider of providers) {
      try { answer = await provider(); break; }
      catch (e) { lastErr = e; console.warn('[assistant] provider faalde, volgende proberen:', e?.message ?? e); }
    }
    setMessages((m) => [...m, { role: 'assistant', content: answer == null ? describeAiError(lastErr) : answer }]);
    setLoading(false);
  }

  // Expose the assistant to the in-app MCP server: an external MCP client can
  // drive it (app_assistant_ask) and act as its AI brain (app_assistant_pending
  // / app_assistant_answer). Registered once when the panel mounts.
  registerAssistantSubmit((text) => { setOpen(true); send(text); });
  registerAssistantMessages(() => messages().map((m) => ({ role: m.role, content: m.content })));

  function onKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  }

  // Skill set: one-click capabilities. Clicking sends the skill's instruction
  // through the assistant (and thus the relay to the brain), which executes it
  // via MCP tools. 'draw' needs the user to specify what, so it pre-fills.
  function runSkill(skill) {
    if (skill.needsInput) { setInput(skill.invoke); inputEl?.focus(); }
    else send(skill.invoke);
  }

  // Subtitle shows the active provider so the user knows where answers come from.
  const providerLabel = () => (ai().sleutel
    ? `via ${ai().label}`
    : (t('assistant.notConnected') || 'not connected'));

  return (
    <Show
      when={open()}
      fallback={
        <button class="chat-fab" title={t('assistantTitle') || 'OpenAEC assistant'} onClick={() => setOpen(true)}>💬</button>
      }
    >
      <div class="chat-floating">
        <div class="chat-panel">
          <div class="chat-header">
            <div class="chat-header-titles">
              <span class="chat-title">✨ {t('assistantTitle') || 'OpenAEC assistant'}</span>
              <span class="chat-subtitle" title={activeDocName() || ''}>
                {activeDocName()
                  ? `${t('assistant.workingIn') || 'working in'}: ${activeDocName()} · ${providerLabel()}`
                  : providerLabel()}
              </span>
            </div>
            <button class="chat-close" title={t('assistant.setKey') || 'AI provider and API key'} onClick={openKey}>🔑</button>
            <button class="chat-close" title={t('close') || 'Close'} onClick={() => setOpen(false)}>✕</button>
          </div>

          <Show when={showKey()}>
            <div class="chat-keyrow chat-keyrow-wrap">
              <select
                class="chat-keyselect"
                value={concept().id}
                onChange={(e) => kiesAanbieder(e.currentTarget.value)}
              >
                <For each={AANBIEDERS}>{(a) => <option value={a.id}>{a.label}</option>}</For>
              </select>
              <input
                type="password"
                class="chat-keyinput"
                placeholder={`API key — ${concept().sleutelHint || '…'}`}
                value={concept().sleutel}
                onInput={(e) => setConcept({ ...concept(), sleutel: e.currentTarget.value })}
                onKeyDown={(e) => { if (e.key === 'Enter') saveKey(); }}
              />
              <input
                type="text"
                class="chat-keyinput chat-keymodel"
                placeholder="model"
                list="chat-modellen"
                value={concept().model}
                onInput={(e) => setConcept({ ...concept(), model: e.currentTarget.value })}
                onKeyDown={(e) => { if (e.key === 'Enter') saveKey(); }}
              />
              <datalist id="chat-modellen">
                <For each={modellen()}>{(m) => <option value={m} />}</For>
              </datalist>
              <button
                class="chat-keylist"
                title="Ask the provider which models it has"
                onClick={haalModellen}
              >↻</button>
              <Show when={concept().id === 'custom'}>
                <input
                  type="text"
                  class="chat-keyinput"
                  placeholder="https://… /v1"
                  value={concept().basis}
                  onInput={(e) => setConcept({ ...concept(), basis: e.currentTarget.value })}
                  onKeyDown={(e) => { if (e.key === 'Enter') saveKey(); }}
                />
              </Show>
              <button class="chat-keysave" onClick={saveKey}>{t('assistant.save') || 'Save'}</button>
              <Show when={modellenStand()}>
                <span class="chat-keystand">{modellenStand()}</span>
              </Show>
            </div>
          </Show>

          <div class="chat-messages">
            <For each={messages()}>
              {(msg) => (
                <div class={`chat-message chat-${msg.role}`}>
                  <div class="chat-bubble" innerHTML={renderContent(msg.content)} />
                </div>
              )}
            </For>
            <Show when={loading()}>
              <div class="chat-message chat-assistant"><div class="chat-bubble chat-typing">Thinking…</div></div>
            </Show>
            <div ref={messagesEnd} />
          </div>

          <Show when={!loading()}>
            <div class="chat-chips">
              <For each={ASSISTANT_SKILLS}>
                {(skill) => (
                  <button class="chat-chip"
                    title={(skill.hintKey && t(skill.hintKey)) || skill.hint}
                    onClick={() => runSkill(skill)}>
                    {skill.icon} {(skill.labelKey && t(skill.labelKey)) || skill.label}
                  </button>
                )}
              </For>
            </div>
          </Show>

          <div class="chat-input-area">
            <textarea
              ref={inputEl}
              class="chat-input"
              value={input()}
              onInput={(e) => setInput(e.currentTarget.value)}
              onKeyDown={onKeyDown}
              placeholder={t('assistant.ask') || 'Ask something about this PDF…'}
              rows={2}
            />
            <button class="chat-send" onClick={send} disabled={loading() || !input().trim()}>➤</button>
          </div>
        </div>
      </div>
    </Show>
  );
}
