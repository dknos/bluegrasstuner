/**
 * INTERVALS — distance measured two ways at once.
 *
 * Every interval carries a NUMBER (how many letter names it spans, counting
 * both ends: C→E spans C,D,E = a 3rd) and a QUALITY (how many semitones that
 * span actually contains). C→E is 4 semitones = major 3rd. C→Eb is 3 = minor
 * 3rd. C→D# is also 3 semitones, but it spans only C,D = a 2nd, so it is an
 * augmented 2nd. Same sound, different interval, different musical meaning.
 *
 * Transposition is defined here rather than in pitch.js because moving a note
 * *by an interval* is what produces correct spelling everywhere else.
 */

import { LETTERS, letterIndex, note, midi, naturalMidi, asNote } from './pitch.js';

const NATURAL_SEMITONE = [0, 2, 4, 5, 7, 9, 11];

/**
 * Thrown when two legitimate notes sit at a distance that music notation has
 * no name for. Callers that sweep over exotic spellings should catch this
 * rather than treating it as a bug.
 */
export class UnnameableIntervalError extends Error {
  constructor(message, details) {
    super(message);
    this.name = 'UnnameableIntervalError';
    Object.assign(this, details);
  }
}

/** Unisons, 4ths, 5ths and octaves take perfect/augmented/diminished. */
export function isPerfectNumber(number) {
  const simple = ((Math.abs(number) - 1) % 7) + 1;
  return simple === 1 || simple === 4 || simple === 5;
}

/** Semitones in a plain (perfect or major) interval of this number. */
export function baseSemitones(number) {
  const n = Math.abs(number);
  const step = (n - 1) % 7;
  const octaves = Math.floor((n - 1) / 7);
  return NATURAL_SEMITONE[step] + 12 * octaves;
}

const PERFECT_OFFSETS = { dd: -2, d: -1, P: 0, A: 1, AA: 2 };
const MAJOR_OFFSETS = { dd: -3, d: -2, m: -1, M: 0, A: 1, AA: 2 };

const PERFECT_BY_OFFSET = Object.fromEntries(
  Object.entries(PERFECT_OFFSETS).map(([q, o]) => [o, q]),
);
const MAJOR_BY_OFFSET = Object.fromEntries(
  Object.entries(MAJOR_OFFSETS).map(([q, o]) => [o, q]),
);

function offsetTable(number) {
  return isPerfectNumber(number) ? PERFECT_OFFSETS : MAJOR_OFFSETS;
}

/**
 * @param {number} number   1 = unison, 2 = second, … 8 = octave, 9 = ninth …
 * @param {string} quality  'P' | 'M' | 'm' | 'A' | 'AA' | 'd' | 'dd'
 */
export function interval(number, quality) {
  if (!Number.isInteger(number) || number < 1) {
    throw new Error(`Interval number must be a positive integer: ${number}`);
  }
  const table = offsetTable(number);
  if (!(quality in table)) {
    const kind = isPerfectNumber(number) ? 'perfect' : 'major/minor';
    throw new Error(`"${quality}" is not a valid quality for a ${kind}-family interval (${number})`);
  }
  return Object.freeze({ number, quality });
}

const LONG_QUALITY = {
  perf: 'P', per: 'P', p: 'P',
  maj: 'M', major: 'M',
  min: 'm', minor: 'm',
  aug: 'A', augmented: 'A',
  dim: 'd', diminished: 'd',
};

const INTERVAL_RE = /^([PMmAd]+|perf|per|maj|major|min|minor|aug|augmented|dim|diminished)\s*(\d+)$/;

/** Parse "P5", "m3", "A4", "dd7", "maj7", "min 3". */
export function parseInterval(str) {
  const s = String(str).trim();
  const m = INTERVAL_RE.exec(s);
  if (!m) throw new Error(`Cannot parse interval: "${str}"`);
  let [, q, num] = m;
  if (q.length > 2 || LONG_QUALITY[q.toLowerCase()]) {
    q = LONG_QUALITY[q.toLowerCase()] ?? q;
  }
  return interval(parseInt(num, 10), q);
}

export function asInterval(iv) {
  return typeof iv === 'string' ? parseInterval(iv) : iv;
}

/** How many semitones this interval spans. */
export function semitones(iv) {
  const x = asInterval(iv);
  return baseSemitones(x.number) + offsetTable(x.number)[x.quality];
}

/** Compact label: "m3", "P5", "A4". */
export function intervalSymbol(iv) {
  const x = asInterval(iv);
  return x.quality + x.number;
}

const ORDINALS = [
  '', 'unison', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh',
  'octave', 'ninth', 'tenth', 'eleventh', 'twelfth', 'thirteenth', 'fourteenth',
  'fifteenth',
];

const QUALITY_WORDS = {
  P: 'perfect', M: 'major', m: 'minor',
  A: 'augmented', AA: 'doubly augmented',
  d: 'diminished', dd: 'doubly diminished',
};

/** Spoken label: "minor third", "perfect fifth", "augmented fourth". */
export function intervalName(iv) {
  const x = asInterval(iv);
  const ord = ORDINALS[x.number] ?? `${x.number}th`;
  if (x.number === 1 && x.quality === 'P') return 'unison';
  if (x.number === 8 && x.quality === 'P') return 'octave';
  return `${QUALITY_WORDS[x.quality]} ${ord}`;
}

/**
 * The interval from `a` up (or down) to `b`.
 * Returns { number, quality, direction } where direction is +1 or -1.
 */
export function intervalBetween(a, b) {
  const lo = asNote(a);
  const hi = asNote(b);
  const letterSpan = (letterIndex(hi.letter) - letterIndex(lo.letter)) + 7 * (hi.octave - lo.octave);
  const semitoneSpan = midi(hi) - midi(lo);

  const descending = letterSpan < 0 || (letterSpan === 0 && semitoneSpan < 0);
  if (descending) {
    const up = intervalBetween(hi, lo);
    return Object.freeze({ ...up, direction: -1 });
  }

  const number = letterSpan + 1;
  const offset = semitoneSpan - baseSemitones(number);
  const byOffset = isPerfectNumber(number) ? PERFECT_BY_OFFSET : MAJOR_BY_OFFSET;
  const quality = byOffset[offset];
  if (!quality) {
    // Real notes, but no name for the gap between them: e.g. B♯ up to A𝄫 spans
    // a seventh yet only 7 semitones, which would be quadruply diminished.
    // Refusing beats inventing a symbol no musician uses.
    const show = (n) => n.letter + (['𝄫', '♭', '', '♯', '𝄪'][n.alter + 2] ?? `(${n.alter})`) + n.octave;
    throw new UnnameableIntervalError(
      `${show(lo)} up to ${show(hi)} spans a ${number === 1 ? 'unison' : `${number}th`} ` +
      `but only ${semitoneSpan} semitone${semitoneSpan === 1 ? '' : 's'}: ` +
      `no standard interval name covers that.`,
      { lo, hi, number, semitoneSpan },
    );
  }
  return Object.freeze({ number, quality, direction: 1 });
}

/** Just the semitone distance between two notes (signed). */
export function semitonesBetween(a, b) {
  return midi(b) - midi(a);
}

/**
 * Move a note by an interval. This is the function that makes every scale and
 * chord in the app spell correctly: the letter moves by the interval's number,
 * the accidental is then whatever it takes to land on the right sound.
 *
 *   transpose(F#4, M3) → A#4     (letter F→A, sound 66→70)
 *   transpose(Gb4, P4) → Cb5     (letter G→C, sound 66→71)
 */
export function transpose(n, iv, direction = 1) {
  const x = asNote(n);
  const i = asInterval(iv);
  // An interval produced by intervalBetween() carries its own direction.
  // The argument composes with it rather than overriding it, so
  // transpose(n, descendingThird) goes down and transposeDown() of that
  // same interval goes back up.
  const dir = direction * (i.direction ?? 1);

  const letterSteps = (i.number - 1) * dir;
  const rawIndex = letterIndex(x.letter) + letterSteps;
  const newLetter = ((rawIndex % 7) + 7) % 7;
  const newOctave = x.octave + Math.floor(rawIndex / 7);

  const targetMidi = midi(x) + semitones(i) * dir;
  const alter = targetMidi - naturalMidi(newLetter, newOctave);

  if (alter < -3 || alter > 3) {
    throw new Error(
      `Transposing ${x.letter}${x.alter} by ${intervalSymbol(i)} needs ${alter} alterations ` +
      `(outside standard notation)`,
    );
  }
  return note(LETTERS[newLetter], alter, newOctave);
}

export function transposeDown(n, iv) {
  return transpose(n, iv, -1);
}

/**
 * Invert a simple interval: what's left of the octave.
 * m3 → M6, P5 → P4, A4 → d5. Numbers sum to 9, qualities flip.
 */
export function invert(iv) {
  const x = asInterval(iv);
  const simple = simplify(x);
  const FLIP = { P: 'P', M: 'm', m: 'M', A: 'd', d: 'A', AA: 'dd', dd: 'AA' };
  return interval(9 - simple.number, FLIP[simple.quality]);
}

/** Reduce a compound interval to within an octave. M9 → M2, P12 → P5. */
export function simplify(iv) {
  const x = asInterval(iv);
  if (x.number <= 8) return interval(x.number, x.quality);
  const simpleNumber = ((x.number - 1) % 7) + 1;
  return interval(simpleNumber, x.quality);
}

export function isCompound(iv) {
  return asInterval(iv).number > 8;
}

/** Consonance category — useful for teaching, not a moral judgement. */
export function consonance(iv) {
  const s = ((semitones(simplify(iv)) % 12) + 12) % 12;
  if ([0, 7].includes(s)) return 'perfect-consonance';
  if ([5].includes(s)) return 'perfect-consonance';
  if ([3, 4, 8, 9].includes(s)) return 'imperfect-consonance';
  return 'dissonance';
}

/** The twelve simple intervals a beginner meets first, in order. */
export const SIMPLE_INTERVALS = [
  'P1', 'm2', 'M2', 'm3', 'M3', 'P4', 'A4', 'P5', 'm6', 'M6', 'm7', 'M7', 'P8',
].map(parseInterval);

/** Look up the everyday interval for a semitone count (0..12). */
export function commonIntervalForSemitones(s) {
  const table = {
    0: 'P1', 1: 'm2', 2: 'M2', 3: 'm3', 4: 'M3', 5: 'P4',
    6: 'A4', 7: 'P5', 8: 'm6', 9: 'M6', 10: 'm7', 11: 'M7', 12: 'P8',
  };
  const key = table[s];
  if (!key) throw new Error(`No simple interval for ${s} semitones`);
  return parseInterval(key);
}
