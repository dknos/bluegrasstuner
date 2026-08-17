/**
 * THE COURSE MAP.
 *
 * Two things live here.
 *
 * 1. CONCEPTS — every idea the course can teach, and what has to be understood
 *    first. This is a directed acyclic graph, and it is the thing the map
 *    screen draws: a node is locked until every concept it points at is done.
 *    Worlds 0 and 1 are written; worlds 2 to 6 exist as ids and prerequisites
 *    only, so their nodes render locked instead of missing.
 *
 * 2. WORLDS — the lessons themselves, in order.
 *
 * The graph is kept separate from the lessons on purpose. A lesson is a
 * teaching episode; a concept is a thing you either understand or you don't.
 * One lesson can teach two concepts, and later worlds can depend on a single
 * concept without depending on the whole lesson that introduced it.
 */

import { WORLD_0 } from './world0.js';
import { WORLD_1 } from './world1.js';
import { WORLD_2 } from './world2.js';
import { WORLD_3 } from './world3.js';
import { WORLD_4 } from './world4.js';
import { WORLD_5 } from './world5.js';
import { WORLD_6 } from './world6.js';
import {
  conceptGraph, findCycles, topoOrder, validateCourse, courseOrder,
  unlockedConcepts, isLessonUnlocked,
} from './schema.js';

const C = {};
function concept(id, world, title, requires, summary) {
  C[id] = Object.freeze({ id, world, title, requires: Object.freeze(requires), summary });
}

// ---------------------------------------------------------------------------
// WORLD 0 — MUSIC BOOT CAMP
// ---------------------------------------------------------------------------
concept('musical-alphabet', 0, 'The musical alphabet', [],
  'Seven letters, A to G, then straight back to A.');
concept('why-seven-letters', 0, 'Why seven and not twelve', ['musical-alphabet'],
  'The letters name one particular seven-note set, not every pitch.');
concept('piano-layout', 0, 'The keyboard pattern', ['musical-alphabet'],
  'Black keys in twos and threes are the landmarks that tell you where you are.');
concept('half-step', 0, 'Half step', ['piano-layout'],
  'The smallest move on the keyboard: one key to the very next key.');
concept('whole-step', 0, 'Whole step', ['half-step'],
  'Two half steps, with exactly one key skipped in between.');
concept('accidentals', 0, 'Sharps and flats', ['half-step'],
  'A sharp raises a letter by a half step, a flat lowers it.');
concept('enharmonic-spelling', 0, 'Enharmonic spelling', ['accidentals'],
  'One key on the keyboard, more than one correct name, and the name matters.');
concept('octave', 0, 'The octave', ['musical-alphabet'],
  'Twelve half steps up, and the letter comes back around.');
concept('pitch-class', 0, 'Pitch class', ['octave'],
  'All the Cs are the same note name in different registers.');
concept('staff', 0, 'The staff', ['musical-alphabet', 'octave'],
  'Five lines and four spaces: height on the page means pitch.');
concept('clef', 0, 'Clefs', ['staff'],
  'A clef nails one line to one pitch so the rest can be read off it.');
concept('reading-treble-bass', 0, 'Reading treble and bass', ['clef', 'pitch-class'],
  'Two clefs, one continuous keyboard, middle C in the gap between them.');

// ---------------------------------------------------------------------------
// WORLD 1 — INTERVAL LAB
// ---------------------------------------------------------------------------
concept('interval', 1, 'What an interval is', ['half-step', 'musical-alphabet'],
  'The distance between two pitches, which is what music is actually made of.');
concept('interval-number', 1, 'Interval number', ['interval', 'musical-alphabet'],
  'Count letter names, including both ends. That gives you 2nd, 3rd, 4th.');
concept('two-number-rule', 1, 'Number plus semitones', ['interval-number', 'half-step', 'accidentals'],
  'Every interval is measured twice at once: letters for the name, semitones for the sound.');
concept('second', 1, 'Seconds', ['two-number-rule', 'whole-step'],
  'Adjacent letters. Minor if one half step, major if two.');
concept('major-minor-quality', 1, 'Major and minor quality', ['second'],
  'The same number in two sizes, a half step apart. Bright or dark.');
concept('third', 1, 'Thirds', ['major-minor-quality'],
  'Two letters apart. The interval that decides whether music sounds happy or sad.');
concept('perfect-family', 1, 'The perfect intervals', ['two-number-rule'],
  'Unison, fourth, fifth, octave: one size only, so no major or minor option.');
concept('tritone', 1, 'The tritone', ['perfect-family'],
  'Exactly half an octave. Sits between the fourth and the fifth and belongs to neither.');
concept('sixth', 1, 'Sixths', ['third', 'perfect-family'],
  'Wide, warm, and easier to hear as an upside-down third.');
concept('seventh', 1, 'Sevenths', ['sixth'],
  'One step short of the octave. Minor sevenths are smooth, major sevenths bite.');
concept('melodic-harmonic', 1, 'Melodic and harmonic intervals', ['interval'],
  'The same two notes, played one after the other or together.');
concept('interval-inversion', 1, 'Inversion', ['seventh', 'melodic-harmonic'],
  'Flip the two notes: numbers add to nine and qualities swap.');
concept('compound-interval', 1, 'Compound intervals', ['interval-inversion', 'octave'],
  'Anything bigger than an octave, named by folding it back inside one.');

// ---------------------------------------------------------------------------
// WORLDS 2–6 — stubbed. Ids and prerequisites only, so the map can draw them
// locked. No lesson claims them, and validateCourse knows not to expect any.
// ---------------------------------------------------------------------------
concept('major-scale', 2, 'The major scale', ['whole-step', 'second'],
  'One fixed pattern of whole and half steps, startable on any note.');
concept('scale-degrees', 2, 'Scale degrees', ['major-scale', 'two-number-rule'],
  'Numbering the notes of a scale so you can talk about them in any key.');
concept('minor-scales', 2, 'Minor scales', ['major-scale', 'third'],
  'Natural, harmonic and melodic minor, and what each one is for.');
concept('key-signature', 2, 'Key signatures', ['major-scale', 'accidentals', 'staff'],
  'The sharps or flats a key needs, collected at the front of the line.');
concept('modes', 2, 'Modes', ['major-scale', 'scale-degrees'],
  'The same seven notes, treated as if a different one were home.');
concept('pentatonic', 2, 'Pentatonic scales', ['major-scale', 'tritone'],
  'Five notes, chosen by leaving out the two that fight.');

concept('triad', 3, 'Triads', ['third', 'perfect-family'],
  'Three notes a third apart: the smallest complete chord.');
concept('chord-inversion', 3, 'Chord inversions', ['triad', 'interval-inversion'],
  'The same chord with a different note lowest.');
concept('seventh-chord', 3, 'Seventh chords', ['triad', 'seventh'],
  'A triad with one more third stacked on top.');
concept('chord-symbols', 3, 'Chord symbols', ['seventh-chord', 'enharmonic-spelling'],
  'Reading and writing the shorthand that working musicians use.');
concept('extensions', 3, 'Ninths, elevenths, thirteenths', ['seventh-chord', 'compound-interval'],
  'Carrying on stacking thirds past the seventh.');

concept('circle-of-fifths', 4, 'The circle of fifths', ['key-signature', 'perfect-family'],
  'Twelve keys arranged by how much they have in common.');
concept('diatonic-harmony', 4, 'Diatonic chords', ['triad', 'scale-degrees'],
  'The chords a key gives you for free.');
concept('roman-numerals', 4, 'Roman numerals', ['diatonic-harmony'],
  'Naming chords by their role so a progression survives changing key.');
concept('relative-keys', 4, 'Relative and parallel keys', ['circle-of-fifths', 'minor-scales'],
  'Same notes different home, versus same home different notes.');
concept('modulation', 4, 'Modulation', ['relative-keys', 'roman-numerals'],
  'Changing key on purpose, and making the listener believe it.');

concept('harmonic-function', 5, 'Harmonic function', ['roman-numerals'],
  'Home, on the way, and tense: the three jobs a chord can hold.');
concept('cadence', 5, 'Cadences', ['harmonic-function'],
  'The handful of endings that tell a listener a phrase is over.');
concept('voice-leading', 5, 'Voice leading', ['chord-inversion', 'harmonic-function'],
  'Moving between chords by the smallest distance each part can travel.');
concept('secondary-dominant', 5, 'Secondary dominants', ['cadence', 'chord-symbols'],
  'Borrowing another key\'s tension chord to spotlight a chord in this one.');
concept('borrowed-chords', 5, 'Borrowed chords', ['secondary-dominant', 'relative-keys'],
  'Taking a chord from the parallel key because you want its colour.');

concept('interval-ear', 6, 'Hearing intervals', ['interval-inversion', 'tritone'],
  'Naming what you hear without looking at anything.');
concept('chord-quality-ear', 6, 'Hearing chord quality', ['interval-ear', 'seventh-chord'],
  'Major, minor, diminished, dominant, by sound alone.');
concept('progression-ear', 6, 'Hearing progressions', ['chord-quality-ear', 'roman-numerals'],
  'Following harmony in real music as it goes past.');
concept('transcription', 6, 'Transcription', ['progression-ear', 'reading-treble-bass'],
  'Writing down what you hear, accurately enough to play it back.');
concept('improvisation-frames', 6, 'Playing over changes', ['progression-ear', 'modes'],
  'Choosing notes in real time because you know what the chord is doing.');

export const CONCEPTS = Object.freeze(C);

export { WORLD_0, WORLD_1, WORLD_2, WORLD_3, WORLD_4, WORLD_5, WORLD_6 };

export const WORLDS = Object.freeze([WORLD_0, WORLD_1, WORLD_2, WORLD_3, WORLD_4, WORLD_5, WORLD_6]);

/** The whole thing, in the shape validateCourse expects. */
export const COURSE = Object.freeze({ worlds: WORLDS, concepts: CONCEPTS });

/** concept id → prerequisites. Built once; the map screen walks this. */
export const PREREQUISITES = conceptGraph(CONCEPTS);

/** Lesson id → lesson, for deep links. */
export const LESSONS_BY_ID = Object.freeze(Object.fromEntries(
  courseOrder(WORLDS).map((l) => [l.id, l]),
));

/**
 * Which lesson INTRODUCES this concept.
 *
 * A concept is often developed across several lessons (seventh chords get one
 * lesson each for major, dominant and minor), so this has to keep the first
 * one rather than the last. Object.fromEntries would silently keep the last,
 * and every "go to the lesson for this concept" link on the map would drop the
 * learner into the middle of a topic instead of at its start.
 */
export const LESSON_FOR_CONCEPT = Object.freeze((() => {
  const out = {};
  for (const lesson of courseOrder(WORLDS)) {
    for (const c of lesson.teaches ?? []) {
      if (!(c in out)) out[c] = lesson.id;
    }
  }
  return out;
})());

/** Concepts with no lesson yet — worlds 2 to 6. The map draws these locked. */
export function isStubConcept(conceptId) {
  return !(conceptId in LESSON_FOR_CONCEPT);
}

export {
  conceptGraph, findCycles, topoOrder, validateCourse, courseOrder,
  unlockedConcepts, isLessonUnlocked,
};
