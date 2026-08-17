/**
 * GAMES.
 *
 * A hub, then the game. Everything here runs on the same generator + shell, so
 * scoring, teaching-on-a-wrong-answer and mastery tracking behave identically
 * whichever one you pick.
 *
 * Only games that are actually playable are listed. A grid of greyed-out cards
 * for things that do not exist yet is how an app tells you it is a mock-up.
 */

import { createGame } from '../games/gameShell.js';
import { createViewRack } from '../ui/viewrack.js';
import { audio } from '../audio/index.js';
import { noteName, midi } from '../theory/pitch.js';

const GAMES = {
  'note-hunt': {
    title: 'Note Hunt',
    blurb: 'A note is named. Find it: on the keyboard, on the staff, on the neck, on the ring.',
    skill: 'recognition',
    generator: 'generateNoteHuntQuestion',
    stimulus: 'views',
    levels: [
      { id: 1, label: 'White keys only', difficulty: 1 },
      { id: 2, label: 'Add sharps and flats', difficulty: 2 },
      { id: 3, label: 'Fewer hints', difficulty: 3 },
      { id: 4, label: 'No labels at all', difficulty: 4 },
    ],
  },
  'interval-invaders': {
    title: 'Interval Invaders',
    blurb: 'Two notes. Name the distance before the clock runs out.',
    skill: 'listening',
    generator: 'generateIntervalQuestion',
    timeLimitMs: 12000,
    levels: [
      { id: 1, label: 'Far apart', difficulty: 1, hint: 'P5 against m2, nothing subtle yet' },
      { id: 2, label: 'Thirds and fifths', difficulty: 2 },
      { id: 3, label: 'All the simple intervals', difficulty: 3 },
      { id: 4, label: 'The confusable ones', difficulty: 4, hint: 'M6 against m7, and friends' },
    ],
    modes: [
      { id: 'melodic-up', label: 'One after another, up' },
      { id: 'melodic-down', label: 'One after another, down' },
      { id: 'harmonic', label: 'Both at once' },
      { id: 'visual', label: 'On the page, no sound' },
    ],
  },
  'chord-forensics': {
    title: 'Chord Forensics',
    blurb: 'A chord sounds. Work out what it is made of.',
    skill: 'listening',
    generator: 'generateChordQuestion',
    levels: [
      { id: 1, label: 'Major or minor', difficulty: 1 },
      { id: 2, label: 'All four triads', difficulty: 2 },
      { id: 3, label: 'Seventh chords', difficulty: 3 },
      { id: 4, label: 'Everything', difficulty: 4 },
    ],
  },
  'scale-degrees': {
    title: 'Degree Drill',
    blurb: 'Where does this note sit in the key?',
    skill: 'application',
    generator: 'generateScaleDegreeQuestion',
    levels: [
      { id: 1, label: 'Major scale', difficulty: 1 },
      { id: 2, label: 'Add minor', difficulty: 2 },
      { id: 3, label: 'Any key', difficulty: 3 },
    ],
  },
  'one-note-change': {
    title: 'One Note Change',
    blurb: 'Turn this chord into that one by moving a single note.',
    skill: 'construction',
    generator: 'generateConstructionQuestion',
    levels: [
      { id: 1, label: 'Triads', difficulty: 1 },
      { id: 2, label: 'Add sevenths', difficulty: 2 },
      { id: 3, label: 'Anything', difficulty: 3 },
    ],
  },
};

export function render(host, { arg, go, setTransport }) {
  if (arg && GAMES[arg]) return renderGame(host, GAMES[arg], arg, { go, setTransport });
  return renderHub(host, { setTransport });
}

function renderHub(host, { setTransport }) {
  setTransport({ label: 'Games', detail: '', play: null });
  host.innerHTML = `
    <header class="lesson-head">
      <span class="label">Play</span>
      <h1>Games</h1>
      <p class="prose" style="margin-top:var(--s-3);color:var(--text-dim)">
        Every one of these tracks what you actually got right, and every wrong answer comes
        back with the reasoning and the two sounds side by side.
      </p>
    </header>
    <div class="game-grid">
      ${Object.entries(GAMES).map(([id, g]) => `
        <button class="game-card" data-route="games" data-arg="${id}">
          <span class="game-card-title">${esc(g.title)}</span>
          <span class="game-card-blurb">${esc(g.blurb)}</span>
          <span class="game-card-meta label-sm">${g.levels.length} levels · trains ${esc(g.skill)}</span>
        </button>`).join('')}
    </div>`;
  return {};
}

function renderGame(host, def, id, { setTransport }) {
  let level = def.levels[0];
  let mode = def.modes?.[0]?.id;
  let game = null;
  let gen = null;
  let rng = null;

  host.innerHTML = `
    <div class="row-wrap" style="justify-content:space-between;margin-bottom:var(--s-5)">
      <button class="btn btn-ghost" data-route="games">← All games</button>
      <div class="row-wrap">
        <label class="widget-field"><span class="label-sm">Level</span>
          <select id="g-level">${def.levels.map((l) => `<option value="${l.id}">${esc(l.label)}</option>`).join('')}</select>
        </label>
        ${def.modes ? `<label class="widget-field"><span class="label-sm">How you hear it</span>
          <select id="g-mode">${def.modes.map((m) => `<option value="${m.id}">${esc(m.label)}</option>`).join('')}</select>
        </label>` : ''}
      </div>
    </div>
    <div id="g-host"></div>`;

  const gHost = host.querySelector('#g-host');
  gHost.innerHTML = '<p class="step-locked-note">Loading…</p>';

  import('../games/generators.js').then((mod) => {
    gen = mod[def.generator];
    rng = mod.makeRng(Date.now() >>> 0);
    if (typeof gen !== 'function') throw new Error(`${def.generator} is not available`);
    start();
  }).catch((err) => {
    gHost.innerHTML = `<div class="panel" style="padding:var(--s-5)">
      <h2 class="display" style="font-size:var(--step-2)">This game is not ready</h2>
      <p class="prose" style="margin-top:var(--s-3)">${esc(err.message)}</p></div>`;
  });

  function start() {
    game?.destroy();
    gHost.innerHTML = '';
    game = createGame(gHost, {
      title: def.title,
      blurb: level.hint ?? def.blurb,
      skill: def.skill,
      timeLimitMs: def.timeLimitMs,
      nextQuestion: () => gen(rng, { difficulty: level.difficulty, mode }),
      renderStimulus: def.stimulus === 'views' ? renderViewStimulus : undefined,
    });
    setTransport({ label: def.title, detail: level.label, play: () => game.replay() });
  }

  host.addEventListener('change', (ev) => {
    if (ev.target.id === 'g-level') {
      level = def.levels.find((l) => String(l.id) === ev.target.value) ?? level;
      start();
    }
    if (ev.target.id === 'g-mode') { mode = ev.target.value; start(); }
  });

  return { destroy: () => game?.destroy() };
}

/** Note Hunt shows the views and asks you to point at the right key. */
function renderViewStimulus(q, el) {
  const rack = createViewRack(el, {
    views: (q.representations ?? ['piano']).map((v) => (v === 'pitchring' ? 'ring' : v)),
    onSelect: (n) => {
      const btn = [...document.querySelectorAll('.choice')]
        .find((b) => b.querySelector('.choice-main')?.textContent === noteName(n, { unicode: true }));
      btn?.click();
      audio.note(n, { duration: 0.7 });
    },
  });
  rack.update({ notes: [], tonic: null, labelMode: q.showLabels ? 'name' : 'none' });
  return rack;
}

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
