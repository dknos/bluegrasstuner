/**
 * INTERVAL LAB.
 *
 * The product's thesis in one component. Two notes; change either one; every
 * representation and the name and the sound all move together. If a visitor
 * only ever touches one thing on this site, this is the thing.
 *
 * It is deliberately not a quiz. There is no right answer to find here — the
 * point is that poking at it teaches you what the words mean, so naming comes
 * after the experience rather than before it.
 */

import { parseNote, noteName, midi, spellFromMidi, pitchClass } from '../theory/pitch.js';
import {
  intervalBetween, intervalName, intervalSymbol, semitones, invert,
  consonance, simplify, isCompound, UnnameableIntervalError,
} from '../theory/interval.js';
import { intervalCategory, CATEGORY_BLURB } from '../ui/color.js';
import { createViewRack } from '../ui/viewrack.js';
import { audio } from '../audio/index.js';

/** Plain-language notes on what each interval is *for*, in our own words. */
const CHARACTER = {
  P1: 'Two voices on the same note. Used for weight, not colour.',
  m2: 'The tightest gap there is. Grinding, urgent, the sound of suspense.',
  M2: 'One step. Neutral on its own; it is what scales are mostly made of.',
  m3: 'The interval that makes a chord sound minor. Soft and inward.',
  M3: 'The interval that makes a chord sound major. Open and bright.',
  P4: 'Hollow and strong. Sounds like it is leaning on the note above it.',
  A4: 'Exactly half an octave. Restless; it belongs to no key comfortably.',
  P5: 'The most stable interval after the octave. Bare, wide, ancient-sounding.',
  m6: 'Wistful. A minor third turned upside down.',
  M6: 'Warm and lyrical. Very common in melodies that want to feel generous.',
  m7: 'The sound of an unresolved chord. Leans forward.',
  M7: 'A half step short of the octave, so it shimmers rather than settles.',
  P8: 'The same note, higher. The one interval every culture agrees on.',
};

const MODES = [
  { id: 'ascending', label: 'Up', hint: 'lower note first' },
  { id: 'descending', label: 'Down', hint: 'higher note first' },
  { id: 'harmonic', label: 'Together', hint: 'both at once' },
];

/**
 * @param {HTMLElement} container
 * @param {object} opts
 * @param {string} [opts.low='C4']
 * @param {string} [opts.high='E4']
 * @param {string[]} [opts.views]
 * @param {boolean} [opts.compact] hero mode — fewer controls, more presence
 */
export function createIntervalLab(container, opts = {}) {
  let low = parseNote(opts.low ?? 'C4');
  let high = parseNote(opts.high ?? 'E4');
  let mode = 'ascending';
  let sounding = [];
  let editing = 'high'; // which note a click on a view will move

  const root = document.createElement('div');
  root.className = 'lab lab-interval stack';
  root.style.setProperty('--flow', 'var(--s-5)');
  container.appendChild(root);

  // ---- Readout ------------------------------------------------------------
  const readout = document.createElement('div');
  readout.className = 'readout';
  readout.setAttribute('role', 'status');
  readout.setAttribute('aria-live', 'polite');
  root.appendChild(readout);

  // ---- Which note am I moving? -------------------------------------------
  const picker = document.createElement('div');
  picker.className = 'lab-picker';
  picker.innerHTML = `
    <div class="lab-note" data-slot="low">
      <span class="label-sm">Lower note</span>
      <div class="lab-note-controls">
        <button class="btn btn-ghost" data-step="low:-1" aria-label="Lower note down a semitone">−</button>
        <output class="lab-note-name data" data-out="low"></output>
        <button class="btn btn-ghost" data-step="low:1" aria-label="Lower note up a semitone">+</button>
      </div>
    </div>
    <div class="lab-note" data-slot="high">
      <span class="label-sm">Upper note</span>
      <div class="lab-note-controls">
        <button class="btn btn-ghost" data-step="high:-1" aria-label="Upper note down a semitone">−</button>
        <output class="lab-note-name data" data-out="high"></output>
        <button class="btn btn-ghost" data-step="high:1" aria-label="Upper note up a semitone">+</button>
      </div>
    </div>`;
  // Picker and transport share one bar. Stacked they cost 111px of vertical
  // space, which is the difference between seeing all four views at once on a
  // 900px screen and having to scroll between the keyboard and the ring.
  const bar = document.createElement('div');
  bar.className = 'lab-bar-row';
  bar.appendChild(picker);
  root.appendChild(bar);

  // ---- Transport for this widget -----------------------------------------
  const controls = document.createElement('div');
  controls.className = 'lab-controls row-wrap';
  controls.innerHTML = `
    <div class="segmented" role="group" aria-label="How to play the interval">
      ${MODES.map((m) => `<button data-mode="${m.id}" aria-pressed="${m.id === mode}" title="${m.hint}">${m.label}</button>`).join('')}
    </div>
    <button class="btn btn-primary" data-act="play">Hear it</button>
    <button class="btn" data-act="invert" title="Flip the two notes around">Invert</button>
    <button class="btn" data-act="compare" title="Play the neighbouring interval straight after">Compare with neighbour</button>`;
  bar.appendChild(controls);

  // ---- The four views -----------------------------------------------------
  const rackHost = document.createElement('div');
  root.appendChild(rackHost);

  const rack = createViewRack(rackHost, {
    views: opts.views ?? ['piano', 'staff', 'ring', 'fretboard'],
    onSelect: (n) => {
      // Clicking a view moves whichever note you last touched, so you can
      // "drag" an interval around without fighting the controls.
      setNote(editing, n);
      play();
    },
    viewOptions: {
      piano: { from: 'C3', to: 'B5' },
      fretboard: { firstFret: 0, lastFret: 12 },
      ring: { order: 'chromatic' },
    },
  });

  // ---- Audio-driven highlighting -----------------------------------------
  // Captured so destroy() can drop them. Without this, every visit to a page
  // that mounts this lab leaves a listener firing paint() on a dead rack for
  // every note played, for the rest of the session.
  const unsubscribes = [
    audio.onNoteStart((n) => {
      const m = typeof n === 'number' ? n : midi(n);
      sounding = [...new Set([...sounding, m])];
      paint();
    }),
    audio.onNoteEnd((n) => {
      const m = typeof n === 'number' ? n : midi(n);
      sounding = sounding.filter((x) => x !== m);
      paint();
    }),
  ];

  // ---- Behaviour ----------------------------------------------------------
  function currentInterval() {
    try {
      return intervalBetween(low, high);
    } catch (err) {
      if (err instanceof UnnameableIntervalError) return null;
      throw err;
    }
  }

  function setNote(slot, n) {
    if (slot === 'low') low = n; else high = n;
    // Keep them in order without silently ignoring the user's click: if they
    // put the "upper" note below the lower one, swap the roles instead.
    if (midi(low) > midi(high)) {
      [low, high] = [high, low];
      editing = editing === 'low' ? 'high' : 'low';
    }
    paint();
  }

  function stepNote(slot, delta) {
    const n = slot === 'low' ? low : high;
    const next = spellFromMidi(midi(n) + delta, {
      prefer: delta > 0 ? 'sharp' : 'flat',
    });
    setNote(slot, next);
    audio.note(next, { duration: 0.6 });
  }

  function play() {
    audio.interval(low, high, { mode });
  }

  function paint() {
    const iv = currentInterval();
    const cat = intervalCategory(high, low);
    const semis = midi(high) - midi(low);

    readout.dataset.iv = cat;

    if (!iv) {
      readout.innerHTML = `
        <div class="readout-name" style="font-size:var(--step-3)">No standard name</div>
        <p class="readout-sub">These two notes are ${semis} semitones apart, but the way they
        are spelled does not match any interval name musicians use. Try respelling one of them.</p>`;
    } else {
      const simple = simplify(iv);
      const compound = isCompound(iv);
      readout.innerHTML = `
        <div class="readout-name">${escapeHtml(intervalName(iv))}</div>
        <div class="readout-sub">
          <span><b>${escapeHtml(intervalSymbol(iv))}</b> symbol</span>
          <span><b>${semis}</b> semitone${semis === 1 ? '' : 's'}</span>
          <span><b>${iv.number}</b> letter name${iv.number === 1 ? '' : 's'} apart</span>
          ${compound ? `<span>bigger than an octave: inside, it is a <b>${escapeHtml(intervalSymbol(simple))}</b></span>` : ''}
        </div>
        <p class="readout-note">${escapeHtml(CHARACTER[intervalSymbol(simple)] ?? CATEGORY_BLURB[cat])}</p>`;
    }

    picker.querySelector('[data-out="low"]').textContent = noteName(low, { unicode: true, octave: true });
    picker.querySelector('[data-out="high"]').textContent = noteName(high, { unicode: true, octave: true });
    for (const slotEl of picker.querySelectorAll('.lab-note')) {
      slotEl.classList.toggle('is-editing', slotEl.dataset.slot === editing);
    }

    rack.update({ notes: [low, high], tonic: low, sounding, labelMode: 'name' });
  }

  // ---- Wiring -------------------------------------------------------------
  function onClick(ev) {
    const step = ev.target.closest('[data-step]')?.dataset.step;
    if (step) {
      const [slot, delta] = step.split(':');
      editing = slot;
      stepNote(slot, Number(delta));
      return;
    }
    const slotEl = ev.target.closest('.lab-note');
    if (slotEl) { editing = slotEl.dataset.slot; paint(); return; }

    const m = ev.target.closest('[data-mode]')?.dataset.mode;
    if (m) {
      mode = m;
      for (const b of controls.querySelectorAll('[data-mode]')) {
        b.setAttribute('aria-pressed', String(b.dataset.mode === mode));
      }
      play();
      return;
    }

    const act = ev.target.closest('[data-act]')?.dataset.act;
    if (act === 'play') play();
    if (act === 'invert') {
      // Move the lower note up an octave: m3 becomes M6, and you can hear why.
      const raised = { ...low, octave: low.octave + 1 };
      if (midi(raised) > midi(high)) { low = high; high = raised; }
      paint();
      play();
    }
    if (act === 'compare') compareWithNeighbour();
  }

  /**
   * Play this interval, then the one a semitone wider. Hearing m3 next to M3
   * back to back does more than any amount of explanation.
   */
  function compareWithNeighbour() {
    const neighbourUp = spellFromMidi(midi(high) + 1, { prefer: 'sharp' });
    audio.interval(low, high, { mode });
    setTimeout(() => audio.interval(low, neighbourUp, { mode }), 1400);
  }

  root.addEventListener('click', onClick);
  paint();

  return {
    element: root,
    get notes() { return [low, high]; },
    set(a, b) { low = parseNote(a); high = parseNote(b); paint(); },
    play,
    destroy() {
      root.removeEventListener('click', onClick);
      for (const off of unsubscribes) off();
      rack.destroy();
      root.remove();
    },
  };
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}
