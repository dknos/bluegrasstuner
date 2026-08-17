/**
 * SCALES — defined as interval formulas, never as note lists.
 *
 * A scale here is a sequence of intervals measured from the tonic. Building
 * the scale means transposing the tonic by each one, which means the spelling
 * is produced by the same letter-arithmetic as everything else. This is why
 * F# major comes out with an E# and not an F: we ask for a major seventh
 * above F#, and a seventh above F must be some kind of E.
 *
 * Storing "F# G# A# B C# D# E#" as a literal would work for one key and fail
 * for the other twenty-nine.
 */

import { asNote, noteName, midi, pitchClass, sortNotes } from './pitch.js';
import { transpose, parseInterval, semitones, intervalBetween, intervalSymbol } from './interval.js';

/**
 * @typedef {object} ScaleDefinition
 * @property {string} id
 * @property {string} name
 * @property {string[]} aliases
 * @property {string[]} formula      intervals from the tonic
 * @property {string} family
 * @property {string} character      one plain sentence about how it sounds
 */

/** @type {Record<string, ScaleDefinition>} */
export const SCALES = {};

function defineScale(id, name, formula, family, character, aliases = []) {
  SCALES[id] = Object.freeze({ id, name, formula, family, character, aliases });
}

// ---- The seven modes of the major scale -----------------------------------
defineScale('major', 'Major', ['P1', 'M2', 'M3', 'P4', 'P5', 'M6', 'M7'], 'major',
  'The reference point. Bright, settled, and the scale every other one gets compared to.',
  ['ionian', 'major scale']);
defineScale('dorian', 'Dorian', ['P1', 'M2', 'm3', 'P4', 'P5', 'M6', 'm7'], 'major',
  'Minor, but with a raised 6th that keeps it from sounding sad. Hopeful and a little cool.');
defineScale('phrygian', 'Phrygian', ['P1', 'm2', 'm3', 'P4', 'P5', 'm6', 'm7'], 'major',
  'That flat 2nd right above the tonic gives it a dark, Spanish-tinged edge.');
defineScale('lydian', 'Lydian', ['P1', 'M2', 'M3', 'A4', 'P5', 'M6', 'M7'], 'major',
  'Major with a raised 4th. Floating, wide-open, a touch otherworldly.');
defineScale('mixolydian', 'Mixolydian', ['P1', 'M2', 'M3', 'P4', 'P5', 'M6', 'm7'], 'major',
  'Major with a flat 7th. Bluesy and unresolved: the sound of a dominant chord.');
defineScale('aeolian', 'Natural minor', ['P1', 'M2', 'm3', 'P4', 'P5', 'm6', 'm7'], 'major',
  'The plain minor scale. Serious without being dramatic.',
  ['natural minor', 'minor']);
defineScale('locrian', 'Locrian', ['P1', 'm2', 'm3', 'P4', 'd5', 'm6', 'm7'], 'major',
  'Flat 2nd and flat 5th. Unstable by design. It barely has a home to sit on.');

// ---- Minor variants --------------------------------------------------------
defineScale('harmonic-minor', 'Harmonic minor', ['P1', 'M2', 'm3', 'P4', 'P5', 'm6', 'M7'], 'harmonic-minor',
  'Minor with the 7th pulled up so it leans hard into the tonic. The gap between b6 and 7 is its signature.');
defineScale('melodic-minor', 'Melodic minor', ['P1', 'M2', 'm3', 'P4', 'P5', 'M6', 'M7'], 'melodic-minor',
  'A major scale with a flat 3rd, and nothing else lowered. Smooth and slightly ambiguous.',
  ['jazz minor']);
defineScale('harmonic-major', 'Harmonic major', ['P1', 'M2', 'M3', 'P4', 'P5', 'm6', 'M7'], 'harmonic-major',
  'Major with a flat 6th. Familiar until that one note darkens it.');
defineScale('double-harmonic', 'Double harmonic major', ['P1', 'm2', 'M3', 'P4', 'P5', 'm6', 'M7'], 'double-harmonic',
  'Two augmented seconds. Instantly exotic, hard to use by accident.',
  ['byzantine']);

// ---- Modes of melodic minor (the ones that earn their keep) ---------------
defineScale('lydian-dominant', 'Lydian dominant', ['P1', 'M2', 'M3', 'A4', 'P5', 'M6', 'm7'], 'melodic-minor',
  'Raised 4th and flat 7th together. The go-to sound over an unresolved dominant.',
  ['lydian b7', 'mixolydian #11']);
defineScale('altered', 'Altered', ['P1', 'm2', 'm3', 'd4', 'd5', 'm6', 'm7'], 'melodic-minor',
  'Every tension a dominant chord can take, all at once. Maximum pull toward resolution.',
  ['super locrian', 'diminished whole tone']);
defineScale('locrian-natural-2', 'Locrian ♮2', ['P1', 'M2', 'm3', 'P4', 'd5', 'm6', 'm7'], 'melodic-minor',
  'Locrian with the 2nd restored, which makes a half-diminished chord sound far less bleak.',
  ['half diminished scale']);

// ---- Symmetrical and pentatonic collections -------------------------------
defineScale('major-pentatonic', 'Major pentatonic', ['P1', 'M2', 'M3', 'P5', 'M6'], 'pentatonic',
  'The major scale with its two most opinionated notes removed. Almost impossible to make sound wrong.');
defineScale('minor-pentatonic', 'Minor pentatonic', ['P1', 'm3', 'P4', 'P5', 'm7'], 'pentatonic',
  'Five notes that carry most of blues, rock and soul.');
defineScale('blues', 'Blues scale', ['P1', 'm3', 'P4', 'A4', 'P5', 'm7'], 'pentatonic',
  'Minor pentatonic plus the note between 4 and 5, the one that makes it growl.');
defineScale('whole-tone', 'Whole tone', ['P1', 'M2', 'M3', 'A4', 'A5', 'A6'], 'symmetrical',
  'Nothing but whole steps. No leading tone, no gravity, no home.');
defineScale('diminished', 'Diminished (whole-half)', ['P1', 'M2', 'm3', 'P4', 'd5', 'm6', 'M6', 'M7'], 'symmetrical',
  'Alternating whole and half steps. Eight notes, and it repeats every minor third.',
  ['whole half diminished']);
defineScale('dominant-diminished', 'Dominant diminished (half-whole)', ['P1', 'm2', 'm3', 'M3', 'A4', 'P5', 'M6', 'm7'], 'symmetrical',
  'The same eight notes started a half step over. Fits a dominant chord with a b9 and #9.',
  ['half whole diminished', 'octatonic']);

/** Scales a learner should meet first, in the order they should meet them. */
export const BEGINNER_SCALES = ['major', 'aeolian', 'major-pentatonic', 'minor-pentatonic'];

export function getScale(id) {
  const s = SCALES[id];
  if (!s) throw new Error(`Unknown scale: ${id}`);
  return s;
}

/** Find a scale by id, name or alias, case-insensitively. */
export function findScale(query) {
  const q = String(query).toLowerCase().trim();
  return Object.values(SCALES).find(
    (s) => s.id === q || s.name.toLowerCase() === q || s.aliases.includes(q),
  ) ?? null;
}

/**
 * Build the notes of a scale.
 * @param {object|string} tonic
 * @param {string} scaleId
 * @param {{octaves?: number, includeOctave?: boolean}} opts
 */
export function buildScale(tonic, scaleId, { octaves = 1, includeOctave = false } = {}) {
  const root = asNote(tonic);
  const def = getScale(scaleId);
  const out = [];
  for (let o = 0; o < octaves; o++) {
    const base = { ...root, octave: root.octave + o };
    for (const iv of def.formula) out.push(transpose(base, parseInterval(iv)));
  }
  if (includeOctave) {
    out.push(transpose({ ...root, octave: root.octave + octaves - 1 }, parseInterval('P8')));
  }
  return out;
}

/** Scale-degree labels: "1", "2", "b3", "#4"… relative to a major scale. */
export function degreeLabels(scaleId) {
  const def = getScale(scaleId);
  return def.formula.map((ivStr) => {
    const iv = parseInterval(ivStr);
    const prefix = { P: '', M: '', m: '♭', d: iv.number === 4 ? '♭♭' : '♭', A: '♯', AA: '♯♯', dd: '♭♭' }[iv.quality];
    return `${prefix}${iv.number}`;
  });
}

/**
 * The step pattern as W / H letters — the way most people first learn a scale.
 * Returns e.g. ['W','W','H','W','W','W','H'] for major.
 */
export function stepPattern(scaleId) {
  const def = getScale(scaleId);
  const semis = def.formula.map((f) => semitones(parseInterval(f)));
  const steps = [];
  for (let i = 1; i < semis.length; i++) steps.push(semis[i] - semis[i - 1]);
  steps.push(12 - semis[semis.length - 1]);
  return steps.map((s) => ({ 1: 'H', 2: 'W', 3: 'W+H', 4: '2W' }[s] ?? `${s}`));
}

/** Semitone gaps between consecutive scale notes, wrapping to the octave. */
export function stepSemitones(scaleId) {
  const def = getScale(scaleId);
  const semis = def.formula.map((f) => semitones(parseInterval(f)));
  const steps = [];
  for (let i = 1; i < semis.length; i++) steps.push(semis[i] - semis[i - 1]);
  steps.push(12 - semis[semis.length - 1]);
  return steps;
}

/**
 * Rotate a scale to start on a different degree — how modes are actually made.
 * modeOfScale('major', 5) → the formula for mixolydian.
 */
export function modeOfScale(scaleId, degree) {
  const def = getScale(scaleId);
  const n = def.formula.length;
  if (degree < 1 || degree > n) throw new Error(`${def.name} has no degree ${degree}`);
  const semis = def.formula.map((f) => semitones(parseInterval(f)));
  const shift = semis[degree - 1];
  const rotated = [];
  for (let i = 0; i < n; i++) {
    const idx = (degree - 1 + i) % n;
    const raw = semis[idx] - shift;
    rotated.push(((raw % 12) + 12) % 12);
  }
  return rotated;
}

/** Which of our named scales has exactly this interval content, if any. */
export function identifyScaleBySemitones(semitoneSet) {
  const target = [...new Set(semitoneSet.map((s) => ((s % 12) + 12) % 12))].sort((a, b) => a - b).join(',');
  for (const def of Object.values(SCALES)) {
    const mine = def.formula
      .map((f) => ((semitones(parseInterval(f)) % 12) + 12) % 12)
      .sort((a, b) => a - b)
      .join(',');
    if (mine === target) return def;
  }
  return null;
}

/**
 * Compare two scales built on the same tonic and report only what differs.
 * This powers the "change one note" teaching move — the fastest way to make
 * someone actually hear what a mode is.
 */
export function compareScales(tonic, scaleA, scaleB) {
  const a = buildScale(tonic, scaleA);
  const b = buildScale(tonic, scaleB);
  const aPcs = a.map(pitchClass);
  const bPcs = b.map(pitchClass);
  const shared = a.filter((n) => bPcs.includes(pitchClass(n)));
  const onlyA = a.filter((n) => !bPcs.includes(pitchClass(n)));
  const onlyB = b.filter((n) => !aPcs.includes(pitchClass(n)));
  return {
    a, b, shared, onlyA, onlyB,
    changedDegrees: onlyB.map((n) => b.indexOf(n) + 1),
    summary: onlyB.length === 0
      ? 'Identical note content.'
      : `${onlyB.length} note${onlyB.length > 1 ? 's' : ''} change: ` +
        onlyA.map((n, i) => `${noteName(n)}→${noteName(onlyB[i] ?? onlyB[0])}`).join(', '),
  };
}

/** Does this note belong to this scale (by sound, ignoring spelling)? */
export function scaleContains(tonic, scaleId, candidate) {
  const pcs = buildScale(tonic, scaleId).map(pitchClass);
  return pcs.includes(pitchClass(candidate));
}

/** Which scale degree is this note, or null. 1-based. */
export function degreeOf(tonic, scaleId, candidate) {
  const pcs = buildScale(tonic, scaleId).map(pitchClass);
  const i = pcs.indexOf(pitchClass(candidate));
  return i < 0 ? null : i + 1;
}
