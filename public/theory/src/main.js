/**
 * App shell: rail, router, transport.
 *
 * Routing is hash-based and dumb on purpose. There is no framework here, and
 * pages are loaded on demand so that opening a lesson about half steps does
 * not download the reharmonization lab.
 */

import { getState, setSetting, subscribe } from './ui/store.js';
import { audio, unlockAudio, primeContext } from './audio/index.js';

// ---------------------------------------------------------------------------
// Route table. `load` is dynamic so each page is its own network chunk.
// ---------------------------------------------------------------------------
const ROUTES = {
  home: { title: 'Overtone', load: () => import('./pages/home.js') },
  course: { title: 'Course', load: () => import('./pages/course.js') },
  lesson: { title: 'Lesson', load: () => import('./pages/lesson.js') },
  labs: { title: 'The Lab', load: () => import('./pages/labs.js') },
  games: { title: 'Games', load: () => import('./pages/games.js') },
  watch: { title: 'Watch', load: () => import('./pages/watch.js') },
  practice: { title: 'Practice', load: () => import('./pages/practice.js') },
  map: { title: 'Course map', load: () => import('./pages/map.js') },
  settings: { title: 'Settings', load: () => import('./pages/settings.js') },
};

const RAIL = [
  {
    group: 'Learn',
    items: [
      { route: 'home', idx: '♪', label: 'Start here' },
      { route: 'course', idx: '1', label: 'The course' },
      { route: 'map', idx: '⌘', label: 'Course map' },
      { route: 'practice', idx: '↻', label: 'Daily practice' },
    ],
  },
  {
    group: 'Play',
    items: [
      { route: 'games', idx: '▲', label: 'Games' },
      { route: 'labs', idx: '⬡', label: 'The Lab' },
      { route: 'watch', idx: '▶', label: 'Watch' },
    ],
  },
];

const view = document.getElementById('view');
const stage = document.getElementById('stage');
const railNav = document.getElementById('rail-nav');

let currentPage = null;

// ---------------------------------------------------------------------------
// Rail
// ---------------------------------------------------------------------------
function buildRail() {
  railNav.innerHTML = RAIL.map((g) => `
    <div class="rail-group">
      <span class="label">${g.group}</span>
      ${g.items.map((it) => `
        <button class="rail-link" data-route="${it.route}">
          <span class="rail-idx" aria-hidden="true">${it.idx}</span>
          <span class="rail-label">${it.label}</span>
        </button>`).join('')}
    </div>`).join('');
}

function markRail(route) {
  for (const b of document.querySelectorAll('.rail-link')) {
    const on = b.dataset.route === route;
    if (on) b.setAttribute('aria-current', 'page');
    else b.removeAttribute('aria-current');
  }
}

document.addEventListener('click', (ev) => {
  const btn = ev.target.closest('[data-route]');
  if (!btn) return;
  ev.preventDefault();
  go(btn.dataset.route, btn.dataset.arg);
});

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------
export function go(route, arg) {
  location.hash = arg ? `#/${route}/${encodeURIComponent(arg)}` : `#/${route}`;
}

function parseHash() {
  const raw = location.hash.replace(/^#\/?/, '');
  const [route, ...rest] = raw.split('/');
  return { route: route || 'home', arg: rest.length ? decodeURIComponent(rest.join('/')) : null };
}

async function render() {
  const { route, arg } = parseHash();
  const def = ROUTES[route] ?? ROUTES.home;

  // Leaving a page must silence it. Nothing is worse than a loop that follows
  // you around the app.
  audio.stopAll();
  if (currentPage?.destroy) {
    try { currentPage.destroy(); } catch (err) { console.warn(err); }
  }
  currentPage = null;
  view.innerHTML = '';

  markRail(route);
  document.title = `${def.title} — Overtone`;

  try {
    const mod = await def.load();
    currentPage = mod.render(view, { arg, go, setTransport }) ?? null;
  } catch (err) {
    console.error('[router]', err);
    view.innerHTML = `
      <div class="panel" style="padding:var(--s-6)">
        <h1 class="display" style="font-size:var(--step-3)">This page did not load</h1>
        <p class="prose" style="margin-top:var(--s-3)">${escapeHtml(err?.message ?? String(err))}</p>
        <p style="margin-top:var(--s-4)"><button class="btn" data-route="home">Back to the start</button></p>
      </div>`;
  }

  stage.scrollTop = 0;
  stage.focus({ preventScroll: true });
}

window.addEventListener('hashchange', render);

// ---------------------------------------------------------------------------
// Transport
// ---------------------------------------------------------------------------
const tNow = document.getElementById('t-now');
const tDetail = document.getElementById('t-detail');
const tPlay = document.getElementById('t-play');
const tLoop = document.getElementById('t-loop');
const tStop = document.getElementById('t-stop');
const tTempo = document.getElementById('t-tempo');
const tTempoOut = document.getElementById('t-tempo-out');
const tVolume = document.getElementById('t-volume');
const tTheme = document.getElementById('t-theme');

/** Pages hand the transport a play function and a label. */
let transport = { label: 'Overtone', detail: 'Press anything to make a sound', play: null, loop: false };

export function setTransport({ label, detail, play }) {
  transport = { ...transport, label, detail, play };
  tNow.textContent = label ?? 'Overtone';
  tDetail.textContent = detail ?? '';
  tPlay.disabled = !play;
}

tPlay.addEventListener('click', async () => {
  await unlockAudio();
  transport.play?.();
});

tStop.addEventListener('click', () => {
  audio.stopAll();
  transport.loop = false;
  tLoop.setAttribute('aria-pressed', 'false');
});

tLoop.addEventListener('click', () => {
  transport.loop = !transport.loop;
  tLoop.setAttribute('aria-pressed', String(transport.loop));
  if (transport.loop) transport.play?.();
});

tTempo.addEventListener('input', () => {
  const bpm = Number(tTempo.value);
  tTempoOut.textContent = String(bpm);
  setSetting('tempo', bpm);
  audio.setTempo(bpm);
});

tVolume.addEventListener('input', () => {
  const v = Number(tVolume.value) / 100;
  setSetting('volume', v);
  audio.setVolume(v);
});

tTheme.addEventListener('click', () => {
  const next = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light';
  document.documentElement.dataset.theme = next;
  setSetting('theme', next);
});

// Keyboard: space plays, escape silences. Both are muscle memory from every
// audio tool the learner already uses.
document.addEventListener('keydown', (ev) => {
  const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(ev.target.tagName) || ev.target.isContentEditable;
  if (typing) return;
  if (ev.key === ' ' && !ev.repeat) { ev.preventDefault(); tPlay.click(); }
  if (ev.key === 'Escape') { audio.stopAll(); }
});

// ---------------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------------
function applySettings() {
  const { settings } = getState();
  document.documentElement.dataset.theme = settings.theme ?? 'dark';
  tTempo.value = String(settings.tempo ?? 96);
  tTempoOut.textContent = String(settings.tempo ?? 96);
  tVolume.value = String(Math.round((settings.volume ?? 0.7) * 100));
}

buildRail();
applySettings();
render();

// The very first gesture anywhere unlocks audio, so the first thing the
// learner clicks makes a sound instead of teaching them the site is broken.
const firstGesture = () => {
  // Synchronous first, before anything is awaited: opening the AudioContext
  // is only permitted while the user activation is still live.
  primeContext();
  unlockAudio();
  window.removeEventListener('pointerdown', firstGesture);
  window.removeEventListener('keydown', firstGesture);
};
window.addEventListener('pointerdown', firstGesture, { once: false });
window.addEventListener('keydown', firstGesture, { once: false });

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
