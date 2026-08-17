/**
 * COURSE — the world list, and what is open to you right now.
 *
 * Locked lessons show *why* they are locked rather than just going grey. A
 * learner who can see "this needs half steps first" has been taught something
 * about the shape of the subject; one who sees a padlock has only been told no.
 */

import { WORLDS, CONCEPTS, isStubConcept } from '../lessons/index.js';
import { getState, overallMastery, isUnlocked } from '../ui/store.js';

export function render(host, { go, setTransport }) {
  setTransport({ label: 'The course', detail: '', play: null });

  const { completedLessons } = getState();
  const done = new Set(completedLessons);

  host.innerHTML = `
    <header class="lesson-head">
      <span class="label">Curriculum</span>
      <h1>The course</h1>
      <p class="prose" style="margin-top:var(--s-3);color:var(--text-dim)">
        Short lessons, one idea each. The order is not decoration. A lesson opens when the
        things it is built from are in place, so you should never meet a word whose parts you
        have not already heard.
      </p>
    </header>

    <div class="worlds">
      ${WORLDS.map((w) => renderWorld(w, done)).join('')}
    </div>
  `;

  host.addEventListener('click', (ev) => {
    const card = ev.target.closest('[data-lesson]');
    if (card && !card.hasAttribute('disabled')) go('lesson', card.dataset.lesson);
  });

  return {};
}

function renderWorld(world, done) {
  const lessons = world.lessons ?? [];
  const written = lessons.length > 0;
  const finished = lessons.filter((l) => done.has(l.id)).length;
  const pct = written ? Math.round((finished / lessons.length) * 100) : 0;

  return `
    <section class="world ${written ? '' : 'is-stub'}">
      <header class="world-head">
        <div class="world-idx data">${world.number ?? ''}</div>
        <div class="world-title">
          <h2>${esc(world.title)}</h2>
          <p>${esc(world.tagline ?? '')}</p>
        </div>
        <div class="world-progress">
          ${written
            ? `<span class="data">${finished}/${lessons.length}</span>
               <span class="meter" style="width:110px"><i style="width:${pct}%"></i></span>`
            : `<span class="label-sm">Coming next</span>`}
        </div>
      </header>

      ${written ? `
        <ol class="lesson-list">
          ${lessons.map((l) => renderLesson(l, done)).join('')}
        </ol>` : `
        <p class="world-stub-note">
          The ideas in here are already mapped and their prerequisites are wired up; the
          lessons themselves are the next thing being written.
        </p>`}
    </section>`;
}

function renderLesson(lesson, done) {
  const unlocked = isUnlocked(lesson.id, lesson.requires ?? []);
  const isDone = done.has(lesson.id);
  const blockers = (lesson.requires ?? [])
    .filter((c) => overallMastery(c) < 0.45 && !done.has(c))
    .map((c) => CONCEPTS[c]?.title ?? c);

  return `
    <li>
      <button class="lesson-card ${isDone ? 'is-done' : ''}" data-lesson="${esc(lesson.id)}"
              ${unlocked ? '' : 'disabled'}>
        <span class="lesson-card-idx data">${lesson.index}</span>
        <span class="lesson-card-body">
          <span class="lesson-card-title">${esc(lesson.title)}</span>
          <span class="lesson-card-sub">${esc(lesson.depths?.quick ?? '')}</span>
          ${!unlocked && blockers.length
            ? `<span class="lesson-card-block">Needs first: ${esc(blockers.join(', '))}</span>` : ''}
        </span>
        <span class="lesson-card-meta">
          <span class="data">${lesson.minutes} min</span>
          ${isDone ? '<span class="tick" aria-label="Finished">✓</span>' : ''}
        </span>
      </button>
    </li>`;
}

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
