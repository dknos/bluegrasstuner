/**
 * THE QUESTION ENGINE.
 *
 * Nothing in this file is a static question bank. Every item is manufactured
 * on demand from the theory engine and a seeded random number generator, which
 * buys three things at once:
 *
 *   1. the supply never runs out, so nobody memorises question #47;
 *   2. the same seed always rebuilds the same question, so tests and shared
 *      practice links are reproducible;
 *   3. correctness is not a proofreading problem. If `interval.js` says the
 *      answer is a minor third, then the answer is a minor third, in every key,
 *      forever. There is no second copy of the truth to drift out of sync.
 *
 * THE EXPLANATION IS THE PRODUCT. A wrong answer that only says "wrong" has
 * taught nothing. `explain()` reconstructs the reasoning from the engine every
 * time: count the letters, count the half steps, compare that count against the
 * plain form of that interval, then hand the learner two sounds to play back to
 * back. That chain is generated, never filled into a template, so it is right
 * for C–E♭ and for B♯–D𝄪 alike.
 *
 * Pure logic only — no DOM, no audio, no colour values. Views consume
 * `question.promptAudio`, `choice.notes` and `explain().compare` and decide how
 * to draw and play them. Colour categories come from ui/color.js, never hex.
 */

import {
  parseNote, noteName, midi, pitchClass, diatonicStep, LETTERS, letterIndex,
  spellFromMidi, sortNotes, respell, isSameNote, shiftOctave, asNote,
} from '../theory/pitch.js';

import {
  parseInterval, interval, intervalBetween, intervalName, intervalSymbol,
  semitones, semitonesBetween, transpose, isPerfectNumber,
} from '../theory/interval.js';

import {
  buildScale, getScale, degreeLabels, degreeOf, identifyScaleBySemitones,
} from '../theory/scale.js';

import {
  buildChord, getChord, chordSymbol, chordToneRoles, detectChord, CHORDS,
} from '../theory/chord.js';

import { intervalCategory } from '../ui/color.js';

// ===========================================================================
// SEEDED RANDOMNESS
// ===========================================================================

/**
 * mulberry32 — a 32-bit state PRNG. Small enough to read in one sitting and
 * good enough that consecutive questions do not visibly pattern.
 * Returns a function producing floats in [0, 1).
 */
export function makeRng(seed = 1) {
  let a = (Math.imul(Number(seed) | 0, 0x9e3779b1) ^ 0x6d2b79f5) >>> 0;
  if (a === 0) a = 0x9e3779b9;
  return function rng() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Integer in [0, n). */
export function randInt(rng, n) {
  return Math.floor(rng() * n) % Math.max(1, n);
}

export function pick(rng, arr) {
  if (!arr || arr.length === 0) return undefined;
  return arr[randInt(rng, arr.length)];
}

/** Fisher–Yates, non-mutating. */
export function shuffle(rng, arr) {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = randInt(rng, i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** `k` distinct members, order randomised. */
export function sample(rng, arr, k) {
  return shuffle(rng, arr).slice(0, Math.max(0, Math.min(k, arr.length)));
}

/** Stable short id from content, so identical questions get identical ids. */
function hashId(prefix, parts) {
  const s = parts.filter((p) => p !== undefined && p !== null).join('|');
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return `${prefix}-${h.toString(36)}`;
}

// ===========================================================================
// DIFFICULTY LADDERS
//
// Every pool is defined as a list of tiers that are *added*, never swapped.
// pool(d) is therefore always a superset of pool(d-1): levelling up widens the
// world rather than replacing it, and a learner never loses ground they held.
// ===========================================================================

export const MAX_DIFFICULTY = 6;

export function clampDifficulty(d) {
  const n = Math.round(Number(d));
  if (!Number.isFinite(n)) return 1;
  return Math.max(1, Math.min(MAX_DIFFICULTY, n));
}

function accumulate(tiers, difficulty) {
  const d = clampDifficulty(difficulty);
  const out = [];
  for (let i = 0; i < Math.min(d, tiers.length); i++) {
    for (const x of tiers[i]) if (!out.includes(x)) out.push(x);
  }
  return out;
}

/**
 * Interval unlock order. The first tier is deliberately absurd to confuse —
 * a perfect fifth against a minor second is the widest contrast available in
 * an octave. Neighbours that genuinely fool people (M6 against m7, M7 against
 * the octave) are held back until the wide contrasts are automatic.
 *
 * Every interval in the audible tiers has a unique semitone count, because two
 * intervals of the same size are the same sound: asking a listener to choose
 * between A4 and d5 by ear is asking them to guess.
 */
const INTERVAL_TIERS = [
  ['P5', 'm2'],           // 1 — maximally contrasting
  ['P8', 'M3'],           // 2 — still far apart, adds the octave frame
  ['P4', 'm3'],           // 3 — first same-number pair: M3 vs m3
  ['M2', 'M6', 'P1'],     // 4 — m2 vs M2 now live
  ['A4', 'm6', 'M7'],     // 5 — tritone and the dark/bright sixths
  ['m7'],                 // 6 — M6 vs m7 and M7 vs P8, the last confusions
];

/** Spelling twins — identical sound, different meaning. Sight-reading only. */
const INTERVAL_VISUAL_TIERS = [[], [], [], [], ['d5'], ['A2', 'd4', 'A5']];

/**
 * @param {number} difficulty
 * @param {string} mode  'visual' also unlocks same-sound/different-spelling pairs
 * @returns {string[]} interval symbols
 */
export function intervalPoolFor(difficulty, mode = 'melodic-up') {
  const base = accumulate(INTERVAL_TIERS, difficulty);
  if (mode !== 'visual') return base;
  return [...base, ...accumulate(INTERVAL_VISUAL_TIERS, difficulty)];
}

const CHORD_TIERS = [
  ['major', 'minor'],
  ['diminished', 'augmented'],
  ['sus4', 'sus2'],
  ['maj7', 'dom7', 'min7'],
  ['half-dim7', 'dim7', '6', 'm6'],
  ['min-maj7', 'aug7', '7sus4', 'maj7-sharp5'],
];

export function chordPoolFor(difficulty) {
  return accumulate(CHORD_TIERS, difficulty);
}

/** Seven-note scales only: degree numbering is unambiguous in these. */
const SCALE_TIERS = [
  ['major'],
  ['aeolian'],
  ['dorian', 'mixolydian'],
  ['lydian', 'phrygian'],
  ['harmonic-minor', 'locrian'],
  ['melodic-minor', 'harmonic-major', 'double-harmonic'],
];

export function scalePoolFor(difficulty) {
  return accumulate(SCALE_TIERS, difficulty);
}

/** Roots, ordered by how often a learner meets them. Never double-altered. */
const ROOT_TIERS = [
  ['C', 'G', 'F'],
  ['D', 'A', 'E'],
  ['B', 'Bb', 'Eb'],
  ['Ab', 'F#', 'Db'],
  ['C#', 'G#', 'Gb', 'D#'],
  ['A#', 'Cb', 'Fb', 'E#', 'B#'],
];

export function rootPoolFor(difficulty) {
  return accumulate(ROOT_TIERS, difficulty);
}

const NOTE_NAME_TIERS = [
  ['C', 'D', 'E', 'F', 'G', 'A', 'B'],
  [],
  ['F#', 'Bb', 'Eb', 'C#'],
  ['G#', 'Ab', 'Db', 'D#', 'A#', 'Gb'],
  ['Cb', 'Fb', 'E#', 'B#'],
  ['F##', 'C##', 'Bbb', 'Ebb'],
];

const OCTAVE_TIERS = [[4], [3, 5], [], [2, 6], [], []];

/** Every note a hunt question may target at this level, as parseable strings. */
export function noteHuntPoolFor(difficulty) {
  const names = accumulate(NOTE_NAME_TIERS, difficulty);
  const octaves = accumulate(OCTAVE_TIERS, difficulty).sort((a, b) => a - b);
  const out = [];
  for (const o of octaves) for (const n of names) out.push(`${n}${o}`);
  return out;
}

export const REPRESENTATIONS = ['piano', 'staff', 'fretboard', 'ring'];

// ===========================================================================
// ENGINE GUARDS
//
// Real notes can sit at distances notation has no name for, and transposition
// can run off the end of the accidental range. Those are legitimate musical
// facts, not bugs — but they must never reach the learner as a stack trace,
// least of all from explain(), which only ever runs when someone is already
// confused. Every engine call on an explanation path goes through one of these
// and degrades to something true but plainer.
// ===========================================================================

function safeInterval(a, b) {
  try {
    return intervalBetween(a, b);
  } catch {
    return null;
  }
}

function safeTranspose(n, iv, direction = 1) {
  try {
    return transpose(n, iv, direction);
  } catch {
    return null;
  }
}

const nm = (n) => (n ? noteName(n, { unicode: true }) : '?');
const nmo = (n) => (n ? noteName(n, { unicode: true, octave: true }) : '?');

function aOrAn(word) {
  return /^[aeio]/i.test(String(word)) ? `an ${word}` : `a ${word}`;
}

/** Capitalise a generated fragment that has landed at the start of a sentence. */
function cap(s) {
  return String(s).charAt(0).toUpperCase() + String(s).slice(1);
}

/**
 * How a chord should be written. Major triads have an empty symbol, so
 * `chordSymbol()` alone returns a bare note name — fine on a lead sheet,
 * confusing in a sentence.
 */
function chordTag(root, chordId) {
  const def = getChord(chordId);
  return def.symbol ? chordSymbol(root, chordId) : `${nm(root)} major`;
}

/** Spoken name, plus the written symbol only when it adds information. */
function chordTitle(root, chordId) {
  const def = getChord(chordId);
  const spoken = `${nm(root)} ${def.name.toLowerCase()}`;
  return def.symbol ? `${spoken}, written ${chordSymbol(root, chordId)}` : spoken;
}

function plural(n, one, many = `${one}s`) {
  return `${n} ${Math.abs(n) === 1 ? one : many}`;
}

/** 'unison' | 'second' | … | 'octave' — taken from the engine's own naming. */
function ordinalWord(number) {
  try {
    const plain = interval(number, isPerfectNumber(number) ? 'P' : 'M');
    return intervalName(plain).split(' ').pop();
  } catch {
    return `${number}th`;
  }
}

// ===========================================================================
// THE REASONING CORE
//
// One function generates the interval argument used by all five generators.
// It counts letters, counts half steps, and checks that count against the
// plain form of an interval that size. That is the whole method — and because
// it is computed, it is as correct for B♯→D𝄪 as it is for C→E.
// ===========================================================================

/** The chromatic route between two notes, as a spelled walk. */
export function chromaticPath(a, b) {
  const from = midi(a);
  const to = midi(b);
  const dist = Math.abs(to - from);
  const dir = Math.sign(to - from) || 1;
  const names = [nm(a)];
  for (let i = 1; i < dist; i++) {
    names.push(nm(spellFromMidi(from + dir * i, { prefer: dir > 0 ? 'sharp' : 'flat' })));
  }
  if (dist > 0) names.push(nm(b));
  const listed = dist <= 8;
  return {
    steps: dist,
    names,
    text: dist === 0
      ? `${nm(a)} stays where it is`
      : listed ? names.join(' → ') : `${nm(a)} → … → ${nm(b)}`,
  };
}

/** The letter-name route: the thing that decides an interval's *number*. */
export function letterPath(a, b) {
  const x = asNote(a);
  const y = asNote(b);
  const delta = diatonicStep(y) - diatonicStep(x);
  const dir = Math.sign(delta) || 1;
  const span = Math.abs(delta) + 1;
  const letters = [];
  for (let i = 0; i < Math.min(span, 10); i++) {
    letters.push(LETTERS[(((letterIndex(x.letter) + dir * i) % 7) + 7) % 7]);
  }
  return { span, letters, text: letters.join('–') };
}

/**
 * The three-step argument for "what interval is this, and how do I know".
 *
 * @param {object} a  first note (the one played first — direction matters)
 * @param {object} b  second note
 * @returns {{interval: object|null, symbol: string, name: string,
 *            semitones: number, letterSpan: number, steps: {id: string, text: string}[],
 *            text: string}}
 */
export function explainIntervalPair(a, b) {
  const iv = safeInterval(a, b);
  const lp = letterPath(a, b);
  const cp = chromaticPath(a, b);
  const down = midi(b) < midi(a);
  const steps = [];

  steps.push({
    id: 'letters',
    text: `Letter names: ${lp.text}. That spans ${plural(lp.span, 'letter name')}, `
      + `so whatever it is, it is some kind of ${ordinalWord(lp.span)}.`,
  });

  steps.push({
    id: 'semitones',
    text: `Half steps${down ? ' (going down)' : ''}: ${cp.text}. That is ${plural(cp.steps, 'half step')}.`,
  });

  if (iv) {
    const plain = interval(iv.number, isPerfectNumber(iv.number) ? 'P' : 'M');
    const plainSize = semitones(plain);
    const actual = semitones(iv);
    const diff = actual - plainSize;
    const delta = diff === 0
      ? 'exactly that'
      : `${plural(Math.abs(diff), 'half step')} ${diff < 0 ? 'narrower' : 'wider'}`;
    steps.push({
      id: 'size',
      text: `A plain ${ordinalWord(iv.number)} is ${plural(plainSize, 'half step')} `
        + `(${intervalName(plain)}). You counted ${actual} (${delta}), so `
        + `${nmo(a)} ${down ? 'down' : 'up'} to ${nmo(b)} is ${aOrAn(intervalName(iv))}.`,
    });
  } else {
    steps.push({
      id: 'size',
      text: `${nmo(a)} to ${nmo(b)} is ${plural(cp.steps, 'half step')} across `
        + `${plural(lp.span, 'letter name')}, a gap standard notation has no single name for.`,
    });
  }

  return {
    interval: iv,
    symbol: iv ? intervalSymbol(iv) : null,
    name: iv ? intervalName(iv) : 'unnameable interval',
    semitones: Math.abs(semitonesBetween(a, b)),
    letterSpan: lp.span,
    direction: down ? -1 : 1,
    steps,
    text: steps.map((s) => s.text).join(' '),
  };
}

/**
 * What actually differs between two sounds — the sentence that tells a learner
 * where to point their ear during the A/B comparison.
 */
export function describeDifference(notesA, notesB) {
  const A = notesA ?? [];
  const B = notesB ?? [];
  if (A.length === B.length) {
    const moved = [];
    for (let i = 0; i < A.length; i++) {
      if (midi(A[i]) !== midi(B[i])) moved.push(i);
    }
    if (moved.length === 0) {
      const spelled = A.some((n, i) => !isSameNote(n, B[i]));
      return spelled
        ? 'Identical sound. The only difference is how it is written, which is exactly what is being tested.'
        : 'These are the same notes.';
    }
    if (moved.length === 1) {
      const i = moved[0];
      const d = midi(B[i]) - midi(A[i]);
      return `Only one note moves: ${nm(A[i])} → ${nm(B[i])}, `
        + `${plural(Math.abs(d), 'half step')} ${d > 0 ? 'up' : 'down'}. Everything else holds still.`;
    }
    return `${moved.length} notes move: ` + moved.map((i) => `${nm(A[i])} → ${nm(B[i])}`).join(', ') + '.';
  }
  return `${A.length} note${A.length === 1 ? '' : 's'} against ${B.length}: different sizes, so the whole shape changes.`;
}

/** Package the shared explanation fields, with `text` flattened for a11y/tests. */
function finishExplanation({ correct, chosen, answer, headline, steps, compare, conceptIds }) {
  const text = [
    headline,
    ...steps.map((s) => s.text),
    compare ? `${compare.intro} A: ${compare.a.label}. B: ${compare.b.label}. ${compare.listenFor}` : '',
  ].filter(Boolean).join(' ');
  return { correct, chosen, chosenId: chosen?.id ?? null, answer, answerId: answer.id, headline, steps, compare, conceptIds, text };
}

/** Resolve whatever the UI passed as a chosen id into a choice, or null. */
function resolveChoice(choices, chosenId) {
  if (chosenId === null || chosenId === undefined) return null;
  return choices.find((c) => c.id === chosenId) ?? null;
}

// ===========================================================================
// SHARED CHOICE PLUMBING
// ===========================================================================

/**
 * Tag every choice with the note it actually turns on, and that note's colour
 * category, so all four views light the same pitch at the same instant.
 *
 * The "focus" note is found, not assumed: it is the first position where the
 * choices disagree — the third in a major/minor pair, the altered fifth in a
 * diminished one, the second note of an interval. Picking the top voice
 * instead would colour C major and C minor identically, which is exactly the
 * distinction the question is about.
 *
 * Colour decisions themselves live in ui/color.js; this only carries the
 * category name for the view to put on `data-iv`.
 */
function decorateAll(choices, reference) {
  const lengths = choices.map((c) => c.notes?.length ?? 0);
  const len = lengths.length ? Math.min(...lengths) : 0;
  let idx = Math.max(0, len - 1);
  for (let i = 0; i < len; i++) {
    if (new Set(choices.map((c) => midi(c.notes[i]))).size > 1) { idx = i; break; }
  }
  return choices.map((c) => {
    const focus = c.notes?.[Math.min(idx, (c.notes?.length ?? 1) - 1)] ?? null;
    return { ...c, focus, iv: intervalCategory(focus, reference) };
  });
}

/** Distinct by id, by label, and by sounding content. */
function assertDistinct(choices) {
  const seen = new Set();
  const out = [];
  for (const c of choices) {
    const key = `${c.label}::${(c.notes ?? []).map(midi).join(',')}`;
    if (seen.has(c.id) || seen.has(key)) continue;
    seen.add(c.id);
    seen.add(key);
    out.push(c);
  }
  return out;
}

/**
 * Choose distractors from a ranked pool. Early on, wrong answers should be
 * obviously wrong so the learner hears the category; later they should be the
 * nearest neighbour, because that is the only thing left to learn.
 */
function nearOrFar(rng, candidates, distanceOf, difficulty, count) {
  const ranked = [...candidates].sort((x, y) => distanceOf(x) - distanceOf(y));
  if (ranked.length <= count) return shuffle(rng, ranked);
  const preferNear = clampDifficulty(difficulty) >= 4;
  const width = Math.max(count, Math.ceil(ranked.length * 0.6));
  const band = preferNear ? ranked.slice(0, width) : ranked.slice(ranked.length - width);
  return sample(rng, band, count);
}

// ===========================================================================
// 1. NOTE HUNT — "find this note"
// ===========================================================================

/**
 * @param {function} rng
 * @param {{difficulty?: number, representations?: string[]}} opts
 */
export function generateNoteHuntQuestion(rng, opts = {}) {
  const difficulty = clampDifficulty(opts.difficulty ?? 1);
  const reps = (opts.representations ?? REPRESENTATIONS).filter((r) => REPRESENTATIONS.includes(r));
  const representation = pick(rng, reps.length ? reps : REPRESENTATIONS);
  const pool = noteHuntPoolFor(difficulty);
  const target = parseNote(pick(rng, pool));

  // On a keyboard, fretboard or ring, C♯ and D♭ are the same button — offering
  // both as choices would make the question unanswerable. Only notation can
  // tell them apart, so only notation gets enharmonic distractors.
  const spellingMatters = representation === 'staff';

  const candidates = [];
  const add = (n) => { if (n) candidates.push(n); };
  // Double accidentals only turn up as near-misses once single ones are solid.
  for (const step of difficulty <= 3 ? [1, -1] : [1, -1, 2, -2]) {
    if (Math.abs(target.alter + step) <= 2) {
      add(parseNote(`${target.letter}${'#'.repeat(Math.max(0, target.alter + step))}${'b'.repeat(Math.max(0, -(target.alter + step)))}${target.octave}`));
    }
  }
  for (const s of [1, -1, 2, -2]) {
    const li = ((letterIndex(target.letter) + s) % 7 + 7) % 7;
    add(parseNote(`${LETTERS[li]}${target.octave}`));
  }
  add(shiftOctave(target, 1));
  add(shiftOctave(target, -1));
  if (spellingMatters) {
    for (const s of [1, -1]) {
      const li = ((letterIndex(target.letter) + s) % 7 + 7) % 7;
      add(respell(target, LETTERS[li]));
    }
  }

  const usable = [];
  for (const c of candidates) {
    if (!c) continue;
    if (isSameNote(c, target)) continue;
    if (!spellingMatters && midi(c) === midi(target)) continue;
    if (usable.some((u) => isSameNote(u, c))) continue;
    if (!spellingMatters && usable.some((u) => midi(u) === midi(c))) continue;
    if (midi(c) < 21 || midi(c) > 108) continue;
    usable.push(c);
  }

  const wrong = sample(rng, usable, 3);
  const asChoice = (n) => ({
    id: `n:${noteName(n, { unicode: false, octave: true })}`,
    label: nmo(n),
    value: noteName(n, { unicode: false, octave: true }),
    notes: [n],
  });

  const choices = decorateAll(assertDistinct(shuffle(rng, [target, ...wrong].map(asChoice))), target);
  const answer = choices.find((c) => c.value === noteName(target, { unicode: false, octave: true }));

  const accidentalWord = target.alter === 0 ? 'natural'
    : target.alter === 1 ? 'sharp' : target.alter === -1 ? 'flat'
      : target.alter > 1 ? 'double-sharp' : 'double-flat';

  const conceptIds = ['note.locate', `note.locate.${representation}`, `note.accidental.${accidentalWord}`];

  const q = {
    id: hashId('hunt', [representation, noteName(target, { unicode: false, octave: true }), difficulty]),
    type: 'note-hunt',
    difficulty,
    representation,
    target,
    reference: target,
    prompt: `Find ${nmo(target)} on the ${representation === 'ring' ? 'pitch ring' : representation}.`,
    promptAudio: { notes: [target], style: 'single' },
    choices,
    answerId: answer.id,
    conceptIds,
    explain(chosenId) {
      const chosen = resolveChoice(choices, chosenId);
      const correct = !!chosen && chosen.id === answer.id;
      const steps = [];
      let compare;

      if (correct) {
        const near = choices.filter((c) => c.id !== answer.id)
          .sort((x, y) => Math.abs(midi(x.notes[0]) - midi(target)) - Math.abs(midi(y.notes[0]) - midi(target)))[0] ?? answer;
        steps.push({
          id: 'confirm',
          text: `${nmo(target)} it is: letter ${target.letter}, `
            + `${target.alter === 0 ? 'no accidental' : `${accidentalWord} sign`}, octave ${target.octave} `
            + `(MIDI ${midi(target)}).`,
        });
        steps.push({ id: 'contrast', text: explainIntervalPair(target, near.notes[0]).text });
        compare = {
          intro: 'Fix the difference in your ear:',
          a: { label: `${nmo(target)} (the one you found)`, notes: [target], style: 'single' },
          b: { label: `${nmo(near.notes[0])} (its closest neighbour here)`, notes: near.notes, style: 'single' },
          listenFor: describeDifference([target], near.notes),
        };
      } else {
        const got = chosen ? chosen.notes[0] : null;
        if (got && midi(got) === midi(target)) {
          steps.push({
            id: 'enharmonic',
            text: `${nmo(got)} and ${nmo(target)} are the same key on a keyboard, but they are not the same note. `
              + `The letter is what changes: a ${target.letter} sits on the ${target.letter} line or space, `
              + `a ${got.letter} sits on the ${got.letter} one. Same sound, different job in the key.`,
          });
        } else if (got) {
          steps.push({ id: 'distance', text: explainIntervalPair(got, target).text });
        } else {
          steps.push({
            id: 'unanswered',
            text: `Nothing was selected. The note being asked for is ${nmo(target)}.`,
          });
        }
        steps.push({
          id: 'locate',
          text: `To place ${nmo(target)}: find the letter ${target.letter} in octave ${target.octave} first, `
            + `then apply the ${target.alter === 0 ? 'accidental (there isn\'t one)' : `${accidentalWord}`}. `
            + `Letter first, accidental second, every time.`,
        });
        compare = {
          intro: 'Play these one after the other:',
          a: { label: `${got ? nmo(got) : 'nothing'} (what you picked)`, notes: got ? [got] : [], style: 'single' },
          b: { label: `${nmo(target)} (what was asked for)`, notes: [target], style: 'single' },
          listenFor: got ? describeDifference([got], [target]) : `Listen for ${nmo(target)} on its own.`,
        };
      }

      return finishExplanation({
        correct,
        chosen,
        answer,
        headline: correct
          ? `Correct. That is ${nmo(target)}.`
          : `Not quite. The note asked for was ${nmo(target)}.`,
        steps,
        compare,
        conceptIds,
      });
    },
  };
  return q;
}

// ===========================================================================
// 2. INTERVALS
// ===========================================================================

const MODES = ['melodic-up', 'melodic-down', 'harmonic', 'visual'];

function modesFor(difficulty) {
  const d = clampDifficulty(difficulty);
  const out = ['melodic-up'];
  if (d >= 3) out.push('melodic-down');
  if (d >= 4) out.push('harmonic');
  if (d >= 5) out.push('visual');
  return out;
}

/**
 * Roots that can carry this interval without running off the end of notation.
 * Filtering up front beats retrying, and keeps generation deterministic.
 */
function rootsFor(ivSymbol, direction, difficulty) {
  const iv = parseInterval(ivSymbol);
  const maxAlter = clampDifficulty(difficulty) <= 2 ? 1 : 2;
  const out = [];
  for (const name of rootPoolFor(difficulty)) {
    for (const octave of [3, 4, 5]) {
      const root = parseNote(`${name}${octave}`);
      const other = safeTranspose(root, iv, direction);
      if (!other) continue;
      if (Math.abs(other.alter) > maxAlter) continue;
      const lo = Math.min(midi(root), midi(other));
      const hi = Math.max(midi(root), midi(other));
      if (lo < 45 || hi > 88) continue;
      out.push(`${name}${octave}`);
    }
  }
  return out;
}

/**
 * `allowed` narrows the difficulty pool rather than replacing it. If the
 * intersection cannot support a question (fewer than two intervals), we widen
 * back out instead of failing: a learner who set an impossible filter should
 * still get a question, not an exception.
 */
function resolveIntervalPool(pool, allowed) {
  if (!allowed || !allowed.length) return pool;
  const wanted = allowed.map((x) => (typeof x === 'string' ? x : intervalSymbol(x)));
  const inter = pool.filter((p) => wanted.includes(p));
  if (inter.length >= 2) return inter;
  const valid = wanted.filter((w) => { try { parseInterval(w); return true; } catch { return false; } });
  if (valid.length >= 2) return valid;
  return pool;
}

/**
 * @param {function} rng
 * @param {{difficulty?: number, mode?: string, allowed?: string[]}} opts
 */
export function generateIntervalQuestion(rng, opts = {}) {
  const difficulty = clampDifficulty(opts.difficulty ?? 1);
  const mode = MODES.includes(opts.mode) ? opts.mode : pick(rng, modesFor(difficulty));
  const direction = mode === 'melodic-down' ? -1 : 1;
  // A descending unison is not descending. It belongs in the ascending and
  // harmonic modes, where "no change" is a real thing to recognise.
  const levelPool = intervalPoolFor(difficulty, mode).filter((s) => !(direction < 0 && s === 'P1'));
  const pool = resolveIntervalPool(levelPool, opts.allowed);

  // Only intervals we can actually place on a root at this level.
  const playable = pool.filter((s) => rootsFor(s, direction, difficulty).length > 0);
  const usable = playable.length >= 2 ? playable
    : levelPool.filter((s) => rootsFor(s, direction, difficulty).length > 0);

  const answerSymbol = pick(rng, usable);
  const answerIv = parseInterval(answerSymbol);
  const root = parseNote(pick(rng, rootsFor(answerSymbol, direction, difficulty)));
  const other = transpose(root, answerIv, direction);

  const orderedFor = (iv) => {
    const partner = safeTranspose(root, iv, direction);
    if (!partner) return null;
    return direction < 0 ? [root, partner] : [root, partner];
  };

  const heard = orderedFor(answerIv);

  const distractorCount = difficulty <= 2 ? 2 : 3;
  const others = usable.filter((s) => s !== answerSymbol && orderedFor(parseInterval(s)));
  const distance = (s) => Math.abs(semitones(parseInterval(s)) - semitones(answerIv)) || 0.5;
  const wrong = nearOrFar(rng, others, distance, difficulty, distractorCount);

  const toChoice = (s) => {
    const iv = parseInterval(s);
    return {
      id: `iv:${s}`,
      label: intervalName(iv),
      short: s,
      value: s,
      notes: orderedFor(iv),
    };
  };

  const choices = decorateAll(
    assertDistinct(shuffle(rng, [answerSymbol, ...wrong].map(toChoice))).filter((c) => c.notes),
    root,
  );
  const answer = choices.find((c) => c.value === answerSymbol);

  const style = mode === 'harmonic' || mode === 'visual' ? 'harmonic'
    : mode === 'melodic-down' ? 'melodic-down' : 'melodic-up';

  const prompt = mode === 'visual'
    ? `Name the interval from ${nmo(heard[0])} to ${nmo(heard[1])}. Read the spelling, not just the sound.`
    : mode === 'harmonic'
      ? 'Both notes sound together. Name the interval.'
      : `Two notes, played ${direction < 0 ? 'high to low' : 'low to high'}. Name the interval.`;

  const conceptIds = [
    'interval.identify',
    `interval.${answerSymbol}`,
    `interval.mode.${mode}`,
    `interval.category.${intervalCategory(other, root)}`,
  ];

  return {
    id: hashId('iv', [mode, answerSymbol, noteName(root, { unicode: false, octave: true }), difficulty]),
    type: 'interval',
    difficulty,
    mode,
    root,
    reference: root,
    prompt,
    promptAudio: { notes: heard, style },
    choices,
    answerId: answer.id,
    conceptIds,
    explain(chosenId) {
      const chosen = resolveChoice(choices, chosenId);
      const correct = !!chosen && chosen.id === answer.id;
      const reasoning = explainIntervalPair(heard[0], heard[1]);
      const steps = [...reasoning.steps];
      let compare;

      if (correct) {
        // Even a right answer earns a contrast: the neighbour it will one day
        // be confused with is the next thing to learn.
        const rival = choices.filter((c) => c.id !== answer.id)
          .sort((x, y) => distance(x.value) - distance(y.value))[0];
        if (rival) {
          steps.push({
            id: 'contrast',
            text: `The nearest thing to it here is ${aOrAn(rival.label)}, `
              + `${plural(Math.abs(semitones(parseInterval(rival.value)) - semitones(answerIv)), 'half step')} `
              + `away. Hear them side by side while you have the sound in your head.`,
          });
          compare = {
            intro: 'Lock it in:',
            a: { label: `${answer.label} (what you just named)`, notes: answer.notes, style },
            b: { label: `${rival.label} (its closest neighbour)`, notes: rival.notes, style },
            listenFor: describeDifference(answer.notes, rival.notes),
          };
        }
      } else if (chosen) {
        const claimedIv = parseInterval(chosen.value);
        const claimedTarget = safeTranspose(heard[0], claimedIv, direction);
        if (claimedTarget) {
          const gap = midi(claimedTarget) - midi(heard[1]);
          steps.push({
            id: 'claim',
            text: gap === 0
              ? `You answered ${chosen.label}. ${cap(aOrAn(chosen.label))} from ${nmo(heard[0])} lands on `
                + `${nmo(claimedTarget)}: the same key as ${nmo(heard[1])}, spelled differently. `
                + `The letters decide which name is right: ${letterPath(heard[0], heard[1]).text} `
                + `spans ${plural(reasoning.letterSpan, 'letter name')}.`
              : `You answered ${chosen.label}. ${cap(aOrAn(chosen.label))} ${direction < 0 ? 'below' : 'above'} `
                + `${nmo(heard[0])} is ${nmo(claimedTarget)}, which is `
                + `${plural(Math.abs(gap), 'half step')} ${gap > 0 ? 'above' : 'below'} the `
                + `${nmo(heard[1])} you actually got.`,
          });
        } else {
          steps.push({
            id: 'claim',
            text: `You answered ${chosen.label}, which is ${plural(semitones(claimedIv), 'half step')}. `
              + `This one is ${plural(reasoning.semitones, 'half step')}.`,
          });
        }
        compare = {
          intro: 'Play these back to back. This is the whole lesson:',
          a: { label: `${answer.label} (what was played)`, notes: answer.notes, style },
          b: { label: `${chosen.label} (what you named)`, notes: chosen.notes, style },
          listenFor: describeDifference(answer.notes, chosen.notes),
        };
      } else {
        steps.push({
          id: 'unanswered',
          text: `No answer was given. It was ${aOrAn(answer.label)}.`,
        });
        // Turning a sound around only teaches something if it changes: a
        // simultaneity has no direction, and a unison has nowhere to go. In
        // both cases the useful contrast is the nearest neighbour instead.
        const flat = midi(answer.notes[0]) === midi(answer.notes[1]);
        if (style === 'harmonic' || flat) {
          const rival = choices.filter((c) => c.id !== answer.id)
            .sort((x, y) => distance(x.value) - distance(y.value))[0] ?? answer;
          compare = {
            intro: 'Hear it against its nearest neighbour:',
            a: { label: `${answer.label} (the answer)`, notes: answer.notes, style },
            b: { label: `${rival.label} (the nearest thing to it)`, notes: rival.notes, style },
            listenFor: describeDifference(answer.notes, rival.notes),
          };
        } else {
          const flipped = [...answer.notes].reverse();
          compare = {
            intro: 'Hear it again, then turned around:',
            a: { label: `${answer.label} (the answer)`, notes: answer.notes, style },
            b: {
              label: `${answer.label} again, ${direction < 0 ? 'bottom note first' : 'top note first'}`,
              notes: flipped,
              style: direction < 0 ? 'melodic-up' : 'melodic-down',
            },
            listenFor: `${cap(intervalName(answerIv))} either way: ${nmo(flipped[0])} to ${nmo(flipped[1])} `
              + `covers the same ${plural(semitones(answerIv), 'half step')}. Direction changes the feel, not the distance.`,
          };
        }
      }

      return finishExplanation({
        correct,
        chosen,
        answer,
        headline: correct
          ? `Correct: ${nmo(heard[0])} to ${nmo(heard[1])} is ${aOrAn(intervalName(answerIv))}.`
          : `That was ${aOrAn(intervalName(answerIv))}: ${nmo(heard[0])} to ${nmo(heard[1])}.`,
        steps,
        compare,
        conceptIds,
      });
    },
  };
}

// ===========================================================================
// 3. CHORDS — identify what you hear, or construct what you are asked for
// ===========================================================================

function chordNotesSafe(root, chordId) {
  try {
    const notes = buildChord(root, chordId);
    if (notes.some((n) => Math.abs(n.alter) > 2)) return null;
    return notes;
  } catch {
    return null;
  }
}

/** How many notes differ between two chord types on the same root. */
function chordDistance(root, idA, idB) {
  const a = chordNotesSafe(root, idA);
  const b = chordNotesSafe(root, idB);
  if (!a || !b) return 99;
  const bp = b.map(pitchClass);
  const ap = a.map(pitchClass);
  const onlyA = ap.filter((p) => !bp.includes(p)).length;
  const onlyB = bp.filter((p) => !ap.includes(p)).length;
  return Math.max(onlyA, onlyB) + Math.abs(a.length - b.length);
}

/**
 * @param {function} rng
 * @param {{difficulty?: number, form?: 'identify'|'construct'}} opts
 */
export function generateChordQuestion(rng, opts = {}) {
  const difficulty = clampDifficulty(opts.difficulty ?? 1);
  const forms = difficulty >= 3 ? ['identify', 'construct'] : ['identify'];
  const form = forms.includes(opts.form) ? opts.form : pick(rng, forms);
  const pool = chordPoolFor(difficulty);

  // Root and quality must both work; filter before choosing so nothing throws.
  const rootNames = rootPoolFor(difficulty);
  let root = null;
  let chordId = null;
  for (const attempt of shuffle(rng, rootNames)) {
    const candidate = parseNote(`${attempt}4`);
    const ok = pool.filter((id) => chordNotesSafe(candidate, id));
    if (ok.length >= 2) {
      root = candidate;
      chordId = pick(rng, ok);
      break;
    }
  }
  if (!root) {
    root = parseNote('C4');
    chordId = pick(rng, ['major', 'minor']);
  }

  const answerNotes = buildChord(root, chordId);
  const size = answerNotes.length;

  // Comparable distractors only: a triad against a seventh chord is answered
  // by counting notes, which teaches nothing about quality.
  const siblings = pool.filter((id) => {
    if (id === chordId) return false;
    const n = chordNotesSafe(root, id);
    return n && n.length === size;
  });
  const dist = (id) => chordDistance(root, chordId, id);
  const wrongIds = nearOrFar(rng, siblings.length >= 3 ? siblings : pool.filter((id) => id !== chordId && chordNotesSafe(root, id)), dist, difficulty, 3);

  const style = difficulty <= 2 ? 'harmonic' : pick(rng, ['harmonic', 'arpeggio']);
  const conceptIds = ['chord', `chord.${chordId}`, `chord.family.${getChord(chordId).family}`, `chord.form.${form}`];

  let choices;
  let prompt;
  let promptAudio;

  if (form === 'identify') {
    const toChoice = (id) => ({
      id: `ch:${id}`,
      label: `${nm(root)} ${getChord(id).name.toLowerCase()}`,
      short: chordTag(root, id),
      value: id,
      notes: buildChord(root, id),
    });
    choices = decorateAll(assertDistinct(shuffle(rng, [chordId, ...wrongIds].map(toChoice))), root);
    prompt = `The root is ${nm(root)}. What quality of chord is this?`;
    promptAudio = { notes: answerNotes, style };
  } else {
    const spell = (notes) => notes.map((n) => nm(n)).join('–');
    const toChoice = (id) => {
      const notes = buildChord(root, id);
      return { id: `cn:${id}`, label: spell(notes), short: chordTag(root, id), value: id, notes };
    };
    const built = [chordId, ...wrongIds].map(toChoice);
    // At the top levels, add the trap that only reading catches: the right
    // sound written with the wrong letters.
    if (difficulty >= 5) {
      const misspelled = answerNotes.map((n, i) => (i === answerNotes.length - 1
        ? (respell(n, LETTERS[(letterIndex(n.letter) + 1) % 7]) ?? n) : n));
      if (misspelled.some((n, i) => !isSameNote(n, answerNotes[i]))) {
        built.push({
          id: 'cn:misspelled',
          label: spell(misspelled),
          short: `${chordTag(root, chordId)}, misspelled`,
          value: 'misspelled',
          notes: misspelled,
        });
      }
    }
    choices = assertDistinct(shuffle(rng, built)).slice(0, 4);
    if (!choices.some((c) => c.value === chordId)) {
      choices = shuffle(rng, assertDistinct([toChoice(chordId), ...choices]).slice(0, 4));
    }
    choices = decorateAll(choices, root);
    prompt = `Spell ${chordTitle(root, chordId)}. Which of these is it?`;
    promptAudio = { notes: [root], style: 'single' };
  }

  const answer = choices.find((c) => c.value === chordId);
  const roles = chordToneRoles(root, chordId);

  return {
    id: hashId('ch', [form, chordId, noteName(root, { unicode: false }), difficulty]),
    type: 'chord',
    difficulty,
    form,
    root,
    reference: root,
    chordId,
    prompt,
    promptAudio,
    choices,
    answerId: answer.id,
    conceptIds,
    explain(chosenId) {
      const chosen = resolveChoice(choices, chosenId);
      const correct = !!chosen && chosen.id === answer.id;
      const steps = [];

      steps.push({
        id: 'formula',
        text: `${chordTag(root, chordId)} is built from ${nm(root)} as `
          + roles.map((r) => `${r.name} (${r.role}, ${intervalName(parseInterval(r.interval))})`).join(', ')
          + `. Every one of those is measured from the root, which is why the same shape works in any key.`,
      });

      if (correct) {
        const rival = choices.filter((c) => c.id !== answer.id)
          .sort((x, y) => dist(x.value) - dist(y.value))[0];
        if (rival && rival.notes) {
          steps.push({
            id: 'contrast',
            text: `Closest neighbour: ${rival.short}. ${describeDifference(answer.notes, rival.notes)}`,
          });
        }
        const compare = rival ? {
          intro: 'Hold the difference in your ear:',
          a: { label: `${answer.short} (correct)`, notes: answer.notes, style },
          b: { label: `${rival.short} (one step away)`, notes: rival.notes, style },
          listenFor: describeDifference(answer.notes, rival.notes),
        } : undefined;
        return finishExplanation({
          correct, chosen, answer, conceptIds, steps, compare,
          headline: `Correct. ${chordTitle(root, chordId)}.`,
        });
      }

      if (chosen && chosen.value !== 'misspelled' && CHORDS[chosen.value]) {
        const chosenRoles = chordToneRoles(root, chosen.value);
        const changed = [];
        for (const r of roles) {
          const twin = chosenRoles.find((x) => x.role === r.role || parseInterval(x.interval).number === parseInterval(r.interval).number);
          if (twin && !isSameNote(twin.note, r.note)) changed.push({ from: twin, to: r });
        }
        steps.push({
          id: 'difference',
          text: changed.length
            ? changed.map(({ from, to }) => {
              const gap = midi(to.note) - midi(from.note);
              return `${chordTag(root, chosen.value)} puts ${from.name} on the ${from.role} `
                + `(${intervalName(parseInterval(from.interval))} above ${nm(root)}); `
                + `${chordTag(root, chordId)} needs ${to.name} there `
                + `(${intervalName(parseInterval(to.interval))}), `
                + `${plural(Math.abs(gap), 'half step')} ${gap > 0 ? 'higher' : 'lower'}.`;
            }).join(' ')
            : `${chordTag(root, chosen.value)} and ${chordTag(root, chordId)} share their notes; `
              + `what differs is which note is heard as the root.`,
        });
        if (changed.length === 1) {
          steps.push({
            id: 'rule',
            text: `One note is the entire difference between these two chords. `
              + `That is worth knowing: chord qualities are neighbours, not separate worlds.`,
          });
        }
      } else if (chosen && chosen.value === 'misspelled') {
        steps.push({
          id: 'spelling',
          text: `That set sounds identical, but it is spelled wrong. A `
            + `${getChord(chordId).name.toLowerCase()} stacks specific interval numbers above the root, `
            + `so the letters are forced: ${roles.map((r) => `${r.role} = some kind of ${ordinalWord(parseInterval(r.interval).number)} = ${r.name}`).join(', ')}.`,
        });
      } else {
        steps.push({ id: 'unanswered', text: `No answer given. The chord is ${nm(root)} ${getChord(chordId).name.toLowerCase()}.` });
      }

      // With no answer to react to, contrast against the nearest chord in the
      // set — never against itself.
      const fallback = choices.filter((c) => c.id !== answer.id)
        .sort((x, y) => dist(x.value) - dist(y.value))[0] ?? answer;
      const other = chosen ?? fallback;
      const compare = {
        intro: 'Play them one after the other:',
        a: { label: `${answer.short} (the answer)`, notes: answer.notes, style },
        b: {
          label: chosen ? `${chosen.short} (your choice)` : `${other.short} (the nearest thing to it)`,
          notes: other.notes,
          style,
        },
        listenFor: describeDifference(answer.notes, other.notes),
      };

      return finishExplanation({
        correct, chosen, answer, conceptIds, steps, compare,
        headline: `That one is ${chordTitle(root, chordId)}.`,
      });
    },
  };
}

// ===========================================================================
// 4. SCALE DEGREES
// ===========================================================================

/**
 * @param {function} rng
 * @param {{difficulty?: number, form?: 'degree-to-note'|'note-to-degree'}} opts
 */
export function generateScaleDegreeQuestion(rng, opts = {}) {
  const difficulty = clampDifficulty(opts.difficulty ?? 1);
  const forms = difficulty >= 3 ? ['degree-to-note', 'note-to-degree'] : ['degree-to-note'];
  const form = forms.includes(opts.form) ? opts.form : pick(rng, forms);
  const scaleId = pick(rng, scalePoolFor(difficulty));

  const rootNames = rootPoolFor(difficulty);
  let tonic = null;
  let scale = null;
  for (const name of shuffle(rng, rootNames)) {
    const candidate = parseNote(`${name}4`);
    try {
      const built = buildScale(candidate, scaleId);
      if (built.every((n) => Math.abs(n.alter) <= 2)) { tonic = candidate; scale = built; break; }
    } catch { /* this tonic needs accidentals nobody writes; try the next */ }
  }
  if (!tonic) { tonic = parseNote('C4'); scale = buildScale(tonic, 'major'); }

  const def = getScale(scaleId);
  const labels = degreeLabels(scaleId);
  const index = 1 + randInt(rng, scale.length - 1); // never degree 1: it is the given
  const target = scale[index];
  const label = labels[index];
  const formulaIv = parseInterval(def.formula[index]);

  const conceptIds = ['scale.degree', `scale.${scaleId}`, `scale.degree.${label}`, `scale.form.${form}`];
  let choices;
  let prompt;
  let answerValue;

  if (form === 'degree-to-note') {
    const others = scale.filter((n, i) => i !== index);
    const neighbours = [scale[(index + 1) % scale.length], scale[(index - 1 + scale.length) % scale.length]];
    const chromatic = [safeTranspose(target, parseInterval('A1')), safeTranspose(target, parseInterval('A1'), -1)]
      .filter((n) => n && Math.abs(n.alter) <= 2 && !scale.some((s) => isSameNote(s, n)));
    const candidates = [...neighbours, ...chromatic, ...others]
      .filter((n) => n && !isSameNote(n, target));
    const uniq = [];
    for (const c of candidates) if (!uniq.some((u) => isSameNote(u, c))) uniq.push(c);
    const wrong = difficulty >= 4 ? uniq.slice(0, 6) : uniq;
    const picked = sample(rng, wrong, 3);
    const toChoice = (n) => ({
      id: `sd:${noteName(n, { unicode: false, octave: true })}`,
      label: nm(n),
      value: noteName(n, { unicode: false }),
      notes: [tonic, n],
    });
    choices = decorateAll(assertDistinct(shuffle(rng, [target, ...picked].map(toChoice))), tonic);
    answerValue = noteName(target, { unicode: false });
    prompt = `In ${nm(tonic)} ${def.name.toLowerCase()}, which note is degree ${label}?`;
  } else {
    const wrongLabels = sample(rng, labels.filter((l) => l !== label), 3);
    const toChoice = (l) => {
      const i = labels.indexOf(l);
      return { id: `dg:${l}`, label: `degree ${l}`, value: l, notes: [tonic, scale[i]] };
    };
    choices = decorateAll(assertDistinct(shuffle(rng, [label, ...wrongLabels].map(toChoice))), tonic);
    answerValue = label;
    prompt = `In ${nm(tonic)} ${def.name.toLowerCase()}, which degree is ${nm(target)}?`;
  }

  const answer = choices.find((c) => c.value === answerValue);

  return {
    id: hashId('sd', [form, scaleId, noteName(tonic, { unicode: false }), label, difficulty]),
    type: 'scale-degree',
    difficulty,
    form,
    tonic,
    reference: tonic,
    scaleId,
    degree: index + 1,
    degreeLabel: label,
    prompt,
    promptAudio: { notes: [tonic], style: 'single' },
    choices,
    answerId: answer.id,
    conceptIds,
    explain(chosenId) {
      const chosen = resolveChoice(choices, chosenId);
      const correct = !!chosen && chosen.id === answer.id;
      const steps = [];

      steps.push({
        id: 'formula',
        text: `${def.name} is a set of distances from its tonic, not a list of note names. `
          + `Degree ${label} is ${intervalSymbol(formulaIv)}, ${aOrAn(intervalName(formulaIv))} above the tonic, `
          + `so from ${nm(tonic)} it has to be ${nm(target)}.`,
      });
      steps.push({ id: 'count', text: explainIntervalPair(tonic, target).text });

      if (!correct && chosen) {
        const chosenNote = form === 'degree-to-note' ? chosen.notes[1] : scale[labels.indexOf(chosen.value)];
        if (form === 'degree-to-note') {
          const deg = degreeOf(tonic, scaleId, chosenNote);
          steps.push({
            id: 'chosen',
            text: deg
              ? `${nm(chosenNote)} is in this scale, but it is degree ${labels[deg - 1]}, not ${label}.`
              : `${nm(chosenNote)} is not in ${nm(tonic)} ${def.name.toLowerCase()} at all. `
                + `It is ${plural(Math.abs(semitonesBetween(target, chosenNote)), 'half step')} from ${nm(target)}, `
                + `which puts it outside the key.`,
          });
        } else {
          const ivChosen = parseInterval(def.formula[labels.indexOf(chosen.value)]);
          steps.push({
            id: 'chosen',
            text: `Degree ${chosen.value} is ${intervalSymbol(ivChosen)} above ${nm(tonic)}, which lands on `
              + `${nm(chosenNote)}, not the ${nm(target)} in the question.`,
          });
        }
      } else if (!correct) {
        steps.push({ id: 'unanswered', text: `No answer given. Degree ${label} of ${nm(tonic)} ${def.name.toLowerCase()} is ${nm(target)}.` });
      } else {
        steps.push({
          id: 'character',
          text: `${def.character} Degree ${label} is part of why.`,
        });
      }

      const wrongNote = !correct && chosen
        ? (form === 'degree-to-note' ? chosen.notes[1] : scale[labels.indexOf(chosen.value)])
        : null;

      const compare = {
        intro: 'Hear the degree in place, then on its own:',
        a: { label: `${nm(tonic)} ${def.name.toLowerCase()}, tonic up to degree ${label}`, notes: [tonic, target], style: 'melodic-up' },
        b: wrongNote
          ? { label: `Tonic up to ${nm(wrongNote)} (what you chose)`, notes: [tonic, wrongNote], style: 'melodic-up' }
          : { label: `The whole scale`, notes: scale, style: 'scale' },
        listenFor: wrongNote
          ? describeDifference([tonic, target], [tonic, wrongNote])
          : `Degree ${label} sits ${plural(semitones(formulaIv), 'half step')} above home.`,
      };

      return finishExplanation({
        correct, chosen, answer, conceptIds, steps, compare,
        headline: correct
          ? `Correct. Degree ${label} of ${nm(tonic)} ${def.name.toLowerCase()} is ${nm(target)}.`
          : `Degree ${label} of ${nm(tonic)} ${def.name.toLowerCase()} is ${nm(target)}.`,
      });
    },
  };
}

// ===========================================================================
// 5. CONSTRUCTION — "change one note"
//
// The fastest way to make someone hear what a quality *is*: hold everything
// else still and move one note. Pairs are found by comparing pitch-class sets,
// so any two chords or scales that happen to be one note apart qualify — the
// list is discovered, not typed out.
// ===========================================================================

function oneNoteApartChords(root, pool) {
  const pairs = [];
  for (const from of pool) {
    const a = chordNotesSafe(root, from);
    if (!a) continue;
    for (const to of pool) {
      if (to === from) continue;
      const b = chordNotesSafe(root, to);
      if (!b || b.length !== a.length) continue;
      const ap = a.map(pitchClass);
      const bp = b.map(pitchClass);
      const gone = ap.filter((p) => !bp.includes(p));
      const added = bp.filter((p) => !ap.includes(p));
      if (gone.length === 1 && added.length === 1) pairs.push({ from, to });
    }
  }
  return pairs;
}

function oneNoteApartScales(tonic, pool) {
  const pairs = [];
  for (const from of pool) {
    let a;
    try { a = buildScale(tonic, from); } catch { continue; }
    for (const to of pool) {
      if (to === from) continue;
      let b;
      try { b = buildScale(tonic, to); } catch { continue; }
      if (b.length !== a.length) continue;
      const ap = a.map(pitchClass);
      const bp = b.map(pitchClass);
      const gone = ap.filter((p) => !bp.includes(p));
      const added = bp.filter((p) => !ap.includes(p));
      if (gone.length === 1 && added.length === 1) pairs.push({ from, to });
    }
  }
  return pairs;
}

/** Which note of `a` moved, and where it landed in `b`. Both engine-built. */
function singleMove(a, b) {
  const bp = b.map(pitchClass);
  const ap = a.map(pitchClass);
  const fromNote = a.find((n) => !bp.includes(pitchClass(n)));
  const toNote = b.find((n) => !ap.includes(pitchClass(n)));
  if (!fromNote || !toNote) return null;
  return { fromNote, toNote, delta: midi(toNote) - midi(fromNote) };
}

/**
 * Whatever a set of notes turns out to be after a change. Detection is the
 * engine's job; when nothing standard fits we say so rather than guess, which
 * is itself the lesson ("that move doesn't land on a chord at all").
 */
function identifySet(root, notes, kind) {
  if (kind === 'chord') {
    // detectChord() transposes every known formula from every input note, so a
    // double-flat in the set can push it past the accidental range and throw.
    // A name we cannot produce is not worth crashing an explanation over.
    let hit = null;
    try { hit = detectChord(notes)[0] ?? null; } catch { hit = null; }
    if (hit) {
      const tag = chordTag(hit.root, hit.chordId);
      return hit.inversion ? `${tag} in ${hit.inversionName}` : tag;
    }
    return notes.map((n) => nm(n)).join('–');
  }
  const offsets = notes.map((n) => ((pitchClass(n) - pitchClass(root)) % 12 + 12) % 12);
  const hit = identifyScaleBySemitones(offsets);
  return hit ? `${nm(root)} ${hit.name.toLowerCase()}` : `no standard scale (${notes.map((n) => nm(n)).join('–')})`;
}

/**
 * Legal single-note changes that are *not* the answer — generated by moving one
 * note a half step and letting the engine spell it, so even the wrong options
 * are real music with real names.
 */
function chromaticNeighbourMoves(root, source, kind, forbiddenPcSets) {
  const out = [];
  const usedLetters = new Set(source.map((n) => n.letter));
  const taken = [...forbiddenPcSets];
  for (let i = 0; i < source.length; i++) {
    for (const dir of [1, -1]) {
      let landed = null;
      for (const step of ['A1', 'm2']) {
        const cand = safeTranspose(source[i], parseInterval(step), dir);
        if (!cand || Math.abs(cand.alter) > 2) continue;
        if (step === 'm2' && usedLetters.has(cand.letter)) continue;
        landed = cand;
        break;
      }
      if (!landed) continue;
      const notes = sortNotes(source.map((n, j) => (j === i ? landed : n)));
      const pcs = [...new Set(notes.map(pitchClass))].sort((a, b) => a - b);
      if (pcs.length !== source.length) continue;
      const key = pcs.join(',');
      if (taken.includes(key)) continue;
      taken.push(key);
      out.push({
        key,
        notes,
        move: { fromNote: source[i], toNote: landed, delta: midi(landed) - midi(source[i]) },
        identity: identifySet(root, notes, kind),
      });
    }
  }
  return out;
}

function moveLabel(fromNote, toNote) {
  const d = midi(toNote) - midi(fromNote);
  const verb = d > 0 ? 'raise' : d < 0 ? 'lower' : 'respell';
  const size = Math.abs(d) === 1 ? 'a half step' : Math.abs(d) === 2 ? 'a whole step' : plural(Math.abs(d), 'half step');
  return `${verb} ${nm(fromNote)} to ${nm(toNote)}${d === 0 ? '' : ` (${size})`}`;
}

/**
 * @param {function} rng
 * @param {{difficulty?: number, kind?: 'chord'|'scale'}} opts
 */
export function generateConstructionQuestion(rng, opts = {}) {
  const difficulty = clampDifficulty(opts.difficulty ?? 1);
  const kinds = difficulty >= 4 ? ['chord', 'scale'] : ['chord'];
  const kind = kinds.includes(opts.kind) ? opts.kind : pick(rng, kinds);

  const rootNames = rootPoolFor(difficulty);
  const pool = kind === 'chord' ? chordPoolFor(difficulty) : scalePoolFor(Math.max(3, difficulty));

  let root = null;
  let pairs = [];
  for (const name of shuffle(rng, rootNames)) {
    const candidate = parseNote(`${name}4`);
    const found = kind === 'chord'
      ? oneNoteApartChords(candidate, pool)
      : oneNoteApartScales(candidate, pool);
    if (found.length) { root = candidate; pairs = found; break; }
  }
  if (!root) {
    root = parseNote('C4');
    pairs = oneNoteApartChords(root, ['major', 'minor', 'diminished', 'augmented']);
  }

  const { from, to } = pick(rng, pairs);
  const build = (id) => (kind === 'chord' ? buildChord(root, id) : buildScale(root, id));
  const nameOf = (id) => (kind === 'chord' ? getChord(id).name.toLowerCase() : getScale(id).name.toLowerCase());
  const sourceNotes = build(from);
  const targetNotes = build(to);
  const correctMove = singleMove(sourceNotes, targetNotes);

  // Distractors are other real one-note moves from the same starting set, so
  // every wrong answer is itself a nameable thing — and can be identified in
  // the explanation instead of just being rejected.
  const pcKey = (notes) => [...new Set(notes.map(pitchClass))].sort((a, b) => a - b).join(',');

  const named = pairs
    .filter((p) => p.from === from && p.to !== to)
    .map((p) => {
      const notes = build(p.to);
      return {
        value: p.to,
        short: kind === 'chord' ? chordTag(root, p.to) : `${nm(root)} ${nameOf(p.to)}`,
        notes,
        move: singleMove(sourceNotes, notes),
      };
    })
    .filter((x) => x.move);

  const wrong = sample(rng, named, 3);
  // Top up with other legal one-note moves so there are always real choices,
  // even at level 1 where only two chord qualities are in play.
  if (wrong.length < 3) {
    const forbidden = [pcKey(sourceNotes), pcKey(targetNotes), ...wrong.map((w) => pcKey(w.notes))];
    const extra = chromaticNeighbourMoves(root, sourceNotes, kind, forbidden);
    for (const x of sample(rng, extra, 3 - wrong.length)) {
      wrong.push({ value: `x:${x.key}`, short: x.identity, notes: x.notes, move: x.move });
    }
  }

  const toChoice = (o) => ({
    id: `mv:${o.value}`,
    label: cap(moveLabel(o.move.fromNote, o.move.toNote)),
    short: o.short,
    value: o.value,
    notes: o.notes,
  });

  const correctOption = {
    value: to,
    short: kind === 'chord' ? chordTag(root, to) : `${nm(root)} ${nameOf(to)}`,
    notes: targetNotes,
    move: correctMove,
  };

  let choices = assertDistinct(shuffle(rng, [correctOption, ...wrong].map(toChoice)));
  if (!choices.some((c) => c.value === to)) {
    choices = [toChoice(correctOption), ...choices].slice(0, 4);
  }
  choices = decorateAll(choices, root);

  const answer = choices.find((c) => c.value === to);
  const spell = (notes) => notes.map((n) => nm(n)).join('–');
  const conceptIds = ['construction', `construction.${kind}`, `${kind}.${to}`, `${kind}.${from}`];

  return {
    id: hashId('cn', [kind, from, to, noteName(root, { unicode: false }), difficulty]),
    type: 'construction',
    difficulty,
    kind,
    root,
    reference: root,
    fromId: from,
    toId: to,
    sourceNotes,
    prompt: `${nm(root)} ${nameOf(from)} is ${spell(sourceNotes)}. `
      + `Change exactly one note to turn it into ${nm(root)} ${nameOf(to)}.`,
    promptAudio: { notes: sourceNotes, style: kind === 'chord' ? 'harmonic' : 'scale' },
    choices,
    answerId: answer.id,
    conceptIds,
    explain(chosenId) {
      const chosen = resolveChoice(choices, chosenId);
      const correct = !!chosen && chosen.id === answer.id;
      const steps = [];

      const ivFrom = safeInterval(root, correctMove.fromNote);
      const ivTo = safeInterval(root, correctMove.toNote);
      steps.push({
        id: 'role',
        text: ivFrom && ivTo
          ? `The note that has to move is ${nm(correctMove.fromNote)}, `
            + `${intervalName(ivFrom)} above ${nm(root)}. ${nm(root)} ${nameOf(to)} needs `
            + `${aOrAn(intervalName(ivTo))} there instead, which is ${nm(correctMove.toNote)}. `
            + `Same letter position in the stack, different size.`
          : `${nm(correctMove.fromNote)} becomes ${nm(correctMove.toNote)}.`,
      });
      steps.push({ id: 'count', text: explainIntervalPair(correctMove.fromNote, correctMove.toNote).text });
      steps.push({
        id: 'rest',
        text: `Nothing else changes: ${spell(sourceNotes.filter((n) => !isSameNote(n, correctMove.fromNote)))} `
          + `are common to both. One note is the entire distance between `
          + `${nm(root)} ${nameOf(from)} and ${nm(root)} ${nameOf(to)}.`,
      });

      if (!correct && chosen) {
        const identified = chosen.short;
        steps.push({
          id: 'chosen',
          text: `${chosen.label} is a legal single change, but it produces ${identified} `
            + `(${spell(chosen.notes)}), a different destination.`,
        });
      } else if (!correct) {
        steps.push({ id: 'unanswered', text: `No answer given. ${cap(moveLabel(correctMove.fromNote, correctMove.toNote))}.` });
      }

      const compare = {
        intro: 'Play the before and after:',
        a: { label: `${nm(root)} ${nameOf(from)} (where you started)`, notes: sourceNotes, style: kind === 'chord' ? 'harmonic' : 'scale' },
        b: {
          label: correct || !chosen
            ? `${nm(root)} ${nameOf(to)} (after the change)`
            : `${chosen.short} (where your change led)`,
          notes: correct || !chosen ? targetNotes : chosen.notes,
          style: kind === 'chord' ? 'harmonic' : 'scale',
        },
        listenFor: describeDifference(sourceNotes, correct || !chosen ? targetNotes : chosen.notes),
      };

      return finishExplanation({
        correct, chosen, answer, conceptIds, steps, compare,
        headline: correct
          ? `Correct: ${moveLabel(correctMove.fromNote, correctMove.toNote)} and you have ${nm(root)} ${nameOf(to)}.`
          : `The one change that works: ${moveLabel(correctMove.fromNote, correctMove.toNote)}.`,
      });
    },
  };
}

// ===========================================================================
// ROUTER
// ===========================================================================

export const GENERATORS = {
  'note-hunt': generateNoteHuntQuestion,
  interval: generateIntervalQuestion,
  chord: generateChordQuestion,
  'scale-degree': generateScaleDegreeQuestion,
  construction: generateConstructionQuestion,
};

/** Pick a question type available at this level and generate one. */
export function generateQuestion(rng, opts = {}) {
  const difficulty = clampDifficulty(opts.difficulty ?? 1);
  const available = ['note-hunt', 'interval'];
  if (difficulty >= 2) available.push('chord', 'scale-degree');
  if (difficulty >= 3) available.push('construction');
  const type = GENERATORS[opts.type] ? opts.type : pick(rng, available);
  return GENERATORS[type](rng, { ...opts, difficulty });
}

// ===========================================================================
// ADAPTIVE DIFFICULTY
//
// Accuracy alone cannot tell you what to do next. Someone who is right every
// time but takes nine seconds is *calculating*, not hearing — more of the same
// material, faster, is what they need. Someone who is wrong in under a second
// is guessing, and handing them harder material rewards the guess. Those two
// learners look identical on a percentage score and need opposite treatment,
// so pace is a first-class input here.
// ===========================================================================

const DEFAULTS = {
  window: 8,
  targetMs: 4000,   // "answered from recognition" for a single item
  slowMs: 9000,     // "answered by working it out"
  advanceAccuracy: 0.85,
  shakyAccuracy: 0.6,
  streakToAdvance: 3,
};

function median(values) {
  if (!values.length) return null;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

/**
 * @param {{correct: boolean, responseMs?: number, difficulty?: number, conceptIds?: string[]}[]} history
 *        Attempts oldest → newest. May be empty.
 * @param {{accuracy?: number, responseTime?: number, streak?: number,
 *          window?: number, targetMs?: number, slowMs?: number,
 *          difficulty?: number}} signals
 *        Measured values override anything computed from history.
 * @returns {{difficulty: number, previous: number, delta: number, action: string,
 *            pace: string, drill: string, reason: string, weakConcepts: string[],
 *            metrics: object}}
 */
export function nextDifficulty(history = [], signals = {}) {
  const cfg = { ...DEFAULTS, ...signals };
  const past = Array.isArray(history) ? history.filter(Boolean) : [];
  const recent = past.slice(-Math.max(1, cfg.window));

  const previous = clampDifficulty(
    signals.difficulty ?? past[past.length - 1]?.difficulty ?? 1,
  );

  const samples = recent.length;
  const computedAccuracy = samples
    ? recent.filter((h) => h.correct).length / samples
    : null;
  const accuracy = typeof signals.accuracy === 'number' ? signals.accuracy : computedAccuracy;

  const times = recent.map((h) => h.responseMs).filter((t) => typeof t === 'number' && t >= 0);
  const responseTime = typeof signals.responseTime === 'number' ? signals.responseTime : median(times);

  let computedStreak = 0;
  for (let i = past.length - 1; i >= 0 && past[i].correct; i--) computedStreak++;
  const streak = typeof signals.streak === 'number' ? signals.streak : computedStreak;

  // Concepts that have gone wrong more often than they have gone right.
  const tally = new Map();
  for (const h of past) {
    for (const c of h.conceptIds ?? []) {
      const t = tally.get(c) ?? { right: 0, wrong: 0 };
      if (h.correct) t.right++; else t.wrong++;
      tally.set(c, t);
    }
  }
  const weakConcepts = [...tally.entries()]
    .filter(([, t]) => t.wrong > t.right)
    .sort((a, b) => (b[1].wrong - b[1].right) - (a[1].wrong - a[1].right))
    .map(([c]) => c)
    .slice(0, 5);

  const metrics = { accuracy, responseTime, streak, samples, weakConcepts };

  if (accuracy === null && samples === 0) {
    return {
      difficulty: previous, previous, delta: 0,
      action: 'start', pace: 'unknown', drill: 'introduce',
      reason: 'No attempts yet. Start where the learner left off and measure before moving.',
      weakConcepts, metrics,
    };
  }

  const pace = responseTime === null ? 'unknown'
    : responseTime <= cfg.targetMs ? 'fast'
      : responseTime >= cfg.slowMs ? 'slow' : 'steady';

  const band = accuracy >= cfg.advanceAccuracy ? 'accurate'
    : accuracy >= cfg.shakyAccuracy ? 'shaky' : 'struggling';

  let delta = 0;
  let action = 'hold';
  let drill = 'mixed';
  let reason = '';

  if (band === 'accurate' && pace === 'fast') {
    if (streak >= cfg.streakToAdvance) {
      delta = 1; action = 'advance'; drill = 'introduce';
      reason = `${Math.round(accuracy * 100)}% and answering inside ${cfg.targetMs}ms with a streak of ${streak}. Recognition is automatic, so widen the pool.`;
    } else {
      action = 'hold'; drill = 'mixed';
      reason = 'Fast and accurate, but not yet on a run. One more solid streak before adding material.';
    }
  } else if (band === 'accurate' && (pace === 'slow' || pace === 'steady')) {
    action = 'build-fluency'; drill = 'speed';
    reason = `The answers are right but ${pace === 'slow' ? 'slow' : 'not yet quick'}: that is counting, not hearing. `
      + 'Same material, shorter answer window, until it becomes recognition.';
  } else if (band === 'shaky' && pace === 'fast') {
    action = 'slow-down'; drill = 'deliberate';
    reason = 'Quick answers with real errors. That pattern is guessing. Remove the clock and require the reasoning before the answer.';
  } else if (band === 'shaky') {
    action = 'hold'; drill = 'review';
    reason = 'Working it out and getting most of it. Stay here and review the misses rather than moving on.';
  } else if (band === 'struggling' && pace === 'fast') {
    delta = -1; action = 'ease'; drill = 'deliberate';
    reason = 'Fast and mostly wrong. Drop back a level and slow the pace down; speed here is not confidence.';
  } else {
    delta = -1; action = 'ease'; drill = 'scaffold';
    reason = 'Slow and mostly wrong. The pool is too wide. Narrow it back to contrasts that are easy to hear.';
  }

  if (weakConcepts.length && action !== 'advance') {
    reason += ` Focus next on: ${weakConcepts.slice(0, 3).join(', ')}.`;
  }

  const difficulty = clampDifficulty(previous + delta);
  return { difficulty, previous, delta: difficulty - previous, action, pace, drill, reason, weakConcepts, metrics };
}
