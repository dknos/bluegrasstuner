/**
 * THE DISCOVER WIDGET.
 *
 * Every `discover` step in the course asks for a named widget kind. Rather
 * than eighteen hand-built one-offs that drift apart, there is one engine
 * here driven by config: an example recipe, a set of views, and a set of
 * controls. A widget kind is a *preset over that engine*, not a separate
 * program.
 *
 * The payoff is that a control behaves identically everywhere it appears — the
 * octave shifter in a clef lesson works exactly like the one in an interval
 * lesson — and any lesson can ask for any combination without new code.
 *
 * Where a kind genuinely needs its own behaviour (the interval builder's
 * two-number readout, the enharmonic flip) it is handled as a *readout*
 * variant below, not as a fork of the whole widget.
 */

import { parseNote, noteName, midi, pitchClass, shiftOctave, enharmonicSpellings, spellFromMidi } from '../theory/pitch.js';
import {
  intervalBetween, intervalName, intervalSymbol, transpose, parseInterval,
  invert, simplify, isCompound, semitones, UnnameableIntervalError,
} from '../theory/interval.js';
import { degreeLabels, getScale } from '../theory/scale.js';
import { resolveExample } from './schema.js';
import { createViewRack } from '../ui/viewrack.js';
import { intervalCategory } from '../ui/color.js';
import { audio } from '../audio/index.js';
import { getState } from '../ui/store.js';

const KEYS = ['C', 'G', 'D', 'A', 'E', 'B', 'F#', 'Db', 'Ab', 'Eb', 'Bb', 'F'];

/** Which readout a kind wants. Everything else is shared. */
const READOUT_FOR = {
  'interval-builder': 'two-number',
  'two-number-meter': 'two-number',
  'interval-ear': 'hidden-until-revealed',
  'inversion-mirror': 'inversion',
  'compound-collapse': 'inversion',
  'tritone-mirror': 'inversion',
  'enharmonic-flip': 'spellings',
  'accidental-lab': 'spellings',
  'step-walker': 'step-size',
  'quality-shifter': 'label',
  'scale-degree-map': 'degrees',
  'letter-wheel': 'letters',
  'octave-stack': 'octaves',
  'clef-slider': 'label',
  'staff-plotter': 'label',
  'black-key-grouper': 'label',
  'keyboard-explorer': 'label',
  'melodic-harmonic-toggle': 'label',
};

/** Sensible view sets when a lesson doesn't pin them. */
const VIEWS_FOR = {
  'letter-wheel': ['pitchring', 'piano'],
  'black-key-grouper': ['piano'],
  'staff-plotter': ['staff', 'piano'],
  'clef-slider': ['staff', 'piano'],
  'octave-stack': ['piano', 'staff'],
  'scale-degree-map': ['pitchring', 'piano'],
  'tritone-mirror': ['pitchring', 'piano'],
};

const VIEW_ALIAS = { pitchring: 'ring' };
const toRackViews = (ids) => ids.map((v) => VIEW_ALIAS[v] ?? v);

/**
 * @param {HTMLElement} host
 * @param {object} cfg   the widget config from a lesson step
 * @param {object} [ctx] { tonic, onPlay }
 */
export function createWidget(host, cfg = {}, ctx = {}) {
  const kind = cfg.kind ?? 'keyboard-explorer';
  const controls = new Set(cfg.controls ?? ['play']);
  const playback = cfg.playback ?? 'sequence';

  const s = {
    tonic: parseNote(ctx.tonic ?? cfg.tonic ?? 'C4'),
    octaveShift: 0,
    labelMode: cfg.labelMode ?? 'name',
    direction: 'up',
    revealed: !controls.has('reveal'),
    spellingIndex: 0,
    semitoneNudge: 0,
    letterNudge: 0,
    folded: false,
    inverted: false,
    sounding: [],
  };

  const root = document.createElement('div');
  root.className = 'widget';
  root.dataset.kind = kind;
  host.appendChild(root);

  const readoutEl = document.createElement('div');
  readoutEl.className = 'widget-readout';
  readoutEl.setAttribute('role', 'status');
  readoutEl.setAttribute('aria-live', 'polite');
  root.appendChild(readoutEl);

  const controlsEl = document.createElement('div');
  controlsEl.className = 'widget-controls row-wrap';
  root.appendChild(controlsEl);

  const rackHost = document.createElement('div');
  root.appendChild(rackHost);

  const views = toRackViews(cfg.views ?? VIEWS_FOR[kind] ?? ['piano', 'staff']);
  const rack = createViewRack(rackHost, {
    views,
    onSelect: (n) => {
      // Clicking a view moves the note the controls move, so pointing and
      // using the slider do the same thing. The nudge is measured against the
      // note it will actually be applied to — the last one — and added to the
      // existing nudge, since that is already baked into what is on screen.
      if (kind === 'keyboard-explorer' || kind === 'staff-plotter' || kind === 'black-key-grouper') {
        s.tonic = n;
      } else {
        const shown = current().notes;
        const moving = shown[shown.length - 1];
        if (!moving) return;
        s.semitoneNudge += midi(n) - midi(moving);
      }
      paint();
      play();
    },
    viewOptions: {
      piano: { from: cfg.from ?? 'C3', to: cfg.to ?? 'B5' },
      staff: { clef: cfg.clef ?? 'treble' },
      ring: { order: kind === 'letter-wheel' ? 'chromatic' : (cfg.ringOrder ?? 'chromatic') },
      fretboard: { firstFret: 0, lastFret: 12, tuning: getState().settings.tuning },
    },
  });

  // Captured so destroy() can drop them — a lesson mounts several of these,
  // and an unsubscribed listener keeps updating a destroyed rack for every
  // note played for the rest of the session.
  const unsubscribes = [
    audio.onNoteStart((n) => { s.sounding = [...new Set([...s.sounding, toMidi(n)])]; rack.update({ sounding: s.sounding }); }),
    audio.onNoteEnd((n) => { s.sounding = s.sounding.filter((x) => x !== toMidi(n)); rack.update({ sounding: s.sounding }); }),
  ];

  // -------------------------------------------------------------------------
  /** Resolve the lesson's recipe under the current knob positions. */
  function current() {
    const base = cfg.example ?? { kind: 'interval', intervalId: 'M3' };
    const tonic = shiftOctave(s.tonic, s.octaveShift);
    let resolved;
    try {
      resolved = resolveExample(base, tonic, {});
    } catch (err) {
      return { notes: [tonic], label: err.message, root: tonic, kind: base.kind };
    }

    let notes = [...resolved.notes];

    // Nudges apply to the moving note — the second one — which is what every
    // "change one thing and listen" control in the course is doing.
    if (s.semitoneNudge && notes.length > 1) {
      const target = midi(notes[notes.length - 1]) + s.semitoneNudge;
      notes[notes.length - 1] = spellFromMidi(target, { prefer: s.semitoneNudge > 0 ? 'sharp' : 'flat' });
    }
    if (s.spellingIndex && notes.length) {
      const alts = enharmonicSpellings(notes[notes.length - 1], { maxAlter: 2 });
      if (alts.length) notes[notes.length - 1] = alts[s.spellingIndex % alts.length];
    }
    if (s.inverted && notes.length === 2) {
      notes = [notes[1], shiftOctave(notes[0], 1)].sort((a, b) => midi(a) - midi(b));
    }
    if (s.folded && notes.length === 2) {
      while (midi(notes[1]) - midi(notes[0]) > 12) notes[1] = shiftOctave(notes[1], -1);
    }
    if (s.direction === 'down' && notes.length > 1) notes = [...notes].reverse();

    return { ...resolved, notes };
  }

  // -------------------------------------------------------------------------
  function play() {
    const { notes } = current();
    if (!notes.length) return;
    ctx.onPlay?.(notes);
    switch (playback) {
      case 'chord':
        audio.chord(notes, { style: 'block' });
        break;
      case 'sequence-descending':
        audio.sequence([...notes].reverse(), {});
        break;
      case 'sequence-then-chord':
        audio.sequence(notes, {});
        setTimeout(() => audio.chord(notes, { style: 'block' }), notes.length * 460 + 350);
        break;
      case 'drone-then-note':
        audio.note(notes[0], { duration: 2.6 });
        setTimeout(() => audio.note(notes[notes.length - 1], { duration: 1.8 }), 500);
        break;
      case 'pair':
        audio.interval(notes[0], notes[notes.length - 1], { mode: s.direction === 'down' ? 'descending' : 'ascending' });
        break;
      default:
        audio.sequence(notes, {});
    }
  }

  // -------------------------------------------------------------------------
  function buildControls() {
    const parts = [];
    if (controls.has('play')) parts.push(btn('play', 'Play', 'btn-primary'));
    if (controls.has('compare')) parts.push(btn('compare', 'Compare'));
    if (controls.has('direction')) {
      parts.push(`<div class="segmented" role="group" aria-label="Direction">
        <button data-c="dir-up" aria-pressed="${s.direction === 'up'}">Up</button>
        <button data-c="dir-down" aria-pressed="${s.direction === 'down'}">Down</button>
      </div>`);
    }
    if (controls.has('semitone-slider')) {
      parts.push(`<label class="widget-field"><span class="label-sm">Move by semitones</span>
        <input class="slider" type="range" min="-12" max="12" step="1" value="${s.semitoneNudge}" data-c="semitones" aria-label="Move the upper note by semitones">
        <output class="data">${s.semitoneNudge > 0 ? '+' : ''}${s.semitoneNudge}</output></label>`);
    }
    if (controls.has('accidental-step')) {
      parts.push(`<div class="row" role="group" aria-label="Raise or lower">
        <button class="btn" data-c="acc-down">♭ Lower</button>
        <button class="btn" data-c="acc-up">♯ Raise</button></div>`);
    }
    if (controls.has('spelling-toggle')) parts.push(btn('spell', 'Respell it'));
    if (controls.has('invert')) parts.push(btn('invert', 'Turn it upside down'));
    if (controls.has('octave-fold')) parts.push(btn('fold', s.folded ? 'Unfold' : 'Fold into one octave'));
    if (controls.has('octave-shift')) {
      parts.push(`<div class="row" role="group" aria-label="Octave">
        <button class="btn" data-c="oct-down" aria-label="Down an octave">8vb</button>
        <button class="btn" data-c="oct-up" aria-label="Up an octave">8va</button></div>`);
    }
    if (controls.has('clef-switch')) {
      parts.push(`<div class="segmented" role="group" aria-label="Clef">
        <button data-c="clef-treble">Treble</button><button data-c="clef-bass">Bass</button></div>`);
    }
    if (controls.has('tonic-picker')) {
      parts.push(`<label class="widget-field"><span class="label-sm">Key</span>
        <select data-c="tonic" aria-label="Starting note">
          ${KEYS.map((k) => `<option value="${k}" ${noteName(s.tonic, { unicode: false }) === k ? 'selected' : ''}>${k}</option>`).join('')}
        </select></label>`);
    }
    if (controls.has('label-mode')) {
      parts.push(`<label class="widget-field"><span class="label-sm">Labels</span>
        <select data-c="labels" aria-label="What the labels show">
          <option value="name">Note names</option>
          <option value="interval">Intervals</option>
          <option value="degree">Semitones</option>
          <option value="none">Nothing</option>
        </select></label>`);
    }
    if (controls.has('reveal')) parts.push(btn('reveal', s.revealed ? 'Hide the answer' : 'Show me'));
    if (controls.has('reset')) parts.push(btn('reset', 'Reset', 'btn-ghost'));
    controlsEl.innerHTML = parts.join('');
    const labels = controlsEl.querySelector('[data-c="labels"]');
    if (labels) labels.value = s.labelMode;
  }

  const btn = (c, text, cls = 'btn') => `<button class="btn ${cls === 'btn' ? '' : cls}" data-c="${c}">${text}</button>`;

  // -------------------------------------------------------------------------
  function paint() {
    const cur = current();
    const [a, b] = cur.notes;
    const variant = READOUT_FOR[kind] ?? 'label';

    // Measure from the first note to the last, not "only when there are
    // exactly two". Lessons routinely hand us a three- or four-note stack —
    // the perfect-family lesson compares 4th, 5th and octave in one example —
    // and requiring a pair made those readouts print an em dash where the
    // letter count belongs.
    const lo = cur.notes[0];
    const hi = cur.notes[cur.notes.length - 1];
    let iv = null;
    if (lo && hi && cur.notes.length >= 2 && midi(lo) !== midi(hi)) {
      try { iv = intervalBetween(lo, hi); } catch { iv = null; }
    }
    const cat = hi ? intervalCategory(hi, lo ?? s.tonic) : 'none';
    readoutEl.dataset.iv = cat;

    // The readout always describes the span of the example — first note to
    // last — so a three-note stack reads as one interval rather than silently
    // reporting only its first two notes.
    readoutEl.innerHTML = renderReadout(variant, { cur, iv, a: lo, b: hi });

    rack.update({
      notes: cur.notes,
      tonic: cur.notes[0] ?? s.tonic,
      sounding: s.sounding,
      labelMode: s.labelMode,
    });
    buildControls();
  }

  function renderReadout(variant, { cur, iv, a, b }) {
    const semis = a && b ? Math.abs(midi(b) - midi(a)) : 0;

    if (variant === 'two-number' && a && b) {
      // The crux of the whole interval world: two counts, side by side, and
      // the name is a *consequence* of both rather than a third fact.
      const letters = iv ? iv.number : '—';
      return `
        <div class="two-number">
          <div class="tn-cell"><span class="tn-v data">${letters}</span><span class="label-sm">letter names</span>
            <span class="tn-hint">${esc(a.letter)} to ${esc(b.letter)}, counting both ends</span></div>
          <div class="tn-op">+</div>
          <div class="tn-cell"><span class="tn-v data">${semis}</span><span class="label-sm">semitones</span>
            <span class="tn-hint">keys you pass on the way</span></div>
          <div class="tn-op">=</div>
          <div class="tn-cell tn-answer"><span class="tn-name">${iv ? esc(intervalName(iv)) : 'no standard name'}</span>
            <span class="label-sm">${iv ? esc(intervalSymbol(iv)) : ''}</span></div>
        </div>`;
    }

    if (variant === 'hidden-until-revealed') {
      return s.revealed && iv
        ? `<div class="readout-name">${esc(intervalName(iv))}</div>
           <div class="readout-sub"><span><b>${esc(intervalSymbol(iv))}</b></span><span><b>${semis}</b> semitones</span></div>`
        : `<div class="readout-name" style="color:var(--text-faint)">Listen first</div>
           <p class="readout-note">Decide what you think it is, then reveal it.</p>`;
    }

    if (variant === 'inversion' && iv) {
      const inv = invert(simplify(iv));
      return `
        <div class="readout-name">${esc(intervalName(iv))}</div>
        <div class="readout-sub">
          <span>turned upside down it becomes <b>${esc(intervalName(inv))}</b></span>
          <span><b>${iv.number}</b> + <b>${inv.number}</b> = <b>9</b></span>
          ${isCompound(iv) ? `<span>folded into one octave: <b>${esc(intervalSymbol(simplify(iv)))}</b></span>` : ''}
        </div>`;
    }

    if (variant === 'spellings' && b) {
      const alts = enharmonicSpellings(b, { maxAlter: 1 });
      return `
        <div class="readout-name">${esc(noteName(b))}</div>
        <div class="readout-sub">
          <span>same key, also written <b>${alts.filter((n) => noteName(n) !== noteName(b)).map((n) => esc(noteName(n))).join(', ') || '—'}</b></span>
          <span>MIDI <b>${midi(b)}</b></span>
        </div>
        <p class="readout-note">Same sound, different name. Which one is correct depends on
        the key you are in and where the note is going next.</p>`;
    }

    if (variant === 'step-size' && a && b) {
      const word = semis === 1 ? 'half step' : semis === 2 ? 'whole step' : `${semis} half steps`;
      return `<div class="readout-name">${esc(word)}</div>
        <div class="readout-sub"><span>${esc(noteName(a))} → ${esc(noteName(b))}</span>
        <span>${semis === 1 ? 'no key skipped' : semis === 2 ? 'exactly one key skipped' : `${semis - 1} keys skipped`}</span></div>`;
    }

    if (variant === 'degrees' && cur.kind === 'scale') {
      const labels = degreeLabels(cfg.example?.scaleId ?? 'major');
      return `<div class="readout-name" style="font-size:var(--step-3)">${esc(cur.label)}</div>
        <div class="degree-strip">${cur.notes.slice(0, labels.length).map((n, i) => `
          <span class="degree-cell" data-iv="${intervalCategory(n, cur.notes[0])}">
            <b>${esc(labels[i])}</b><i>${esc(noteName(n))}</i></span>`).join('')}</div>`;
    }

    if (variant === 'letters') {
      return `<div class="letter-strip">${cur.notes.map((n) => `
        <span class="letter-cell">${esc(n.letter)}</span>`).join('<span class="letter-arrow">→</span>')}</div>
        <p class="readout-note">Seven letters, then straight back to the start. That wrap-around
        is what an octave is.</p>`;
    }

    if (variant === 'octaves') {
      return `<div class="readout-name" style="font-size:var(--step-3)">${esc(cur.label)}</div>
        <div class="readout-sub">${cur.notes.map((n) => `<span><b>${esc(noteName(n, { octave: true }))}</b> · ${midi(n)}</span>`).join('')}</div>`;
    }

    return `<div class="readout-name" style="font-size:var(--step-3)">${esc(cur.label ?? '')}</div>
      ${iv ? `<div class="readout-sub"><span><b>${esc(intervalSymbol(iv))}</b></span><span><b>${semis}</b> semitones</span></div>` : ''}`;
  }

  // -------------------------------------------------------------------------
  function onInput(ev) {
    const c = ev.target.closest('[data-c]')?.dataset.c;
    if (!c) return;
    const v = ev.target.value;
    if (c === 'semitones') { s.semitoneNudge = Number(v); paint(); play(); }
    if (c === 'tonic') { s.tonic = parseNote(v + '4'); s.semitoneNudge = 0; paint(); play(); }
    if (c === 'labels') { s.labelMode = v; paint(); }
  }

  function onClick(ev) {
    const c = ev.target.closest('[data-c]')?.dataset.c;
    if (!c) return;
    switch (c) {
      case 'play': play(); return;
      case 'dir-up': s.direction = 'up'; break;
      case 'dir-down': s.direction = 'down'; break;
      case 'acc-up': s.semitoneNudge += 1; break;
      case 'acc-down': s.semitoneNudge -= 1; break;
      case 'spell': s.spellingIndex += 1; break;
      case 'invert': s.inverted = !s.inverted; break;
      case 'fold': s.folded = !s.folded; break;
      case 'oct-up': s.octaveShift += 1; break;
      case 'oct-down': s.octaveShift -= 1; break;
      case 'reveal': s.revealed = !s.revealed; paint(); return;
      case 'reset':
        Object.assign(s, { octaveShift: 0, semitoneNudge: 0, spellingIndex: 0, inverted: false, folded: false, direction: 'up' });
        break;
      case 'compare': compare(); return;
      case 'clef-treble': case 'clef-bass': paint(); return;
      default: return;
    }
    paint();
    if (c !== 'reset') play();
  }

  /** Play it, then play it with one thing changed. The core teaching move. */
  function compare() {
    const before = current().notes;
    audio.sequence(before, {});
    const saved = s.semitoneNudge;
    setTimeout(() => {
      s.semitoneNudge = saved + (cfg.compareDelta ?? 1);
      const after = current().notes;
      audio.sequence(after, {});
      s.semitoneNudge = saved;
      paint();
    }, before.length * 460 + 500);
  }

  root.addEventListener('click', onClick);
  root.addEventListener('input', onInput);
  root.addEventListener('change', onInput);

  paint();

  return {
    element: root,
    play,
    destroy() {
      root.removeEventListener('click', onClick);
      root.removeEventListener('input', onInput);
      root.removeEventListener('change', onInput);
      for (const off of unsubscribes) off();
      rack.destroy();
      root.remove();
    },
  };
}

const toMidi = (n) => (typeof n === 'number' ? n : midi(n));

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
