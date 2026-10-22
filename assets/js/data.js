import { CONFIG, COLUMNS, STATUSES } from './config.js';

const LOCAL_KEY = 'idea-desk:mine';

/* ---------- Reading the sheet ---------- */

// Google's visualization endpoint returns JSON wrapped in a JS callback and
// sends CORS headers for publicly viewable sheets, so a plain fetch works.
export async function fetchSheetIdeas() {
  const url = `https://docs.google.com/spreadsheets/d/${CONFIG.sheetId}/gviz/tq` +
    `?tqx=out:json&headers=1&sheet=${encodeURIComponent(CONFIG.sheetTab)}&_=${Date.now()}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Sheet request failed (${res.status})`);
  const text = await res.text();
  const json = JSON.parse(text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1));
  if (json.status === 'error') throw new Error('The sheet is not shared publicly or the tab name is wrong.');

  const keys = json.table.cols.map(col => COLUMNS[col.label.trim()] || null);
  return json.table.rows
    .map(row => {
      const idea = {};
      row.c.forEach((cell, i) => {
        if (!keys[i]) return;
        idea[keys[i]] = keys[i] === 'timestamp' ? cellDate(cell) : cellText(cell);
      });
      return idea;
    })
    .filter(idea => idea.id)
    .map(normalise);
}

function cellText(cell) {
  if (!cell || cell.v == null) return '';
  return String(cell.f ?? cell.v).trim();
}

// Datetime cells arrive as "Date(2026,9,22,21,40,1)" (month is zero-based).
// If the column was typed as text, fall back to whatever Date can parse.
function cellDate(cell) {
  if (!cell || cell.v == null) return null;
  const m = /^Date\((\d+),(\d+),(\d+)(?:,(\d+),(\d+),(\d+))?\)$/.exec(cell.v);
  if (m) return new Date(+m[1], +m[2], +m[3], +(m[4] || 0), +(m[5] || 0), +(m[6] || 0));
  const parsed = new Date(cell.f || cell.v);
  return isNaN(parsed) ? null : parsed;
}

function normalise(idea) {
  const status = STATUSES.find(s => s.toLowerCase() === (idea.status || '').toLowerCase());
  return { ...idea, status: status || 'New' };
}

/* ---------- This browser's own submissions ---------- */

export function getLocalIdeas() {
  try {
    const list = JSON.parse(localStorage.getItem(LOCAL_KEY) || '[]');
    return list.map(idea => normalise({ ...idea, timestamp: new Date(idea.timestamp), local: true }));
  } catch {
    return [];
  }
}

export function saveLocalIdea(idea) {
  try {
    const list = JSON.parse(localStorage.getItem(LOCAL_KEY) || '[]');
    list.push({ ...idea, timestamp: new Date().toISOString() });
    localStorage.setItem(LOCAL_KEY, JSON.stringify(list));
  } catch {
    // Private mode or blocked storage: the sheet copy still exists.
  }
}

export function localIds() {
  return new Set(getLocalIdeas().map(idea => idea.id));
}

// Sheet rows win; local copies fill the gap until the sheet catches up.
export async function loadIdeas() {
  const local = getLocalIdeas();
  let sheet = [];
  let error = null;
  try {
    sheet = await fetchSheetIdeas();
  } catch (e) {
    error = e;
  }
  const seen = new Set(sheet.map(idea => idea.id));
  const pending = local.filter(idea => !seen.has(idea.id)).map(idea => ({ ...idea, pending: true }));
  const ideas = [...sheet, ...pending].sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
  return { ideas, error };
}

/* ---------- Submitting ---------- */

// Forms doesn't send CORS headers, so the response is opaque: a resolved
// fetch means the request left the browser, not that Google accepted it.
export async function submitIdea(idea) {
  const body = new URLSearchParams();
  for (const [key, entry] of Object.entries(CONFIG.entries)) body.append(entry, idea[key] || '');
  await fetch(CONFIG.formAction, { method: 'POST', mode: 'no-cors', body });
}

export function newIdeaId(existing = new Set()) {
  const alphabet = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let id;
  do {
    const bytes = crypto.getRandomValues(new Uint8Array(5));
    id = 'IDEA-' + Array.from(bytes, b => alphabet[b % alphabet.length]).join('');
  } while (existing.has(id));
  return id;
}

/* ---------- Small DOM + formatting helpers ---------- */

// Builds elements with textContent only, so sheet data can never inject HTML.
export function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (value == null || value === false) continue;
    if (key === 'class') el.className = value;
    else if (key.startsWith('on')) el.addEventListener(key.slice(2), value);
    else el.setAttribute(key, value === true ? '' : value);
  }
  for (const child of children.flat()) {
    if (child == null || child === false) continue;
    el.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  return el;
}

export function formatDate(date) {
  if (!date) return '—';
  return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

export function statusSlug(status) {
  return status.toLowerCase().replace(/\s+/g, '-');
}

export function statusBadge(idea) {
  if (idea.pending) return h('span', { class: 'stamp stamp--pending', title: 'Waiting for the sheet to update' }, 'Syncing');
  return h('span', { class: `stamp stamp--${statusSlug(idea.status)}` }, idea.status);
}

// Turns "- item" / "1. item" lines into clean list items.
export function listItems(text) {
  return (text || '')
    .split('\n')
    .map(line => line.replace(/^\s*(?:[-*•]|\d+[.)])\s*/, '').trim())
    .filter(Boolean);
}
