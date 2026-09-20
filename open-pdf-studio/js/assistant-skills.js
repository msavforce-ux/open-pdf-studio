// OpenAEC assistant skill set.
//
// Each skill is a capability the assistant can perform on the open PDF. Clicking
// a skill chip sends `invoke` as a user message; via the provider chain it reaches
// the brain (Claude Code over the MCP relay, or any AI provider) which executes
// it using the app's MCP tools. SKILLS_SYSTEM_PROMPT teaches the brain how.
//
// De zichtbare teksten lopen via i18n (labelKey/hintKey); de waarden hier zijn
// de Engelse terugval. Het paneel stond volledig in het Nederlands, ook voor wie
// de applicatie in het Engels draait — een knop die je niet kunt lezen is geen
// knop.

export const ASSISTANT_SKILLS = [
  {
    id: 'translate',
    icon: '🌐',
    labelKey: 'assistant.skill.translate',
    hintKey: 'assistant.skill.translateHint',
    label: 'Translate',
    hint: 'Translate the text of the document',
    invoke: 'Translate the text of the open document into English. If it is already in English, translate it into the language I am writing in. Present the translation clearly.',
  },
  {
    id: 'summarize',
    icon: '📝',
    labelKey: 'assistant.skill.summarize',
    hintKey: 'assistant.skill.summarizeHint',
    label: 'Summarise',
    hint: 'Summarise the document or drawing',
    invoke: 'Summarise the open document or drawing concisely: what it covers, the main parts, and anything that needs attention.',
  },
  {
    id: 'draw',
    icon: '✏️',
    labelKey: 'assistant.skill.draw',
    hintKey: 'assistant.skill.drawHint',
    label: 'Draw',
    hint: 'Draw an element or annotation on the drawing',
    invoke: 'Draw on the drawing: ',
    needsInput: true,
  },
  {
    id: 'detect-doors',
    icon: '🚪',
    labelKey: 'assistant.skill.doors',
    hintKey: 'assistant.skill.doorsHint',
    label: 'Detect doors',
    hint: 'Detect the doors in the floor plan and mark them',
    invoke: 'Look at the floor plan, identify the doors, and mark each one on the drawing with a markup and a short label.',
  },
];

// Voor een eigen API-sleutel: er gaat GEEN gereedschap mee met zo'n aanroep,
// dus het model mag er ook niet naar grijpen. gpt-oss-120b deed dat wel — het
// riep app_fit_page aan omdat de opdracht hieronder dat gereedschap noemt — en
// Groq keurde het antwoord af met "Tool choice is none, but model called a
// tool". Een 400 op een vraag die niets met gereedschap te maken had.
export const DIRECT_SYSTEM_PROMPT =
  'You answer as text only. You have NO tools and NO function calling available in this mode: '
  + 'never emit a tool call, a function call or JSON pretending to be one — it will be rejected by the API.\n'
  + 'You can read the text of the page the user has open (given below when there is one) and answer '
  + 'questions about it.\n'
  + 'You CANNOT see the drawing as an image, and you cannot draw, mark or change anything in the '
  + 'document. If the user asks you to draw or mark something, say plainly that this needs the MCP '
  + 'connection (Claude Code or Claude Desktop) and that an API key alone cannot do it.\n'
  + 'Answer in the language the user writes in, briefly and practically.';

// Voor de MCP-relay: daar zit een cliënt achter die het gereedschap wél heeft.
export const SKILLS_SYSTEM_PROMPT =
  'You have a skill set and can perform ACTIONS on the open PDF document through the app\'s MCP tools:\n' +
  '- Translating / summarising: use app_screenshot_view (width 2000) to look at and read the page; return the result as text.\n' +
  '- Drawing: use app_create_annotation. Coordinates are page points at 100% zoom; get the page size with app_get_viewport_state (pageW/pageH).\n' +
  '- Detecting doors: first app_fit_page, then app_screenshot_view (width 2000), recognise the doors visually and mark each one with app_create_annotation (for example a box or cloud around the door plus a textbox label). Convert screenshot pixels to page points via pageW/pageH.\n' +
  'Answer in the language the user writes in, briefly and practically. Carry out requested actions directly and say shortly what you did.';
