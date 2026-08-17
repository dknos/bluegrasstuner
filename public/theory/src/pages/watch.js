/**
 * WATCH — the short films.
 *
 * Hosted on YouTube when they go up; this page is the catalogue and the
 * jump-off into the lab. We do not ship the MP4s with the site.
 *
 * Optional `youtube` on a film is a watch URL. Leave it empty and the
 * card says the link is coming.
 */

import { audio } from '../audio/index.js';

const FILMS = [
  {
    id: 'intervals',
    title: 'Two notes, and what happens between them',
    minutes: '1:27',
    blurb: 'A major third becomes a minor third by moving one note one key. The two-count rule falls out of it.',
    teaches: ['what an interval is', 'letters give the number', 'half steps give the quality'],
    goto: { label: 'Open the Interval Lab', route: 'labs', arg: 'interval' },
    youtube: '',
  },
  {
    id: 'spelling',
    title: 'Why F♯ major contains an E♯',
    minutes: '1:37',
    blurb: 'The claim most music software gets wrong. Seven letters, each used once, and the accidentals follow.',
    teaches: ['enharmonic spelling', 'key signatures', 'why sound is not spelling'],
    goto: { label: 'Open the Scale Explorer', route: 'labs', arg: 'scale' },
    youtube: '',
  },
  {
    id: 'circle',
    title: 'The circle of fifths builds itself',
    minutes: '1:36',
    blurb: 'Two keys a fifth apart share six of their seven notes. Notice that once and the poster stops needing to be memorised.',
    teaches: ['why the circle is ordered that way', 'how key signatures accumulate', 'near and far keys'],
    goto: { label: 'Open the Key Room', route: 'labs', arg: 'key' },
    youtube: '',
  },
];

export function render(host, { arg, go, setTransport }) {
  setTransport({ label: 'Watch', detail: '', play: null });
  audio.stopAll();

  const showing = FILMS.find((f) => f.id === arg) ?? null;
  host.innerHTML = showing ? one(showing) : index();
  return { destroy() {} };
}

function index() {
  return `
    <header class="lesson-head">
      <span class="label">Watch</span>
      <h1>Short films</h1>
      <p class="prose" style="margin-top:var(--s-3);color:var(--text-dim)">
        One idea each, in about ninety seconds. They will live on YouTube so this
        page stays light; we will drop the links here when they are up. Until then
        the labs already teach the same ideas with your hands.
      </p>
    </header>

    <div class="film-grid">
      ${FILMS.map((f) => `
        <button class="film-card" data-route="watch" data-arg="${f.id}">
          <span class="film-card-play" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="26" height="26"><path d="M8 5v14l11-7z" fill="currentColor"/></svg>
          </span>
          <span class="film-card-body">
            <span class="film-card-title">${esc(f.title)}</span>
            <span class="film-card-blurb">${esc(f.blurb)}</span>
            <span class="film-card-meta label-sm">${f.minutes} · ${f.youtube ? 'YouTube' : 'YouTube · soon'}</span>
          </span>
        </button>`).join('')}
    </div>`;
}

function one(f) {
  const watch = f.youtube
    ? `<p class="prose" style="margin:0;color:var(--text-dim)">
         This one is on YouTube.
       </p>
       <p style="margin-top:var(--s-4)">
         <a class="btn btn-primary" href="${esc(f.youtube)}" target="_blank" rel="noopener noreferrer">Watch on YouTube</a>
       </p>`
    : `<p class="prose" style="margin:0;color:var(--text-dim)">
         The film is ready; the YouTube link is not on this page yet. Use the lab
         below — it is the same keyboard, staff, fretboard and colour system the
         film was rendered from.
       </p>`;

  return `
    <button class="btn btn-ghost" data-route="watch" style="margin-bottom:var(--s-5)">← All films</button>

    <header class="lesson-head">
      <span class="label">Film · ${f.minutes}</span>
      <h1>${esc(f.title)}</h1>
    </header>

    <div class="film-player panel" style="padding:var(--s-6)">
      ${watch}
    </div>

    <section class="film-after">
      <div>
        <span class="label">What it covers</span>
        <ul class="takeaways" style="margin-top:var(--s-3)">
          ${f.teaches.map((t) => `<li>${esc(t)}</li>`).join('')}
        </ul>
      </div>
      <div>
        <span class="label">Then go and use it</span>
        <p class="prose" style="margin:var(--s-3) 0;color:var(--text-dim)">
          Watching is the cheap part. The idea sticks when you move the notes yourself.
        </p>
        <button class="btn btn-primary" data-route="${f.goto.route}" data-arg="${f.goto.arg}">
          ${esc(f.goto.label)}
        </button>
      </div>
    </section>`;
}

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
