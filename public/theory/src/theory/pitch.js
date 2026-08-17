/**
 * PITCH — the foundation of the whole engine.
 *
 * A note is (letter, alter, octave), never a bare pitch-class integer.
 * That distinction is the entire reason this file exists: F# major has an E#
 * in it, not an F. Gb major has a Cb, not a B. If you flatten notes to
 * semitone numbers on the way in, you cannot recover the correct letter on
 * the way out, and every scale, chord and key signature downstream lies.
 *
 * Two kinds of arithmetic live side by side here and must never be conflated:
 *   LETTER arithmetic  — C D E F G A B, mod 7, decides the *name*
 *   SEMITONE arithmetic — mod 12, decides the *sound*
 * An interval is the pair of them. Spelling falls out for free.
 */

export const LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];

/** Semitones above C for each natural letter. */
const NATURAL_SEMITONE = [0, 2, 4, 5, 7, 9, 11];

export const MIN_ALTER = -3;
export const MAX_ALTER = 3;

export function letterIndex(letter) {
  const i = LETTERS.indexOf(String(letter).toUpperCase());
  if (i < 0) throw new Error(`Not a note letter: ${letter}`);
  return i;
}

/**
 * Build a note. Octave uses scientific pitch notation (middle C = C4 = MIDI 60).
 * @param {string} letter  A..G
 * @param {number} alter   -2 = double flat … +2 = double sharp
 * @param {number} octave
 */
export function note(letter, alter = 0, octave = 4) {
  const L = String(letter).toUpperCase();
  letterIndex(L); // validate
  if (!Number.isInteger(alter) || alter < MIN_ALTER || alter > MAX_ALTER) {
    throw new Error(`Alteration out of range: ${alter}`);
  }
  if (!Number.isInteger(octave)) throw new Error(`Octave must be an integer: ${octave}`);
  return Object.freeze({ letter: L, alter, octave });
}

const ACCIDENTAL_TO_ALTER = {
  '': 0,
  '#': 1, '##': 2, '###': 3,
  'x': 2, '#x': 3,
  'b': -1, 'bb': -2, 'bbb': -3,
  '♯': 1, '♯♯': 2,      // ♯
  '♭': -1, '♭♭': -2,    // ♭
  '♮': 0,                         // ♮
  '𝄪': 2,                   // 𝄪
  '𝄫': -2,                  // 𝄫
};

const NOTE_RE = /^([A-Ga-g])([#b♯♭♮ x]*|𝄪|𝄫)?(-?\d+)?$/;

/**
 * Parse "C", "Eb", "F#4", "Bbb2", "Cx3", "G♯5".
 * Octave defaults to 4 when omitted.
 */
export function parseNote(str, defaultOctave = 4) {
  const s = String(str).trim();
  const m = NOTE_RE.exec(s);
  if (!m) throw new Error(`Cannot parse note: "${str}"`);
  const [, letter, accRaw, octRaw] = m;
  const acc = (accRaw || '').replace(/\s/g, '').toLowerCase() === 'x' ? 'x' : (accRaw || '');
  const alter = ACCIDENTAL_TO_ALTER[acc.replace(/\s/g, '')];
  if (alter === undefined) throw new Error(`Cannot parse accidental in: "${str}"`);
  const octave = octRaw === undefined ? defaultOctave : parseInt(octRaw, 10);
  return note(letter, alter, octave);
}

/** Accept a note object or a string, always return a note object. */
export function asNote(n, defaultOctave = 4) {
  return typeof n === 'string' ? parseNote(n, defaultOctave) : n;
}

const ASCII_ACCIDENTALS = { '-3': 'bbb', '-2': 'bb', '-1': 'b', 0: '', 1: '#', 2: '##', 3: '###' };
const UNICODE_ACCIDENTALS = {
  '-3': '♭𝄫', '-2': '𝄫', '-1': '♭',
  0: '', 1: '♯', 2: '𝄪', 3: '♯𝄪',
};

/** Just the accidental glyph(s). */
export function accidentalSymbol(alter, { unicode = true } = {}) {
  return (unicode ? UNICODE_ACCIDENTALS : ASCII_ACCIDENTALS)[String(alter)] ?? '';
}

/**
 * Render a note.
 * @param {object|string} n
 * @param {{unicode?: boolean, octave?: boolean}} opts
 */
export function noteName(n, { unicode = true, octave = false } = {}) {
  const x = asNote(n);
  return x.letter + accidentalSymbol(x.alter, { unicode }) + (octave ? x.octave : '');
}

/** MIDI number. Middle C (C4) = 60. */
export function midi(n) {
  const x = asNote(n);
  return 12 * (x.octave + 1) + NATURAL_SEMITONE[letterIndex(x.letter)] + x.alter;
}

/** The MIDI number this letter+octave would have with no accidental. */
export function naturalMidi(letterIdx, octave) {
  return 12 * (octave + 1) + NATURAL_SEMITONE[letterIdx];
}

/** 0..11, C = 0. */
export function pitchClass(n) {
  return ((midi(n) % 12) + 12) % 12;
}

export function frequency(n, a4 = 440) {
  return a4 * Math.pow(2, (midi(n) - 69) / 12);
}

/** Same key on the piano? (C# and Db → true) */
export function isEnharmonic(a, b) {
  return midi(a) === midi(b);
}

/** Identical spelling AND octave? (C# and Db → false) */
export function isSameNote(a, b) {
  const x = asNote(a), y = asNote(b);
  return x.letter === y.letter && x.alter === y.alter && x.octave === y.octave;
}

/** Same letter and accidental, ignoring octave. */
export function isSamePitchName(a, b) {
  const x = asNote(a), y = asNote(b);
  return x.letter === y.letter && x.alter === y.alter;
}

export function withOctave(n, octave) {
  const x = asNote(n);
  return note(x.letter, x.alter, octave);
}

/** Move a note by whole octaves. */
export function shiftOctave(n, by) {
  const x = asNote(n);
  return note(x.letter, x.alter, x.octave + by);
}

/**
 * The white key a note sits on — its "staff position", counted in diatonic
 * steps from C0. This is what puts a note on a staff line or space, and it is
 * deliberately blind to accidentals: Cb4, C4 and C#4 all share a position.
 */
export function diatonicStep(n) {
  const x = asNote(n);
  return x.octave * 7 + letterIndex(x.letter);
}

/** Is this note playable on a white key? */
export function isNatural(n) {
  return asNote(n).alter === 0;
}

/**
 * Respell a note to the same sound with a different letter.
 * Returns null when the target letter would need an impossible accidental.
 *   respell(C#4, 'D') → Db4
 */
export function respell(n, targetLetter, { maxAlter = 2 } = {}) {
  const x = asNote(n);
  const target = letterIndex(targetLetter);
  const m = midi(x);
  // Choose the octave whose natural pitch sits closest to our target.
  // Triple accidentals are legal in the model but nobody notates them, so by
  // default we report "no sensible spelling" rather than inventing an A###.
  for (const oct of [x.octave - 1, x.octave, x.octave + 1]) {
    const alter = m - naturalMidi(target, oct);
    if (Math.abs(alter) <= Math.min(maxAlter, MAX_ALTER)) {
      return note(LETTERS[target], alter, oct);
    }
  }
  return null;
}

/** Every reasonable spelling of the same sound, simplest first. */
export function enharmonicSpellings(n, { maxAlter = 2 } = {}) {
  const x = asNote(n);
  const out = [];
  for (const letter of LETTERS) {
    const r = respell(x, letter);
    if (r && Math.abs(r.alter) <= maxAlter) out.push(r);
  }
  return out.sort((a, b) => Math.abs(a.alter) - Math.abs(b.alter));
}

/**
 * Pick the plainest spelling for a MIDI number, biased sharp or flat.
 * Used when we generate a pitch from a semitone count and have no key context.
 */
export function spellFromMidi(m, { prefer = 'sharp' } = {}) {
  const pc = ((m % 12) + 12) % 12;
  const octave = Math.floor(m / 12) - 1;
  const SHARP = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const FLAT = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
  const name = (prefer === 'flat' ? FLAT : SHARP)[pc];
  return parseNote(name + octave);
}

/** Sort notes low to high by sound; ties broken by letter so Cb < B#. */
export function compareNotes(a, b) {
  return midi(a) - midi(b) || diatonicStep(a) - diatonicStep(b);
}

export function sortNotes(notes) {
  return [...notes].map((n) => asNote(n)).sort(compareNotes);
}
