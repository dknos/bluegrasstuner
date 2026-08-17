/**
 * PIANO KEYBOARD.
 *
 * The reference view. A keyboard shows pitch as physical distance better than
 * anything else — a minor third is *visibly* smaller than a major third — so
 * this is the view a beginner should meet first and the one the other three
 * are synchronised against.
 *
 * Geometry note: the black keys are not centred on the gaps between white
 * keys. On a real instrument C♯ sits left of the C/D boundary and D♯ sits
 * right of it, because the five black keys have to share the space of seven
 * white ones. Getting that subtly wrong is one of the tells of a fake-looking
 * keyboard, so the offsets below are measured rather than guessed.
 */

import {
  midi, pitchClass, noteName, spellFromMidi, parseNote, asNote, isSameNote,
} from '../theory/pitch.js';
import { intervalBetween, intervalSymbol, semitonesBetween } from '../theory/interval.js';
import { intervalCategory } from '../ui/color.js';
import { keySignature } from '../theory/key.js';

const WHITE_PCS = [0, 2, 4, 5, 7, 9, 11];
const isWhitePc = (pc) => WHITE_PCS.includes(pc);

/** Black-key centres, in white-key widths from the C of that octave. */
const BLACK_OFFSET = { 1: 0.90, 3: 2.10, 6: 3.87, 8: 5.00, 10: 6.13 };

const WHITE_W = 24;
const WHITE_H = 132;
const BLACK_W = 14.4;
const BLACK_H = 84;

// ---------------------------------------------------------------------------
// Pure layout maths — testable without a DOM.
// ---------------------------------------------------------------------------

/** How many white keys sit in [lo, m). */
export function whiteKeysBefore(lo, m) {
  let n = 0;
  for (let x = lo; x < m; x++) if (isWhitePc(((x % 12) + 12) % 12)) n++;
  return n;
}

/**
 * Where does this MIDI note sit on the drawn keyboard?
 * @returns {{x:number, y:number, w:number, h:number, black:boolean}}
 */
export function keyGeometry(lo, m) {
  const pc = ((m % 12) + 12) % 12;
  if (isWhitePc(pc)) {
    return { x: whiteKeysBefore(lo, m) * WHITE_W, y: 0, w: WHITE_W, h: WHITE_H, black: false };
  }
  const cOfOctave = m - pc;
  const originWhite = whiteKeysBefore(lo, cOfOctave);
  const centre = (originWhite + BLACK_OFFSET[pc]) * WHITE_W;
  return { x: centre - BLACK_W / 2, y: 0, w: BLACK_W, h: BLACK_H, black: true };
}

/** Total drawn width of a keyboard spanning [lo, hi]. */
export function keyboardWidth(lo, hi) {
  return whiteKeysBefore(lo, hi + 1) * WHITE_W;
}

/**
 * A keyboard should start and end on a white key, or it looks sawn off.
 * Widens the requested range outward to the nearest white keys.
 */
export function snapRange(lo, hi) {
  let a = lo, b = hi;
  while (!isWhitePc(((a % 12) + 12) % 12)) a--;
  while (!isWhitePc(((b % 12) + 12) % 12)) b++;
  return [a, b];
}

/**
 * How should we spell the key the user just clicked? A piano key has no
 * spelling of its own — that comes from context. In a flat key we say E♭, in
 * a sharp key D♯, and they are genuinely different notes even though it is
 * one piece of wood.
 */
export function spellForContext(m, tonic, preference = 'auto') {
  if (preference === 'sharp' || preference === 'flat') return spellFromMidi(m, { prefer: preference });
  if (!tonic) return spellFromMidi(m, { prefer: 'sharp' });
  let sig;
  try {
    sig = keySignature(tonic, 'major');
  } catch {
    return spellFromMidi(m, { prefer: 'sharp' });
  }
  return spellFromMidi(m, { prefer: sig.flats > sig.sharps ? 'flat' : 'sharp' });
}

// ---------------------------------------------------------------------------
// The view
// ---------------------------------------------------------------------------

const SVG_NS = 'http://www.w3.org/2000/svg';
const el = (tag, attrs = {}) => {
  const n = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
  return n;
};

/**
 * @param {HTMLElement} container
 * @param {object} options
 * @param {string} [options.from='C3'] lowest note
 * @param {string} [options.to='B4']   highest note
 * @param {(note:object)=>void} [options.onSelect]
 * @param {(note:object|null)=>void} [options.onHover]
 * @param {'auto'|'sharp'|'flat'} [options.preferAccidental='auto']
 * @param {string} [options.ariaLabel]
 */
export function createPianoView(container, options = {}) {
  const opts = {
    from: 'C3', to: 'B4', preferAccidental: 'auto',
    ariaLabel: 'Piano keyboard', ...options,
  };

  const [lo, hi] = snapRange(midi(parseNote(opts.from)), midi(parseNote(opts.to)));
  const width = keyboardWidth(lo, hi);

  const root = document.createElement('div');
  root.className = 'piano';
  root.setAttribute('role', 'group');
  root.setAttribute('aria-label', opts.ariaLabel);

  const svg = el('svg', {
    viewBox: `0 0 ${width} ${WHITE_H + 2}`,
    class: 'piano-svg',
    preserveAspectRatio: 'xMidYMid meet',
  });
  svg.style.width = '100%';
  svg.style.height = 'auto';
  root.appendChild(svg);

  const whiteLayer = el('g', { class: 'piano-white' });
  const blackLayer = el('g', { class: 'piano-black' });
  const labelLayer = el('g', { class: 'piano-labels' });
  svg.append(whiteLayer, blackLayer, labelLayer);

  /** @type {Map<number, {group:SVGElement, rect:SVGElement, label:SVGElement, black:boolean}>} */
  const keys = new Map();
  let state = { notes: [], tonic: null, sounding: [], labelMode: 'none', focus: null };
  let focusMidi = null;

  for (let m = lo; m <= hi; m++) {
    const g = keyGeometry(lo, m);
    const layer = g.black ? blackLayer : whiteLayer;

    const group = el('g', {
      class: `piano-key ${g.black ? 'is-black' : 'is-white'}`,
      role: 'button',
      tabindex: '-1',
      'data-midi': String(m),
    });

    const rect = el('rect', {
      x: g.x, y: g.y, width: g.w, height: g.h,
      rx: g.black ? 2 : 3,
      class: 'piano-key-face',
    });
    group.appendChild(rect);

    const label = el('text', {
      x: g.x + g.w / 2,
      y: g.black ? g.h - 10 : g.h - 9,
      class: 'piano-key-label',
      'text-anchor': 'middle',
    });
    group.appendChild(label);

    layer.appendChild(group);
    keys.set(m, { group, rect, label, black: g.black, geom: g });
  }

  // --- interaction ---------------------------------------------------------
  const noteFor = (m) => spellForContext(m, state.tonic, opts.preferAccidental);

  function handlePointer(ev) {
    const g = ev.target.closest('.piano-key');
    if (!g) return;
    const m = Number(g.dataset.midi);
    focusMidi = m;
    updateFocusability();
    opts.onSelect?.(noteFor(m), m);
  }

  function handleMove(ev) {
    const g = ev.target.closest?.('.piano-key');
    opts.onHover?.(g ? noteFor(Number(g.dataset.midi)) : null);
  }

  svg.addEventListener('click', handlePointer);
  svg.addEventListener('pointermove', handleMove);
  svg.addEventListener('pointerleave', () => opts.onHover?.(null));

  // Keyboard: the whole instrument is one tab stop, arrows walk the keys.
  root.tabIndex = 0;
  function handleKey(ev) {
    const step = { ArrowRight: 1, ArrowLeft: -1, ArrowUp: 12, ArrowDown: -12 }[ev.key];
    if (step) {
      ev.preventDefault();
      const next = Math.min(hi, Math.max(lo, (focusMidi ?? lo) + step));
      focusMidi = next;
      updateFocusability();
      opts.onHover?.(noteFor(next));
      return;
    }
    if (ev.key === 'Enter' || ev.key === ' ') {
      ev.preventDefault();
      if (focusMidi != null) opts.onSelect?.(noteFor(focusMidi), focusMidi);
    }
  }
  root.addEventListener('keydown', handleKey);

  function updateFocusability() {
    for (const [m, k] of keys) {
      k.group.classList.toggle('is-focused', m === focusMidi);
    }
  }

  // --- rendering -----------------------------------------------------------
  function labelText(m, n) {
    switch (state.labelMode) {
      case 'name': return noteName(n, { unicode: true });
      case 'degree': {
        if (!state.tonic) return '';
        const d = ((pitchClass(n) - pitchClass(state.tonic)) % 12 + 12) % 12;
        return String(d);
      }
      case 'interval': {
        if (!state.tonic) return '';
        try { return intervalSymbol(intervalBetween(state.tonic, n)); } catch { return ''; }
      }
      case 'semitones': {
        if (!state.tonic) return '';
        return String(Math.abs(semitonesBetween(state.tonic, n)));
      }
      default: return '';
    }
  }

  /** @param {object} next */
  function update(next) {
    state = { ...state, ...next };
    const active = new Map();
    for (const n of state.notes ?? []) active.set(midi(n), asNote(n));
    const sounding = new Set(state.sounding ?? []);
    const showLabels = state.labelMode && state.labelMode !== 'none';

    for (const [m, k] of keys) {
      const n = active.get(m);
      const on = !!n;
      const ringing = sounding.has(m);

      k.group.classList.toggle('is-on', on);
      k.group.classList.toggle('is-ringing', ringing);
      k.group.dataset.iv = on ? intervalCategory(n, state.tonic) : 'none';
      k.group.setAttribute('aria-pressed', on ? 'true' : 'false');

      const shown = n ?? spellForContext(m, state.tonic, opts.preferAccidental);
      k.group.setAttribute('aria-label', noteName(shown, { unicode: false, octave: true }));

      // Labels only on notes that are actually in play, plus every C for
      // orientation. A keyboard with 25 labels on it is unreadable.
      const isC = pitchClass(shown) === 0;
      const wantLabel = showLabels && (on || (isC && state.labelMode === 'name'));
      const txt = wantLabel ? labelText(m, shown) : '';
      if (k.label.textContent !== txt) k.label.textContent = txt;
      k.label.classList.toggle('is-visible', !!txt);
    }
  }

  function destroy() {
    svg.removeEventListener('click', handlePointer);
    svg.removeEventListener('pointermove', handleMove);
    root.removeEventListener('keydown', handleKey);
    root.remove();
  }

  container.appendChild(root);
  update({});

  return { element: root, update, destroy, range: [lo, hi] };
}
