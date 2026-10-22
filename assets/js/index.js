import { CONFIG } from './config.js';
import { loadIdeas, localIds, h, formatDate, statusBadge } from './data.js';

const body = document.getElementById('board-body');
const count = document.getElementById('board-count');
const notice = document.getElementById('board-notice');
const search = document.getElementById('search');
const filterButtons = document.querySelectorAll('[data-filter]');

const state = { ideas: [], mine: localIds(), filter: 'all', query: '' };

// Contact block
const ghUrl = `https://github.com/${CONFIG.githubUser}`;
document.getElementById('gh-link').href = ghUrl;
const avatar = document.getElementById('gh-avatar');
avatar.addEventListener('error', () => avatar.remove());
avatar.src = `https://github.com/${CONFIG.githubUser}.png?size=128`;
avatar.alt = `${CONFIG.githubUser} on GitHub`;

function detailUrl(idea) {
  return `request.html?id=${encodeURIComponent(idea.id)}`;
}

function render() {
  const q = state.query.trim().toLowerCase();
  const rows = state.ideas.filter(idea => {
    if (state.filter === 'mine' && !state.mine.has(idea.id)) return false;
    if (!q) return true;
    return [idea.title, idea.id, idea.status].some(v => (v || '').toLowerCase().includes(q));
  });

  const total = state.ideas.length;
  count.textContent = `${total} idea${total === 1 ? '' : 's'} submitted`;

  if (!rows.length) {
    const emptyText = total === 0
      ? ['No ideas yet', 'Be the first. The board is waiting for its first work order.']
      : state.filter === 'mine' && !q
        ? ['Nothing from this browser yet', 'Ideas you submit from this device show up here.']
        : ['No matches', 'Try a different search or switch back to all ideas.'];
    body.replaceChildren(h('tr', {}, h('td', { colspan: 5 },
      h('div', { class: 'board-empty' },
        h('p', { class: 'big' }, emptyText[0]),
        h('p', {}, emptyText[1]),
        h('a', { class: 'btn', href: 'submit.html' }, 'Submit an idea')))));
    return;
  }

  body.replaceChildren(...rows.map(idea => {
    const url = detailUrl(idea);
    return h('tr', { onclick: e => { if (!e.target.closest('a')) location.href = url; } },
      h('td', { class: 'col-date' }, formatDate(idea.timestamp)),
      h('td', { class: 'col-id' }, h('span', { class: 'id-chip' }, idea.id)),
      h('td', { class: 'col-title' },
        h('a', { class: 'title-link', href: url }, idea.title || 'Untitled idea'),
        state.mine.has(idea.id) && h('span', { class: 'mine-tag' }, 'Yours')),
      h('td', { class: 'col-status' }, statusBadge(idea)),
      h('td', { class: 'col-go', 'aria-hidden': 'true' }, '→'));
  }));
}

filterButtons.forEach(btn => btn.addEventListener('click', () => {
  state.filter = btn.dataset.filter;
  filterButtons.forEach(b => b.setAttribute('aria-pressed', String(b === btn)));
  render();
}));

search.addEventListener('input', () => {
  state.query = search.value;
  render();
});

const { ideas, error } = await loadIdeas();
state.ideas = ideas;
render();
if (error) {
  notice.replaceChildren(h('p', { class: 'notice' },
    'Couldn’t reach the idea sheet right now, so only ideas submitted from this browser are shown. Try refreshing in a minute.'));
}
