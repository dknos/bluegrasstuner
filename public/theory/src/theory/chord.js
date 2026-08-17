/**
 * CHORDS — also interval formulas, for the same reason scales are.
 *
 * A C# minor triad must contain an E, not an F♭, because a triad is a root
 * plus *some kind of third* plus *some kind of fifth*. Ask for the intervals
 * and the letters take care of themselves.
 *
 * Detection runs the other way: given a set of sounds, which formula fits,
 * and on which root. That is genuinely ambiguous — a diminished seventh chord
 * has four equally defensible roots — so we return ranked candidates rather
 * than pretending there is one answer.
 */

import { asNote, noteName, midi, pitchClass, sortNotes, shiftOctave, note, LETTERS, letterIndex } from './pitch.js';
import { transpose, parseInterval, semitones, intervalBetween, intervalSymbol } from './interval.js';

/** @type {Record<string, {id:string,symbol:string,name:string,formula:string[],family:string,aliases:string[],character:string}>} */
export const CHORDS = {};

function defineChord(id, symbol, name, formula, family, character, aliases = []) {
  CHORDS[id] = Object.freeze({ id, symbol, name, formula, family, character, aliases });
}

// ---- Triads ---------------------------------------------------------------
defineChord('major', '', 'Major triad', ['P1', 'M3', 'P5'], 'triad',
  'Stable and bright. The major third is doing all the work.', ['maj', 'M']);
defineChord('minor', 'm', 'Minor triad', ['P1', 'm3', 'P5'], 'triad',
  'The same chord with the third lowered a half step. One note, whole different mood.', ['min', '-']);
defineChord('diminished', 'dim', 'Diminished triad', ['P1', 'm3', 'd5'], 'triad',
  'Both the third and fifth squeezed down. Tense, and it wants to go somewhere.', ['°', 'o']);
defineChord('augmented', 'aug', 'Augmented triad', ['P1', 'M3', 'A5'], 'triad',
  'The fifth stretched up. Two major thirds stacked, so it sounds suspended in mid-air.', ['+']);
defineChord('sus2', 'sus2', 'Suspended 2nd', ['P1', 'M2', 'P5'], 'triad',
  'The third replaced by a second. Neither major nor minor, open and unresolved.');
defineChord('sus4', 'sus4', 'Suspended 4th', ['P1', 'P4', 'P5'], 'triad',
  'The third replaced by a fourth. Leans forward, traditionally into the major or minor chord.');

// ---- Seventh chords -------------------------------------------------------
defineChord('maj7', 'maj7', 'Major seventh', ['P1', 'M3', 'P5', 'M7'], 'seventh',
  'A major triad with the note a half step below the octave. Warm, lush, at rest.', ['M7', 'Δ7', 'Δ']);
defineChord('dom7', '7', 'Dominant seventh', ['P1', 'M3', 'P5', 'm7'], 'seventh',
  'Major triad, flat 7th. The tritone inside it is what makes it restless.', ['7']);
defineChord('min7', 'm7', 'Minor seventh', ['P1', 'm3', 'P5', 'm7'], 'seventh',
  'Minor triad plus a flat 7th. Smooth and neutral. The workhorse of modern harmony.', ['-7', 'min7']);
defineChord('min-maj7', 'mMaj7', 'Minor-major seventh', ['P1', 'm3', 'P5', 'M7'], 'seventh',
  'Minor triad with a natural 7th. Beautiful and slightly unsettling at the same time.', ['mM7', '-Δ7']);
defineChord('half-dim7', 'm7♭5', 'Half-diminished seventh', ['P1', 'm3', 'd5', 'm7'], 'seventh',
  'Diminished triad with a flat 7th on top, which softens it. Usually a ii chord in minor.', ['ø7', 'm7b5']);
defineChord('dim7', 'dim7', 'Diminished seventh', ['P1', 'm3', 'd5', 'd7'], 'seventh',
  'Four notes a minor third apart. Perfectly symmetrical, so it has no single root.', ['°7', 'o7']);
defineChord('aug7', '7♯5', 'Augmented seventh', ['P1', 'M3', 'A5', 'm7'], 'seventh',
  'A dominant chord with the fifth stretched up. Whole-tone flavour.', ['+7', '7#5']);
defineChord('maj7-sharp5', 'maj7♯5', 'Major seventh ♯5', ['P1', 'M3', 'A5', 'M7'], 'seventh',
  'Lush and floating, a major seventh that refuses to settle onto its fifth.');
defineChord('7sus4', '7sus4', 'Dominant seventh sus4', ['P1', 'P4', 'P5', 'm7'], 'seventh',
  'Dominant tension without the bite of the third. Very common right before a resolution.');
defineChord('6', '6', 'Major sixth', ['P1', 'M3', 'P5', 'M6'], 'sixth',
  'Major triad with a sixth instead of a seventh. Settled but not stiff.');
defineChord('m6', 'm6', 'Minor sixth', ['P1', 'm3', 'P5', 'M6'], 'sixth',
  'Minor triad with a natural sixth. Cooler and more open than a minor seventh.');

// ---- Extensions and alterations -------------------------------------------
defineChord('maj9', 'maj9', 'Major ninth', ['P1', 'M3', 'P5', 'M7', 'M9'], 'extended',
  'A major seventh with a ninth added. Wider and airier.');
defineChord('dom9', '9', 'Dominant ninth', ['P1', 'M3', 'P5', 'm7', 'M9'], 'extended',
  'Dominant seventh plus a ninth. Still restless, now more colourful.');
defineChord('min9', 'm9', 'Minor ninth', ['P1', 'm3', 'P5', 'm7', 'M9'], 'extended',
  'Minor seventh with a ninth. Silky.');
defineChord('dom7b9', '7♭9', 'Dominant 7♭9', ['P1', 'M3', 'P5', 'm7', 'm9'], 'altered',
  'A flattened ninth grinding against the root. Sharpens the pull to resolve.');
defineChord('dom7sharp9', '7♯9', 'Dominant 7♯9', ['P1', 'M3', 'P5', 'm7', 'A9'], 'altered',
  'Major third and raised ninth together: effectively both thirds at once. Gritty.');
defineChord('dom7sharp11', '7♯11', 'Dominant 7♯11', ['P1', 'M3', 'P5', 'm7', 'A11'], 'altered',
  'Adds the raised fourth. Bright and slightly acidic.');
defineChord('dom13', '13', 'Dominant 13th', ['P1', 'M3', 'P5', 'm7', 'M13'], 'extended',
  'A dominant chord with a sixth an octave up. Full and horn-like.');
defineChord('maj7sharp11', 'maj7♯11', 'Major 7♯11', ['P1', 'M3', 'P5', 'M7', 'A11'], 'extended',
  'The lydian sound as a chord. Floating and cinematic.');

/** Learners should meet these four before anything else. */
export const CORE_TRIADS = ['major', 'minor', 'diminished', 'augmented'];
export const CORE_SEVENTHS = ['maj7', 'dom7', 'min7', 'half-dim7', 'dim7'];

export function getChord(id) {
  const c = CHORDS[id];
  if (!c) throw new Error(`Unknown chord type: ${id}`);
  return c;
}

export function findChordType(query) {
  const q = String(query).toLowerCase().trim();
  return Object.values(CHORDS).find(
    (c) => c.id === q || c.symbol.toLowerCase() === q || c.name.toLowerCase() === q ||
      c.aliases.some((a) => a.toLowerCase() === q),
  ) ?? null;
}

/**
 * Build a chord's notes in root position, close voiced.
 * @param {object|string} root
 * @param {string} chordId
 */
export function buildChord(root, chordId) {
  const r = asNote(root);
  const def = getChord(chordId);
  return def.formula.map((iv) => transpose(r, parseInterval(iv)));
}

/** Full display name, e.g. "C♯m7". */
export function chordSymbol(root, chordId, { unicode = true } = {}) {
  return noteName(root, { unicode }) + getChord(chordId).symbol;
}

/**
 * Rotate the lowest note up an octave, `n` times. Inversion 0 is root
 * position, 1 puts the third in the bass, and so on.
 */
export function invertChord(notes, inversion) {
  let out = sortNotes(notes);
  const n = out.length;
  for (let i = 0; i < ((inversion % n) + n) % n; i++) {
    const [lowest, ...rest] = out;
    out = [...rest, shiftOctave(lowest, 1)];
  }
  return out;
}

/** Which inversion is this voicing? Compares the bass note to the formula. */
export function inversionOf(root, chordId, notes) {
  const sorted = sortNotes(notes);
  const chordTones = buildChord(root, chordId).map(pitchClass);
  const bassPc = pitchClass(sorted[0]);
  const i = chordTones.indexOf(bassPc);
  return i < 0 ? null : i;
}

const INVERSION_WORDS = ['root position', '1st inversion', '2nd inversion', '3rd inversion', '4th inversion'];
export function inversionName(i) {
  return INVERSION_WORDS[i] ?? `inversion ${i}`;
}

/**
 * Move a voicing so its notes sit as close as possible to a target register.
 * Keeps spelling; only octaves change.
 */
export function voiceNear(notes, targetMidi = 60) {
  return notes.map((n) => {
    let x = asNote(n);
    while (midi(x) - targetMidi > 6) x = shiftOctave(x, -1);
    while (targetMidi - midi(x) > 6) x = shiftOctave(x, 1);
    return x;
  });
}

/** Spread a close voicing out so it doesn't sound muddy down low. */
export function openVoicing(notes) {
  const sorted = sortNotes(notes);
  if (sorted.length < 3) return sorted;
  // Drop-2: take the second voice from the top down an octave.
  const out = [...sorted];
  const idx = out.length - 2;
  out[idx] = shiftOctave(out[idx], -1);
  return sortNotes(out);
}

/**
 * What role does each note play in this chord? Powers the "click any pitch and
 * find out what it is" behaviour.
 */
export function chordToneRoles(root, chordId) {
  const r = asNote(root);
  const def = getChord(chordId);
  const ROLE = {
    1: 'root', 2: '9th', 3: '3rd', 4: '11th', 5: '5th', 6: '13th', 7: '7th',
    9: '9th', 11: '11th', 13: '13th',
  };
  return def.formula.map((ivStr) => {
    const iv = parseInterval(ivStr);
    const n = transpose(r, iv);
    const base = ROLE[iv.number] ?? `${iv.number}`;
    const altered = !['P', 'M'].includes(iv.quality);
    const prefix = altered ? ({ m: '♭', d: '♭', A: '♯', AA: '♯♯', dd: '♭♭' }[iv.quality] ?? '') : '';
    const isTension = [2, 9, 11, 13, 6].includes(iv.number) && iv.number !== 5;
    return {
      note: n,
      name: noteName(n),
      interval: intervalSymbol(iv),
      role: iv.number === 3 && iv.quality === 'm' ? '♭3rd' : `${prefix}${base}`,
      kind: isTension ? 'tension' : 'chord-tone',
      isGuideTone: iv.number === 3 || iv.number === 7,
    };
  });
}

/**
 * Notes shared between two chords. Common tones are the reason smooth voice
 * leading is possible at all, so we surface them everywhere.
 */
export function commonTones(notesA, notesB) {
  const bPcs = notesB.map(pitchClass);
  return notesA.filter((n) => bPcs.includes(pitchClass(n)));
}

/**
 * Identify a chord from a set of notes. Returns ranked candidates; a
 * diminished seventh legitimately has four, so we don't hide that.
 */
export function detectChord(notes) {
  const input = sortNotes(notes);
  const pcs = [...new Set(input.map(pitchClass))].sort((a, b) => a - b);
  if (pcs.length === 0) return [];
  const bassPc = pitchClass(input[0]);
  const results = [];

  for (const candidateRoot of input) {
    for (const def of Object.values(CHORDS)) {
      const built = def.formula.map((iv) => transpose(candidateRoot, parseInterval(iv)));
      const builtPcs = [...new Set(built.map(pitchClass))].sort((a, b) => a - b);
      if (builtPcs.length !== pcs.length) continue;
      if (builtPcs.join(',') !== pcs.join(',')) continue;
      const inv = inversionOf(candidateRoot, def.id, input);
      results.push({
        root: candidateRoot,
        chordId: def.id,
        symbol: chordSymbol(candidateRoot, def.id),
        name: `${noteName(candidateRoot)} ${def.name}`,
        inversion: inv,
        inversionName: inv === null ? null : inversionName(inv),
        // Root in the bass is the reading a listener will hear first.
        score: (pitchClass(candidateRoot) === bassPc ? 2 : 0) + (def.family === 'triad' ? 1 : 0),
      });
    }
  }
  // Try roots that aren't in the input too (rootless voicings, slash chords).
  return results.sort((a, b) => b.score - a.score);
}

/** Arpeggiate: return the notes spread across `octaves`, ascending. */
export function arpeggiate(notes, octaves = 1) {
  const base = sortNotes(notes);
  const out = [];
  for (let o = 0; o < octaves; o++) out.push(...base.map((n) => shiftOctave(n, o)));
  return out;
}
