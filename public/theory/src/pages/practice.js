/**
 * DAILY PRACTICE.
 *
 * You choose how long you have; the app builds the session. What it puts in is
 * decided by what you are actually weakest at, not by where you happen to be
 * in the course — and it deliberately does not drill things you already do
 * perfectly, because that is how practice time gets wasted.
 *
 * There is no streak-shaming here on purpose. The goal is a musician who
 * improves, not a user who opens an app.
 */

import { dueForReview, weakestSkill, getState, logPractice, SKILL_BLURB, overallMastery } from '../ui/store.js';
import { CONCEPTS, LESSON_FOR_CONCEPT, WORLDS } from '../lessons/index.js';

const LENGTHS = [10, 20, 30, 45, 60];

/** How a session is divided. Proportions, not fixed minutes. */
const SHAPE = [
  { id: 'warmup', label: 'Warm up', share: 0.12, blurb: 'Something you can already do, to get the ear going.' },
  { id: 'ear', label: 'Ear', share: 0.22, blurb: 'Listening only. This is the part most people skip.' },
  { id: 'review', label: 'Review', share: 0.22, blurb: 'Things that are due back before they fade.' },
  { id: 'new', label: 'New ground', share: 0.24, blurb: 'The next thing you are ready for.' },
  { id: 'apply', label: 'Apply', share: 0.20, blurb: 'Use it musically, not just name it.' },
];

export function render(host, { go, setTransport }) {
  setTransport({ label: 'Practice', detail: '', play: null });

  let minutes = 20;
  const due = dueForReview(20);
  const weak = weakestSkill();

  host.innerHTML = `
    <header class="lesson-head">
      <span class="label">Today</span>
      <h1>Daily practice</h1>
      <p class="prose" style="margin-top:var(--s-3);color:var(--text-dim)">
        Pick how long you have. The session is built from what you are weakest at right now.
      </p>
    </header>

    <div class="lab-bar row-wrap">
      <div class="segmented" role="group" aria-label="Session length">
        ${LENGTHS.map((m) => `<button data-min="${m}" aria-pressed="${m === minutes}">${m} min</button>`).join('')}
      </div>
      <button class="btn btn-primary" data-a="start">Build the session</button>
    </div>

    <div id="plan"></div>
  `;

  const planEl = host.querySelector('#plan');

  function buildPlan() {
    const state = getState();
    const tracked = Object.keys(state.mastery).filter((id) => state.mastery[id].attempts > 0);
    const nextUp = findNextLesson(state);

    planEl.innerHTML = `
      ${weak ? `
        <div class="panel" style="padding:var(--s-5);margin-bottom:var(--s-4)">
          <span class="label">What to work on</span>
          <p class="prose" style="margin-top:var(--s-2)">
            Across everything you have practised, your weakest area is
            <strong>${esc(SKILL_BLURB[weak.skill].toLowerCase())}</strong>. This session leans that way.
          </p>
        </div>` : ''}

      <ol class="session">
        ${SHAPE.map((block) => {
          const mins = Math.max(2, Math.round(minutes * block.share));
          const item = pickFor(block, { due, nextUp, tracked });
          return `
            <li class="session-block">
              <div class="session-time data">${mins}<span>min</span></div>
              <div class="session-body">
                <span class="label">${esc(block.label)}</span>
                <h3>${esc(item.title)}</h3>
                <p>${esc(item.detail ?? block.blurb)}</p>
              </div>
              <div class="session-go">
                ${item.route
                  ? `<button class="btn" data-route="${item.route}" ${item.arg ? `data-arg="${esc(item.arg)}"` : ''}>Start</button>`
                  : `<span class="label-sm">nothing due</span>`}
              </div>
            </li>`;
        }).join('')}
      </ol>

      <div class="panel" style="padding:var(--s-5);margin-top:var(--s-5)">
        <span class="label">Due for review</span>
        ${due.length === 0
          ? `<p class="prose" style="margin-top:var(--s-2);color:var(--text-dim)">Nothing is due. Come back tomorrow, or go and learn something new.</p>`
          : `<ul class="due-list">${due.slice(0, 8).map((d) => `
              <li><span>${esc(CONCEPTS[d.conceptId]?.title ?? d.conceptId)}</span>
              <span class="meter" style="width:90px"><i style="width:${Math.round(overallMastery(d.conceptId) * 100)}%"></i></span></li>`).join('')}</ul>`}
      </div>`;
  }

  host.addEventListener('click', (ev) => {
    const m = ev.target.closest('[data-min]')?.dataset.min;
    if (m) {
      minutes = Number(m);
      for (const b of host.querySelectorAll('[data-min]')) b.setAttribute('aria-pressed', String(Number(b.dataset.min) === minutes));
      buildPlan();
      return;
    }
    if (ev.target.closest('[data-a="start"]')) {
      logPractice(minutes, SHAPE.map((s) => s.id));
      buildPlan();
    }
  });

  buildPlan();
  return {};
}

/** Choose the concrete activity for a block. */
function pickFor(block, { due, nextUp, tracked }) {
  if (block.id === 'ear') {
    return {
      title: 'Interval Invaders: listening only',
      detail: 'Two notes, name the distance. Nothing to look at.',
      route: 'games', arg: 'interval-invaders',
    };
  }
  if (block.id === 'review') {
    const first = due[0];
    return first
      ? {
          title: CONCEPTS[first.conceptId]?.title ?? first.conceptId,
          detail: 'Due back today. A quick pass is enough if it comes straight away.',
          route: LESSON_FOR_CONCEPT[first.conceptId] ? 'lesson' : 'games',
          arg: LESSON_FOR_CONCEPT[first.conceptId]?.id ?? LESSON_FOR_CONCEPT[first.conceptId] ?? 'interval-invaders',
        }
      : { title: 'Nothing due', detail: 'Your review queue is clear.' };
  }
  if (block.id === 'new') {
    return nextUp
      ? { title: nextUp.title, detail: nextUp.depths?.quick ?? '', route: 'lesson', arg: nextUp.id }
      : { title: 'You are up to date', detail: 'More worlds are being written.' };
  }
  if (block.id === 'warmup') {
    return { title: 'Note Hunt', detail: 'Find named notes quickly. Cheap reps to get started.', route: 'games', arg: 'note-hunt' };
  }
  return { title: 'Key Room', detail: 'Play the chords of a key and listen to how they relate.', route: 'labs', arg: 'key' };
}

function findNextLesson(state) {
  const done = new Set(state.completedLessons);
  for (const w of WORLDS) {
    for (const l of w.lessons ?? []) {
      if (!done.has(l.id)) return l;
    }
  }
  return null;
}

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
