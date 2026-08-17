/**
 * KEYS, THE CIRCLE OF FIFTHS, AND DIATONIC HARMONY.
 *
 * Key signatures are derived, not tabulated. We build the scale, look at which
 * letters ended up altered, and report that. It means the "circle of fifths"
 * in the app is a consequence of the engine rather than a picture we drew.
 *
 * Roman numerals are the payoff of the whole first half of the curriculum:
 * they are what survives transposition. C Am Dm G and E C#m F#m B are the same
 * four relationships, and once a learner sees that, keys stop being thirty
 * separate things to memorise.
 */

import { asNote, noteName, pitchClass, midi, letterIndex, LETTERS, parseNote, note, sortNotes } from './pitch.js';
import { transpose, parseInterval, intervalBetween, intervalSymbol, semitones } from './interval.js';
import { buildScale, getScale } from './scale.js';
import { buildChord, chordSymbol, getChord, detectChord, CHORDS } from './chord.js';

/** Order sharps and flats appear in a key signature. */
export const SHARP_ORDER = ['F', 'C', 'G', 'D', 'A', 'E', 'B'];
export const FLAT_ORDER = ['B', 'E', 'A', 'D', 'G', 'C', 'F'];

/**
 * Work out a key signature by building the scale and seeing what got altered.
 * Returns { sharps, flats, count, accidentals } where accidentals are in the
 * order a copyist would actually write them.
 */
export function keySignature(tonic, scaleId = 'major') {
  const notes = buildScale(tonic, scaleId);
  const sharps = notes.filter((n) => n.alter > 0);
  const flats = notes.filter((n) => n.alter < 0);
  const order = sharps.length >= flats.length ? SHARP_ORDER : FLAT_ORDER;
  const altered = [...sharps, ...flats].sort(
    (a, b) => order.indexOf(a.letter) - order.indexOf(b.letter),
  );
  return {
    sharps: sharps.length,
    flats: flats.length,
    count: altered.length,
    accidentals: altered,
    label: altered.length === 0
      ? 'no sharps or flats'
      : `${altered.length} ${sharps.length >= flats.length ? 'sharp' : 'flat'}${altered.length > 1 ? 's' : ''}`,
  };
}

/** The twelve major keys as they sit on the circle, C at the top going clockwise. */
export const CIRCLE_OF_FIFTHS = (() => {
  const out = [];
  let n = parseNote('C4');
  for (let i = 0; i < 12; i++) {
    // Past six sharps the flat spelling is the one musicians actually use.
    const useFlat = i >= 6;
    const majorTonic = useFlat ? enharmonicKeyName(n) : n;
    out.push({
      position: i,
      major: majorTonic,
      minor: transpose(majorTonic, parseInterval('M6')),
      signature: keySignature(majorTonic, 'major'),
    });
    n = transpose(n, parseInterval('P5'));
    if (n.octave > 5) n = { ...n, octave: 4 };
  }
  return out;
})();

/** Prefer the flat spelling of a key when it has fewer accidentals. */
function enharmonicKeyName(n) {
  const FLAT_EQUIV = { 'F#': 'Gb', 'C#': 'Db', 'G#': 'Ab', 'D#': 'Eb', 'A#': 'Bb', 'E#': 'F', 'B#': 'C' };
  const key = n.letter + (n.alter > 0 ? '#'.repeat(n.alter) : n.alter < 0 ? 'b'.repeat(-n.alter) : '');
  const swap = FLAT_EQUIV[key];
  return swap ? parseNote(swap + n.octave) : n;
}

/** Step around the circle. +1 is one fifth clockwise (one more sharp). */
export function moveAroundCircle(tonic, steps) {
  const iv = parseInterval('P5');
  let n = asNote(tonic);
  for (let i = 0; i < Math.abs(steps); i++) {
    n = steps > 0 ? transpose(n, iv) : transpose(n, iv, -1);
    n = { ...n, octave: 4 };
  }
  return n;
}

/** How far apart two keys are on the circle, 0..6. Smaller means closer. */
export function circleDistance(a, b) {
  const pcA = pitchClass(a);
  const pcB = pitchClass(b);
  for (let d = 0; d <= 6; d++) {
    if (pitchClass(moveAroundCircle(a, d)) === pcB) return d;
    if (pitchClass(moveAroundCircle(a, -d)) === pcB) return -d;
  }
  return null;
}

export function relativeMinor(majorTonic) {
  return transpose(majorTonic, parseInterval('M6'));
}
export function relativeMajor(minorTonic) {
  return transpose(minorTonic, parseInterval('m3'));
}
export function parallelMinor(majorTonic) {
  return asNote(majorTonic);
}

// ---- Diatonic harmony ------------------------------------------------------

const TRIAD_BY_INTERVALS = [
  { thirds: ['M3', 'P5'], id: 'major' },
  { thirds: ['m3', 'P5'], id: 'minor' },
  { thirds: ['m3', 'd5'], id: 'diminished' },
  { thirds: ['M3', 'A5'], id: 'augmented' },
  { thirds: ['P4', 'P5'], id: 'sus4' },
  { thirds: ['M2', 'P5'], id: 'sus2' },
];

const SEVENTH_BY_INTERVALS = [
  { ivs: ['M3', 'P5', 'M7'], id: 'maj7' },
  { ivs: ['M3', 'P5', 'm7'], id: 'dom7' },
  { ivs: ['m3', 'P5', 'm7'], id: 'min7' },
  { ivs: ['m3', 'P5', 'M7'], id: 'min-maj7' },
  { ivs: ['m3', 'd5', 'm7'], id: 'half-dim7' },
  { ivs: ['m3', 'd5', 'd7'], id: 'dim7' },
  { ivs: ['M3', 'A5', 'm7'], id: 'aug7' },
  { ivs: ['M3', 'A5', 'M7'], id: 'maj7-sharp5' },
];

function classifyStack(root, notes, table, key) {
  const ivs = notes.slice(1).map((n) => intervalSymbol(intervalBetween(root, n)));
  const hit = table.find((t) => (t[key] ?? t.ivs).join(',') === ivs.join(','));
  return hit ? hit.id : null;
}

/**
 * Stack thirds on each scale degree. This is how diatonic chords are actually
 * made, and building them this way means the app can do it in any key and any
 * scale without a lookup table.
 * @param {object|string} tonic
 * @param {string} scaleId
 * @param {number} size 3 for triads, 4 for seventh chords
 */
export function diatonicChords(tonic, scaleId = 'major', size = 3) {
  const scale = buildScale(tonic, scaleId, { octaves: 3 });
  const len = getScale(scaleId).formula.length;
  const out = [];

  for (let deg = 0; deg < len; deg++) {
    const notes = [];
    for (let s = 0; s < size; s++) notes.push(scale[deg + s * 2]);
    const root = notes[0];
    const id = size === 3
      ? classifyStack(root, notes, TRIAD_BY_INTERVALS, 'thirds')
      : classifyStack(root, notes, SEVENTH_BY_INTERVALS, 'ivs');

    out.push({
      degree: deg + 1,
      root,
      notes,
      chordId: id,
      symbol: id ? chordSymbol(root, id) : `${noteName(root)}?`,
      quality: id ? getChord(id).name : 'unclassified',
      roman: id ? romanNumeral(deg + 1, id) : String(deg + 1),
      function: harmonicFunction(deg + 1, scaleId),
    });
  }
  return out;
}

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];

/** Roman numeral for a degree + quality: uppercase major, lowercase minor. */
export function romanNumeral(degree, chordId, { alteration = '' } = {}) {
  const base = ROMAN[(degree - 1) % 7];
  const def = CHORDS[chordId];
  if (!def) return alteration + base;
  const minorish = ['minor', 'min7', 'min-maj7', 'm6', 'min9', 'diminished', 'dim7', 'half-dim7'].includes(chordId);
  const numeral = minorish ? base.toLowerCase() : base;
  const suffix = {
    diminished: '°', dim7: '°7', 'half-dim7': 'ø7', augmented: '+',
    maj7: 'maj7', dom7: '7', min7: '7', 'min-maj7': 'maj7',
    sus4: 'sus4', sus2: 'sus2', 6: '6', m6: '6',
  }[chordId] ?? '';
  return alteration + numeral + suffix;
}

/**
 * Tonic / predominant / dominant. The three-way split is a simplification, and
 * we say so in the lesson text — but it is the simplification that makes
 * progressions start to make sense.
 */
export function harmonicFunction(degree, scaleId = 'major') {
  const isMinorMode = ['aeolian', 'harmonic-minor', 'melodic-minor'].includes(scaleId);
  const map = isMinorMode
    ? { 1: 'tonic', 2: 'predominant', 3: 'tonic', 4: 'predominant', 5: 'dominant', 6: 'predominant', 7: 'dominant' }
    : { 1: 'tonic', 2: 'predominant', 3: 'tonic', 4: 'predominant', 5: 'dominant', 6: 'tonic', 7: 'dominant' };
  return map[((degree - 1) % 7) + 1];
}

export const FUNCTION_BLURB = {
  tonic: 'Home. Arriving here feels like the phrase is over.',
  predominant: 'On the way somewhere. Sets up the dominant.',
  dominant: 'Maximum tension. Contains the tritone that wants to resolve to the tonic.',
};

/**
 * Analyse a progression in a key: label each chord with a Roman numeral and a
 * function, and flag anything that isn't diatonic.
 * @param {string[]} chordSymbols e.g. ['C','Am','Dm','G7']
 * @param {object|string} tonic
 */
export function analyzeProgression(chordSymbols, tonic, scaleId = 'major') {
  const key = asNote(tonic);
  const diatonic = diatonicChords(key, scaleId, 3);
  const diatonic7 = diatonicChords(key, scaleId, 4);
  const scalePcs = buildScale(key, scaleId).map(pitchClass);

  return chordSymbols.map((sym) => {
    const parsed = parseChordSymbol(sym);
    if (!parsed) return { input: sym, error: `Could not read "${sym}"` };
    const { root, chordId } = parsed;
    const rootPc = pitchClass(root);

    const match = [...diatonic, ...diatonic7].find(
      (d) => pitchClass(d.root) === rootPc && d.chordId === chordId,
    );
    const degreeIndex = scalePcs.indexOf(rootPc);
    const tones = buildChord(root, chordId);
    const outsiders = tones.filter((n) => !scalePcs.includes(pitchClass(n)));

    let roman;
    let borrowed = false;
    if (match) {
      roman = match.roman;
    } else if (degreeIndex >= 0) {
      roman = romanNumeral(degreeIndex + 1, chordId);
      borrowed = true;
    } else {
      // Root is outside the key entirely — describe it by distance from tonic.
      const iv = intervalBetween({ ...key, octave: 4 }, { ...root, octave: root.octave < key.octave ? key.octave : root.octave });
      const flatness = ['♭II', '♭III', '♭V', '♭VI', '♭VII'];
      const approxDegree = Math.round(((rootPc - pitchClass(key) + 12) % 12) / 2) + 1;
      roman = `(${noteName(root)}${getChord(chordId).symbol})`;
      borrowed = true;
    }

    return {
      input: sym,
      root,
      chordId,
      symbol: chordSymbol(root, chordId),
      notes: tones,
      roman,
      diatonic: !!match,
      borrowed,
      nonScaleTones: outsiders,
      function: degreeIndex >= 0 ? harmonicFunction(degreeIndex + 1, scaleId) : 'chromatic',
      secondaryDominant: detectSecondaryDominant(root, chordId, key, scaleId),
    };
  });
}

/**
 * Is this a V7 of some other diatonic chord? The single most useful piece of
 * chromatic analysis a learner can pick up.
 */
export function detectSecondaryDominant(root, chordId, tonic, scaleId = 'major') {
  if (!['dom7', 'major', 'dom9', 'dom7b9'].includes(chordId)) return null;
  const target = transpose(root, parseInterval('P4'));
  const diatonic = diatonicChords(tonic, scaleId, 3);
  const hit = diatonic.find((d) => pitchClass(d.root) === pitchClass(target));
  if (!hit || hit.degree === 1) return null;
  return { targetRoman: hit.roman, targetSymbol: hit.symbol, label: `V/${hit.roman}` };
}

const CHORD_SYMBOL_RE = /^([A-Ga-g][#b♯♭]{0,2})\s*(.*)$/;

/** Read "Cmaj7", "F#m", "Bb7", "Am7b5". Returns { root, chordId } or null. */
export function parseChordSymbol(sym) {
  const m = CHORD_SYMBOL_RE.exec(String(sym).trim());
  if (!m) return null;
  const root = parseNote(m[1], 4);
  const rest = m[2].trim();
  const NORMALISE = {
    '': 'major', 'maj': 'major', 'M': 'major',
    'm': 'minor', 'min': 'minor', '-': 'minor',
    'dim': 'diminished', '°': 'diminished', 'o': 'diminished',
    'aug': 'augmented', '+': 'augmented',
    'sus4': 'sus4', 'sus': 'sus4', 'sus2': 'sus2',
    'maj7': 'maj7', 'M7': 'maj7', 'Δ7': 'maj7', 'Δ': 'maj7', 'ma7': 'maj7',
    '7': 'dom7', 'dom7': 'dom7',
    'm7': 'min7', 'min7': 'min7', '-7': 'min7',
    'mMaj7': 'min-maj7', 'mM7': 'min-maj7', 'minmaj7': 'min-maj7',
    'm7b5': 'half-dim7', 'm7♭5': 'half-dim7', 'ø7': 'half-dim7', 'ø': 'half-dim7', 'half-dim': 'half-dim7',
    'dim7': 'dim7', '°7': 'dim7', 'o7': 'dim7',
    '6': '6', 'm6': 'm6', 'min6': 'm6',
    '9': 'dom9', 'maj9': 'maj9', 'M9': 'maj9', 'm9': 'min9', 'min9': 'min9',
    '7b9': 'dom7b9', '7♭9': 'dom7b9', '7#9': 'dom7sharp9', '7♯9': 'dom7sharp9',
    '7#11': 'dom7sharp11', '7♯11': 'dom7sharp11', '13': 'dom13',
    '7sus4': '7sus4', '7sus': '7sus4',
  };
  const chordId = NORMALISE[rest] ?? (findByAnySymbol(rest) ?? null);
  if (!chordId) return null;
  return { root, chordId };
}

function findByAnySymbol(rest) {
  const q = rest.toLowerCase();
  const hit = Object.values(CHORDS).find(
    (c) => c.symbol.toLowerCase() === q || c.aliases.some((a) => a.toLowerCase() === q),
  );
  return hit?.id ?? null;
}

/**
 * Move a whole progression to a new key. The Roman numerals do not change,
 * which is the entire point of the exercise.
 */
export function transposeProgression(chordSymbols, fromKey, toKey) {
  const iv = intervalBetween(asNote(fromKey), asNote(toKey));
  return chordSymbols.map((sym) => {
    const parsed = parseChordSymbol(sym);
    if (!parsed) return sym;
    const newRoot = transpose(parsed.root, iv);
    return chordSymbol({ ...newRoot, octave: 4 }, parsed.chordId);
  });
}

/** Well-known cadence shapes, described by function rather than by name only. */
export const CADENCES = {
  authentic: { degrees: [5, 1], name: 'Authentic (V–I)', blurb: 'The strongest ending. Tension resolves straight home.' },
  plagal: { degrees: [4, 1], name: 'Plagal (IV–I)', blurb: 'Softer arrival. Often called the "amen" cadence.' },
  half: { degrees: [1, 5], name: 'Half cadence (–V)', blurb: 'Stops on the dominant. Sounds like a question.' },
  deceptive: { degrees: [5, 6], name: 'Deceptive (V–vi)', blurb: 'Sets up home, then sidesteps it.' },
};

export function buildCadence(tonic, cadenceId, { size = 3, scaleId = 'major' } = {}) {
  const cad = CADENCES[cadenceId];
  if (!cad) throw new Error(`Unknown cadence: ${cadenceId}`);
  const chords = diatonicChords(tonic, scaleId, size);
  return cad.degrees.map((d) => chords[d - 1]);
}
