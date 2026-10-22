import { CONFIG } from './config.js';
import { INTERVIEW_PROMPT } from './prompt.js';
import { fetchSheetIdeas, getLocalIdeas, saveLocalIdea, submitIdea, newIdeaId, h } from './data.js';

const form = document.getElementById('idea-form');
const $ = id => document.getElementById(id);

/* ---------- Step 2: AI launchers ---------- */

const encoded = encodeURIComponent(INTERVIEW_PROMPT);
$('open-chatgpt').href = `https://chatgpt.com/?q=${encoded}`;
$('open-claude').href = `https://claude.ai/new?q=${encoded}`;
$('prompt-text').textContent = INTERVIEW_PROMPT;

if (CONFIG.geminiSkillUrl) {
  $('ai-buttons').prepend(h('a', { class: 'btn btn--ink', href: CONFIG.geminiSkillUrl, target: '_blank', rel: 'noopener' },
    'Open in Gemini ', h('span', { class: 'arrow', 'aria-hidden': 'true' }, '↗')));
}

$('copy-prompt').addEventListener('click', async e => {
  const btn = e.currentTarget;
  try {
    await navigator.clipboard.writeText(INTERVIEW_PROMPT);
    btn.textContent = 'Copied ✓ now paste it into your AI';
  } catch {
    // Clipboard API blocked: open the prompt so it can be copied by hand.
    document.querySelector('.prompt-peek').open = true;
    btn.textContent = 'Select the prompt below and copy it';
  }
  setTimeout(() => { btn.textContent = 'Copy interview prompt'; }, 4000);
});

/* ---------- Step 3: parse the pasted summary ---------- */

const LABELS = [
  ['title', 'Title'],
  ['problem', 'Problem'],
  ['requirements', 'Requirements'],
  ['suppliers', 'Suppliers'],
  ['inputs', 'Inputs'],
  ['process', 'Process'],
  ['outputs', 'Outputs'],
  ['customers', 'Customers'],
  ['frequency', 'Frequency & time spent|Frequency and time spent|Frequency'],
];

// Tolerates what chat apps add when copying: code fences, **bold** labels,
// bullet markers before labels, and text before/after the summary block.
const LABEL_RE = new RegExp(
  '^\\s*(?:[-*]\\s+)?\\**\\s*(' + LABELS.map(([, l]) => l).join('|') + ')\\s*\\**\\s*:\\s*\\**\\s*(.*)$', 'i');

export function parseSummary(raw) {
  let text = raw.replace(/\r\n?/g, '\n');
  const start = text.search(/=+\s*IDEA SUMMARY\s*=+/i);
  if (start !== -1) text = text.slice(start).replace(/^.*\n?/, '');
  const end = text.search(/=+\s*END\s*=+/i);
  if (end !== -1) text = text.slice(0, end);

  const result = {};
  let current = null;
  for (const line of text.split('\n')) {
    if (/^\s*```/.test(line)) continue;
    const m = LABEL_RE.exec(line);
    if (m) {
      const label = m[1].toLowerCase();
      current = LABELS.find(([, l]) => l.toLowerCase().split('|').includes(label))[0];
      result[current] = m[2].trim();
    } else if (current) {
      result[current] += '\n' + line.trimEnd();
    }
  }
  for (const key of Object.keys(result)) {
    result[key] = result[key].trim();
    if (/^not specified\.?$/i.test(result[key])) result[key] = '';
  }
  return result;
}

const pasteBox = $('paste');
const parseStatus = $('parse-status');

pasteBox.addEventListener('input', () => {
  const raw = pasteBox.value.trim();
  if (!raw) {
    parseStatus.textContent = '';
    parseStatus.className = 'parse-status';
    return;
  }
  const parsed = parseSummary(raw);
  const found = LABELS.filter(([key]) => key in parsed).length;
  if (!found) {
    parseStatus.textContent = 'Couldn’t find any summary fields. Make sure you copied the whole block, including the labels.';
    parseStatus.className = 'parse-status warn';
    return;
  }
  for (const [key] of LABELS) if (key in parsed) $(key).value = parsed[key];
  parseStatus.textContent = found === LABELS.length
    ? `✓ All ${found} fields filled in. Check them in step 4.`
    : `Filled ${found} of ${LABELS.length} fields. Fill in the rest in step 4.`;
  parseStatus.className = `parse-status ${found === LABELS.length ? 'ok' : 'warn'}`;
  updateRail();
});

/* ---------- Progress rail ---------- */

const filled = id => $(id).value.trim() !== '';
const railDone = {
  1: () => filled('firstName') && filled('surname'),
  2: () => filled('paste') || (filled('title') && filled('problem')),
  3: () => filled('paste') || (filled('title') && filled('problem')),
  4: () => filled('title') && filled('problem'),
};

function updateRail() {
  for (const [step, done] of Object.entries(railDone)) {
    document.querySelector(`[data-rail="${step}"]`).classList.toggle('is-done', done());
  }
}
form.addEventListener('input', updateRail);

/* ---------- Submit ---------- */

const REQUIRED = ['firstName', 'surname', 'title', 'problem'];
const submitBtn = $('submit-btn');
const submitNote = $('submit-note');
const defaultNote = submitNote.textContent;

form.addEventListener('submit', async e => {
  e.preventDefault();

  const missing = REQUIRED.filter(id => !filled(id));
  REQUIRED.forEach(id => $(id).classList.toggle('is-invalid', missing.includes(id)));
  if (missing.length) {
    submitNote.textContent = 'Please fill in your name, a title and the problem before submitting.';
    submitNote.className = 'form-error';
    $(missing[0]).focus();
    return;
  }
  submitNote.textContent = defaultNote;
  submitNote.className = '';

  submitBtn.disabled = true;
  submitBtn.textContent = 'Submitting…';

  const fields = ['firstName', 'surname', 'title', 'problem', 'requirements',
    'suppliers', 'inputs', 'process', 'outputs', 'customers', 'frequency'];
  const idea = Object.fromEntries(fields.map(key => [key, $(key).value.trim()]));

  // Avoid ID clashes with anything already on the board.
  let taken = new Set(getLocalIdeas().map(i => i.id));
  try { taken = new Set([...taken, ...(await fetchSheetIdeas()).map(i => i.id)]); } catch {}
  idea.id = newIdeaId(taken);

  try {
    // Bots fill every field; quietly skip sending but behave as if it worked.
    if (!$('website').value) await submitIdea(idea);
    saveLocalIdea(idea);
    location.href = `request.html?id=${encodeURIComponent(idea.id)}&new=1`;
  } catch {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Try again';
    submitNote.textContent = 'Couldn’t send your idea. Check your internet connection and try again.';
    submitNote.className = 'form-error';
  }
});
