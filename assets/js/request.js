import { loadIdeas, h, formatDate, statusSlug, listItems } from './data.js';

const root = document.getElementById('detail');
const params = new URLSearchParams(location.search);
const id = (params.get('id') || '').trim().toUpperCase();
const isNew = params.has('new');

function arrow() {
  return h('span', { class: 'arrow', 'aria-hidden': 'true' }, '→');
}

function showState(title, text) {
  root.replaceChildren(h('div', { class: 'state' },
    h('h1', {}, title),
    h('p', {}, text),
    h('a', { class: 'btn', href: './#board' }, 'Back to the idea board ', arrow())));
}

function section(label, content) {
  return h('section', { class: 'order-section' }, h('h2', { class: 'label' }, label), content);
}

function textOrDash(text) {
  return h('p', {}, text || 'Not specified');
}

function sipocColumn(letter, name, text, ordered = false) {
  const items = listItems(text);
  let body;
  if (!items.length) body = h('p', { class: 'hint' }, 'Not specified');
  else if (items.length === 1) body = h('p', {}, items[0]);
  else body = h(ordered ? 'ol' : 'ul', {}, items.map(item => h('li', {}, item)));
  return h('div', { class: 'sipoc-col' },
    h('header', {}, h('b', {}, letter), h('small', {}, name)),
    h('div', { class: 'read' }, body));
}

function render(idea) {
  document.title = `${idea.id}: ${idea.title || 'Idea'}`;
  const reqs = listItems(idea.requirements);
  const statusText = idea.pending ? 'Syncing' : idea.status;
  const stampClass = idea.pending ? 'stamp--pending' : `stamp--${statusSlug(idea.status)}`;

  const copyBtn = h('button', { type: 'button', class: 'btn btn--plain btn--sm' }, 'Copy link');
  copyBtn.addEventListener('click', async () => {
    const link = `${location.origin}${location.pathname}?id=${encodeURIComponent(idea.id)}`;
    try {
      await navigator.clipboard.writeText(link);
      copyBtn.textContent = 'Link copied ✓';
    } catch {
      copyBtn.textContent = link;
    }
  });

  root.replaceChildren(
    isNew && h('div', { class: 'banner', role: 'status' },
      h('div', {},
        h('b', {}, 'Submitted. Thank you! '),
        h('span', {}, `Your idea is ${idea.id}. Bookmark this page to check its status any time.`)),
      copyBtn),

    h('article', { class: 'order' },
      h('div', { class: 'order-top' },
        h('div', {},
          h('span', { class: 'id-chip' }, idea.id),
          h('h1', {}, idea.title || 'Untitled idea')),
        h('span', { class: `stamp stamp--big ${stampClass}` }, statusText)),

      h('dl', { class: 'meta' },
        h('div', {}, h('dt', { class: 'label' }, 'Requested by'),
          h('dd', {}, [idea.firstName, idea.surname].filter(Boolean).join(' ') || '—')),
        h('div', {}, h('dt', { class: 'label' }, 'Submitted'), h('dd', {}, formatDate(idea.timestamp))),
        h('div', {}, h('dt', { class: 'label' }, 'Frequency & time spent'), h('dd', {}, idea.frequency || 'Not specified'))),

      section('Problem', textOrDash(idea.problem)),

      section('Requirements', reqs.length
        ? h('ol', { class: 'reqs' }, reqs.map(r => h('li', {}, h('span', {}, r))))
        : textOrDash('')),

      section('Process map (SIPOC)', h('div', { class: 'sipoc' },
        sipocColumn('S', 'Suppliers', idea.suppliers),
        sipocColumn('I', 'Inputs', idea.inputs),
        sipocColumn('P', 'Process', idea.process, true),
        sipocColumn('O', 'Outputs', idea.outputs),
        sipocColumn('C', 'Customers', idea.customers))),

      idea.pending && section('Sync status', h('p', { class: 'hint' },
        'This idea was sent from this browser and is waiting to appear in the shared sheet. That usually takes a few seconds; refresh to check.'))),

    h('p', {}, h('a', { class: 'btn btn--plain', href: './#board' }, '← Back to the idea board')));
}

if (!id) {
  showState('No idea selected', 'Open an idea from the board to see its details.');
} else {
  const { ideas, error } = await loadIdeas();
  const idea = ideas.find(i => i.id.toUpperCase() === id);
  if (idea) render(idea);
  else if (error) showState('Couldn’t load this idea', 'The idea sheet didn’t respond. Try refreshing in a minute.');
  else showState(`${id} not found`, 'It may have just been submitted from another device and not reached the sheet yet. Try again in a moment, or check the ID.');
}
