/**
 * LESSON SCHEMA — the shape every microlesson must take, and the validator
 * that refuses to let a broken one ship.
 *
 * Two ideas hold this file together.
 *
 * 1. A lesson is DATA, not markup. It says what to teach, which widget to put
 *    in front of the learner, and which musical objects to build. It never
 *    says how anything looks. Views own geometry; audio owns sound.
 *
 * 2. A lesson never contains notes. It contains a *recipe* — a tonic plus a
 *    scale, chord or interval id — and `resolveExample()` hands that recipe to
 *    the theory engine. That is why every example in the course works in all
 *    twelve keys without a single line of authoring per key, and why a lesson
 *    can never quietly disagree with the engine about how something is spelled.
 *
 * The arc is fixed and enforced:
 *    why → hear → see → discover → name → practice → apply → challenge → review
 * You meet the sound before the picture, the picture before the definition,
 * and the definition after you have already noticed the thing it names. The
 * validator rejects a `discover` step that contains prose, because "discover"
 * with paragraphs in it is just reading with extra steps.
 */

import {
  asNote, parseNote, note, noteName, midi, shiftOctave, LETTERS, letterIndex,
  enharmonicSpellings, isEnharmonic, sortNotes, diatonicStep,
} from '../theory/pitch.js';
import {
  parseInterval, intervalName, intervalSymbol, transpose, semitones,
  invert, simplify, SIMPLE_INTERVALS,
} from '../theory/interval.js';
import { SCALES, getScale, buildScale, degreeLabels } from '../theory/scale.js';
import { CHORDS, getChord, buildChord, chordSymbol } from '../theory/chord.js';

// ===========================================================================
// THE ARC
// ===========================================================================

/** The nine steps, in the only order they are allowed to appear. */
export const STEP_KINDS = Object.freeze([
  'why', 'hear', 'see', 'discover', 'name', 'practice', 'apply', 'challenge', 'review',
]);

/** What each step is for. The UI shows these as the step rail's captions. */
export const STEP_INTENT = Object.freeze({
  why: 'The problem this idea solves, before any terminology.',
  hear: 'Sound first. The learner listens before reading anything else.',
  see: 'The same sound in the views, so ear and eye are wired together.',
  discover: 'Hands on the controls. The learner finds the pattern themselves.',
  name: 'Only now does the thing get its official name and symbol.',
  practice: 'Short reps on exactly what was just discovered.',
  apply: 'The idea used for something musical, not just identified.',
  challenge: 'One harder rep that proves it stuck, including an edge case.',
  review: 'What to keep, in the learner\'s own working vocabulary.',
});

/** Steps whose payload must be interactive rather than prose. */
export const INTERACTIVE_STEPS = Object.freeze(['discover', 'practice', 'challenge']);

// ===========================================================================
// THE FOUR DEPTHS
// ===========================================================================

export const DEPTHS = Object.freeze(['quick', 'normal', 'deep', 'nerd']);

export const DEPTH_INTENT = Object.freeze({
  quick: 'One sentence. What you would say to someone walking past.',
  normal: 'The working explanation. Enough to use the idea today.',
  deep: 'Why it is true, and what it connects to.',
  nerd: 'Derivation, edge cases, alternative names, and where the tidy version leaks.',
});

/** `quick` is one sentence. A character ceiling enforces that without
 *  mis-parsing "C♯." as a sentence break. */
export const QUICK_MAX_CHARS = 160;
const MIN_CHARS = Object.freeze({ quick: 24, normal: 100, deep: 180, nerd: 180 });

// ===========================================================================
// CONTRACTS WITH THE OTHER MODULES
// ===========================================================================

/** View ids, exactly as CONTRACT.md names them. */
export const VIEW_IDS = Object.freeze(['piano', 'staff', 'fretboard', 'pitchring']);

/** How many views one step may stack and still be readable on a 360px screen. */
export const MAX_VIEWS = 3;

/** ViewState.labelMode vocabulary, so a widget config spreads straight in. */
export const LABEL_MODES = Object.freeze(['none', 'name', 'degree', 'interval', 'semitones']);

/** How the audio engine should present an example. */
export const PLAYBACK_MODES = Object.freeze([
  'sequence',            // one note after another, ascending
  'sequence-descending', // one note after another, descending
  'chord',               // all at once
  'sequence-then-chord', // melodic, then harmonic — the same notes both ways
  'drone-then-note',     // hold the tonic underneath, then add the second note
  'pair',                // exactly two notes, one after the other
]);

/**
 * The interactive widgets a `discover` step may ask for. This is a contract
 * with modules that do not exist yet, so the validator checks the name and the
 * shape and nothing more.
 */
export const WIDGET_KINDS = Object.freeze([
  'keyboard-explorer',   // click keys, hear them, watch every view light up
  'letter-wheel',        // seven letters that wrap around
  'black-key-grouper',   // find the 2s and 3s, and what they are for
  'step-walker',         // move by half or whole steps and watch where you land
  'accidental-lab',      // raise and lower one note, sound and name together
  'enharmonic-flip',     // same key, two spellings, two musical meanings
  'octave-stack',        // the same pitch class in several registers
  'staff-plotter',       // drop a note on the staff and see it on the piano
  'clef-slider',         // move the same note between treble and bass
  'interval-builder',    // the crux: letter count and semitone count, side by side
  'two-number-meter',    // one readout for letters, one for semitones
  'interval-ear',        // hear an interval, guess before revealing
  'quality-shifter',     // major to minor to diminished, one semitone at a time
  'tritone-mirror',      // the interval that inverts to itself
  'inversion-mirror',    // flip an interval and watch 9 minus n happen
  'compound-collapse',   // a 10th folding down into a 3rd
  'melodic-harmonic-toggle', // same two notes, apart in time or together
  'scale-degree-map',    // where each degree sits relative to the tonic
]);

/** Controls a widget may expose. Also a contract with the view layer. */
export const CONTROL_KINDS = Object.freeze([
  'tonic-picker', 'octave-shift', 'label-mode', 'play', 'tempo', 'direction',
  'clef-switch', 'accidental-step', 'semitone-slider', 'letter-slider',
  'invert', 'octave-fold', 'spelling-toggle', 'compare', 'reveal', 'reset',
]);

/** Drill formats for `practice` and `challenge`. */
export const DRILL_KINDS = Object.freeze([
  'multiple-choice',  // pick the right name
  'identify',         // here are notes, what is this
  'build',            // here is a name, place the notes
  'ear',              // listen, then answer
  'spell',            // type or pick letter + accidental
  'match',            // pair sounds with names
  'order',            // put items in size order
  'true-false',       // catch the plausible-but-wrong statement
]);

/** Where a drill draws its questions from. Ids are resolved by the engine. */
export const POOL_KINDS = Object.freeze([
  'interval', 'scale', 'chord', 'letter', 'clef', 'spelling', 'step-size',
]);

/**
 * What the learner is asked to PRODUCE. This is deliberately separate from the
 * pool: a drill can draw on interval ids and still not be asking for an
 * interval name. World 0 lesson 4 draws on m2, M2 and A1 to ask "how many keys
 * apart is this" — a question a beginner can answer — and a question generator
 * that reads the pool alone would instead demand the name "A1" from someone two
 * worlds away from having that word. `asks` is what removes the guess.
 */
export const DRILL_ASKS = Object.freeze([
  'letter-order',    // which letter comes next
  'note-name',       // name the key or the note
  'spelling',        // which exact letter-plus-accidental
  'step-size',       // how far apart, in half or whole steps
  'same-different',  // are these the same note / the same distance
  'clef-reading',    // read a position on a staff, given a clef
  'interval-name',   // the full name: number and quality
  'interval-size',   // which is wider, without naming anything
  'construct',       // build the thing rather than identify it
  'invert',          // turn it upside down
  'simplify',        // reduce a compound interval
]);

/** How a question is presented. Matches the audio/game engine's own modes. */
export const DRILL_MODES = Object.freeze(['melodic-up', 'melodic-down', 'harmonic', 'visual']);

// ===========================================================================
// EXAMPLES — recipes, never note lists
// ===========================================================================

export const EXAMPLE_KINDS = Object.freeze([
  'scale',      // { scaleId, octaves?, includeOctave? }
  'degrees',    // { scaleId, degrees: [1,3,5] }
  'chord',      // { chordId, rootInterval? }
  'interval',   // { intervalId }            → two notes: tonic and its partner
  'stack',      // { intervals: [...] }      → each interval measured from the tonic
  'ladder',     // the twelve simple intervals above the tonic, in order
  'letters',    // the seven natural letters, starting from the tonic's letter
  'enharmonics',// { intervalId }            → every sane spelling of one sound
  'octaves',    // { count }                 → the same note in several registers
]);

const DEFAULT_TONIC = 'C4';

function exampleTonic(ex, tonic, opts) {
  const base = ex.tonic ? parseNote(ex.tonic, 4) : asNote(tonic ?? parseNote(DEFAULT_TONIC));
  const oct = ex.octave ?? opts.octave;
  return oct === undefined ? base : note(base.letter, base.alter, oct);
}

/**
 * Turn a lesson's example recipe into real notes, in whatever key the session
 * is currently in.
 *
 * @param {object} ex     an example recipe (see EXAMPLE_KINDS)
 * @param {object|string} tonic  the session tonic; ex.tonic pins it instead
 * @param {{octave?: number}} opts  register hint — clef lessons need this
 * @returns {{notes: object[], label: string, kind: string, root: object}}
 */
export function resolveExample(ex, tonic = DEFAULT_TONIC, opts = {}) {
  if (!ex || typeof ex !== 'object') throw new Error('resolveExample: not an example');
  const root = exampleTonic(ex, tonic, opts);

  switch (ex.kind) {
    case 'scale': {
      const def = getScale(ex.scaleId);
      const notes = buildScale(root, ex.scaleId, {
        octaves: ex.octaves ?? 1,
        includeOctave: ex.includeOctave ?? true,
      });
      return { kind: ex.kind, root, notes, label: `${noteName(root)} ${def.name.toLowerCase()}` };
    }
    case 'degrees': {
      const def = getScale(ex.scaleId);
      const scale = buildScale(root, ex.scaleId, { octaves: 2 });
      const labels = degreeLabels(ex.scaleId);
      const notes = ex.degrees.map((d) => scale[d - 1]);
      return {
        kind: ex.kind, root, notes,
        label: `${noteName(root)} ${def.name.toLowerCase()}, degrees ` +
          ex.degrees.map((d) => labels[(d - 1) % labels.length]).join('–'),
      };
    }
    case 'chord': {
      const chordRoot = ex.rootInterval ? transpose(root, parseInterval(ex.rootInterval)) : root;
      const notes = buildChord(chordRoot, ex.chordId);
      return { kind: ex.kind, root: chordRoot, notes, label: chordSymbol(chordRoot, ex.chordId) };
    }
    case 'interval': {
      const iv = parseInterval(ex.intervalId);
      const other = transpose(root, iv, ex.direction === 'down' ? -1 : 1);
      const notes = ex.direction === 'down' ? [other, root] : [root, other];
      return {
        kind: ex.kind, root, notes,
        label: `${noteName(root)} to ${noteName(other)} (${intervalName(iv)})`,
      };
    }
    case 'stack': {
      const notes = ex.intervals.map((id) => transpose(root, parseInterval(id)));
      return {
        kind: ex.kind, root, notes,
        label: `${noteName(root)} plus ${ex.intervals.join(' ')}`,
      };
    }
    case 'ladder': {
      const notes = SIMPLE_INTERVALS.map((iv) => transpose(root, iv));
      return { kind: ex.kind, root, notes, label: `every simple interval above ${noteName(root)}` };
    }
    case 'letters': {
      // The seven natural letters, starting from this tonic's letter. No note
      // list: the letters come from the engine's own alphabet.
      const start = letterIndex(root.letter);
      const notes = LETTERS.map((_, i) => {
        const idx = (start + i) % 7;
        return note(LETTERS[idx], 0, root.octave + (start + i >= 7 ? 1 : 0));
      });
      return { kind: ex.kind, root, notes, label: `seven letters from ${root.letter}` };
    }
    case 'enharmonics': {
      const target = ex.intervalId ? transpose(root, parseInterval(ex.intervalId)) : root;
      // Three pitch classes — the naturals D, G and A — have only one spelling
      // that uses a single accidental, so in three of the twelve keys the plain
      // request would return one note and demonstrate nothing. Widen the search
      // rather than let the example collapse. Double accidentals are genuinely
      // the other names for those pitches, so this stays true, not convenient.
      const notes = (() => {
        const first = enharmonicSpellings(target, { maxAlter: ex.maxAlter ?? 1 });
        return first.length >= 2 ? first : enharmonicSpellings(target, { maxAlter: 2 });
      })();
      return {
        kind: ex.kind, root: target, notes,
        label: `${notes.map((n) => noteName(n)).join(' = ')}: one key, ${notes.length} names`,
      };
    }
    case 'octaves': {
      const count = ex.count ?? 3;
      const notes = Array.from({ length: count }, (_, i) => shiftOctave(root, i));
      return {
        kind: ex.kind, root, notes,
        label: `${noteName(root)} across ${count} octaves`,
      };
    }
    default:
      throw new Error(`resolveExample: unknown example kind "${ex.kind}"`);
  }
}

/** Every example recipe a lesson contains, with the path it was found at. */
export function collectExamples(lesson) {
  const out = [];
  for (const kind of STEP_KINDS) {
    const step = lesson.steps?.[kind];
    if (!step) continue;
    if (step.example) out.push({ path: `${lesson.id}.steps.${kind}.example`, example: step.example });
    if (step.widget?.example) {
      out.push({ path: `${lesson.id}.steps.${kind}.widget.example`, example: step.widget.example });
    }
    if (step.drill?.example) {
      out.push({ path: `${lesson.id}.steps.${kind}.drill.example`, example: step.drill.example });
    }
  }
  return out;
}

// ===========================================================================
// VALIDATION
// ===========================================================================

const isStr = (v) => typeof v === 'string' && v.trim().length > 0;
const isArr = (v) => Array.isArray(v);
const ID_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/** Fields that mean "this step is really just reading". */
const PROSE_FIELDS = ['text', 'body', 'prose', 'paragraphs'];

/** Note-name-shaped junk that would mean somebody hard-coded an example. */
const FORBIDDEN_EXAMPLE_FIELDS = ['notes', 'noteNames', 'pitches', 'noteList', 'midi'];

function validateExample(ex, path, errors) {
  if (!ex || typeof ex !== 'object') { errors.push(`${path}: example must be an object`); return; }
  if (!EXAMPLE_KINDS.includes(ex.kind)) {
    errors.push(`${path}: unknown example kind "${ex.kind}"`);
    return;
  }
  for (const bad of FORBIDDEN_EXAMPLE_FIELDS) {
    if (bad in ex) errors.push(`${path}: examples are recipes, not note lists — remove "${bad}"`);
  }
  if (ex.tonic !== undefined) {
    try { parseNote(ex.tonic, 4); } catch { errors.push(`${path}: cannot parse pinned tonic "${ex.tonic}"`); }
  }
  if (ex.octave !== undefined && !Number.isInteger(ex.octave)) {
    errors.push(`${path}: octave must be an integer`);
  }
  if ((ex.kind === 'scale' || ex.kind === 'degrees') && !SCALES[ex.scaleId]) {
    errors.push(`${path}: unknown scale id "${ex.scaleId}"`);
  }
  if (ex.kind === 'degrees') {
    if (!isArr(ex.degrees) || ex.degrees.length === 0) errors.push(`${path}: degrees must be a non-empty array`);
    else if (SCALES[ex.scaleId]) {
      const len = SCALES[ex.scaleId].formula.length;
      for (const d of ex.degrees) {
        if (!Number.isInteger(d) || d < 1 || d > len * 2) errors.push(`${path}: degree ${d} out of range`);
      }
    }
  }
  if (ex.kind === 'chord' && !CHORDS[ex.chordId]) errors.push(`${path}: unknown chord id "${ex.chordId}"`);
  if (ex.kind === 'chord' && ex.rootInterval !== undefined) {
    try { parseInterval(ex.rootInterval); } catch (e) { errors.push(`${path}: ${e.message}`); }
  }
  if (ex.kind === 'interval') {
    try { parseInterval(ex.intervalId); } catch (e) { errors.push(`${path}: ${e.message}`); }
    if (ex.direction !== undefined && !['up', 'down'].includes(ex.direction)) {
      errors.push(`${path}: direction must be "up" or "down"`);
    }
  }
  if (ex.kind === 'stack') {
    if (!isArr(ex.intervals) || ex.intervals.length === 0) errors.push(`${path}: stack needs intervals`);
    else for (const id of ex.intervals) {
      try { parseInterval(id); } catch (e) { errors.push(`${path}: ${e.message}`); }
    }
  }
  if (ex.kind === 'enharmonics' && ex.intervalId !== undefined) {
    try { parseInterval(ex.intervalId); } catch (e) { errors.push(`${path}: ${e.message}`); }
  }
  if (ex.kind === 'octaves' && ex.count !== undefined
      && (!Number.isInteger(ex.count) || ex.count < 2 || ex.count > 6)) {
    errors.push(`${path}: octaves count must be an integer 2..6`);
  }
}

function validateViews(views, path, errors, { required = true } = {}) {
  if (views === undefined) {
    if (required) errors.push(`${path}: needs a views array`);
    return;
  }
  if (!isArr(views) || views.length === 0) { errors.push(`${path}: views must be a non-empty array`); return; }
  // Four stacked views cannot stay legible at 360px, which is a hard constraint
  // on the whole product. Three is the ceiling the layout can honour.
  if (views.length > MAX_VIEWS) {
    errors.push(`${path}: ${views.length} views will not stay legible at 360px — ${MAX_VIEWS} is the ceiling`);
  }
  for (const v of views) if (!VIEW_IDS.includes(v)) errors.push(`${path}: unknown view id "${v}"`);
}

function validateLabelMode(mode, path, errors) {
  if (mode === undefined) return;
  if (!LABEL_MODES.includes(mode)) errors.push(`${path}: unknown labelMode "${mode}"`);
}

function validateWidget(w, path, errors) {
  if (!w || typeof w !== 'object') { errors.push(`${path}: widget must be an object`); return; }
  if (!WIDGET_KINDS.includes(w.kind)) errors.push(`${path}: unknown widget kind "${w.kind}"`);
  if (!isStr(w.prompt)) errors.push(`${path}: widget needs a prompt`);
  if (!isStr(w.noticing)) errors.push(`${path}: widget needs "noticing" — what the learner should end up spotting`);
  validateViews(w.views, `${path}.views`, errors);
  validateLabelMode(w.labelMode, `${path}.labelMode`, errors);
  if (w.controls !== undefined) {
    if (!isArr(w.controls)) errors.push(`${path}.controls: must be an array`);
    else for (const c of w.controls) {
      if (!CONTROL_KINDS.includes(c)) errors.push(`${path}.controls: unknown control "${c}"`);
    }
  }
  if (w.example !== undefined) validateExample(w.example, `${path}.example`, errors);
}

function validatePool(pool, path, errors) {
  if (!pool || typeof pool !== 'object') { errors.push(`${path}: drill needs a pool`); return; }
  if (!POOL_KINDS.includes(pool.kind)) { errors.push(`${path}: unknown pool kind "${pool.kind}"`); return; }
  if (!isArr(pool.ids) || pool.ids.length === 0) { errors.push(`${path}: pool needs ids`); return; }
  for (const id of pool.ids) {
    switch (pool.kind) {
      case 'interval':
        try { parseInterval(id); } catch (e) { errors.push(`${path}: ${e.message}`); }
        break;
      case 'scale':
        if (!SCALES[id]) errors.push(`${path}: unknown scale id "${id}"`);
        break;
      case 'chord':
        if (!CHORDS[id]) errors.push(`${path}: unknown chord id "${id}"`);
        break;
      case 'letter':
        if (!LETTERS.includes(id)) errors.push(`${path}: "${id}" is not a note letter`);
        break;
      case 'clef':
        if (!['treble', 'bass'].includes(id)) errors.push(`${path}: unknown clef "${id}"`);
        break;
      case 'spelling':
        try { parseNote(id, 4); } catch { errors.push(`${path}: cannot parse spelling "${id}"`); }
        break;
      case 'step-size':
        if (!['H', 'W'].includes(id)) errors.push(`${path}: step size must be "H" or "W"`);
        break;
      default:
        break;
    }
  }
}

function validateDrill(d, path, errors) {
  if (!d || typeof d !== 'object') { errors.push(`${path}: drill must be an object`); return; }
  if (!DRILL_KINDS.includes(d.kind)) errors.push(`${path}: unknown drill kind "${d.kind}"`);
  if (!isStr(d.prompt)) errors.push(`${path}: drill needs a prompt`);
  if (!Number.isInteger(d.reps) || d.reps < 1 || d.reps > 20) {
    errors.push(`${path}: reps must be an integer 1..20`);
  }
  if (!DRILL_ASKS.includes(d.asks)) {
    errors.push(`${path}: "asks" must say what the learner produces (one of ${DRILL_ASKS.join(', ')})`);
  }
  // A drill that asks for an interval name must be drawing on intervals.
  if (d.asks === 'interval-name' && d.pool?.kind !== 'interval') {
    errors.push(`${path}: asks for an interval name but draws from a "${d.pool?.kind}" pool`);
  }
  if (d.mode !== undefined && !DRILL_MODES.includes(d.mode)) {
    errors.push(`${path}: unknown mode "${d.mode}"`);
  }
  if (d.difficulty !== undefined
      && (!Number.isInteger(d.difficulty) || d.difficulty < 1 || d.difficulty > 5)) {
    errors.push(`${path}: difficulty must be an integer 1..5`);
  }
  validatePool(d.pool, `${path}.pool`, errors);
  validateViews(d.views, `${path}.views`, errors, { required: false });
  validateLabelMode(d.labelMode, `${path}.labelMode`, errors);
  if (d.example !== undefined) validateExample(d.example, `${path}.example`, errors);
  if (d.feedback !== undefined && !isStr(d.feedback)) errors.push(`${path}: feedback must be a string`);
}

const STEP_RULES = {
  why: (s, p, e) => {
    if (!isStr(s.text)) e.push(`${p}: needs text`);
    else if (s.text.length < 60) e.push(`${p}: text is too thin to motivate anything`);
  },
  hear: (s, p, e) => {
    if (!isStr(s.text)) e.push(`${p}: needs text`);
    if (!s.example) e.push(`${p}: needs an example to play`);
    else validateExample(s.example, `${p}.example`, e);
    if (!PLAYBACK_MODES.includes(s.playback)) e.push(`${p}: unknown playback mode "${s.playback}"`);
  },
  see: (s, p, e) => {
    if (!isStr(s.text)) e.push(`${p}: needs text`);
    if (!s.example) e.push(`${p}: needs an example to display`);
    else validateExample(s.example, `${p}.example`, e);
    validateViews(s.views, `${p}.views`, e);
    validateLabelMode(s.labelMode, `${p}.labelMode`, e);
  },
  discover: (s, p, e) => {
    if (!s.widget) e.push(`${p}: discover must specify a widget`);
    else validateWidget(s.widget, `${p}.widget`, e);
  },
  name: (s, p, e) => {
    if (!isStr(s.term)) e.push(`${p}: needs the term being named`);
    if (!isStr(s.text)) e.push(`${p}: needs text`);
    if (s.symbol !== undefined && typeof s.symbol !== 'string') e.push(`${p}: symbol must be a string`);
    if (s.alsoCalled !== undefined && !isArr(s.alsoCalled)) e.push(`${p}: alsoCalled must be an array`);
  },
  practice: (s, p, e) => {
    if (!s.drill) e.push(`${p}: practice must specify a drill`);
    else validateDrill(s.drill, `${p}.drill`, e);
  },
  apply: (s, p, e) => {
    if (!isStr(s.text)) e.push(`${p}: needs text`);
    if (!isStr(s.task)) e.push(`${p}: needs a concrete task`);
    if (s.example !== undefined) validateExample(s.example, `${p}.example`, e);
  },
  challenge: (s, p, e) => {
    if (!s.drill) e.push(`${p}: challenge must specify a drill`);
    else validateDrill(s.drill, `${p}.drill`, e);
  },
  review: (s, p, e) => {
    if (!isArr(s.takeaways) || s.takeaways.length < 2) e.push(`${p}: needs at least two takeaways`);
    else for (const t of s.takeaways) if (!isStr(t)) e.push(`${p}: takeaways must be strings`);
    if (s.next !== undefined && !isStr(s.next)) e.push(`${p}: next must be a string`);
  },
};

/**
 * Validate one lesson in isolation. Returns an array of human-readable
 * problems; empty means the lesson is well formed.
 */
export function validateLesson(lesson) {
  const errors = [];
  if (!lesson || typeof lesson !== 'object') return ['lesson is not an object'];
  const id = isStr(lesson.id) ? lesson.id : '(no id)';

  if (!isStr(lesson.id)) errors.push('lesson: missing id');
  else if (!ID_RE.test(lesson.id)) errors.push(`${id}: id must be kebab-case`);
  if (!isStr(lesson.title)) errors.push(`${id}: missing title`);
  if (!Number.isInteger(lesson.world)) errors.push(`${id}: world must be an integer`);
  if (!Number.isInteger(lesson.index) || lesson.index < 1) errors.push(`${id}: index must be a positive integer`);
  if (!Number.isInteger(lesson.minutes) || lesson.minutes < 3 || lesson.minutes > 8) {
    errors.push(`${id}: minutes must be 3..8 — this is a microlesson`);
  }
  if (!isArr(lesson.teaches) || lesson.teaches.length === 0) {
    errors.push(`${id}: must teach at least one concept`);
  }
  if (!isArr(lesson.requires)) errors.push(`${id}: requires must be an array (possibly empty)`);

  // ---- depths ----
  const d = lesson.depths;
  if (!d || typeof d !== 'object') {
    errors.push(`${id}: missing depths`);
  } else {
    const keys = Object.keys(d);
    for (const depth of DEPTHS) {
      if (!isStr(d[depth])) errors.push(`${id}.depths.${depth}: missing`);
      else if (d[depth].length < MIN_CHARS[depth]) {
        errors.push(`${id}.depths.${depth}: too short for its job (${d[depth].length} chars)`);
      }
    }
    for (const k of keys) if (!DEPTHS.includes(k)) errors.push(`${id}.depths: unexpected depth "${k}"`);
    if (isStr(d.quick) && d.quick.length > QUICK_MAX_CHARS) {
      errors.push(`${id}.depths.quick: ${d.quick.length} chars — one sentence means under ${QUICK_MAX_CHARS}`);
    }
    const texts = DEPTHS.map((k) => d[k]).filter(isStr);
    if (new Set(texts).size !== texts.length) errors.push(`${id}.depths: two depths are identical`);
  }

  // ---- steps ----
  const steps = lesson.steps;
  if (!steps || typeof steps !== 'object') {
    errors.push(`${id}: missing steps`);
  } else {
    for (const kind of STEP_KINDS) {
      const step = steps[kind];
      if (!step || typeof step !== 'object') { errors.push(`${id}.steps.${kind}: missing`); continue; }
      STEP_RULES[kind](step, `${id}.steps.${kind}`, errors);
      // The arc's three interactive steps must not quietly turn back into
      // reading. This is driven by INTERACTIVE_STEPS so the ban is one list,
      // not three copies of the same check.
      if (INTERACTIVE_STEPS.includes(kind)) {
        for (const prosey of PROSE_FIELDS) {
          if (prosey in step) {
            errors.push(`${id}.steps.${kind}: ${kind} is interactive — move "${prosey}" into a depth or another step`);
          }
        }
      }
    }
    for (const k of Object.keys(steps)) {
      if (!STEP_KINDS.includes(k)) errors.push(`${id}.steps: "${k}" is not part of the arc`);
    }
  }

  return errors;
}

/**
 * Lesson prose is authored as indented template literals so the source stays
 * readable. That leaves newlines and runs of spaces inside the strings, which
 * would end up in the DOM. Collapse them once, at definition time, and freeze
 * the result — a lesson is a fact, not a mutable object.
 */
function normalizeStrings(value) {
  if (typeof value === 'string') return value.replace(/\s+/g, ' ').trim();
  if (Array.isArray(value)) return Object.freeze(value.map(normalizeStrings));
  if (value && typeof value === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(value)) out[k] = normalizeStrings(v);
    return Object.freeze(out);
  }
  return value;
}

/** Normalize, freeze and hand back a lesson. Every lesson goes through this. */
export function defineLesson(lesson) {
  return normalizeStrings(lesson);
}

/** Same treatment for the world container. */
export function defineWorld(world) {
  return normalizeStrings(world);
}

/** The lesson's steps as an ordered array — the arc, made renderable. */
export function stepsInOrder(lesson) {
  return STEP_KINDS.map((kind) => ({ kind, intent: STEP_INTENT[kind], ...lesson.steps[kind] }));
}

/** The four depths, shallowest first. */
export function depthsInOrder(lesson) {
  return DEPTHS.map((depth) => ({ depth, intent: DEPTH_INTENT[depth], text: lesson.depths[depth] }));
}

/** Validate a world container and every lesson inside it. */
export function validateWorld(world) {
  const errors = [];
  if (!world || typeof world !== 'object') return ['world is not an object'];
  const id = isStr(world.id) ? world.id : '(no id)';
  if (!isStr(world.id)) errors.push('world: missing id');
  if (!Number.isInteger(world.number)) errors.push(`${id}: number must be an integer`);
  if (!isStr(world.title)) errors.push(`${id}: missing title`);
  if (!isStr(world.tagline)) errors.push(`${id}: missing tagline`);
  if (!isArr(world.lessons)) { errors.push(`${id}: lessons must be an array`); return errors; }
  if (world.stub !== true && world.lessons.length === 0) errors.push(`${id}: a real world needs lessons`);

  const seen = new Set();
  world.lessons.forEach((lesson, i) => {
    errors.push(...validateLesson(lesson));
    if (lesson?.world !== world.number) errors.push(`${lesson?.id}: world number does not match ${id}`);
    if (lesson?.index !== i + 1) errors.push(`${lesson?.id}: index ${lesson?.index} but sits at position ${i + 1}`);
    if (seen.has(lesson?.id)) errors.push(`${id}: duplicate lesson id "${lesson?.id}"`);
    seen.add(lesson?.id);
  });
  return errors;
}

// ===========================================================================
// THE CONCEPT GRAPH
// ===========================================================================

/** concept id → array of concept ids it needs first. */
export function conceptGraph(concepts) {
  const g = new Map();
  for (const c of Object.values(concepts)) g.set(c.id, [...(c.requires ?? [])]);
  return g;
}

/**
 * Every cycle reachable in the prerequisite graph, as arrays of ids.
 * A cycle in a curriculum means a learner can never start.
 */
export function findCycles(graph) {
  const cycles = [];
  const state = new Map();
  const stack = [];

  const visit = (id) => {
    if (state.get(id) === 'done') return;
    if (state.get(id) === 'open') {
      const at = stack.indexOf(id);
      cycles.push(stack.slice(at).concat(id));
      return;
    }
    state.set(id, 'open');
    stack.push(id);
    for (const dep of graph.get(id) ?? []) visit(dep);
    stack.pop();
    state.set(id, 'done');
  };

  for (const id of graph.keys()) visit(id);
  return cycles;
}

/** Prerequisites first. Throws if the graph has a cycle. */
export function topoOrder(graph) {
  const out = [];
  const state = new Map();
  const visit = (id, trail) => {
    if (state.get(id) === 'done') return;
    if (state.get(id) === 'open') throw new Error(`Prerequisite cycle: ${[...trail, id].join(' → ')}`);
    state.set(id, 'open');
    for (const dep of graph.get(id) ?? []) visit(dep, [...trail, id]);
    state.set(id, 'done');
    out.push(id);
  };
  for (const id of graph.keys()) visit(id, []);
  return out;
}

/** Which concepts are reachable given what the learner has already mastered. */
export function unlockedConcepts(mastered, concepts) {
  const have = new Set(mastered);
  return Object.values(concepts)
    .filter((c) => !have.has(c.id) && (c.requires ?? []).every((r) => have.has(r)))
    .map((c) => c.id);
}

/** Is this lesson available yet? */
export function isLessonUnlocked(lesson, mastered) {
  const have = new Set(mastered);
  return (lesson.requires ?? []).every((r) => have.has(r));
}

/** All lessons across all worlds, in teaching order. */
export function courseOrder(worlds) {
  return worlds
    .slice()
    .sort((a, b) => a.number - b.number)
    .flatMap((w) => w.lessons.slice().sort((a, b) => a.index - b.index));
}

/**
 * Whole-course validation. This is the check that catches curriculum bugs
 * rather than typos: a concept taught twice, a lesson that needs something
 * nobody has taught yet, a prerequisite pointing at nothing, a cycle.
 *
 * @param {{worlds: object[], concepts: Record<string, object>}} course
 */
export function validateCourse(course) {
  const errors = [];
  const { worlds, concepts } = course;
  if (!isArr(worlds)) return ['course: worlds must be an array'];
  if (!concepts || typeof concepts !== 'object') return ['course: concepts must be an object'];

  for (const world of worlds) errors.push(...validateWorld(world));

  // Concept table sanity.
  for (const [key, c] of Object.entries(concepts)) {
    if (c.id !== key) errors.push(`concepts.${key}: id field says "${c.id}"`);
    if (!isStr(c.title)) errors.push(`concepts.${key}: missing title`);
    if (!Number.isInteger(c.world)) errors.push(`concepts.${key}: missing world number`);
    if (!isArr(c.requires)) errors.push(`concepts.${key}: requires must be an array`);
    else for (const r of c.requires) {
      if (!concepts[r]) errors.push(`concepts.${key}: prerequisite "${r}" does not exist`);
    }
  }

  // Cycles.
  const graph = conceptGraph(concepts);
  for (const cycle of findCycles(graph)) errors.push(`prerequisite cycle: ${cycle.join(' → ')}`);

  // Teaching order.
  const lessons = courseOrder(worlds);
  const taught = new Map(); // concept id → lesson id
  const lessonIds = new Set();
  for (const lesson of lessons) {
    if (lessonIds.has(lesson.id)) errors.push(`duplicate lesson id across worlds: "${lesson.id}"`);
    lessonIds.add(lesson.id);

    for (const req of lesson.requires ?? []) {
      if (!concepts[req]) errors.push(`${lesson.id}: requires unknown concept "${req}"`);
      else if (!taught.has(req)) {
        errors.push(`${lesson.id}: requires "${req}", which no earlier lesson teaches`);
      }
    }
    for (const c of lesson.teaches ?? []) {
      if (!concepts[c]) { errors.push(`${lesson.id}: teaches unknown concept "${c}"`); continue; }

      // A concept may legitimately span several microlessons, and the good
      // ones do: "seventh chord" is introduced once and then developed across
      // a lesson each for major, dominant and minor sevenths. Insisting on one
      // lesson per concept would force those back into a single fat lesson,
      // which is the opposite of what this course is for.
      //
      // The FIRST lesson to teach a concept owns it. That is the one whose
      // prerequisites have to be satisfied, and the one the map links to.
      if (taught.has(c)) continue;

      for (const r of concepts[c].requires ?? []) {
        if (concepts[r] && !taught.has(r) && !(lesson.teaches ?? []).includes(r)) {
          errors.push(`${lesson.id}: teaches "${c}" before its prerequisite "${r}"`);
        }
      }
      taught.set(c, lesson.id);
    }
  }

  // Anything in a built world that no lesson covers is an orphan.
  const builtWorlds = new Set(worlds.filter((w) => !w.stub).map((w) => w.number));
  for (const c of Object.values(concepts)) {
    if (builtWorlds.has(c.world) && !taught.has(c.id)) {
      errors.push(`concepts.${c.id}: sits in built world ${c.world} but no lesson teaches it`);
    }
    if (!builtWorlds.has(c.world) && taught.has(c.id)) {
      errors.push(`concepts.${c.id}: taught by ${taught.get(c.id)} but marked as world ${c.world}`);
    }
  }

  return errors;
}
