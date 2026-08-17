/**
 * FRETBOARD — the neck as a coordinate system.
 *
 * A fretboard is the only common instrument where the same pitch exists in
 * several physical places at once. That redundancy is the whole reason this
 * view is worth building: seeing one note light up in four places on the neck
 * teaches something a piano diagram structurally cannot.
 *
 * Three ideas keep this file honest:
 *
 *   1. NOTHING MUSICAL IS COMPUTED HERE. Every pitch on the neck is produced by
 *      transposing an open string by an interval from src/theory/. A fret is a
 *      semitone; the engine turns semitones into correctly spelled letters.
 *
 *   2. GEOMETRY IS REAL. Frets are placed at 1 - 2^(-n/12) of the scale length,
 *      the same equal-temperament rule that decides the pitches. The picture is
 *      a consequence of the tuning system rather than a drawing of one.
 *
 *   3. THE NECK IS NOT GUITAR-SHAPED. Everything below reads its string count,
 *      its pitches and its fret span from a Tuning record. A ukulele's
 *      reentrant 4th string is higher than its 3rd, and nothing here assumes
 *      strings ascend.
 *
 * The pure section (tunings, note lookup, position search, layout) has no DOM
 * in it and is unit-tested headlessly. The renderer is built on top of it.
 */

import {
  asNote, noteName, midi, pitchClass, respell, spellFromMidi,
  shiftOctave, withOctave,
} from '../theory/pitch.js';
import {
  transpose, commonIntervalForSemitones, intervalBetween, simplify,
  intervalSymbol, asInterval, semitones, baseSemitones,
} from '../theory/interval.js';
import { intervalCategory } from '../ui/color.js';

/* ==========================================================================
   1. TUNINGS — a registry, not a guitar constant.

   `strings` is stored in PHYSICAL order: index 0 is the highest-numbered
   string (the 6th on a guitar, the 4th on a ukulele) and the last index is
   string 1. It is deliberately NOT "sorted low to high" — a reentrant ukulele
   would have to be reordered to satisfy that, which would renumber its
   strings and make every position report wrong.
   ========================================================================== */

/** @type {Record<string, Tuning>} */
export const TUNINGS = {};

/**
 * @typedef {object} Tuning
 * @property {string} id
 * @property {string} name
 * @property {string} instrument
 * @property {import('../theory/pitch.js').Note[]} strings  physical order, index 0 = highest-numbered string
 * @property {number} stringCount
 * @property {number} maxFret          highest fret the instrument actually has
 * @property {{firstFret:number,lastFret:number}} defaultRange
 * @property {string} blurb            one plain sentence about the tuning
 */

/**
 * Build a tuning record without registering it.
 * @param {{id:string,name?:string,instrument?:string,strings:(string|object)[],maxFret?:number,defaultRange?:object,blurb?:string}} spec
 * @returns {Tuning}
 */
export function makeTuning(spec) {
  const {
    id, name = id, instrument = 'custom', strings,
    maxFret = 22, defaultRange, blurb = '',
  } = spec;
  if (!id) throw new Error('A tuning needs an id');
  if (!Array.isArray(strings) || strings.length === 0) {
    throw new Error(`Tuning "${id}" needs at least one string`);
  }
  const parsed = strings.map((s) => Object.freeze(asNote(s)));
  const range = defaultRange ?? { firstFret: 0, lastFret: Math.min(12, maxFret) };
  return Object.freeze({
    id,
    name,
    instrument,
    strings: Object.freeze(parsed),
    stringCount: parsed.length,
    maxFret,
    defaultRange: Object.freeze({ ...range }),
    blurb,
  });
}

/**
 * Register a tuning. Other instruments drop in here without the renderer
 * knowing anything about them.
 * @returns {Tuning}
 */
export function defineTuning(spec) {
  const tuning = makeTuning(spec);
  TUNINGS[tuning.id] = tuning;
  return tuning;
}

defineTuning({
  id: 'guitar-standard',
  name: 'Standard',
  instrument: 'guitar',
  strings: ['E2', 'A2', 'D3', 'G3', 'B3', 'E4'],
  maxFret: 22,
  blurb: 'Fourths all the way up except one major third, from the 3rd string to the 2nd.',
});

defineTuning({
  id: 'guitar-drop-d',
  name: 'Drop D',
  instrument: 'guitar',
  strings: ['D2', 'A2', 'D3', 'G3', 'B3', 'E4'],
  maxFret: 22,
  blurb: 'Standard tuning with the 6th string pulled down a whole step, so the lowest three strings make a fifth-heavy stack.',
});

defineTuning({
  id: 'guitar-dadgad',
  name: 'DADGAD',
  instrument: 'guitar',
  strings: ['D2', 'A2', 'D3', 'G3', 'A3', 'D4'],
  maxFret: 22,
  blurb: 'Open strings spell a Dsus4, so nothing is committed to major or minor until you fret something.',
});

defineTuning({
  id: 'guitar-open-g',
  name: 'Open G',
  instrument: 'guitar',
  strings: ['D2', 'G2', 'D3', 'G3', 'B3', 'D4'],
  maxFret: 22,
  blurb: 'The open strings are already a G major chord, which is why a bare finger across one fret gives you another one.',
});

defineTuning({
  id: 'bass-4',
  name: 'Bass, standard',
  instrument: 'bass',
  strings: ['E1', 'A1', 'D2', 'G2'],
  maxFret: 20,
  blurb: 'The bottom four strings of a guitar an octave down. Straight fourths.',
});

defineTuning({
  id: 'bass-5',
  name: 'Bass, 5-string',
  instrument: 'bass',
  strings: ['B0', 'E1', 'A1', 'D2', 'G2'],
  maxFret: 24,
  blurb: 'A low B added below the standard four, extending the range down a fourth.',
});

defineTuning({
  id: 'ukulele',
  name: 'Ukulele, reentrant',
  instrument: 'ukulele',
  strings: ['G4', 'C4', 'E4', 'A4'],
  maxFret: 15,
  defaultRange: { firstFret: 0, lastFret: 12 },
  blurb: 'The 4th string sits above the 3rd instead of below it, so the neck does not run low to high.',
});

defineTuning({
  id: 'mandolin',
  name: 'Mandolin',
  instrument: 'mandolin',
  strings: ['G3', 'D4', 'A4', 'E5'],
  maxFret: 20,
  blurb: 'Tuned in fifths, the same as a violin, which is why fingerings look nothing like a guitar.',
});

/** Accept an id, a Tuning, or a bare array of open strings. */
export function getTuning(source) {
  if (!source) throw new Error('No tuning given');
  if (typeof source === 'string') {
    const t = TUNINGS[source];
    if (!t) throw new Error(`Unknown tuning: ${source}`);
    return t;
  }
  if (Array.isArray(source)) {
    // A bare array of open strings is a one-off neck; it is built but not
    // registered, so passing one never pollutes the shared registry.
    const notes = source.map((s) => asNote(s));
    return makeTuning({
      id: `custom:${notes.map((n) => noteName(n, { unicode: false, octave: true })).join('-')}`,
      name: 'Custom',
      strings: notes,
    });
  }
  if (!source.strings) throw new Error('A tuning must have a strings array');
  return source;
}

/** Every registered tuning for an instrument, in registration order. */
export function tuningsFor(instrument) {
  return Object.values(TUNINGS).filter((t) => t.instrument === instrument);
}

/**
 * The number a player calls this string. String 1 is the last entry, because
 * players count from the highest-numbered (usually thickest) string.
 */
export function stringNumber(tuning, index) {
  const t = getTuning(tuning);
  return t.strings.length - index;
}

/**
 * Which accidental this neck should default to. A tuning spelled with flats
 * gets flats; everything else gets sharps. Keeping one preference per board
 * stops the same pitch being called B♭ on one string and A♯ on the next.
 */
export function preferredAccidental(tuning) {
  const t = getTuning(tuning);
  return t.strings.some((s) => s.alter < 0) ? 'flat' : 'sharp';
}

/* ==========================================================================
   2. WHAT IS UNDER YOUR FINGER
   ========================================================================== */

/** MIDI number at a fret. One fret is one semitone; that is the whole rule. */
export function midiAtFret(openStringNote, fret) {
  assertFret(fret);
  return midi(asNote(openStringNote)) + fret;
}

function assertFret(fret) {
  if (!Number.isInteger(fret) || fret < 0) {
    throw new Error(`Fret must be a non-negative integer: ${fret}`);
  }
}

/**
 * The note at a fret, spelled by the theory engine.
 *
 * By default the spelling is measured FROM THE OPEN STRING: fret 3 of a D
 * string is a minor third above D, so it is an F. That is what letter
 * arithmetic gives you and it is right for one string at a time — but two
 * strings can then disagree about one pitch (fret 1 of A is B♭ while fret 6 of
 * E is A♯, and both are honest). Pass `prefer` to force one spelling across a
 * whole board; `createFretboardView` does exactly that.
 *
 * @param {object|string} openStringNote
 * @param {number} fret
 * @param {{prefer?: 'auto'|'sharp'|'flat'}} opts
 */
export function noteAtFret(openStringNote, fret, { prefer = 'auto' } = {}) {
  const open = asNote(openStringNote);
  assertFret(fret);
  const target = midi(open) + fret;
  if (prefer === 'sharp' || prefer === 'flat') return spellFromMidi(target, { prefer });

  const octaves = Math.floor(fret / 12);
  const rest = fret - octaves * 12;
  try {
    const stepped = transpose(open, commonIntervalForSemitones(rest));
    const out = octaves === 0 ? stepped : shiftOctave(stepped, octaves);
    // Double accidentals are legal but nobody wants to read F𝄪 off a neck
    // diagram, so an exotic open string falls back to a plain spelling.
    if (Math.abs(out.alter) <= 1) return out;
  } catch {
    /* transpose refuses past a triple accidental; fall through */
  }
  return spellFromMidi(target, { prefer: open.alter < 0 ? 'flat' : 'sharp' });
}

/**
 * Every place a pitch occurs on the neck.
 *
 * Bounds are inclusive. By default the octave has to match too, because "where
 * else is this E2" and "where else is any E" are different questions; pass
 * `matchOctave: false` for the second one (that is what lights a scale up
 * across the whole board).
 *
 * @param {object|string} target
 * @param {Tuning|string|string[]} tuning
 * @param {{maxFret?:number, minFret?:number, matchOctave?:boolean}} opts
 * @returns {{string:number, stringNumber:number, fret:number, midi:number, note:object}[]}
 */
export function findPositions(target, tuning, { maxFret = 15, minFret = 0, matchOctave = true } = {}) {
  const t = getTuning(tuning);
  const wanted = asNote(target);
  const wantedMidi = midi(wanted);
  const wantedPc = pitchClass(wanted);
  assertFret(minFret);
  const out = [];

  for (let i = 0; i < t.strings.length; i++) {
    const open = t.strings[i];
    const openMidi = midi(open);
    for (let fret = minFret; fret <= maxFret; fret++) {
      const m = openMidi + fret;
      const hit = matchOctave ? m === wantedMidi : ((m % 12) + 12) % 12 === wantedPc;
      if (!hit) continue;
      out.push({
        string: i,
        stringNumber: stringNumber(t, i),
        fret,
        midi: m,
        note: noteAtFret(open, fret, { prefer: preferredAccidental(t) }),
      });
    }
  }
  return out;
}

/**
 * Spell a sounding pitch the way the caller already spells it.
 *
 * If the state says the collection contains an E♯, then the pitch two frets up
 * the D string is an E♯ and not an F. Falling back to a plain sharp/flat
 * spelling only when the pitch is not in the set is what keeps a fretboard
 * agreeing with the staff beside it.
 */
export function spellAt(midiNumber, notes = [], { prefer = 'sharp' } = {}) {
  const plain = spellFromMidi(midiNumber, { prefer });
  const pc = ((midiNumber % 12) + 12) % 12;
  for (const raw of notes) {
    const n = asNote(raw);
    if (pitchClass(n) !== pc) continue;
    if (n.letter === plain.letter && n.alter === plain.alter) return plain;
    const r = respell(plain, n.letter);
    if (r && r.alter === n.alter) return r;
  }
  return plain;
}

/* ==========================================================================
   3. LABELS

   The interval work is done by the engine; the only thing invented here is how
   to print it.
   ========================================================================== */

/**
 * How a scale-degree number is decorated.
 *
 * A degree is written against the major scale, so the accidental in front of it
 * is simply how far the interval sits from the plain (major or perfect) version
 * of that same number. The engine already knows both halves — `semitones()` for
 * the interval in hand, `baseSemitones()` for the plain one — so the glyph is
 * their difference rather than a lookup table.
 *
 * Deriving it matters because the interval's FAMILY decides the answer, and a
 * table keyed on quality alone cannot see the family: a diminished fifth is ♭5,
 * a perfect fifth lowered once, while a diminished seventh is ♭♭7, a major
 * seventh lowered twice. Calling the latter ♭7 would give a diminished seventh
 * chord the same degree labels as a half-diminished one, which is precisely the
 * confusion these labels exist to prevent.
 */
export function degreeAccidental(iv) {
  const x = asInterval(iv);
  const offset = semitones(x) - baseSemitones(x.number);
  if (offset === 0) return '';
  return (offset < 0 ? '♭' : '♯').repeat(Math.abs(offset));
}

/** Simple interval from tonic up to note, ignoring octave. */
export function intervalFromTonic(noteIn, tonic) {
  const t = withOctave(asNote(tonic), 4);
  let n = withOctave(asNote(noteIn), 4);
  if (midi(n) < midi(t)) n = shiftOctave(n, 1);
  return simplify(intervalBetween(t, n));
}

/**
 * The text that goes inside a dot.
 * Falls back to the note name whenever there is no tonic to measure from, so a
 * board with `tonic: null` still says something true.
 */
export function noteLabel(noteIn, { labelMode = 'name', tonic = null } = {}) {
  const n = asNote(noteIn);
  if (labelMode === 'none') return '';
  if (labelMode === 'name' || !tonic) return noteName(n);
  if (labelMode === 'semitones') {
    return String((((midi(n) - midi(asNote(tonic))) % 12) + 12) % 12);
  }
  try {
    const iv = intervalFromTonic(n, tonic);
    if (labelMode === 'interval') return intervalSymbol(iv);
    if (labelMode === 'degree') return `${degreeAccidental(iv)}${iv.number}`;
  } catch {
    // Two real notes with no nameable interval between them. Say the pitch.
    return noteName(n);
  }
  return noteName(n);
}

/* ==========================================================================
   4. GEOMETRY

   Fret n sits at 1 - 2^(-n/12) of the scale length. The twelfth fret lands at
   exactly half the string, which is why the octave is there and not somewhere
   arbitrary — the picture and the pitch come out of the same equation.
   ========================================================================== */

/** Distance from the nut to fret n, as a fraction of the scale length. */
export function fretRatio(n) {
  return 1 - Math.pow(2, -n / 12);
}

/**
 * Normalized x positions for frets 0..fretCount, nut at 0 and the last fret at
 * 1. Gaps shrink as you go up, exactly as they do on a real neck.
 */
export function fretSpacing(fretCount) {
  if (!Number.isInteger(fretCount) || fretCount < 1) {
    throw new Error(`fretSpacing needs at least one fret: ${fretCount}`);
  }
  const total = fretRatio(fretCount);
  const out = [];
  for (let n = 0; n <= fretCount; n++) out.push(fretRatio(n) / total);
  return out;
}

/** Position markers. 1, 11, 13 and 23 are deliberately bare on real necks. */
export const SINGLE_INLAY_FRETS = Object.freeze([3, 5, 7, 9, 15, 17, 19, 21]);
export const DOUBLE_INLAY_FRETS = Object.freeze([12, 24]);

/** Which markers fall inside a fret window, and how many dots each gets. */
export function inlayFrets(firstFret = 0, lastFret = 12) {
  const out = [];
  for (let fret = Math.max(1, firstFret); fret <= lastFret; fret++) {
    if (DOUBLE_INLAY_FRETS.includes(fret)) out.push({ fret, dots: 2 });
    else if (SINGLE_INLAY_FRETS.includes(fret)) out.push({ fret, dots: 1 });
  }
  return out;
}

/**
 * Drawing units. These are viewBox units, not pixels: the SVG scales to its
 * container, so what matters is their ratio to the total width.
 */
export const FRETBOARD_METRICS = Object.freeze({
  stringGap: 30,        // between adjacent strings
  edgePad: 17,          // board edge to outer string
  cellUnit: 44,         // nominal width of one fret cell before log spacing
  openColumn: 36,       // the open-string column, left of the nut
  tuningGutter: 24,     // static open-string names
  rightPad: 12,
  markerBand: 15,       // side dots above the board
  fretNumberBand: 26,   // fret numbers below the board
  nutWidth: 5,
  fretWidth: 1,
  maxDotRadius: 13,
  minLabelCellWidth: 25,
  minLabelRadius: 8.5,
  minNumberCellWidth: 22,
  minMarkerNumberCellWidth: 12,
  stringMin: 0.7,       // stroke width of the thinnest string
  stringMax: 2.1,       // ...and the thickest
});

/**
 * Everything the renderer needs to place a mark, and nothing about pitch.
 *
 * Left-handedness is applied here rather than with an SVG transform, because a
 * mirrored transform would flip the lettering too. Every x is reflected through
 * the full width, so `left[i] + right[i] === width` for every feature.
 *
 * @param {{stringCount:number, firstFret?:number, lastFret?:number,
 *          handed?:'right'|'left', stringOrder?:'tab'|'flipped',
 *          stringWeights?:number[], metrics?:object}} opts
 */
export function fretboardLayout({
  stringCount,
  firstFret = 0,
  lastFret = 12,
  handed = 'right',
  stringOrder = 'tab',
  stringWeights = null,
  metrics = null,
} = {}) {
  if (!Number.isInteger(stringCount) || stringCount < 1) {
    throw new Error(`A neck needs at least one string: ${stringCount}`);
  }
  assertFret(firstFret);
  if (!Number.isInteger(lastFret) || lastFret < Math.max(firstFret, 1)) {
    throw new Error(`lastFret must be at least ${Math.max(firstFret, 1)}: ${lastFret}`);
  }
  const M = metrics ? { ...FRETBOARD_METRICS, ...metrics } : FRETBOARD_METRICS;

  const hasOpen = firstFret === 0;
  const firstWire = hasOpen ? 0 : firstFret - 1;
  const firstCell = Math.max(firstFret, 1);
  const cellCount = lastFret - firstCell + 1;

  const fretAreaWidth = M.cellUnit * cellCount;
  const boardLeft = M.tuningGutter + (hasOpen ? M.openColumn : 0);
  const boardRight = boardLeft + fretAreaWidth;
  const width = boardRight + M.rightPad;

  const boardTop = M.markerBand;
  const boardHeight = (stringCount - 1) * M.stringGap + 2 * M.edgePad;
  const boardBottom = boardTop + boardHeight;
  const height = boardBottom + M.fretNumberBand;

  const flip = handed === 'left';
  const mx = (x) => (flip ? width - x : x);

  const base = fretRatio(firstWire);
  const span = fretRatio(lastFret) - base;
  const rawX = (n) => boardLeft + ((fretRatio(n) - base) / span) * fretAreaWidth;

  // ---- fret wires -------------------------------------------------------
  const frets = [];
  for (let n = firstWire; n <= lastFret; n++) {
    frets.push({
      fret: n,
      x: mx(rawX(n)),
      isNut: hasOpen && n === 0,
      strokeWidth: hasOpen && n === 0 ? M.nutWidth : M.fretWidth,
    });
  }

  // ---- strings ----------------------------------------------------------
  const strings = [];
  for (let i = 0; i < stringCount; i++) {
    const row = stringOrder === 'flipped' ? i : stringCount - 1 - i;
    const w = stringWeights?.[i];
    const weight = Number.isFinite(w)
      ? Math.min(1, Math.max(0, w))
      : (stringCount === 1 ? 0.5 : (stringCount - 1 - i) / (stringCount - 1));
    strings.push({
      index: i,
      stringNumber: stringCount - i,
      row,
      y: boardTop + M.edgePad + row * M.stringGap,
      strokeWidth: M.stringMin + weight * (M.stringMax - M.stringMin),
    });
  }

  // ---- cells ------------------------------------------------------------
  const cellGeom = [];
  for (let fret = firstFret; fret <= lastFret; fret++) {
    let cx;
    let cellWidth;
    if (fret === 0) {
      cellWidth = M.openColumn;
      cx = boardLeft - M.openColumn / 2;
    } else {
      const a = rawX(fret - 1);
      const b = rawX(fret);
      cellWidth = b - a;
      cx = (a + b) / 2;
    }
    const radius = Math.min(cellWidth * 0.4, M.stringGap * 0.46, M.maxDotRadius);
    cellGeom.push({
      fret,
      cx: mx(cx),
      cellWidth,
      radius,
      isOpen: fret === 0,
      showLabel: cellWidth >= M.minLabelCellWidth && radius >= M.minLabelRadius,
    });
  }

  const cells = [];
  for (const s of strings) {
    for (const g of cellGeom) {
      cells.push({
        string: s.index,
        stringNumber: s.stringNumber,
        fret: g.fret,
        cx: g.cx,
        cy: s.y,
        cellWidth: g.cellWidth,
        cellHeight: M.stringGap,
        radius: g.radius,
        isOpen: g.isOpen,
        showLabel: g.showLabel,
      });
    }
  }

  // ---- inlays -----------------------------------------------------------
  const midY = (boardTop + boardBottom) / 2;
  const inlaySpread = Math.min(M.stringGap, boardHeight / 4);
  const inlays = inlayFrets(firstFret, lastFret).map(({ fret, dots }) => {
    const g = cellGeom.find((c) => c.fret === fret);
    return {
      fret,
      dots,
      cx: g.cx,
      cys: dots === 2 ? [midY - inlaySpread, midY + inlaySpread] : [midY],
      sideY: boardTop - M.markerBand / 2,
      radius: Math.min(5, g.cellWidth * 0.14 + 2.5),
    };
  });

  // ---- fret numbers -----------------------------------------------------
  const markerSet = new Set([...SINGLE_INLAY_FRETS, ...DOUBLE_INLAY_FRETS]);
  const fretNumbers = cellGeom
    .filter((g) => g.fret > 0)
    .map((g) => ({
      fret: g.fret,
      x: g.cx,
      y: boardBottom + M.fretNumberBand * 0.62,
      isMarker: markerSet.has(g.fret),
      // Numbers are dropped rather than allowed to collide. Marker frets are
      // the last to go, because they are how a player finds their place.
      show: g.cellWidth >= M.minNumberCellWidth
        || (markerSet.has(g.fret) && g.cellWidth >= M.minMarkerNumberCellWidth),
    }));

  return {
    width,
    height,
    handed,
    stringOrder,
    firstFret,
    lastFret,
    stringCount,
    metrics: M,
    board: {
      x: Math.min(mx(boardLeft), mx(boardRight)),
      y: boardTop,
      width: fretAreaWidth,
      height: boardHeight,
      top: boardTop,
      bottom: boardBottom,
      left: Math.min(mx(boardLeft), mx(boardRight)),
      right: Math.max(mx(boardLeft), mx(boardRight)),
    },
    nut: {
      present: hasOpen,
      x: mx(rawX(firstWire)),
      strokeWidth: hasOpen ? M.nutWidth : M.fretWidth,
    },
    openColumn: {
      present: hasOpen,
      cx: mx(boardLeft - M.openColumn / 2),
      width: M.openColumn,
    },
    tuningGutter: {
      cx: mx(M.tuningGutter / 2),
      width: M.tuningGutter,
    },
    frets,
    strings,
    cells,
    inlays,
    fretNumbers,
  };
}

/**
 * The neck's pitch content: one entry per playable cell, already spelled.
 * Pure, so a test can check what a board *would* show without rendering it.
 */
export function buildBoardModel(tuning, { firstFret = 0, lastFret = 12, prefer = null } = {}) {
  const t = getTuning(tuning);
  const spelling = prefer ?? preferredAccidental(t);
  const strings = t.strings.map((open, index) => {
    const cells = [];
    for (let fret = firstFret; fret <= lastFret; fret++) {
      cells.push({
        string: index,
        fret,
        midi: midi(open) + fret,
        note: noteAtFret(open, fret, { prefer: spelling }),
      });
    }
    return {
      index,
      stringNumber: stringNumber(t, index),
      open,
      openMidi: midi(open),
      cells,
    };
  });
  const midis = strings.map((s) => s.openMidi);
  const lo = Math.min(...midis);
  const hi = Math.max(...midis);
  return {
    tuning: t,
    firstFret,
    lastFret,
    prefer: spelling,
    strings,
    // Thicker strings sound lower. Deriving gauge from pitch instead of from
    // string number keeps a reentrant ukulele looking right.
    stringWeights: midis.map((m) => (hi === lo ? 0.5 : (hi - m) / (hi - lo))),
  };
}

/* ==========================================================================
   5. THE VIEW
   ========================================================================== */

const SVG_NS = 'http://www.w3.org/2000/svg';
const STYLE_ID = 'mta-fretboard-style';

function ensureStyles(doc) {
  if (doc.getElementById(STYLE_ID)) return;
  const link = doc.createElement('link');
  link.id = STYLE_ID;
  link.rel = 'stylesheet';
  link.href = new URL('./fretboard.css', import.meta.url).href;
  doc.head.appendChild(link);
}

function el(doc, tag, attrs) {
  const node = doc.createElementNS(SVG_NS, tag);
  for (const k in attrs) {
    if (attrs[k] === undefined || attrs[k] === null) continue;
    node.setAttribute(k, String(attrs[k]));
  }
  return node;
}

/**
 * Build a fretboard.
 *
 * @param {Element|null} container
 * @param {object} options
 * @param {string|Tuning|string[]} [options.tuning='guitar-standard']
 * @param {number} [options.firstFret]
 * @param {number} [options.lastFret]
 * @param {'right'|'left'} [options.handed='right']
 * @param {'tab'|'flipped'} [options.stringOrder='tab']  'tab' puts string 1 on top
 * @param {'pitch-class'|'pitch'} [options.match='pitch-class']
 * @param {(note:object, position:object)=>void} [options.onSelect]
 * @param {(note:object|null, position:object|null)=>void} [options.onHover]
 * @param {Document} [options.document]
 */
export function createFretboardView(container, options = {}) {
  const doc = options.document
    ?? (typeof document !== 'undefined' ? document : null);
  if (!doc) throw new Error('createFretboardView needs a document');
  ensureStyles(doc);

  const opts = {
    tuning: 'guitar-standard',
    handed: 'right',
    stringOrder: 'tab',
    match: 'pitch-class',
    ...options,
  };

  let tuning = getTuning(opts.tuning);
  let firstFret = opts.firstFret ?? tuning.defaultRange.firstFret;
  let lastFret = opts.lastFret ?? tuning.defaultRange.lastFret;

  const root = el(doc, 'svg', {
    class: 'fb',
    role: 'group',
    xmlns: SVG_NS,
    preserveAspectRatio: 'xMidYMid meet',
  });

  /** @type {Map<string, object>} */
  let cellsByKey = new Map();
  /** @type {object[]} */
  let cellList = [];
  let model = null;
  let layout = null;
  let focusKey = null;
  let hoveredKey = null;
  let lastState = null;

  // ---- build ------------------------------------------------------------

  function clear() {
    while (root.firstChild) root.removeChild(root.firstChild);
    cellsByKey = new Map();
    cellList = [];
    focusKey = null;
  }

  function build() {
    clear();
    model = buildBoardModel(tuning, { firstFret, lastFret });
    layout = fretboardLayout({
      stringCount: tuning.stringCount,
      firstFret,
      lastFret,
      handed: opts.handed,
      stringOrder: opts.stringOrder,
      stringWeights: model.stringWeights,
    });

    root.setAttribute('viewBox', `0 0 ${round(layout.width)} ${round(layout.height)}`);
    root.setAttribute(
      'aria-label',
      `${tuning.name} ${tuning.instrument} fretboard, ${tuning.stringCount} strings, `
      + `frets ${firstFret} to ${lastFret}`,
    );
    root.dataset.handed = opts.handed;

    const title = el(doc, 'title', {});
    title.textContent = `${tuning.name} ${tuning.instrument} fretboard`;
    root.appendChild(title);
    const desc = el(doc, 'desc', {});
    desc.textContent = `${tuning.blurb} Open strings, from string ${tuning.stringCount} to string 1: `
      + `${tuning.strings.map((n) => noteName(n, { octave: true })).join(' ')}.`;
    root.appendChild(desc);

    // fingerboard surface
    root.appendChild(el(doc, 'rect', {
      class: 'fb-surface',
      x: round(layout.board.x),
      y: round(layout.board.y),
      width: round(layout.board.width),
      height: round(layout.board.height),
    }));

    // inlays and side dots
    const gInlay = el(doc, 'g', { class: 'fb-inlays', 'aria-hidden': 'true' });
    for (const inlay of layout.inlays) {
      for (const cy of inlay.cys) {
        gInlay.appendChild(el(doc, 'circle', {
          class: 'fb-inlay', cx: round(inlay.cx), cy: round(cy), r: round(inlay.radius),
        }));
      }
      // Side dots, the markers a player actually reads while holding the neck.
      const sideOffsets = inlay.dots === 2 ? [-6, 6] : [0];
      for (const dx of sideOffsets) {
        gInlay.appendChild(el(doc, 'circle', {
          class: 'fb-sidedot',
          cx: round(inlay.cx + dx), cy: round(inlay.sideY), r: 1.8,
        }));
      }
    }
    root.appendChild(gInlay);

    // fret wires
    const gFrets = el(doc, 'g', { class: 'fb-frets', 'aria-hidden': 'true' });
    for (const f of layout.frets) {
      gFrets.appendChild(el(doc, 'line', {
        class: f.isNut ? 'fb-fret fb-fret--nut' : 'fb-fret',
        x1: round(f.x), x2: round(f.x),
        y1: round(layout.board.top), y2: round(layout.board.bottom),
        'stroke-width': round(f.strokeWidth),
        'data-fret': f.fret,
      }));
    }
    root.appendChild(gFrets);

    // strings
    const gStrings = el(doc, 'g', { class: 'fb-strings', 'aria-hidden': 'true' });
    for (const s of layout.strings) {
      gStrings.appendChild(el(doc, 'line', {
        class: 'fb-string',
        x1: round(layout.board.left), x2: round(layout.board.right),
        y1: round(s.y), y2: round(s.y),
        'stroke-width': round(s.strokeWidth),
      }));
    }
    root.appendChild(gStrings);

    // tuning legend
    const gTuning = el(doc, 'g', { class: 'fb-tuning', 'aria-hidden': 'true' });
    for (const s of layout.strings) {
      const t = el(doc, 'text', {
        class: 'fb-open-name',
        x: round(layout.tuningGutter.cx),
        y: round(s.y),
        dy: '0.34em',
        'text-anchor': 'middle',
      });
      t.textContent = noteName(tuning.strings[s.index]);
      gTuning.appendChild(t);
    }
    root.appendChild(gTuning);

    // fret numbers
    const gNums = el(doc, 'g', { class: 'fb-fretnums', 'aria-hidden': 'true' });
    for (const n of layout.fretNumbers) {
      if (!n.show) continue;
      const t = el(doc, 'text', {
        class: n.isMarker ? 'fb-fretnum fb-fretnum--marker' : 'fb-fretnum',
        x: round(n.x), y: round(n.y), 'text-anchor': 'middle',
      });
      t.textContent = String(n.fret);
      gNums.appendChild(t);
    }
    root.appendChild(gNums);

    // interactive cells
    const gCells = el(doc, 'g', { class: 'fb-cells' });
    for (const geom of layout.cells) {
      const source = model.strings[geom.string].cells.find((c) => c.fret === geom.fret);
      const key = cellKey(geom.string, geom.fret);
      const group = el(doc, 'g', {
        class: 'fb-cell',
        role: 'button',
        tabindex: '-1',
        'data-string': geom.string,
        'data-fret': geom.fret,
        'data-iv': 'none',
      });
      group.appendChild(el(doc, 'rect', {
        class: 'fb-hit',
        x: round(geom.cx - geom.cellWidth / 2),
        y: round(geom.cy - geom.cellHeight / 2),
        width: round(geom.cellWidth),
        height: round(geom.cellHeight),
        rx: 2,
      }));
      const dot = el(doc, 'g', { class: 'fb-dot' });
      dot.appendChild(el(doc, 'circle', {
        class: 'fb-dot-face',
        cx: round(geom.cx), cy: round(geom.cy), r: round(geom.radius),
      }));
      let text = null;
      if (geom.showLabel) {
        text = el(doc, 'text', {
          class: 'fb-dot-label',
          x: round(geom.cx), y: round(geom.cy),
          dy: '0.34em',
          'text-anchor': 'middle',
          'font-size': round(Math.max(12.5, Math.min(geom.radius * 1.06, 15))),
        });
        dot.appendChild(text);
      }
      group.appendChild(dot);
      gCells.appendChild(group);

      const record = {
        key,
        group,
        text,
        geom,
        midi: source.midi,
        pc: ((source.midi % 12) + 12) % 12,
        fallback: source.note,
        baseLabel: describeCell(geom, source.note),
        signature: null,
      };
      group.setAttribute('aria-label', record.baseLabel);
      cellsByKey.set(key, record);
      cellList.push(record);
    }
    root.appendChild(gCells);

    focusKey = cellList.length ? cellList[0].key : null;
    if (focusKey) cellsByKey.get(focusKey).group.setAttribute('tabindex', '0');
    if (lastState) applyState(lastState);
  }

  function describeCell(geom, noteObj) {
    const where = geom.fret === 0 ? 'open' : `fret ${geom.fret}`;
    return `String ${geom.stringNumber}, ${where}, ${noteName(noteObj, { octave: true })}`;
  }

  // ---- state ------------------------------------------------------------

  function applyState(state) {
    const notes = state.notes ?? [];
    const tonic = state.tonic ?? null;
    const labelMode = state.labelMode ?? 'name';
    const match = state.opts?.match ?? opts.match;
    const sounding = state.sounding ?? [];
    const soundingSet = sounding.length ? new Set(sounding) : null;
    const focusNote = state.focus ?? null;
    const focusPc = focusNote ? pitchClass(asNote(focusNote)) : -1;
    const focusMidi = focusNote ? midi(asNote(focusNote)) : -1;

    // One entry per displayed pitch class (or pitch), built once per update
    // rather than once per cell. Both the colour and the text depend only on
    // the note's relationship to the tonic, so a neck full of E's costs one
    // calculation and not eight.
    const byKey = new Map();
    for (const raw of notes) {
      const n = asNote(raw);
      const k = match === 'pitch' ? midi(n) : pitchClass(n);
      if (byKey.has(k)) continue;
      byKey.set(k, {
        iv: intervalCategory(n, tonic),
        label: noteLabel(n, { labelMode, tonic }),
      });
    }

    for (const rec of cellList) {
      const hit = byKey.get(match === 'pitch' ? rec.midi : rec.pc);
      const ringing = soundingSet ? soundingSet.has(rec.midi) : false;
      const focused = focusNote
        ? (match === 'pitch' ? rec.midi === focusMidi : rec.pc === focusPc)
        : false;
      // A pitch that is audibly sounding is worth seeing even when it is not
      // part of the displayed set — a passing tone should appear on the neck,
      // not ring invisibly.
      let iv = 'none';
      if (hit) iv = hit.iv;
      else if (ringing) iv = intervalCategory(rec.fallback, tonic);

      let label = '';
      if (rec.text && hit) label = hit.label;
      else if (rec.text && ringing) label = noteLabel(rec.fallback, { labelMode, tonic });
      const on = Boolean(hit) || ringing;
      const signature = `${on ? 1 : 0}|${iv}|${label}|${ringing ? 1 : 0}|${focused ? 1 : 0}`;
      if (signature === rec.signature) continue;
      rec.signature = signature;

      const g = rec.group;
      if (on) g.setAttribute('data-on', ''); else g.removeAttribute('data-on');
      g.setAttribute('data-iv', iv);
      if (focused) g.setAttribute('data-focus', ''); else g.removeAttribute('data-focus');
      // The ring animation lives in tokens.css; we only flag the state.
      g.classList.toggle('is-ringing', ringing);
      if (rec.text) rec.text.textContent = label;
      g.setAttribute(
        'aria-label',
        on ? `${rec.baseLabel}, ${labelWord(iv, ringing)}` : rec.baseLabel,
      );
    }
  }

  function labelWord(iv, ringing) {
    const base = iv === 'none' ? 'shown'
      : iv === 'tonic' ? 'the tonic'
        : `${iv} interval`;
    return ringing ? `${base}, sounding` : base;
  }

  // ---- interaction ------------------------------------------------------

  function cellFromEvent(event) {
    const target = event.target;
    const group = target && typeof target.closest === 'function'
      ? target.closest('.fb-cell')
      : null;
    if (!group) return null;
    return cellsByKey.get(
      cellKey(Number(group.getAttribute('data-string')), Number(group.getAttribute('data-fret'))),
    ) ?? null;
  }

  function noteOf(rec) {
    const notes = lastState?.notes ?? [];
    return spellAt(rec.midi, notes, { prefer: model.prefer });
  }

  function positionOf(rec) {
    return {
      string: rec.geom.string,
      stringNumber: rec.geom.stringNumber,
      fret: rec.geom.fret,
      midi: rec.midi,
    };
  }

  function select(rec) {
    if (!rec || typeof opts.onSelect !== 'function') return;
    opts.onSelect(noteOf(rec), positionOf(rec));
  }

  function onPointerDown(event) {
    const rec = cellFromEvent(event);
    if (!rec) return;
    moveFocusTo(rec, { focusDom: false });
    select(rec);
  }

  function onPointerMove(event) {
    const rec = cellFromEvent(event);
    const key = rec ? rec.key : null;
    if (key === hoveredKey) return;
    hoveredKey = key;
    if (typeof opts.onHover === 'function') {
      opts.onHover(rec ? noteOf(rec) : null, rec ? positionOf(rec) : null);
    }
  }

  function onPointerLeave() {
    if (hoveredKey === null) return;
    hoveredKey = null;
    if (typeof opts.onHover === 'function') opts.onHover(null, null);
  }

  function onFocusIn(event) {
    const rec = cellFromEvent(event);
    if (rec) moveFocusTo(rec, { focusDom: false });
  }

  function moveFocusTo(rec, { focusDom = true } = {}) {
    if (!rec) return;
    if (focusKey && cellsByKey.has(focusKey)) {
      cellsByKey.get(focusKey).group.setAttribute('tabindex', '-1');
    }
    focusKey = rec.key;
    rec.group.setAttribute('tabindex', '0');
    if (focusDom && typeof rec.group.focus === 'function') rec.group.focus();
  }

  function onKeyDown(event) {
    const rec = cellFromEvent(event) ?? (focusKey ? cellsByKey.get(focusKey) : null);
    if (!rec) return;
    const { string, fret } = rec.geom;
    const row = layout.strings[string].row;
    const fretStep = opts.handed === 'left' ? -1 : 1;
    let next = null;

    switch (event.key) {
      case 'ArrowRight': next = neighbourFret(string, fret + fretStep); break;
      case 'ArrowLeft': next = neighbourFret(string, fret - fretStep); break;
      case 'ArrowUp': next = neighbourRow(row - 1, fret); break;
      case 'ArrowDown': next = neighbourRow(row + 1, fret); break;
      case 'Home': next = cellsByKey.get(cellKey(string, firstFret)); break;
      case 'End': next = cellsByKey.get(cellKey(string, lastFret)); break;
      case 'Enter':
      case ' ':
      case 'Spacebar':
        event.preventDefault();
        select(rec);
        return;
      default:
        return;
    }
    if (!next) return;
    event.preventDefault();
    moveFocusTo(next);
  }

  function neighbourFret(string, fret) {
    return cellsByKey.get(cellKey(string, fret)) ?? null;
  }

  function neighbourRow(row, fret) {
    const s = layout.strings.find((x) => x.row === row);
    return s ? cellsByKey.get(cellKey(s.index, fret)) ?? null : null;
  }

  root.addEventListener('pointerdown', onPointerDown);
  root.addEventListener('pointermove', onPointerMove);
  root.addEventListener('pointerleave', onPointerLeave);
  root.addEventListener('keydown', onKeyDown);
  root.addEventListener('focusin', onFocusIn);

  build();
  if (container && typeof container.appendChild === 'function') container.appendChild(root);

  return {
    element: root,

    /** Cheap. Toggles attributes only; never rebuilds the DOM. */
    update(state = {}) {
      lastState = state;
      applyState(state);
    },

    /**
     * Rebuild paths. Deliberately separate from update() so the hot path can
     * stay attribute-only.
     */
    setTuning(next) {
      tuning = getTuning(next);
      firstFret = Math.min(firstFret, tuning.maxFret - 1);
      lastFret = Math.min(lastFret, tuning.maxFret);
      build();
    },
    setRange(first, last) {
      assertFret(first);
      const lo = first;
      const hi = Math.min(last, tuning.maxFret);
      if (hi < Math.max(lo, 1)) throw new Error(`Empty fret range: ${first}..${last}`);
      firstFret = lo;
      lastFret = hi;
      build();
    },
    /** The pitch content currently on screen. Handy for tests and lessons. */
    getModel() { return model; },
    getLayout() { return layout; },

    destroy() {
      root.removeEventListener('pointerdown', onPointerDown);
      root.removeEventListener('pointermove', onPointerMove);
      root.removeEventListener('pointerleave', onPointerLeave);
      root.removeEventListener('keydown', onKeyDown);
      root.removeEventListener('focusin', onFocusIn);
      clear();
      root.remove?.();
      lastState = null;
    },
  };
}

function cellKey(string, fret) {
  return `${string}:${fret}`;
}

function round(n) {
  return Math.round(n * 100) / 100;
}
