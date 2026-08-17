/**
 * STAFF NOTATION — the representation everything else eventually has to
 * survive contact with.
 *
 * The whole file is built on one number: a note's DIATONIC STEP. Staff
 * notation is letter-arithmetic made visible — a line or a space is a letter,
 * and the accidental is a separate mark that never moves the notehead. So
 * C♭4, C4 and C♯4 sit on exactly the same line, and the only thing that
 * changes is the glyph in front. Every geometry function below is therefore
 * deliberately blind to `alter`; only `accidentalFor()` looks at it.
 *
 * Vertical convention
 *   position = diatonicStep(note) - diatonicStep(clef reference note)
 *   +1 per diatonic step upward, so staff lines land on even positions.
 *   treble  reference G4  → lines at -2  0  2  4  6   (E4 G4 B4 D5 F5)
 *   bass    reference F3  → lines at -6 -4 -2  0  2   (G2 B2 D3 F3 A3)
 *   Middle C is -4 on treble (one ledger below) and +4 on bass (one above).
 *
 * Everything above the "DOM" banner is pure and unit-tested headlessly.
 */

import {
  asNote, noteName, midi, diatonicStep, accidentalSymbol, parseNote, sortNotes,
} from '../theory/pitch.js';
import { intervalBetween, intervalName, intervalSymbol, semitonesBetween } from '../theory/interval.js';
import { degreeOf } from '../theory/scale.js';
import { intervalCategory } from '../ui/color.js';

// ---------------------------------------------------------------------------
// GEOMETRY CONSTANTS — one unit = one SVG user unit; the viewBox does the rest.
// ---------------------------------------------------------------------------

/** Half the gap between staff lines: the height of one diatonic step. */
export const STEP = 6;
/** Distance between adjacent staff lines. */
export const LINE_GAP = STEP * 2;
/** Height of the five-line staff itself. */
export const STAFF_H = LINE_GAP * 4;

const MARGIN_X = 10;
const CLEF_W = 40;          // fixed advance for the clef, glyph or fallback path
const SIG_W = 11;           // horizontal advance per key-signature accidental
const SIG_GAP = 14;         // breathing room after the signature
const NOTE_DX = 30;         // horizontal advance per note in sequence layout
const COL_DX = 15;          // horizontal displacement for a seconds-cluster
const ACC_DX = 13;          // accidental sits this far left of its notehead
const ACC_W = 11;           // width of one staggered accidental column
const ACC_MIN_GAP = 5;      // two accidentals share a column only this far apart
const HEAD_RX = 7.4;
const HEAD_RY = 5.4;
const HEAD_TILT = -20;      // degrees; a notehead is an ellipse on a slant
const LEDGER_HALF = 11;
const PAD_TOP = 11 * STEP;  // room above/below for ledger lines and labels
const PAD_BOTTOM = 11 * STEP;
const GRAND_GAP = 9 * STEP; // treble bottom line → bass top line
const MIN_WIDTH = 230;
const LABEL_MIN_W = 24;     // a label narrower than this cannot be read
const LABEL_MIN_H = 11;     // vertical room one label needs
const LABEL_DY = 9 * STEP;  // labels sit under the staff in sequence layout
const MAX_LEDGERS = 6;

/** Widest layout that still reads at 360 CSS px (keeps LINE_GAP over ~6px). */
export const MAX_LEGIBLE_WIDTH = 720;

/**
 * How far the staff may be magnified above its natural size. A 12-unit line
 * gap times this lands around 22 CSS px, which is a comfortable reading size;
 * beyond it the noteheads start to look like balloons.
 */
export const MAX_SCALE = 1.85;

// ---------------------------------------------------------------------------
// CLEFS
// ---------------------------------------------------------------------------

/**
 * A clef is defined by the note its reference line names and which of the five
 * lines that is (0 = bottom). Everything else is derived.
 */
export const CLEFS = Object.freeze({
  treble: Object.freeze({
    id: 'treble',
    name: 'Treble clef',
    reference: parseNote('G4'),
    referenceLine: 1,
    glyph: '\u{1D11E}',
    spoken: 'treble staff',
  }),
  bass: Object.freeze({
    id: 'bass',
    name: 'Bass clef',
    reference: parseNote('F3'),
    referenceLine: 3,
    glyph: '\u{1D122}',
    spoken: 'bass staff',
  }),
});

export const CLEF_IDS = ['treble', 'bass'];

export function getClef(clef) {
  const c = CLEFS[clef];
  if (!c) {
    throw new Error(`Unknown clef: ${clef}. Use 'treble' or 'bass' (or 'grand' where a note picks its own staff).`);
  }
  return c;
}

/** The five line positions, bottom line first. Always even numbers. */
export function staffLinePositions(clef) {
  const c = getClef(clef);
  return [0, 1, 2, 3, 4].map((i) => (i - c.referenceLine) * 2);
}

/**
 * On a grand staff, which stave does this note belong to?
 * Middle C and above go up, everything else goes down — the same split a
 * pianist's hands make, and the reason middle C is the hinge of the system.
 */
export function staffForNote(n, clef = 'grand') {
  if (clef === 'treble' || clef === 'bass') return clef;
  // Anything else must be the grand staff; a typo must not quietly become one.
  if (clef !== 'grand') getClef(clef);
  return midi(asNote(n)) >= 60 ? 'treble' : 'bass';
}

/**
 * Where this note sits, counted in diatonic steps from the clef's reference
 * line. Blind to accidentals by construction: C♭4, C4 and C♯4 all return the
 * same number, because `diatonicStep` only knows about letters and octaves.
 *
 * @param {object|string} n
 * @param {'treble'|'bass'|'grand'} clef  'grand' lets the note choose its stave
 * @returns {number}
 */
export function staffPosition(n, clef = 'treble') {
  const x = asNote(n);
  const c = getClef(staffForNote(x, clef));
  return diatonicStep(x) - diatonicStep(c.reference);
}

/**
 * The ledger lines a notehead at `position` needs, as positions.
 * Ledgers only ever land on even positions (they continue the line grid), so a
 * note in the space above the staff shares its neighbour's single ledger.
 *
 * @param {number} position
 * @param {'treble'|'bass'} clef  must be a single stave
 * @returns {number[]} inner to outer, [] when the note sits on the staff
 */
export function ledgerLinesFor(position, clef) {
  if (clef === 'grand') {
    throw new Error("ledgerLinesFor needs one stave: pass 'treble' or 'bass'.");
  }
  const lines = staffLinePositions(clef);
  const bottom = lines[0];
  const top = lines[lines.length - 1];
  const out = [];
  if (position > top) {
    const highest = position - (Math.abs(position % 2) === 1 ? 1 : 0);
    for (let p = top + 2; p <= highest; p += 2) out.push(p);
  } else if (position < bottom) {
    const lowest = position + (Math.abs(position % 2) === 1 ? 1 : 0);
    for (let p = bottom - 2; p >= lowest; p -= 2) out.push(p);
  }
  return out;
}

/** SVG y for a position, given the y of the clef's reference line. */
export function yForPosition(position, originY) {
  return originY - position * STEP;
}

// ---------------------------------------------------------------------------
// ACCIDENTALS
// ---------------------------------------------------------------------------

export const NATURAL = '♮';

/** The glyph for an alteration, using the engine's own symbol table. */
export function accidentalGlyph(alter) {
  return alter === 0 ? NATURAL : accidentalSymbol(alter, { unicode: true });
}

const ACCIDENTAL_WORDS = {
  '-3': 'triple flat', '-2': 'double flat', '-1': 'flat',
  0: 'natural', 1: 'sharp', 2: 'double sharp', 3: 'triple sharp',
};

/**
 * Normalise whatever a caller hands us as a key signature into
 * letter → alteration. Accepts:
 *   null / undefined              — open key, no signature
 *   the object from key.js        — { accidentals: Note[] }
 *   an array of Notes or strings  — ['F#','C#']
 */
export function signatureAlterations(keySignature) {
  const map = Object.create(null);
  if (!keySignature) return map;
  const list = Array.isArray(keySignature)
    ? keySignature
    : (keySignature.accidentals ?? []);
  for (const item of list) {
    const n = asNote(item);
    map[n.letter] = n.alter;
  }
  return map;
}

/**
 * Which accidental glyph belongs in front of this note, or null when nothing
 * needs to be drawn.
 *
 * The rule is the one a copyist uses: compare the note against what the key
 * signature already says about that LETTER. A signature of one sharp makes
 * every F sharp, so F♯ needs no mark — and F natural then needs a ♮ to cancel
 * it. Courtesy accidentals inside a bar are a separate question and are not
 * decided here; this function is memoryless.
 *
 * @param {object|string} n
 * @param {object|Array|null} keySignature
 * @returns {string|null}
 */
export function accidentalFor(n, keySignature = null) {
  const x = asNote(n);
  const sig = signatureAlterations(keySignature);
  const covered = sig[x.letter] ?? 0;
  if (x.alter === covered) return null;
  return accidentalGlyph(x.alter);
}

// ---------------------------------------------------------------------------
// KEY SIGNATURE PLACEMENT
//
// The order of sharps and flats is musical (it comes from the circle of
// fifths, and key.js derives it), but WHERE on the staff each one is drawn is
// a copyist's convention chosen so no signature accidental ever needs a ledger
// line. We store the treble placement only and drop the bass one whole line
// lower — that single rule reproduces the standard bass layout.
// ---------------------------------------------------------------------------

const TREBLE_SHARP_PLACEMENT = ['F5', 'C5', 'G5', 'D5', 'A4', 'E5', 'B4'];
const TREBLE_FLAT_PLACEMENT = ['B4', 'E5', 'A4', 'D5', 'G4', 'C5', 'F4'];

/** Bass sits one staff line (two diatonic steps) below the treble placement… */
const BASS_DROP = -6; // …which is -6 once both are measured from their own reference.

function placementPositions(kind, clef) {
  const names = kind === 'flat' ? TREBLE_FLAT_PLACEMENT : TREBLE_SHARP_PLACEMENT;
  const base = names.map((name) => staffPosition(parseNote(name), 'treble'));
  return clef === 'bass' ? base.map((p) => p + BASS_DROP) : base;
}

/**
 * Lay out a key signature: which glyph goes where, in copyist order.
 * @returns {{letter:string, alter:number, glyph:string, position:number, index:number}[]}
 */
export function keySignatureLayout(keySignature, clef) {
  if (clef === 'grand') {
    throw new Error("keySignatureLayout needs one stave: pass 'treble' or 'bass'.");
  }
  getClef(clef);
  if (!keySignature) return [];
  const list = Array.isArray(keySignature)
    ? keySignature.map((x) => asNote(x))
    : (keySignature.accidentals ?? []).map((x) => asNote(x));
  if (list.length === 0) return [];

  // Each accidental picks its own table from its own sign. Sharps and flats
  // agree on where five of the seven letters go, but not on F and G — so a
  // mixed signature (G harmonic minor writes B♭ E♭ F♯) would otherwise draw
  // the sharp in the flat's slot, a whole octave out.
  return list.slice(0, 7).map((n, i) => {
    const kind = n.alter < 0 ? 'flat' : 'sharp';
    const names = kind === 'flat' ? TREBLE_FLAT_PLACEMENT : TREBLE_SHARP_PLACEMENT;
    const slot = names.findIndex((name) => name[0] === n.letter);
    const positions = placementPositions(kind, clef);
    return {
      letter: n.letter,
      alter: n.alter,
      glyph: accidentalGlyph(n.alter),
      position: positions[slot < 0 ? i : slot],
      index: i,
    };
  });
}

// ---------------------------------------------------------------------------
// COLLISION MATHS
// ---------------------------------------------------------------------------

/**
 * Assign horizontal columns to a stack of noteheads so none of them overlap.
 * Two heads collide when they are a second apart or closer, which is exactly
 * why engravers push one of them to the other side of the stem.
 *
 * @param {number[]} positions ascending
 * @returns {number[]} column index per note, 0 = home column
 */
export function chordColumns(positions) {
  const cols = [];
  for (let i = 0; i < positions.length; i++) {
    let col = 0;
    // Walk outward until this head clears everything already in that column.
    while (positions.some((p, j) => j < i && cols[j] === col && Math.abs(p - positions[i]) <= 1)) {
      col++;
    }
    cols.push(col);
  }
  return cols;
}

/**
 * Accidentals in a chord stagger leftwards for the same reason noteheads do,
 * but they need much more vertical clearance because the glyphs are tall.
 * Slot 0 is nearest the noteheads.
 *
 * @param {number[]} positions ascending, only the notes that carry an accidental
 * @returns {number[]} slot index per accidental
 */
export function accidentalSlots(positions) {
  const slots = [];
  for (let i = 0; i < positions.length; i++) {
    let slot = 0;
    while (positions.some((p, j) => j < i && slots[j] === slot && Math.abs(p - positions[i]) < ACC_MIN_GAP)) {
      slot++;
    }
    slots.push(slot);
  }
  return slots;
}

// ---------------------------------------------------------------------------
// LABELS
// ---------------------------------------------------------------------------

function spokenAccidental(alter) {
  return alter === 0 ? '' : ` ${ACCIDENTAL_WORDS[String(alter)] ?? `alter ${alter}`}`;
}

/** A name a screen reader can actually say: "C sharp 4". */
export function spokenNote(n) {
  const x = asNote(n);
  return `${x.letter}${spokenAccidental(x.alter)} ${x.octave}`;
}

/**
 * What a screen reader announces for one notehead. Direction matters: a note
 * below the tonic is an octave BELOW it, and saying only "octave" would leave
 * a blind learner unable to tell the two apart.
 */
export function noteAriaLabel(n, tonic, clef) {
  const x = asNote(n);
  const parts = [spokenNote(x)];
  if (tonic) {
    try {
      const iv = intervalBetween(tonic, x);
      if (iv.number === 1 && iv.quality === 'P') {
        parts.push('the tonic');
      } else {
        parts.push(`${intervalName(iv)} ${iv.direction === -1 ? 'below' : 'above'} ${spokenNote(tonic)}`);
      }
    } catch {
      // An unnameable gap between two exotic spellings. The name alone is
      // still true, which beats announcing something invented.
    }
  }
  if (clef) parts.push(CLEFS[clef].spoken);
  return parts.join(', ');
}

/**
 * The short text under a notehead. Every mode is answered by the theory
 * engine, never by arithmetic here.
 * @param {'none'|'name'|'degree'|'interval'|'semitones'} mode
 */
export function noteLabel(n, tonic, mode, scaleId = 'major') {
  if (!mode || mode === 'none') return '';
  const x = asNote(n);
  if (mode === 'name') return noteName(x, { unicode: true });
  if (!tonic) return '';
  try {
    if (mode === 'interval') return intervalSymbol(intervalBetween(tonic, x));
    if (mode === 'semitones') return String(semitonesBetween(tonic, x));
    if (mode === 'degree') {
      const d = degreeOf(tonic, scaleId, x);
      return d === null ? '' : String(d);
    }
  } catch {
    // Exotic spellings can be unnameable. A blank label beats a broken view.
    return '';
  }
  return '';
}

/**
 * Decide which labels survive. Labels are dropped, never overlapped.
 * @param {{x:number, y:number, text:string}[]} entries in draw order
 * @param {'sequence'|'chord'} layout
 */
export function labelVisibility(entries, layout) {
  if (layout === 'sequence') {
    const fits = NOTE_DX >= LABEL_MIN_W;
    return entries.map((e) => fits && !!e.text);
  }
  let lastY = null;
  return entries.map((e) => {
    if (!e.text) return false;
    if (lastY !== null && Math.abs(e.y - lastY) < LABEL_MIN_H) return false;
    lastY = e.y;
    return true;
  });
}

// ---------------------------------------------------------------------------
// THE LAYOUT — one pure function that decides every coordinate in the view.
// ---------------------------------------------------------------------------

const EMPTY_STATE = { notes: [], tonic: null, sounding: [], labelMode: 'none', focus: null, opts: {} };

/**
 * @param {object} state   ViewState (see CONTRACT.md); missing fields default
 * @param {object} options { clef, capacity, keySignature, layout, scaleId }
 * @returns {object} every number the renderer needs, and nothing else
 */
export function layoutStaff(state = {}, options = {}) {
  const s = { ...EMPTY_STATE, ...state };
  const opts = s.opts ?? {};
  const clef = opts.clef ?? options.clef ?? 'treble';
  if (clef !== 'grand') getClef(clef);
  const layout = opts.layout ?? options.layout ?? 'sequence';
  const capacity = options.capacity ?? 12;
  const keySignature = opts.keySignature !== undefined ? opts.keySignature : (options.keySignature ?? null);
  const scaleId = opts.scaleId ?? options.scaleId ?? 'major';
  const tonic = s.tonic ? asNote(s.tonic) : null;
  const sounding = new Set(s.sounding ?? []);

  // ---- staves -------------------------------------------------------------
  const showTreble = clef === 'treble' || clef === 'grand';
  const showBass = clef === 'bass' || clef === 'grand';
  const trebleOriginY = PAD_TOP + (4 - CLEFS.treble.referenceLine) * LINE_GAP;
  const bassTop = clef === 'grand'
    ? PAD_TOP + STAFF_H + GRAND_GAP
    : PAD_TOP;
  const bassOriginY = bassTop + (4 - CLEFS.bass.referenceLine) * LINE_GAP;

  const staves = CLEF_IDS.map((id) => {
    const visible = id === 'treble' ? showTreble : showBass;
    const originY = id === 'treble' ? trebleOriginY : bassOriginY;
    const sig = keySignatureLayout(keySignature, id).map((a) => ({
      ...a,
      x: MARGIN_X + CLEF_W + a.index * SIG_W + SIG_W / 2,
      y: yForPosition(a.position, originY),
    }));
    return {
      clef: id,
      visible,
      originY,
      clefX: MARGIN_X + 4,
      lineYs: staffLinePositions(id).map((p) => yForPosition(p, originY)),
      lines: staffLinePositions(id),
      sig,
    };
  });

  const sigCount = keySignatureLayout(keySignature, 'treble').length;
  const sigWidth = sigCount === 0 ? 0 : sigCount * SIG_W + SIG_GAP;

  // ---- notes --------------------------------------------------------------
  const incoming = sortNotes(s.notes ?? []);
  const dropped = Math.max(0, incoming.length - capacity);
  const kept = incoming.slice(0, capacity);

  const placed = kept.map((n) => {
    const stave = staffForNote(n, clef);
    return {
      note: n,
      clef: stave,
      position: staffPosition(n, stave),
      accidental: accidentalFor(n, keySignature),
    };
  });

  // Columns and accidental slots are decided per stave, per x-slot.
  const groupKey = (entry, i) => (layout === 'chord' ? entry.clef : `${entry.clef}:${i}`);
  const groups = new Map();
  placed.forEach((entry, i) => {
    const k = groupKey(entry, i);
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(i);
  });

  const columns = new Array(placed.length).fill(0);
  const accSlots = new Array(placed.length).fill(0);
  let maxAccSlot = 0;
  for (const idxs of groups.values()) {
    const cols = chordColumns(idxs.map((i) => placed[i].position));
    idxs.forEach((i, k) => { columns[i] = cols[k]; });
    const withAcc = idxs.filter((i) => placed[i].accidental);
    const slots = accidentalSlots(withAcc.map((i) => placed[i].position));
    withAcc.forEach((i, k) => {
      accSlots[i] = slots[k];
      if (slots[k] > maxAccSlot) maxAccSlot = slots[k];
    });
  }

  const notesX0 = MARGIN_X + CLEF_W + sigWidth + maxAccSlot * ACC_W + ACC_DX + HEAD_RX;

  const notes = placed.map((entry, i) => {
    const stave = staves.find((st) => st.clef === entry.clef);
    const x = layout === 'chord'
      ? notesX0 + columns[i] * COL_DX
      : notesX0 + i * NOTE_DX + columns[i] * COL_DX;
    const y = yForPosition(entry.position, stave.originY);
    const m = midi(entry.note);
    return {
      index: i,
      note: entry.note,
      midi: m,
      clef: entry.clef,
      position: entry.position,
      column: columns[i],
      x,
      y,
      accidental: entry.accidental,
      accidentalX: x - ACC_DX - accSlots[i] * ACC_W,
      accidentalSlot: accSlots[i],
      ledgers: ledgerLinesFor(entry.position, entry.clef)
        .slice(0, MAX_LEDGERS)
        .map((p) => ({ position: p, y: yForPosition(p, stave.originY) })),
      category: intervalCategory(entry.note, tonic),
      ringing: sounding.has(m),
      label: noteLabel(entry.note, tonic, s.labelMode, scaleId),
      labelY: layout === 'chord' ? y : stave.originY + LABEL_DY,
      labelX: layout === 'chord' ? x + HEAD_RX + 6 : x,
      labelAnchor: layout === 'chord' ? 'start' : 'middle',
    };
  });

  const visible = labelVisibility(
    notes.map((n) => ({ x: n.x, y: n.labelY, text: n.label })),
    layout,
  );
  notes.forEach((n, i) => { n.labelVisible = visible[i]; });

  // ---- box ----------------------------------------------------------------
  const rightEdges = notes.map(
    (n) => n.x + HEAD_RX + (n.labelVisible && n.labelAnchor === 'start' ? 34 : 0),
  );
  const lastX = rightEdges.length ? Math.max(...rightEdges) : notesX0;
  const width = Math.max(MIN_WIDTH, Math.round(lastX + MARGIN_X + NOTE_DX / 2));
  const bottomLineY = showBass ? bassOriginY + CLEFS.bass.referenceLine * LINE_GAP
    : trebleOriginY + CLEFS.treble.referenceLine * LINE_GAP;
  const height = Math.round(bottomLineY + PAD_BOTTOM);

  return {
    clef, layout, capacity, width, height, dropped,
    staves, notes,
    sigCount,
    notesX0,
    tonic,
  };
}

// ---------------------------------------------------------------------------
// CLEF FALLBACK SHAPES
//
// We cannot ship a webfont, so the Unicode glyphs are drawn first and these
// paths stand in when the platform has no musical font. They are generated,
// not traced: the G clef's curl is a real logarithmic spiral and the F clef's
// bow is a pair of cubics, which is why they look like drafting instruments
// rather than like a typeface.
//
// All coordinates are in DIATONIC STEPS, origin at the clef's reference line.
// ---------------------------------------------------------------------------

/** Points along a logarithmic spiral, optionally squashed into an oval. */
export function spiralPoints({ theta0, theta1, r0, r1, sx = 1, sy = 1, samples = 40 }) {
  const k = Math.log(r1 / r0) / (theta1 - theta0);
  const pts = [];
  for (let i = 0; i <= samples; i++) {
    const t = i / samples;
    const th = theta0 + (theta1 - theta0) * t;
    const r = r0 * Math.exp(k * (th - theta0));
    pts.push([sx * r * Math.cos(th), sy * r * Math.sin(th)]);
  }
  return pts;
}

/** Catmull-Rom through the points, emitted as cubic segments. */
export function smoothSegments(points) {
  const segs = [{ type: 'M', pts: [points[0]] }];
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] ?? p2;
    segs.push({
      type: 'C',
      pts: [
        [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6],
        [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6],
        p2,
      ],
    });
  }
  return segs;
}

/**
 * The fallback clef, as data rather than a string so the shape can be
 * measured in a test.
 * @returns {{strokes: object[][], dots: {cx:number,cy:number,r:number}[], width:number}}
 */
export function clefOutline(clef) {
  if (clef === 'treble') {
    // The loop and inward curl: 1.6 turns of spiral, squashed narrow.
    const curl = smoothSegments(spiralPoints({
      theta0: -1.62, theta1: -1.62 + Math.PI * 3.05,
      r0: 6.1, r1: 0.42, sx: 0.46, sy: 1,
    }));
    // The spine: top hook, down through the loop, out to the tail below the
    // staff. It meets the spiral's outer end at (-0.12, -6.05) so the two
    // subpaths read as one continuous stroke.
    const spine = [
      { type: 'M', pts: [[-1.45, -6.95]] },
      { type: 'C', pts: [[-1.8, -7.9], [-0.7, -8.5], [-0.05, -7.7]] },
      { type: 'C', pts: [[0.15, -7.2], [-0.05, -6.7], [-0.12, -6.05]] },
      { type: 'C', pts: [[-0.2, -4.2], [0.05, -2.0], [0.3, 0.6]] },
      { type: 'C', pts: [[0.5, 2.8], [0.72, 4.4], [0.3, 5.6]] },
      { type: 'C', pts: [[-0.1, 6.6], [-1.35, 6.7], [-1.7, 5.9]] },
      { type: 'C', pts: [[-1.95, 5.3], [-1.55, 4.85], [-1.1, 5.05]] },
    ];
    return { strokes: [curl, spine], dots: [], width: 4.4 };
  }
  if (clef === 'bass') {
    // A single bow springing off the F line, plus the two dots that name it.
    const bow = [
      { type: 'M', pts: [[-1.6, 0]] },
      { type: 'C', pts: [[-1.55, -1.75], [0.4, -2.2], [1.35, -1.05]] },
      { type: 'C', pts: [[2.4, 0.15], [2.05, 2.0], [0.9, 3.3]] },
      { type: 'C', pts: [[0.0, 4.3], [-1.2, 5.05], [-2.4, 5.5]] },
    ];
    return {
      strokes: [bow],
      dots: [
        // The heavy head sits on the F line; the two dots straddle it, which
        // is the only part of the glyph that actually names the clef.
        { cx: -1.6, cy: 0, r: 0.62 },
        { cx: 2.95, cy: -1, r: 0.34 },
        { cx: 2.95, cy: 1, r: 0.34 },
      ],
      width: 4.6,
    };
  }
  throw new Error(`No fallback shape for clef: ${clef}`);
}

/** Serialise segments to an SVG `d`, scaling steps into user units. */
export function pathData(segments, scale = STEP) {
  const f = (v) => (Math.round(v * scale * 100) / 100).toString();
  return segments.map((seg) => seg.type + seg.pts.map(([x, y]) => `${f(x)},${f(y)}`).join(' ')).join(' ');
}

/**
 * Decide whether the platform actually has the musical glyph.
 * A missing codepoint is drawn as the font's .notdef box, which measures the
 * same as any other missing codepoint — so we compare against one we know is
 * unassigned. Pure so the decision can be tested without a browser.
 */
export function chooseClefRendering({ glyphWidth, tofuWidth, emWidth } = {}) {
  if (!Number.isFinite(glyphWidth) || glyphWidth <= 0) return 'path';
  if (Number.isFinite(tofuWidth) && Math.abs(glyphWidth - tofuWidth) < 0.5) return 'path';
  if (Number.isFinite(emWidth) && emWidth > 0 && glyphWidth < emWidth * 0.2) return 'path';
  return 'glyph';
}

// ===========================================================================
// DOM — everything below builds and updates SVG. Nothing above depends on it.
// ===========================================================================

const SVG_NS = 'http://www.w3.org/2000/svg';

const STYLE = `
.mta-staff { width: 100%; height: auto; display: block; overflow: visible;
  font-family: var(--font-display, sans-serif); }
.mta-staff__line { stroke: var(--rule-bright, currentColor); stroke-width: 1; shape-rendering: crispEdges; }
.mta-staff__ledger { stroke: var(--rule-bright, currentColor); stroke-width: 1.4; shape-rendering: crispEdges; }
.mta-staff__brace { stroke: var(--rule-bright, currentColor); stroke-width: 1.6; fill: none; }
.mta-staff__clef-glyph { fill: var(--text-hi, currentColor); }
.mta-staff__clef-path { fill: none; stroke: var(--text-hi, currentColor);
  stroke-width: 2.1; stroke-linecap: round; stroke-linejoin: round; }
.mta-staff__clef-dot { fill: var(--text-hi, currentColor); }
.mta-staff__sig { fill: var(--text, currentColor); font-size: 17px; }
.mta-staff__acc { fill: var(--hue, var(--text, currentColor)); font-size: 17px; }
.mta-staff__head { fill: var(--hue, currentColor); stroke: none; }
.mta-staff__halo { fill: var(--hue, currentColor); opacity: 0; transition: opacity var(--t-mid, 220ms) var(--ease, ease); }
.mta-staff__note.is-ringing .mta-staff__halo { opacity: 0.35; }
.mta-staff__label { fill: var(--text-dim, currentColor); font-family: var(--font-data, monospace);
  font-size: 11px; letter-spacing: 0.04em; }
.mta-staff__hit { fill: transparent; }
.mta-staff__note { cursor: pointer; }
.mta-staff__note:focus { outline: none; }
.mta-staff__focus-ring { fill: none; stroke: var(--text-hi, currentColor); stroke-width: 1.4; opacity: 0; }
.mta-staff__note:focus-visible .mta-staff__focus-ring,
.mta-staff__note.is-focus .mta-staff__focus-ring { opacity: 1; }
.mta-staff__note[aria-hidden="true"] { display: none; }
/* The UA rule behind [hidden] is namespaced to HTML, so it does nothing to an
   SVG element. Everything in here that hides itself needs this to be true. */
.mta-staff [hidden] { display: none; }
@media (prefers-reduced-motion: reduce) {
  .mta-staff__halo { transition: none; }
}
`;

function el(tag, attrs = {}) {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v !== null && v !== undefined) node.setAttribute(k, String(v));
  }
  return node;
}

/** Only touch the DOM when the value actually changed — update() runs at 60/s. */
function setAttr(node, name, value) {
  const v = value === null || value === undefined ? null : String(value);
  const cache = node.__mta ?? (node.__mta = Object.create(null));
  if (cache[name] === v) return;
  cache[name] = v;
  if (v === null) node.removeAttribute(name);
  else node.setAttribute(name, v);
}

function setText(node, value) {
  const v = String(value ?? '');
  if (node.__mtaText === v) return;
  node.__mtaText = v;
  node.textContent = v;
}

function setClass(node, name, on) {
  const cache = node.__mtaClass ?? (node.__mtaClass = Object.create(null));
  if (cache[name] === on) return;
  cache[name] = on;
  const base = node.getAttribute('class') || '';
  const parts = base.split(/\s+/).filter((c) => c && c !== name);
  if (on) parts.push(name);
  node.setAttribute('class', parts.join(' '));
}

/**
 * Build the staff view.
 *
 * @param {Element} container
 * @param {object} options
 * @param {'treble'|'bass'|'grand'} [options.clef]
 * @param {number}  [options.capacity]   note slots built up front (default 12)
 * @param {object|Array|null} [options.keySignature]
 * @param {'sequence'|'chord'} [options.layout]
 * @param {string}  [options.scaleId]    for labelMode 'degree'
 * @param {(note:object)=>void} [options.onSelect]
 * @param {(note:object|null)=>void} [options.onHover]
 * @param {string}  [options.ariaLabel]
 * @returns {{element: SVGElement, update: (state:object)=>void, destroy: ()=>void}}
 */
export function createStaffView(container, options = {}) {
  const capacity = options.capacity ?? 12;
  const controller = typeof AbortController === 'function' ? new AbortController() : null;
  const listenOpts = controller ? { signal: controller.signal } : undefined;

  const root = el('svg', {
    class: 'mta-staff',
    xmlns: SVG_NS,
    role: 'group',
    'aria-label': options.ariaLabel ?? 'Staff notation',
    preserveAspectRatio: 'xMinYMid meet',
    focusable: 'false',
  });

  const style = document.createElementNS(SVG_NS, 'style');
  style.textContent = STYLE;
  root.appendChild(style);

  const brace = el('path', { class: 'mta-staff__brace', d: '', hidden: 'hidden' });
  root.appendChild(brace);

  // ---- staves (both are built; the clef option only decides visibility) ----
  const staveNodes = {};
  for (const id of CLEF_IDS) {
    const g = el('g', { class: 'mta-staff__stave', 'data-clef': id });
    const lines = [];
    for (let i = 0; i < 5; i++) {
      const line = el('line', { class: 'mta-staff__line', x1: 0, x2: 0, y1: 0, y2: 0 });
      g.appendChild(line);
      lines.push(line);
    }
    const glyph = el('text', {
      class: 'mta-staff__clef-glyph',
      'font-size': STAFF_H,
      x: 0, y: 0,
      'aria-hidden': 'true',
    });
    glyph.textContent = CLEFS[id].glyph;
    g.appendChild(glyph);

    const fallback = el('g', { class: 'mta-staff__clef-fallback', 'aria-hidden': 'true' });
    const shape = clefOutline(id);
    const paths = shape.strokes.map((segs) => {
      const p = el('path', { class: 'mta-staff__clef-path', d: pathData(segs) });
      fallback.appendChild(p);
      return p;
    });
    for (const d of shape.dots) {
      fallback.appendChild(el('circle', {
        class: 'mta-staff__clef-dot',
        cx: d.cx * STEP, cy: d.cy * STEP, r: d.r * STEP,
      }));
    }
    g.appendChild(fallback);

    const sig = [];
    for (let i = 0; i < 7; i++) {
      const t = el('text', {
        class: 'mta-staff__sig',
        'text-anchor': 'middle',
        'dominant-baseline': 'central',
        'aria-hidden': 'true',
        x: 0, y: 0,
      });
      g.appendChild(t);
      sig.push(t);
    }
    root.appendChild(g);
    staveNodes[id] = { g, lines, glyph, fallback, paths, sig };
  }

  // ---- note slots ---------------------------------------------------------
  const noteNodes = [];
  for (let i = 0; i < capacity; i++) {
    const g = el('g', {
      class: 'mta-staff__note',
      role: 'button',
      tabindex: '-1',
      'aria-hidden': 'true',
      'data-iv': 'none',
      'data-slot': String(i),
    });
    const ledgers = [];
    for (let k = 0; k < MAX_LEDGERS; k++) {
      const line = el('line', { class: 'mta-staff__ledger', x1: 0, x2: 0, y1: 0, y2: 0, hidden: 'hidden' });
      g.appendChild(line);
      ledgers.push(line);
    }
    const halo = el('ellipse', { class: 'mta-staff__halo', rx: HEAD_RX * 2.1, ry: HEAD_RY * 2.1, cx: 0, cy: 0 });
    const head = el('ellipse', {
      class: 'mta-staff__head', rx: HEAD_RX, ry: HEAD_RY, cx: 0, cy: 0,
    });
    const acc = el('text', {
      class: 'mta-staff__acc',
      'text-anchor': 'middle',
      'dominant-baseline': 'central',
      x: 0, y: 0,
    });
    const label = el('text', {
      class: 'mta-staff__label',
      'text-anchor': 'middle',
      'dominant-baseline': 'hanging',
      x: 0, y: 0,
    });
    const ring = el('rect', {
      class: 'mta-staff__focus-ring',
      x: 0, y: 0, width: 30, height: 22, rx: 3,
    });
    const hit = el('rect', { class: 'mta-staff__hit', x: 0, y: 0, width: 30, height: 26 });
    g.append(halo, head, acc, label, ring, hit);
    root.appendChild(g);
    noteNodes.push({ g, ledgers, halo, head, acc, label, ring, hit, note: null });
  }

  container.appendChild(root);

  // ---- glyph availability -------------------------------------------------
  let mode = 'path';
  try {
    const probe = el('text', { 'font-size': STAFF_H, x: -9999, y: -9999, 'aria-hidden': 'true' });
    root.appendChild(probe);
    const measure = (s) => {
      probe.textContent = s;
      return typeof probe.getComputedTextLength === 'function' ? probe.getComputedTextLength() : NaN;
    };
    mode = chooseClefRendering({
      glyphWidth: measure(CLEFS.treble.glyph),
      tofuWidth: measure('\u{10FFFF}'),
      emWidth: measure('M'),
    });
    probe.remove();
  } catch {
    mode = 'path';
  }
  for (const id of CLEF_IDS) {
    setAttr(staveNodes[id].glyph, 'hidden', mode === 'glyph' ? null : 'hidden');
    setAttr(staveNodes[id].fallback, 'hidden', mode === 'path' ? null : 'hidden');
  }

  // ---- interaction --------------------------------------------------------
  let live = [];        // slot indices currently showing a note, in draw order
  let focusSlot = -1;

  const emitSelect = (slot) => {
    const n = noteNodes[slot]?.note;
    if (n && options.onSelect) options.onSelect(n);
  };

  const setRoving = (slot) => {
    focusSlot = slot;
    for (const i of live) {
      setAttr(noteNodes[i].g, 'tabindex', i === slot ? '0' : '-1');
    }
  };

  const moveFocus = (from, delta) => {
    if (live.length === 0) return;
    const at = live.indexOf(from);
    const next = live[Math.min(live.length - 1, Math.max(0, (at < 0 ? 0 : at) + delta))];
    setRoving(next);
    noteNodes[next].g.focus?.();
  };

  noteNodes.forEach((slot, i) => {
    slot.g.addEventListener('click', () => emitSelect(i), listenOpts);
    slot.g.addEventListener('mouseenter', () => options.onHover?.(slot.note), listenOpts);
    slot.g.addEventListener('mouseleave', () => options.onHover?.(null), listenOpts);
    slot.g.addEventListener('focus', () => setRoving(i), listenOpts);
    slot.g.addEventListener('keydown', (event) => {
      const k = event.key;
      if (k === 'Enter' || k === ' ' || k === 'Spacebar') {
        event.preventDefault();
        emitSelect(i);
      } else if (k === 'ArrowRight' || k === 'ArrowUp') {
        event.preventDefault();
        moveFocus(i, 1);
      } else if (k === 'ArrowLeft' || k === 'ArrowDown') {
        event.preventDefault();
        moveFocus(i, -1);
      } else if (k === 'Home') {
        event.preventDefault();
        moveFocus(live[0] ?? i, -live.length);
      } else if (k === 'End') {
        event.preventDefault();
        moveFocus(live[live.length - 1] ?? i, live.length);
      }
    }, listenOpts);
  });

  // ---- update -------------------------------------------------------------
  function update(state = {}) {
    const L = layoutStaff(state, { ...options, capacity });

    setAttr(root, 'viewBox', `0 0 ${L.width} ${L.height}`);
    // width:100% would otherwise blow a two-note example up to fill a 1100px
    // bay, magnifying a 12-unit line gap to nearly 60px. Notation has a
    // natural reading size: cap the scale, then let it shrink freely below it.
    const cap = `${Math.round(L.width * MAX_SCALE)}px`;
    if (root.style && root.style.maxWidth !== cap) root.style.maxWidth = cap;
    setAttr(root, 'aria-label', options.ariaLabel
      ?? `${L.clef === 'grand' ? 'Grand staff' : CLEFS[L.clef].name}, ${L.notes.length} note${L.notes.length === 1 ? '' : 's'}`);

    for (const stave of L.staves) {
      const nodes = staveNodes[stave.clef];
      setAttr(nodes.g, 'hidden', stave.visible ? null : 'hidden');
      if (!stave.visible) continue;
      stave.lineYs.forEach((y, i) => {
        setAttr(nodes.lines[i], 'x1', MARGIN_X);
        setAttr(nodes.lines[i], 'x2', L.width - MARGIN_X);
        setAttr(nodes.lines[i], 'y1', y);
        setAttr(nodes.lines[i], 'y2', y);
      });
      setAttr(nodes.glyph, 'x', stave.clefX);
      setAttr(nodes.glyph, 'y', stave.originY);
      setAttr(nodes.fallback, 'transform', `translate(${stave.clefX + 2 * STEP} ${stave.originY})`);
      nodes.sig.forEach((t, i) => {
        const a = stave.sig[i];
        setAttr(t, 'hidden', a ? null : 'hidden');
        if (!a) { setText(t, ''); return; }
        setAttr(t, 'x', a.x);
        setAttr(t, 'y', a.y);
        setText(t, a.glyph);
      });
    }

    if (L.clef === 'grand') {
      const top = L.staves[0].lineYs[4];
      const bottom = L.staves[1].lineYs[0];
      const x = MARGIN_X - 4;
      setAttr(brace, 'hidden', null);
      setAttr(brace, 'd',
        `M${x + 5},${top} C${x - 3},${top} ${x - 3},${(top + bottom) / 2} ${x},${(top + bottom) / 2} ` +
        `C${x - 3},${(top + bottom) / 2} ${x - 3},${bottom} ${x + 5},${bottom}`);
    } else {
      setAttr(brace, 'hidden', 'hidden');
    }

    live = L.notes.map((n) => n.index);

    noteNodes.forEach((slot, i) => {
      const n = L.notes[i];
      if (!n) {
        slot.note = null;
        setAttr(slot.g, 'aria-hidden', 'true');
        setAttr(slot.g, 'tabindex', '-1');
        setAttr(slot.g, 'data-iv', 'none');
        setClass(slot.g, 'is-ringing', false);
        setText(slot.acc, '');
        setText(slot.label, '');
        return;
      }
      slot.note = n.note;
      setAttr(slot.g, 'aria-hidden', null);
      setAttr(slot.g, 'data-iv', n.category);
      setClass(slot.g, 'is-ringing', n.ringing);

      setAttr(slot.g, 'aria-label', noteAriaLabel(n.note, L.tonic, n.clef));

      setAttr(slot.head, 'cx', n.x);
      setAttr(slot.head, 'cy', n.y);
      setAttr(slot.head, 'transform', `rotate(${HEAD_TILT} ${n.x} ${n.y})`);
      setAttr(slot.halo, 'cx', n.x);
      setAttr(slot.halo, 'cy', n.y);

      setAttr(slot.acc, 'hidden', n.accidental ? null : 'hidden');
      setText(slot.acc, n.accidental ?? '');
      setAttr(slot.acc, 'x', n.accidentalX);
      setAttr(slot.acc, 'y', n.y);

      setAttr(slot.label, 'hidden', n.labelVisible ? null : 'hidden');
      setText(slot.label, n.labelVisible ? n.label : '');
      setAttr(slot.label, 'x', n.labelX);
      setAttr(slot.label, 'y', n.labelY);
      setAttr(slot.label, 'text-anchor', n.labelAnchor);

      slot.ledgers.forEach((line, k) => {
        const led = n.ledgers[k];
        setAttr(line, 'hidden', led ? null : 'hidden');
        if (!led) return;
        setAttr(line, 'x1', n.x - LEDGER_HALF);
        setAttr(line, 'x2', n.x + LEDGER_HALF);
        setAttr(line, 'y1', led.y);
        setAttr(line, 'y2', led.y);
      });

      setAttr(slot.ring, 'x', n.x - 15);
      setAttr(slot.ring, 'y', n.y - 11);
      setAttr(slot.hit, 'x', n.x - 15);
      setAttr(slot.hit, 'y', n.y - 13);

      const focused = state.focus
        && state.focus.letter === n.note.letter
        && state.focus.alter === n.note.alter
        && state.focus.octave === n.note.octave;
      setClass(slot.g, 'is-focus', !!focused);
    });

    if (live.length === 0) focusSlot = -1;
    else if (!live.includes(focusSlot)) setRoving(live[0]);
    else setRoving(focusSlot);
  }

  update({});

  function destroy() {
    controller?.abort();
    root.remove();
  }

  return { element: root, update, destroy };
}

export default createStaffView;
