/**
 * PITCH RING — the instrument-free view.
 *
 * Twelve seats on a circle. No keys, no strings, no staff: just the twelve
 * pitch classes and the distances between them. Everything an instrument adds
 * — where your hands go, which octave you happen to be in, how the note is
 * written — is stripped out, so what is left is the shape of the interval
 * content itself.
 *
 * That is why this view earns its place next to the other three. On a piano a
 * diminished seventh is four keys you have to memorise. Here it is a square,
 * and it is *obviously* a square, and the square is *obviously* the same shape
 * no matter which of its four notes you call the root. A whole-tone scale is a
 * regular hexagon. An augmented triad is an equilateral triangle. A major
 * triad is a scalene one — and the fact that it is lopsided is exactly why it
 * has a root and the symmetrical chords do not.
 *
 * Two seatings, one ring:
 *
 *   'chromatic'  seat i holds pitch class i         — the pitch-class clock
 *   'fifths'     seat i holds pitch class (7i)%12   — the circle of fifths
 *
 * Re-seating between them is the best twenty frames of animation in the app.
 * The same twelve notes are simply reorganised, and the reorganisation is not
 * arbitrary: because 7 is odd and 12 is even, every EVEN pitch class keeps its
 * seat and every ODD one moves exactly half a turn. One whole-tone hexagon
 * stands perfectly still while the other rotates through it. Nobody has to be
 * told that the two whole-tone scales partition the chromatic set once they
 * have watched it happen.
 *
 * Geometry conventions used throughout:
 *   - angles are DEGREES, 0 at twelve o'clock, increasing CLOCKWISE
 *   - a "seat angle" ignores rotation; an "absolute angle" includes it
 *   - screen y grows downward, so x = cx + r·sin θ, y = cy − r·cos θ
 */

import {
  asNote, noteName, midi, pitchClass, shiftOctave, withOctave, spellFromMidi,
} from '../theory/pitch.js';
import {
  intervalBetween, intervalSymbol, intervalName, transpose,
  commonIntervalForSemitones, UnnameableIntervalError,
} from '../theory/interval.js';
import { keySignature, CIRCLE_OF_FIFTHS } from '../theory/key.js';
import { intervalCategory } from '../ui/color.js';

// ===========================================================================
// PURE — geometry and selection maths. No DOM below this line until the view.
// ===========================================================================

export const RING_ORDERS = /** @type {const} */ (['chromatic', 'fifths']);

/** Seats on the ring. Twelve, because twelve-tone equal temperament. */
export const SEATS = 12;

/** Degrees between adjacent seats. */
export const SEAT_ARC = 360 / SEATS;

/** Fold any angle into [0, 360). */
export function normalizeAngle(deg) {
  return ((deg % 360) + 360) % 360;
}

/** Fold any pitch class into 0..11. */
function normalizePc(pc) {
  return ((Math.round(pc) % 12) + 12) % 12;
}

/**
 * Accept 0..11, a Note, or a note string — always return 0..11.
 * Notes go through the engine's pitchClass() so B♯ and C land on one seat.
 */
export function toPitchClass(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') return normalizePc(value);
  return pitchClass(asNote(value));
}

function assertOrder(order) {
  if (!RING_ORDERS.includes(order)) {
    throw new Error(`Unknown ring order: ${order}. Expected one of ${RING_ORDERS.join(', ')}.`);
  }
  return order;
}

/**
 * Which seat (0..11, clockwise from the top) does a pitch class occupy?
 *
 * 'fifths' seats pitch class p at (7p mod 12) because seat i holds the note i
 * fifths above C — (7i mod 12) — and 7 is its own inverse mod 12, so the map
 * is its own undo. That single line is the entire circle of fifths.
 */
export function ringIndex(pc, order = 'chromatic') {
  const p = toPitchClass(pc);
  assertOrder(order);
  return order === 'fifths' ? (p * 7) % 12 : p;
}

/** The inverse of ringIndex: which pitch class sits in this seat? */
export function seatPitchClass(seat, order = 'chromatic') {
  const s = normalizePc(seat);
  assertOrder(order);
  return order === 'fifths' ? (s * 7) % 12 : s;
}

/**
 * Where on the dial does this pitch class sit?
 * @param {number|object|string} pc  0..11, or a Note (spelling is respected on
 *   the way in and then deliberately discarded — a ring seats sounds, not
 *   spellings, which is the one place in this app where that is the honest
 *   model).
 * @param {{order?: 'chromatic'|'fifths', rotation?: number}} opts
 * @returns {number} degrees in [0, 360), 0 = top, increasing clockwise
 */
export function ringAngle(pc, { order = 'chromatic', rotation = 0 } = {}) {
  return normalizeAngle(ringIndex(pc, order) * SEAT_ARC + rotation);
}

/**
 * The rotation that parks `anchor` at twelve o'clock — this is what
 * `options.rotateTo` resolves to. Pass null for no rotation.
 */
export function ringRotation(anchor, { order = 'chromatic' } = {}) {
  if (anchor === null || anchor === undefined) return 0;
  return normalizeAngle(-ringIndex(anchor, order) * SEAT_ARC);
}

/**
 * Walk `delta` seats around the ring and report the pitch class you land on.
 * This is what the arrow keys do, so in 'fifths' the right arrow steps C→G
 * while in 'chromatic' it steps C→C♯. The keyboard teaches the ordering.
 */
export function ringStep(pc, delta, { order = 'chromatic' } = {}) {
  const seat = ringIndex(pc, order) + Math.round(delta);
  return seatPitchClass(seat, order);
}

/** Cartesian point for a polar position, in SVG coordinates (y grows down). */
export function polarPoint(angleDeg, radius, cx = 0, cy = 0) {
  const rad = (normalizeAngle(angleDeg) * Math.PI) / 180;
  return { x: cx + radius * Math.sin(rad), y: cy - radius * Math.cos(rad) };
}

/**
 * Signed shortest way round from a to b, in (-180, 180].
 * The half-turn tie resolves clockwise on purpose: when the ring re-seats,
 * every moving note moves exactly 180°, so the tie-break IS the choreography.
 * Breaking it consistently turns twelve ambiguous jumps into one legible
 * half-turn of the odd whole-tone hexagon.
 */
export function shortestDelta(a, b) {
  const d = normalizeAngle(b - a);
  return d > 180 ? d - 360 : d;
}

/** Interpolate along the shortest arc. t is not clamped by design. */
export function lerpAngle(a, b, t) {
  return normalizeAngle(a + shortestDelta(a, b) * t);
}

/**
 * How far this pitch class has to travel when the seating changes, ignoring
 * any whole-ring rotation. 0 for the even pitch classes, ±180 for the odd
 * ones — see the header. Used to decide who dips and who doesn't.
 */
export function seatTravel(pc, fromOrder, toOrder) {
  return shortestDelta(
    ringIndex(pc, fromOrder) * SEAT_ARC,
    ringIndex(pc, toOrder) * SEAT_ARC,
  );
}

/**
 * Nodes that are re-seating pull toward the centre at mid-flight instead of
 * grinding along the rim through six other nodes. A node that isn't moving,
 * or one that is only riding a whole-ring rotation, keeps its radius exactly.
 *
 * @param {number} radius  the resting ring radius
 * @param {number} t       0..1 eased progress
 * @param {number} travel  degrees of *relative* travel (see seatTravel)
 * @param {number} dip     peak inward fraction at |travel| = 180
 */
export function tweenRadius(radius, t, travel, dip = 0.26) {
  const amount = Math.min(Math.abs(travel) / 180, 1);
  return radius * (1 - dip * amount * Math.sin(Math.PI * Math.min(Math.max(t, 0), 1)));
}

/** Slow in, slow out. Cheap, and it reads as weight rather than as easing. */
export function easeInOutCubic(t) {
  const x = Math.min(Math.max(t, 0), 1);
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
}

/**
 * Per-node progress through a staggered tween, clamped to 0..1.
 * The stagger is small: enough to make the half-turn read as a sweep rather
 * than a snap, not enough to feel like a loading spinner.
 */
export function nodeProgress(elapsed, index, { duration = 620, stagger = 16 } = {}) {
  if (duration <= 0) return 1;
  return Math.min(Math.max((elapsed - index * stagger) / duration, 0), 1);
}

/** Total wall time a staggered tween occupies. */
export function tweenDuration({ duration = 620, stagger = 16, count = SEATS } = {}) {
  return duration + stagger * Math.max(count - 1, 0);
}

/**
 * Collapse notes to one entry per pitch class, keeping the lowest sounding
 * spelling of each. The ring has one seat per pitch class, so C4 and C5 are
 * the same node — and saying so out loud is part of the lesson.
 * @returns {Map<number, object>} pitch class → Note
 */
export function pitchClassMap(notes = []) {
  const out = new Map();
  for (const raw of notes) {
    if (raw === null || raw === undefined) continue;
    const n = asNote(raw);
    const pc = pitchClass(n);
    const seen = out.get(pc);
    if (!seen || midi(n) < midi(seen)) out.set(pc, n);
  }
  return out;
}

/**
 * How many of the twelve transpositions map this set onto itself.
 * 1 for a major triad, 3 for an augmented triad, 4 for a diminished seventh,
 * 6 for a whole-tone scale, 12 for the full chromatic. It is the single number
 * that says "this chord has no root", so the ring shows it.
 */
export function rotationalSymmetry(pcs = []) {
  const set = new Set([...pcs].map((p) => toPitchClass(p)).filter((p) => p !== null));
  if (set.size === 0) return 0;
  let count = 0;
  for (let t = 0; t < 12; t++) {
    let all = true;
    for (const p of set) {
      if (!set.has((p + t) % 12)) { all = false; break; }
    }
    if (all) count++;
  }
  return count;
}

/** Gaps in degrees between consecutive vertices, walking clockwise. */
function angularGaps(angles) {
  if (angles.length < 2) return [];
  const gaps = [];
  for (let i = 0; i < angles.length; i++) {
    const a = angles[i];
    const b = angles[(i + 1) % angles.length];
    gaps.push(normalizeAngle(b - a));
  }
  return gaps;
}

/**
 * THE SHAPE. Vertices of the polygon that joins the sounding notes.
 *
 * Vertices come out ordered by seat, not by the order they were handed in, so
 * the polygon closes without crossing itself and stays stable while the ring
 * re-seats underneath it.
 *
 * @param {Array<object|string>} notes  the sounding notes (octaves collapse)
 * @param {object|string|null} tonic    reference note, for interval colour only
 * @param {object} [opts]
 * @param {'chromatic'|'fifths'} [opts.order]
 * @param {number} [opts.rotation]  whole-ring rotation in degrees
 * @param {number} [opts.radius]    ring radius (default 1 → unit circle)
 * @param {number} [opts.cx]
 * @param {number} [opts.cy]
 * @param {(pc:number)=>number} [opts.angleFor]   override, used mid-tween
 * @param {(pc:number)=>number} [opts.radiusFor]  override, used mid-tween
 * @returns {{
 *   vertices: Array<{pitchClass:number, note:object, seat:number, angle:number,
 *                    radius:number, x:number, y:number, category:string,
 *                    isTonic:boolean}>,
 *   points: string, edges: Array<object>, gaps: number[],
 *   evenlySpaced: boolean, rotationalSymmetry: number,
 *   pitchClasses: number[], centroid: {x:number, y:number}|null
 * }}
 */
export function chordGeometry(notes = [], tonic = null, opts = {}) {
  const {
    order = 'chromatic', rotation = 0, radius = 1, cx = 0, cy = 0,
    angleFor = null, radiusFor = null,
  } = opts;
  assertOrder(order);

  const byPc = pitchClassMap(notes);
  const tonicNote = tonic === null || tonic === undefined ? null : asNote(tonic);

  const vertices = [...byPc.entries()]
    .map(([pc, note]) => ({ pc, note, seat: ringIndex(pc, order) }))
    .sort((a, b) => a.seat - b.seat)
    .map(({ pc, note, seat }) => {
      const angle = angleFor
        ? normalizeAngle(angleFor(pc))
        : ringAngle(pc, { order, rotation });
      const r = radiusFor ? radiusFor(pc) : radius;
      const { x, y } = polarPoint(angle, r, cx, cy);
      return {
        pitchClass: pc,
        note,
        seat,
        angle,
        radius: r,
        x,
        y,
        category: intervalCategory(note, tonicNote),
        isTonic: tonicNote !== null && pc === pitchClass(tonicNote),
      };
    });

  // Edges carry their own colour: each one is categorised by the interval it
  // spans, measured from its own lower endpoint. A diminished seventh comes
  // out with four minor edges, a whole-tone scale with six major ones, and a
  // major triad with one of each family — the shape is legible in colour as
  // well as in outline.
  const edges = [];
  const n = vertices.length;
  const edgeCount = n < 2 ? 0 : n === 2 ? 1 : n;
  for (let i = 0; i < edgeCount; i++) {
    const from = vertices[i];
    const to = vertices[(i + 1) % n];
    edges.push({
      from,
      to,
      semitones: ((to.pitchClass - from.pitchClass) % 12 + 12) % 12,
      category: intervalCategory(to.note, from.note),
    });
  }

  const angles = vertices.map((v) => v.angle);
  const gaps = angularGaps(angles);
  const evenly = gaps.length > 1 &&
    gaps.every((g) => Math.abs(g - 360 / gaps.length) < 1e-6);

  return {
    vertices,
    points: vertices.map((v) => `${round(v.x)},${round(v.y)}`).join(' '),
    edges,
    gaps,
    evenlySpaced: evenly,
    rotationalSymmetry: rotationalSymmetry([...byPc.keys()]),
    pitchClasses: vertices.map((v) => v.pitchClass),
    centroid: n === 0 ? null : {
      x: vertices.reduce((s, v) => s + v.x, 0) / n,
      y: vertices.reduce((s, v) => s + v.y, 0) / n,
    },
  };
}

function round(v) {
  return Math.round(v * 1000) / 1000;
}

// ---------------------------------------------------------------------------
// Naming. Spelling comes from context, never from the seating — the whole
// point of the re-seat animation is that the twelve notes keep their identity
// while their positions change, so a label must not flicker between orders.
// ---------------------------------------------------------------------------

/** The twelve key names musicians actually use, taken from the engine. */
const NEUTRAL_NAMES = (() => {
  const out = new Array(12);
  for (const entry of CIRCLE_OF_FIFTHS) {
    out[pitchClass(entry.major)] = withOctave(entry.major, 4);
  }
  return out;
})();

/**
 * Does this tonic's key signature lean sharp or flat? Used to spell the seats
 * a caller didn't hand us a note for, so an E♭ ring reads A♭ rather than G♯.
 */
export function spellingPreference(tonic) {
  if (!tonic) return null;
  try {
    const sig = keySignature(asNote(tonic), 'major');
    return sig.flats > sig.sharps ? 'flat' : 'sharp';
  } catch {
    // Exotic tonics (triple accidentals, keys nobody notates) have no
    // signature the engine will build. Fall back rather than fail.
    return 'sharp';
  }
}

/**
 * Best available spelling for a seat, in order of authority:
 *
 * 1. A note the caller actually handed us. That spelling was chosen on
 *    purpose somewhere upstream and the ring has no business overriding it.
 * 2. Otherwise, the note the engine reaches by transposing the tonic by the
 *    everyday interval for that distance — the same move buildScale() makes.
 *    Deriving the name from the interval is what keeps the name and the
 *    interval label telling the same story: with an E♭ tonic, seat 4 is the
 *    minor second, so it is F♭, not an E that would have to be labelled an
 *    augmented unison.
 * 3. If that needs a double accidental (a handful of seats in the five- and
 *    six-flat keys do), legibility wins: fall back to the plain spelling
 *    leaning the way the key signature leans. The interval label is then
 *    recomputed from the name we actually chose, so the two still agree.
 * 4. With no tonic at all there is nothing to measure from, so the seats take
 *    the twelve key names off the engine's circle of fifths.
 */
export function spellSeat(pc, { notes = null, tonic = null, prefer = undefined } = {}) {
  const p = toPitchClass(pc);
  const supplied = notes instanceof Map ? notes : pitchClassMap(notes ?? []);
  const hit = supplied.get(p);
  if (hit) return hit;
  if (!tonic) return NEUTRAL_NAMES[p] ?? withOctave(spellFromMidi(60 + p), 4);

  const t = withOctave(asNote(tonic), 4);
  const distance = ((p - pitchClass(t)) % 12 + 12) % 12;
  try {
    const spelled = transpose(t, commonIntervalForSemitones(distance));
    if (Math.abs(spelled.alter) <= 1) return withOctave(spelled, 4);
  } catch {
    // transpose() refuses anything past a triple accidental. Its refusal is
    // the correct answer; we just need a readable name instead.
  }
  return withOctave(spellFromMidi(60 + p, { prefer: prefer ?? spellingPreference(t) }), 4);
}

/** Put a note in the octave at or just above the tonic, so intervals ascend. */
function raiseTo(note, tonic) {
  let x = asNote(note);
  const t = asNote(tonic);
  while (midi(x) < midi(t)) x = shiftOctave(x, 1);
  while (midi(x) - midi(t) >= 12) x = shiftOctave(x, -1);
  return x;
}

/**
 * The interval from tonic up to this note, spelled. Falls back to the everyday
 * reading when the spelling produces a gap notation has no name for (the
 * engine throws UnnameableIntervalError for those, correctly).
 */
export function seatInterval(note, tonic) {
  if (!tonic) return null;
  const t = asNote(tonic);
  const raised = raiseTo(note, t);
  try {
    return intervalBetween(t, raised);
  } catch (err) {
    if (!(err instanceof UnnameableIntervalError)) throw err;
    return commonIntervalForSemitones(midi(raised) - midi(t));
  }
}

/**
 * Text for one seat under the current label mode.
 * Returns '' for 'none' and for anything that needs a tonic it hasn't got.
 */
/**
 * noteName() spells a double accidental with the Musical Symbol characters
 * 𝄫 and 𝄪, which live outside the Basic Multilingual Plane and are missing
 * from most interface fonts — they come out as an empty box, which is worse
 * than useless on a label. The doubled ♭♭ / ♯♯ signs say the same thing in
 * characters every font actually has. This swaps the glyph, never the note:
 * the letter and the alteration are still whatever the engine decided.
 */
function displayName(note) {
  return noteName(note, { unicode: true })
    .replace(/\u{1D12B}/gu, '♭♭')
    .replace(/\u{1D12A}/gu, '♯♯');
}

/**
 * Scale-degree label for an interval: 1, ♭2, 2, ♭3, 3, 4, ♯4, 5…
 *
 * The bare interval number is not enough. A chromatic ring has twelve seats
 * and only seven degree numbers, so "3" alone would sit on both E♭ and E —
 * two different notes wearing the same label on the one view whose whole
 * subject is the distance between them. The accidental prefix is what makes
 * the degree row a bijection again.
 *
 * The prefix table mirrors the engine's own convention in scale.js
 * degreeLabels(), so a degree reads identically here and in a scale lesson.
 * That function keys off a scale id and we have a bare interval, hence the
 * duplicated table rather than a call.
 */
export function degreeLabel(iv) {
  const prefix = {
    P: '', M: '',
    m: '♭', d: iv.number === 4 ? '♭♭' : '♭', dd: '♭♭',
    A: '♯', AA: '♯♯',
  }[iv.quality] ?? '';
  return `${prefix}${iv.number === 8 ? 1 : iv.number}`;
}

export function seatLabel(note, tonic, labelMode = 'name') {
  if (labelMode === 'none') return '';
  if (labelMode === 'name') return displayName(note);

  // Every mode except 'name' is measured from the tonic. With no tonic there
  // is nothing to measure, so we fall back to the name rather than go blank.
  const iv = seatInterval(note, tonic);
  if (!iv) return displayName(note);

  if (labelMode === 'interval') return intervalSymbol(iv);
  if (labelMode === 'degree') return degreeLabel(iv);
  if (labelMode === 'semitones') {
    return String(midi(raiseTo(note, asNote(tonic))) - midi(asNote(tonic)));
  }
  return displayName(note);
}

/**
 * The full description of one seat: everything both the SVG and the screen
 * reader need, computed once per update.
 */
export function describeSeat(pc, { notes, tonic, labelMode = 'name', order = 'chromatic', rotation = 0, prefer }) {
  const p = toPitchClass(pc);
  const supplied = notes instanceof Map ? notes : pitchClassMap(notes ?? []);
  const note = spellSeat(p, { notes: supplied, tonic, prefer });
  const iv = seatInterval(note, tonic);
  const isTonic = !!tonic && pitchClass(asNote(tonic)) === p;
  const selected = supplied.has(p);
  return {
    pitchClass: p,
    note,
    seat: ringIndex(p, order),
    angle: ringAngle(p, { order, rotation }),
    label: seatLabel(note, tonic, labelMode),
    category: intervalCategory(note, tonic ?? null),
    interval: iv,
    isTonic,
    selected,
    // Spoken form. Written here rather than assembled from a phrase table so
    // it reads as one sentence: "E, major third above C, selected".
    description: [
      noteName(note, { unicode: false }),
      isTonic ? 'the tonic' : iv ? `${intervalName(iv)} above ${noteName(asNote(tonic), { unicode: false })}` : null,
      selected ? 'selected' : null,
    ].filter(Boolean).join(', '),
  };
}

/** All twelve seats, in seat order. The view renders exactly this. */
export function ringSeats(state = {}) {
  const {
    notes = [], tonic = null, labelMode = 'name',
    order = 'chromatic', rotation = 0,
  } = state;
  const supplied = pitchClassMap(notes);
  const prefer = spellingPreference(tonic);
  const out = [];
  for (let seat = 0; seat < SEATS; seat++) {
    out.push(describeSeat(seatPitchClass(seat, order), {
      notes: supplied, tonic, labelMode, order, rotation, prefer,
    }));
  }
  return out;
}

// ===========================================================================
// The view. DOM starts here.
// ===========================================================================

const NS = 'http://www.w3.org/2000/svg';

/** viewBox is fixed; the element scales with its container. */
const VB = 400;
const CX = VB / 2;
const CY = VB / 2;
const R_RING = 146;   // node centres
const R_NODE = 21;
const R_TONIC = 26;
// The bezel stops at 184 rather than filling the box, because the index mark
// sits outside it and still has to fit: the pointer occupies radius 186..196,
// which leaves 4 units of margin inside the 200-unit half-viewBox. Every
// painted thing is now inside the viewBox, so the SVG does not need
// overflow:visible and cannot be clipped by an ancestor that hides overflow.
const R_BEZEL_OUT = 184;
const R_BEZEL_IN = 176;
const R_HUB = 62;     // central readout disc
const R_SPOKE_IN = R_HUB + 6;
const R_SPOKE_OUT = R_RING - R_TONIC - 5;

const STYLE_ID = 'pitchring-style';

/* Every colour here is a token. The five interval hues arrive through
   data-iv (set by applyCategory) as --hue / --hue-dim; nothing is literal. */
const CSS = `
.pitchring { display: block; width: 100%; max-width: 34rem; margin-inline: auto; }
.pitchring-svg { display: block; width: 100%; height: auto; }

.pr-bezel-ring { fill: none; stroke: var(--rule); stroke-width: 1; }
.pr-bezel-face { fill: var(--deck); }
.pr-tick { stroke: var(--rule-bright); stroke-width: 1; }
.pr-tick-minor { stroke: var(--rule); stroke-width: 1; opacity: 0.75; }
.pr-index { fill: var(--text-dim); }

.pr-hub { fill: none; stroke: var(--rule); stroke-width: 1; }
.pr-spoke { stroke: var(--rule); stroke-width: 1; opacity: 0.5; }
.pr-spoke.is-on { stroke: var(--hue, var(--text-faint)); opacity: 0.5; }

.pr-shape { fill: var(--hue, var(--text-faint)); fill-opacity: 0.07; stroke: none; }
.pr-edge { stroke: var(--hue, var(--text-faint)); stroke-width: 1.75; stroke-linecap: round; opacity: 0.85; }

.pr-node { cursor: pointer; }
.pr-halo { fill: var(--hue, var(--text-faint)); opacity: 0; }
.pr-disc {
  fill: var(--hue, var(--text-faint));
  fill-opacity: 0;
  stroke: var(--hue-dim, var(--rule));
  stroke-width: 1;
}
.pr-label {
  font-family: var(--font-display);
  font-size: 17px;
  font-weight: 600;
  letter-spacing: 0.02em;
  fill: var(--text-dim);
  text-anchor: middle;
  dominant-baseline: central;
  pointer-events: none;
  user-select: none;
}
.pr-label[data-len="3"] { font-size: 14px; letter-spacing: 0; }
.pr-label[data-mode="semitones"],
.pr-label[data-mode="degree"] { font-family: var(--font-data); font-size: 15px; }

.pr-node[data-state="on"] .pr-disc { fill-opacity: 0.16; stroke: var(--hue, var(--rule-bright)); }
.pr-node[data-state="on"] .pr-label { fill: var(--hue, var(--text)); }
.pr-node[data-state="tonic"] .pr-disc { fill-opacity: 1; stroke: var(--hue, var(--text-hi)); stroke-width: 1.5; }
.pr-node[data-state="tonic"] .pr-label { fill: var(--void); font-weight: 700; }
.pr-node[data-state="off"]:hover .pr-disc { fill-opacity: 0.08; }
.pr-node[data-state="off"]:hover .pr-label { fill: var(--text); }

/* Sounding. The shared .is-ringing keyframe in tokens.css is written for box
   shadows, which SVG does not paint, so the halo carries it here instead — a
   state change on opacity, not a second animation. Under reduced motion the
   global rule in tokens.css collapses the transition to nothing. */
.pr-halo { transition: opacity var(--t-slow) var(--ease); }
.pr-node.is-ringing .pr-halo { opacity: 0.34; transition-duration: 40ms; }

/* Replacing the platform outline means this ring IS the focus indicator, so
   it also answers plain :focus. Browser and screen-reader support for
   :focus-visible on a programmatically focused SVG <g> is not something that
   can be checked headlessly, and "no visible focus at all" is not a failure
   mode worth risking to avoid a ring on a mouse click. */
.pr-node:focus { outline: none; }
.pr-focus-ring { fill: none; stroke: var(--text-hi); stroke-width: 2; opacity: 0; }
.pr-node:focus .pr-focus-ring,
.pr-node:focus-visible .pr-focus-ring { opacity: 1; }

.pr-readout-primary {
  font-family: var(--font-display);
  font-size: 26px;
  font-weight: 700;
  fill: var(--text-hi);
  text-anchor: middle;
  dominant-baseline: central;
}
.pr-readout-secondary {
  font-family: var(--font-display);
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.18em;
  fill: var(--text-faint);
  text-anchor: middle;
  dominant-baseline: central;
}
.pr-readout-symmetry {
  font-family: var(--font-data);
  font-size: 10px;
  fill: var(--text-dim);
  text-anchor: middle;
  dominant-baseline: central;
}
.pr-readout { pointer-events: none; user-select: none; }

@media (max-width: 26rem) {
  .pr-label { font-size: 18px; }
  .pr-readout-secondary { letter-spacing: 0.12em; }
}
`;

function ensureStyles(doc) {
  if (!doc || typeof doc.createElement !== 'function') return;
  if (doc.getElementById && doc.getElementById(STYLE_ID)) return;
  const style = doc.createElement('style');
  style.id = STYLE_ID;
  style.textContent = CSS;
  (doc.head ?? doc.documentElement)?.appendChild(style);
}

function el(doc, tag, attrs = {}, parent = null) {
  const node = doc.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, String(v));
  if (parent) parent.appendChild(node);
  return node;
}

/** setAttribute is not free at 60 Hz; skip it when nothing changed. */
function setAttr(node, cache, name, value) {
  const v = String(value);
  if (cache[name] === v) return;
  cache[name] = v;
  node.setAttribute(name, v);
}

function setText(node, cache, value) {
  if (cache.text === value) return;
  cache.text = value;
  node.textContent = value;
}

/**
 * Mode readout, kept to one short word so it stays inside the hub. The hub is
 * only 124 units across and the seats at three and nine o'clock come right up
 * to it, so a longer string overlaps them — which the contract forbids, and
 * which looks like a bug even to someone who has never read the contract.
 */
const ORDER_LABEL = {
  chromatic: 'CHROMATIC',
  fifths: 'FIFTHS',
};

/**
 * @param {Element} container
 * @param {object} [options]
 * @param {'chromatic'|'fifths'} [options.order]
 * @param {object|string|number|null} [options.rotateTo]  note parked at the top
 * @param {(note:object)=>void} [options.onSelect]
 * @param {(note:object|null)=>void} [options.onHover]
 * @param {(note:object)=>void} [options.onFocus]  defaults to onHover
 * @param {string} [options.label]  overrides the root aria-label
 * @param {Document} [options.document]  injectable, for non-browser hosts
 */
export function createPitchRingView(container, options = {}) {
  const doc = options.document ??
    (container && container.ownerDocument) ??
    (typeof document !== 'undefined' ? document : null);
  if (!doc) throw new Error('createPitchRingView needs a document to build into.');
  ensureStyles(doc);

  const onSelect = options.onSelect ?? (() => {});
  const onHover = options.onHover ?? (() => {});
  const onFocus = options.onFocus ?? onHover;

  // What the view is currently showing, and what it is heading toward.
  const desired = {
    order: RING_ORDERS.includes(options.order) ? options.order : 'chromatic',
    rotateTo: options.rotateTo ?? null,
  };
  const shown = { order: desired.order, rotation: ringRotation(desired.rotateTo, desired) };
  /** @type {null|{startedAt:number, fromAngle:number[], delta:number[], travel:number[]}} */
  let tween = null;
  let raf = 0;

  let lastState = {
    notes: [], tonic: null, sounding: [], labelMode: 'name', focus: null, opts: {},
  };
  let focusPc = 0;
  let focusTouched = false;
  let destroyed = false;

  const reduceMotion = typeof doc.defaultView?.matchMedia === 'function'
    ? doc.defaultView.matchMedia('(prefers-reduced-motion: reduce)')
    : null;

  // ---- structure, built exactly once ------------------------------------
  const root = doc.createElement('div');
  root.setAttribute('class', 'pitchring');
  root.setAttribute('role', 'group');
  root.setAttribute('aria-label', options.label ??
    'Pitch ring: the twelve pitch classes on a dial, with the selected notes joined into a shape.');

  const svg = el(doc, 'svg', {
    class: 'pitchring-svg',
    viewBox: `0 0 ${VB} ${VB}`,
    'aria-hidden': 'false',
    focusable: 'false',
  }, root);

  const status = doc.createElement('p');
  status.setAttribute('class', 'visually-hidden');
  status.setAttribute('aria-live', 'polite');
  root.appendChild(status);

  // Bezel: two hairlines and a tick ring. Static furniture — the apparatus.
  const bezel = el(doc, 'g', { class: 'pr-bezel', 'aria-hidden': 'true' }, svg);
  el(doc, 'circle', { class: 'pr-bezel-face', cx: CX, cy: CY, r: R_BEZEL_OUT }, bezel);
  el(doc, 'circle', { class: 'pr-bezel-ring', cx: CX, cy: CY, r: R_BEZEL_OUT }, bezel);
  el(doc, 'circle', { class: 'pr-bezel-ring', cx: CX, cy: CY, r: R_BEZEL_IN }, bezel);
  for (let deg = 0; deg < 360; deg += 6) {
    const major = deg % SEAT_ARC === 0;
    const a = polarPoint(deg, major ? R_BEZEL_IN : R_BEZEL_OUT - 5, CX, CY);
    const b = polarPoint(deg, R_BEZEL_OUT, CX, CY);
    el(doc, 'line', {
      class: major ? 'pr-tick' : 'pr-tick-minor',
      x1: round(a.x), y1: round(a.y), x2: round(b.x), y2: round(b.y),
    }, bezel);
  }
  // Index mark: the fixed pointer the ring rotates under. Apex down, at
  // radius 186 — just clear of the bezel and well inside the viewBox.
  el(doc, 'path', {
    class: 'pr-index',
    d: `M ${CX} ${CY - 186} l 6 -10 l -12 0 z`,
  }, bezel);
  el(doc, 'circle', { class: 'pr-hub', cx: CX, cy: CY, r: R_HUB, 'aria-hidden': 'true' }, svg);

  const spokeLayer = el(doc, 'g', { class: 'pr-spokes', 'aria-hidden': 'true' }, svg);
  const shape = el(doc, 'polygon', { class: 'pr-shape', points: '', 'aria-hidden': 'true' }, svg);
  const edgeLayer = el(doc, 'g', { class: 'pr-edges', 'aria-hidden': 'true' }, svg);
  const nodeLayer = el(doc, 'g', { class: 'pr-nodes' }, svg);

  const spokes = [];
  const edges = [];
  for (let i = 0; i < SEATS; i++) {
    spokes.push({ node: el(doc, 'line', { class: 'pr-spoke', x1: CX, y1: CY, x2: CX, y2: CY }, spokeLayer), cache: {} });
    edges.push({ node: el(doc, 'line', { class: 'pr-edge', x1: CX, y1: CY, x2: CX, y2: CY, visibility: 'hidden' }, edgeLayer), cache: {} });
  }

  /** One group per PITCH CLASS, not per seat — identity has to survive the re-seat. */
  const nodes = [];
  for (let pc = 0; pc < SEATS; pc++) {
    const g = el(doc, 'g', {
      class: 'pr-node',
      role: 'button',
      tabindex: pc === 0 ? '0' : '-1',
      'aria-pressed': 'false',
      'data-pc': String(pc),
      'data-state': 'off',
      transform: `translate(${CX},${CY})`,
    }, nodeLayer);
    const halo = el(doc, 'circle', { class: 'pr-halo', r: R_NODE + 9 }, g);
    const disc = el(doc, 'circle', { class: 'pr-disc', r: R_NODE }, g);
    const ring = el(doc, 'circle', { class: 'pr-focus-ring', r: R_NODE + 4 }, g);
    const text = el(doc, 'text', { class: 'pr-label', x: 0, y: 0 }, g);
    nodes.push({ pc, g, halo, disc, ring, text, cache: {}, discCache: {}, textCache: {} });
  }

  const readout = el(doc, 'g', { class: 'pr-readout', 'aria-hidden': 'true' }, svg);
  const readPrimary = el(doc, 'text', { class: 'pr-readout-primary', x: CX, y: CY - 12 }, readout);
  const readSecondary = el(doc, 'text', { class: 'pr-readout-secondary', x: CX, y: CY + 12 }, readout);
  const readSymmetry = el(doc, 'text', { class: 'pr-readout-symmetry', x: CX, y: CY + 30 }, readout);
  const shapeCache = {};
  const readCache = { primary: {}, secondary: {}, symmetry: {} };

  // ---- interaction --------------------------------------------------------

  function noteForPc(pc) {
    return currentSeats().find((s) => s.pitchClass === pc)?.note ?? spellSeat(pc, {});
  }

  // Naming twelve seats means twelve interval lookups and a key signature;
  // update() runs on every audio tick, so the answer is cached until one of
  // the four things it depends on actually changes.
  let seatCache = { key: '', seats: null };
  function currentSeats() {
    const s = lastState;
    const id = (n) => `${n.letter}${n.alter}${n.octave}`;
    const key = [
      s.notes.map(id).join('|'),
      s.tonic ? id(s.tonic) : '-',
      s.labelMode, shown.order,
    ].join('~');
    if (seatCache.key !== key) {
      seatCache = {
        key,
        seats: ringSeats({
          notes: s.notes, tonic: s.tonic, labelMode: s.labelMode,
          order: shown.order, rotation: 0,
        }),
      };
    }
    return seatCache.seats;
  }

  /** Roving tabindex: the ring is one tab stop, arrows move inside it. */
  function setRovingFocus(pc) {
    focusPc = normalizePc(pc);
    focusTouched = true;
    for (const n of nodes) n.g.setAttribute('tabindex', n.pc === focusPc ? '0' : '-1');
  }

  function moveFocus(pc, { takeFocus = true } = {}) {
    setRovingFocus(pc);
    const target = nodes[focusPc];
    if (takeFocus && typeof target?.g.focus === 'function') target.g.focus();
    const seat = currentSeats().find((s) => s.pitchClass === focusPc);
    if (seat) {
      status.textContent = seat.description;
      onFocus(seat.note);
    }
  }

  function handleClick(ev) {
    const pc = Number(ev.currentTarget.getAttribute('data-pc'));
    setRovingFocus(pc);
    onSelect(noteForPc(pc));
  }

  function handleKey(ev) {
    const pc = Number(ev.currentTarget.getAttribute('data-pc'));
    let next = null;
    switch (ev.key) {
      case 'ArrowRight': case 'ArrowUp': next = ringStep(pc, 1, shown); break;
      case 'ArrowLeft': case 'ArrowDown': next = ringStep(pc, -1, shown); break;
      // Home goes to the tonic, because on this view the tonic is home.
      case 'Home': next = lastState.tonic ? pitchClass(asNote(lastState.tonic)) : seatPitchClass(0, shown.order); break;
      case 'End': next = seatPitchClass(SEATS - 1, shown.order); break;
      case 'Enter': case ' ': case 'Spacebar':
        ev.preventDefault();
        onSelect(noteForPc(pc));
        return;
      default: return;
    }
    ev.preventDefault();
    moveFocus(next);
  }

  function handleEnter(ev) {
    const pc = Number(ev.currentTarget.getAttribute('data-pc'));
    onHover(noteForPc(pc));
  }
  function handleLeave() { onHover(null); }
  function handleNodeFocus(ev) {
    const pc = Number(ev.currentTarget.getAttribute('data-pc'));
    if (pc !== focusPc) moveFocus(pc, { takeFocus: false });
  }

  for (const n of nodes) {
    n.g.addEventListener('click', handleClick);
    n.g.addEventListener('keydown', handleKey);
    n.g.addEventListener('mouseenter', handleEnter);
    n.g.addEventListener('mouseleave', handleLeave);
    n.g.addEventListener('focus', handleNodeFocus);
  }

  // ---- the re-seat tween --------------------------------------------------

  function angleNow(pc, t) {
    if (!tween) return ringAngle(pc, shown);
    const local = easeInOutCubic(nodeProgress(t, ringIndex(pc, tween.fromOrder)));
    return normalizeAngle(tween.fromAngle[pc] + tween.delta[pc] * local);
  }

  function radiusNow(pc, t) {
    if (!tween) return R_RING;
    const local = easeInOutCubic(nodeProgress(t, ringIndex(pc, tween.fromOrder)));
    // `offset` is zero except on a redirect, where it carries the node's
    // in-flight radius back to the rim without a pop.
    return tweenRadius(R_RING, local, tween.travel[pc]) + tween.offset[pc] * (1 - local);
  }

  function startTween(fromOrder, fromRotation) {
    const rotDelta = shortestDelta(fromRotation, shown.rotation);
    // Toggling the ordering again before the last change has landed is a
    // thing people do with a control like this. Picking the new tween up from
    // where each node actually is — rather than from where it was heading —
    // is the difference between a redirect and a teleport.
    const inFlight = tween ? now() - tween.startedAt : null;
    const fromAngle = [];
    const fromRadius = [];
    const delta = [];
    const travel = [];
    const offset = [];
    for (let pc = 0; pc < SEATS; pc++) {
      const rel = seatTravel(pc, fromOrder, shown.order);
      if (inFlight === null) {
        fromAngle[pc] = ringAngle(pc, { order: fromOrder, rotation: fromRotation });
        // The coordinated delta: everyone rides the same rotation, and the
        // re-seaters add their own half-turn on top of it.
        delta[pc] = rel + rotDelta;
        fromRadius[pc] = R_RING;
      } else {
        fromAngle[pc] = angleNow(pc, inFlight);
        fromRadius[pc] = radiusNow(pc, inFlight);
        delta[pc] = shortestDelta(fromAngle[pc], ringAngle(pc, shown));
      }
      travel[pc] = rel;
      offset[pc] = fromRadius[pc] - R_RING;
    }
    // Nothing actually moves, or the user has asked for less motion: snap.
    // Snapping is not a degraded experience here — the two seatings are both
    // legible standing still, only the transition between them is the treat.
    if (delta.every((d) => d === 0) || reduceMotion?.matches) { tween = null; return; }
    tween = { startedAt: now(), fromOrder, fromAngle, delta, travel, offset };
    schedule();
  }

  function now() {
    const view = doc.defaultView;
    return view?.performance?.now ? view.performance.now() : Date.now();
  }

  function schedule() {
    const view = doc.defaultView;
    // No animation frames available (a headless host, a shim): land on the
    // destination immediately rather than freezing mid-flight.
    if (!view?.requestAnimationFrame) { tween = null; return; }
    if (raf) return;
    raf = view.requestAnimationFrame(step);
  }

  function step() {
    raf = 0;
    if (destroyed || !tween) return;
    const elapsed = now() - tween.startedAt;
    paint(elapsed);
    if (elapsed >= tweenDuration()) tween = null;
    else schedule();
  }

  // ---- painting -----------------------------------------------------------

  function paint(elapsed = Infinity) {
    const seats = currentSeats();
    const byPc = new Map(seats.map((s) => [s.pitchClass, s]));
    // paint() runs on every audio tick, so one malformed entry in `sounding`
    // must not take the whole view down. Filter first, then spell.
    const soundingPcs = new Set(
      (lastState.sounding ?? [])
        .filter((m) => Number.isFinite(m))
        .map((m) => pitchClass(spellFromMidi(Math.round(m)))),
    );
    const labelMode = lastState.labelMode ?? 'name';

    for (const n of nodes) {
      const seat = byPc.get(n.pc);
      const angle = angleNow(n.pc, elapsed);
      const radius = radiusNow(n.pc, elapsed);
      const p = polarPoint(angle, radius, CX, CY);

      setAttr(n.g, n.cache, 'transform', `translate(${round(p.x)},${round(p.y)})`);
      const state = seat.isTonic ? 'tonic' : seat.selected ? 'on' : 'off';
      setAttr(n.g, n.cache, 'data-state', state);
      setAttr(n.g, n.cache, 'aria-pressed', seat.selected ? 'true' : 'false');
      setAttr(n.g, n.cache, 'aria-label', seat.description);
      // seat.category came from intervalCategory(); data-iv is the only
      // colour channel a view is allowed to touch.
      setAttr(n.g, n.cache, 'data-iv', seat.category);
      setAttr(n.disc, n.discCache, 'r', seat.isTonic ? R_TONIC : R_NODE);
      setAttr(n.ring, n.discCache, 'r', (seat.isTonic ? R_TONIC : R_NODE) + 4);

      // Contract: sounding notes carry .is-ringing.
      const ringing = soundingPcs.has(n.pc);
      if (n.cache.ringing !== ringing) {
        n.cache.ringing = ringing;
        n.g.classList.toggle('is-ringing', ringing);
      }

      // A label is dropped rather than overlapped when it cannot fit the disc.
      const text = seat.label.length > 4 ? '' : seat.label;
      setText(n.text, n.textCache, text);
      setAttr(n.text, n.textCache, 'data-len', String(Math.min(text.length, 3)));
      setAttr(n.text, n.textCache, 'data-mode', labelMode);

      // Spoke: a faint radial hairline out to each seat.
      const inner = polarPoint(angle, R_SPOKE_IN, CX, CY);
      const outer = polarPoint(angle, Math.max(radius - R_TONIC - 5, R_SPOKE_IN), CX, CY);
      const s = spokes[n.pc];
      setAttr(s.node, s.cache, 'x1', round(inner.x));
      setAttr(s.node, s.cache, 'y1', round(inner.y));
      setAttr(s.node, s.cache, 'x2', round(outer.x));
      setAttr(s.node, s.cache, 'y2', round(outer.y));
      // data-iv gets its own cache slot: a seat can keep its on/off state
      // while its colour changes underneath it (any time the tonic moves),
      // and tying the two together left the spoke painted the old hue.
      setAttr(s.node, s.cache, 'data-iv', seat.category);
      if (s.cache.on !== state) {
        s.cache.on = state;
        s.node.classList.toggle('is-on', state !== 'off');
      }
    }

    // The shape. While a tween is running it has to be rebuilt every frame,
    // but on an ordinary audio tick — where only `sounding` changed — the
    // polygon is identical and the whole computation can be skipped.
    const shapeKey = `${seatCache.key}@${shown.rotation}`;
    if (!tween && shapeCache.key === shapeKey) return;
    shapeCache.key = tween ? null : shapeKey;

    const geo = chordGeometry(lastState.notes ?? [], lastState.tonic ?? null, {
      order: shown.order,
      rotation: shown.rotation,
      radius: R_RING,
      cx: CX,
      cy: CY,
      angleFor: (pc) => angleNow(pc, elapsed),
      radiusFor: (pc) => radiusNow(pc, elapsed),
    });
    setAttr(shape, shapeCache, 'points', geo.vertices.length > 2 ? geo.points : '');
    setAttr(shape, shapeCache, 'data-iv', lastState.tonic ? 'tonic' : 'none');
    for (let i = 0; i < edges.length; i++) {
      const e = edges[i];
      const edge = geo.edges[i];
      if (!edge) { setAttr(e.node, e.cache, 'visibility', 'hidden'); continue; }
      setAttr(e.node, e.cache, 'visibility', 'visible');
      setAttr(e.node, e.cache, 'x1', round(edge.from.x));
      setAttr(e.node, e.cache, 'y1', round(edge.from.y));
      setAttr(e.node, e.cache, 'x2', round(edge.to.x));
      setAttr(e.node, e.cache, 'y2', round(edge.to.y));
      setAttr(e.node, e.cache, 'data-iv', edge.category);
    }

    // Central readout: what you are looking at, and how symmetrical it is.
    const tonicName = lastState.tonic ? displayName(lastState.tonic) : '';
    setText(readPrimary, readCache.primary, tonicName);
    setText(readSecondary, readCache.secondary, ORDER_LABEL[shown.order]);
    const sym = geo.rotationalSymmetry;
    setText(readSymmetry, readCache.symmetry,
      sym > 1 ? `${geo.vertices.length} notes · ${sym}-fold` :
        geo.vertices.length ? `${geo.vertices.length} note${geo.vertices.length > 1 ? 's' : ''}` : '');
  }

  // ---- public surface -----------------------------------------------------

  function update(state = {}) {
    if (destroyed) return;
    // Normalise once, here. Everything downstream — the seat cache key, the
    // geometry, the callbacks — can then assume real Note objects, and a host
    // that hands us note strings still works.
    lastState = {
      notes: (state.notes ?? []).filter((n) => n !== null && n !== undefined).map((n) => asNote(n)),
      tonic: state.tonic ? asNote(state.tonic) : null,
      sounding: state.sounding ?? [],
      labelMode: state.labelMode ?? 'name',
      focus: state.focus ? asNote(state.focus) : null,
      opts: state.opts ?? {},
    };

    const opts = lastState.opts;
    if (opts.order !== undefined) desired.order = assertOrder(opts.order);
    if (opts.rotateTo !== undefined) desired.rotateTo = opts.rotateTo;

    const nextRotation = ringRotation(desired.rotateTo, { order: desired.order });
    const orderChanged = desired.order !== shown.order;
    const rotationChanged = nextRotation !== shown.rotation;

    if (orderChanged || rotationChanged) {
      const fromOrder = shown.order;
      const fromRotation = shown.rotation;
      shown.order = desired.order;
      shown.rotation = nextRotation;
      seatCache.key = '';
      startTween(fromOrder, fromRotation);
    }

    // Honour incoming focus by moving the tab stop, but never pull real DOM
    // focus away from wherever the user actually is on the page.
    if (lastState.focus) {
      const pc = pitchClass(asNote(lastState.focus));
      if (pc !== focusPc) setRovingFocus(pc);
    } else if (!focusTouched && lastState.tonic) {
      // Before anyone has used the ring, the sensible first stop is the tonic.
      const pc = pitchClass(asNote(lastState.tonic));
      focusPc = pc;
      for (const n of nodes) n.g.setAttribute('tabindex', n.pc === pc ? '0' : '-1');
    }

    if (!tween) paint();
  }

  function destroy() {
    destroyed = true;
    const view = doc.defaultView;
    if (raf && view?.cancelAnimationFrame) view.cancelAnimationFrame(raf);
    raf = 0;
    tween = null;
    for (const n of nodes) {
      n.g.removeEventListener('click', handleClick);
      n.g.removeEventListener('keydown', handleKey);
      n.g.removeEventListener('mouseenter', handleEnter);
      n.g.removeEventListener('mouseleave', handleLeave);
      n.g.removeEventListener('focus', handleNodeFocus);
    }
    root.remove?.();
  }

  if (container && typeof container.appendChild === 'function') container.appendChild(root);
  update({ notes: [], tonic: null });

  return {
    element: root,
    update,
    destroy,
    /** Convenience for hosts that drive the ordering imperatively. */
    setOrder(order) { update({ ...lastState, opts: { ...lastState.opts, order } }); },
    /** Park a note at twelve o'clock. Pass null to un-rotate. */
    setRotateTo(note) { update({ ...lastState, opts: { ...lastState.opts, rotateTo: note } }); },
  };
}

export default createPitchRingView;
