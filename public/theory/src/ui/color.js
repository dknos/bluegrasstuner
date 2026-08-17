/**
 * The single source of truth for "what colour is this note right now".
 *
 * Every view — piano, staff, fretboard, pitch ring — imports this and nothing
 * else for colour. That is what makes the same note light up identically in
 * four places at once, which is the product's core teaching move.
 *
 * The categories are musical, not decorative:
 *   tonic    the note everything is measured from
 *   perfect  unison, 4th, 5th, octave — the stable skeleton
 *   major    2nd, 3rd, 6th, 7th when they are major — bright
 *   minor    the same degrees when lowered — shadowed
 *   tritone  the 6-semitone gap, which belongs to neither family
 */

import { pitchClass } from '../theory/pitch.js';

export const IV_CATEGORIES = ['tonic', 'perfect', 'major', 'minor', 'tritone', 'none'];

/** Semitones above the tonic → colour category. */
const BY_SEMITONE = [
  'tonic',    //  0
  'minor',    //  1  m2
  'major',    //  2  M2
  'minor',    //  3  m3
  'major',    //  4  M3
  'perfect',  //  5  P4
  'tritone',  //  6  A4 / d5
  'perfect',  //  7  P5
  'minor',    //  8  m6
  'major',    //  9  M6
  'minor',    // 10  m7
  'major',    // 11  M7
];

/**
 * Which colour category does `note` fall into, relative to `tonic`?
 * Pass a null tonic for an uncoloured view.
 * @returns {'tonic'|'perfect'|'major'|'minor'|'tritone'|'none'}
 */
export function intervalCategory(note, tonic) {
  if (!note || !tonic) return 'none';
  const d = (((pitchClass(note) - pitchClass(tonic)) % 12) + 12) % 12;
  return BY_SEMITONE[d];
}

/** The CSS custom property holding this category's hue. */
export function hueVar(category) {
  return `var(--iv-${category === 'none' ? 'tonic-dim' : category})`;
}

/**
 * Apply the category to an element so the CSS in tokens.css picks it up.
 * Views should call this rather than setting colours directly.
 */
export function applyCategory(el, note, tonic) {
  el.dataset.iv = intervalCategory(note, tonic);
  return el;
}

export const CATEGORY_BLURB = {
  tonic: 'The reference note. Everything else is described by its distance from here.',
  perfect: 'A perfect interval: the stable frame of the scale. These sound solid and hollow.',
  major: 'A major interval: the brighter of the two options at this scale degree.',
  minor: 'A minor interval: the same degree lowered by a half step. Darker.',
  tritone: 'The tritone: exactly half an octave. It belongs to no family and it never sounds settled.',
  none: 'Not currently measured against a tonic.',
};
