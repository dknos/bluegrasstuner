/**
 * THE ENGINE'S ARITHMETIC — the half of the audio module that has never heard
 * of a browser.
 *
 * Everything here is a plain function of numbers in, numbers out. No
 * AudioContext, no window, no timers, no state. That is not tidiness for its
 * own sake: an audio engine is the one part of an app you cannot look at while
 * it runs, so the parts that decide *when* a note starts, *how loud* it is and
 * *what shape* its envelope has have to be checkable on a machine with no
 * sound card at all.
 *
 * `engine.js` re-exports every one of these, so a caller only ever needs to
 * import from `engine.js`.
 *
 * Two clocks are in play and the distinction matters:
 *   MUSICAL time — beats, tempo, articulation. Decided here.
 *   AUDIO time   — seconds on the AudioContext clock. Also decided here; the
 *                  engine only adds a start offset and hands it to Web Audio.
 * Nothing in this file ever reads a wall clock.
 */

/** Slowest and fastest tempo the transport will accept. */
export const MIN_TEMPO = 20;
export const MAX_TEMPO = 300;

/** A walking-pace default: fast enough not to drag, slow enough to hear. */
export const DEFAULT_TEMPO = 96;

export function clamp(x, lo, hi) {
  const n = Number.isFinite(x) ? x : lo;
  return Math.min(Math.max(n, lo), hi);
}

// ---------------------------------------------------------------------------
// TEMPO
// ---------------------------------------------------------------------------

/** Seconds in one beat. 120bpm → 0.5s. */
export function beatSeconds(bpm) {
  return 60 / clamp(bpm, MIN_TEMPO, MAX_TEMPO);
}

/** Seconds occupied by `beats` beats at `bpm`. */
export function beatsToSeconds(beats, bpm) {
  return beatSeconds(bpm) * Math.max(0, beats);
}

/**
 * How much of its slot a note actually sounds for.
 *
 * CONTRACT: articulation shortens the SOUND, it never moves the ONSET. Two
 * notes an eighth apart stay an eighth apart whether they are slurred or
 * spat out. `gap` is the option that moves onsets.
 *
 * Legato deliberately exceeds 1 so consecutive notes overlap by a hair, which
 * is what stops a scale sounding like a row of separate beeps.
 */
const ARTICULATIONS = {
  legato: 1.05,
  tenuto: 0.94,
  normal: 0.72,
  detached: 0.55,
  staccato: 0.34,
};

export function articulationFactor(a = 'normal') {
  if (typeof a === 'number') return clamp(a, 0.02, 4);
  const hit = ARTICULATIONS[String(a).toLowerCase()];
  if (hit === undefined) throw new Error(`Unknown articulation: ${a}`);
  return hit;
}

export const ARTICULATION_NAMES = Object.keys(ARTICULATIONS);

// ---------------------------------------------------------------------------
// VELOCITY
//
// Velocity is 0..1 and drives two things at once, because on any real struck
// instrument it does: a harder strike is louder AND brighter. Splitting them
// into two curves is what keeps a quiet note from sounding like a loud note
// with the fader down.
// ---------------------------------------------------------------------------

/** Peak amplitude of one voice. Convex, so the quiet end has room to breathe. */
export function velocityGain(v) {
  return 0.42 * Math.pow(clamp(v, 0, 1), 1.6);
}

/** 0..1 brightness weighting; never reaches zero or a soft note goes muffled. */
export function velocityBrightness(v) {
  return 0.22 + 0.78 * clamp(v, 0, 1);
}

// ---------------------------------------------------------------------------
// AMPLITUDE ENVELOPE
//
// Shape: fast linear attack, exponential decay toward a low sustain, linear
// release. That is a struck string, not a pad. The one non-obvious term is
// that decay length rises as pitch falls — a bass note rings for seconds, a
// top-octave note is gone almost at once, and getting that wrong is the single
// loudest tell that a keyboard sound is synthetic.
// ---------------------------------------------------------------------------

/**
 * @param {{frequency?: number, velocity?: number, duration?: number}} spec
 * @returns {{attack:number, decay:number, sustain:number, release:number,
 *            peak:number, hold:number, endsAt:number}}
 *   `hold` is when the key is released; `endsAt` is when the tail is silent.
 */
export function envelopeFor({ frequency = 440, velocity = 0.8, duration = 0.9 } = {}) {
  const v = clamp(velocity, 0, 1);
  const f = clamp(frequency, 20, 20000);
  const peak = velocityGain(v);
  // A harder strike speaks fractionally sooner.
  const attack = clamp(0.011 - 0.006 * v, 0.003, 0.012);
  const decay = clamp(0.45 + 320 / f, 0.3, 2.6);
  // Deep sustain on soft notes, shallower on hard ones: loud strikes fall away
  // faster in absolute terms, which is what makes dynamics audible at all.
  const sustain = peak * clamp(0.36 - 0.14 * v, 0.16, 0.36);
  const release = clamp(0.14 + 140 / f, 0.09, 0.55);
  const hold = Math.max(attack + 0.01, clamp(duration, 0.02, 60));
  return { attack, decay, sustain, release, peak, hold, endsAt: hold + release };
}

/** Envelope value before the key comes up. */
function preRelease(t, env) {
  if (t <= 0) return 0;
  // A strike at velocity 0 has no peak, so `sustain / peak` below is 0/0 = NaN
  // and the NaN travels all the way into an AudioParam ramp, which throws in a
  // real browser. A note with no peak is silence; say so explicitly.
  if (!(env.peak > 0)) return 0;
  if (t < env.attack) return env.peak * (t / env.attack);
  const d = t - env.attack;
  if (d < env.decay) return env.peak * Math.pow(env.sustain / env.peak, d / env.decay);
  return env.sustain;
}

/**
 * The envelope's value `t` seconds after the note started.
 *
 * This is not a test fixture: the engine evaluates it whenever it has to cut a
 * note short, so the ramp to silence starts from exactly the level the curve
 * was already at. Guessing that level instead is what produces clicks.
 */
export function envelopeValueAt(t, env) {
  if (!Number.isFinite(t) || t <= 0) return 0;
  if (t < env.hold) return preRelease(t, env);
  const r = t - env.hold;
  if (r >= env.release) return 0;
  return preRelease(env.hold, env) * (1 - r / env.release);
}

// ---------------------------------------------------------------------------
// FILTER ENVELOPE
//
// The lowpass opens on the attack and closes as the note decays. This is the
// whole reason a subtractive voice sounds struck: the transient is bright, the
// tail is dark, exactly like a string losing its high partials first.
// ---------------------------------------------------------------------------

export function filterEnvelopeFor({
  frequency = 440, velocity = 0.8, duration = 0.9, nyquist = 22050,
} = {}) {
  const v = clamp(velocity, 0, 1);
  const f = clamp(frequency, 20, 20000);
  const bright = velocityBrightness(v);
  // Tracked to pitch so the timbre stays even across the keyboard rather than
  // turning to mud at the bottom and glass at the top.
  const peakHz = clamp(f * (3 + 11 * bright), 320, Math.max(400, nyquist * 0.45));
  const sustainHz = clamp(f * 1.6 + 130, 160, peakHz);
  const attack = clamp(0.005 + 0.004 * (1 - v), 0.003, 0.012);
  const decay = clamp(0.22 + 0.55 * Math.min(duration, 2), 0.2, 1.4);
  return { peakHz, sustainHz, attack, decay, q: 0.8 + 1.3 * bright };
}

// ---------------------------------------------------------------------------
// OSCILLATOR STACK
// ---------------------------------------------------------------------------

/**
 * The three oscillators one voice is built from.
 *
 * Saw and triangle sit a few cents either side of true pitch — the beating
 * between them is what gives the note a body instead of a buzz. The third is a
 * square an octave up that is gone in under a tenth of a second: that is the
 * hammer, and without it the voice reads as "blown" rather than "struck".
 */
export function oscillatorPlan(velocity = 0.8) {
  const v = clamp(velocity, 0, 1);
  return [
    { type: 'sawtooth', ratio: 1, detune: -6, gain: 0.42, hammer: false },
    { type: 'triangle', ratio: 1, detune: 7, gain: 0.38, hammer: false },
    { type: 'square', ratio: 2, detune: 3, gain: 0.06 + 0.14 * v, hammer: true },
  ];
}

/** Symmetric detuning in cents for `count` voices. Always sums to zero. */
export function detuneSpread(count, cents = 7) {
  const n = Math.max(1, Math.round(count));
  if (n === 1) return [0];
  const out = [];
  for (let i = 0; i < n; i++) out.push(-cents + (2 * cents * i) / (n - 1));
  return out;
}

/**
 * Stereo placement by register — low notes to the left, high to the right, the
 * way a piano sounds from the player's seat. Subtle on purpose: wide enough to
 * separate a four-note chord, narrow enough to survive mono playback.
 */
export function panFor(midiNumber, width = 0.34) {
  const w = clamp(width, 0, 1);
  return clamp(((midiNumber - 60) / 30) * w, -w, w);
}

// ---------------------------------------------------------------------------
// MASTER SAFETY
// ---------------------------------------------------------------------------

/**
 * A soft-clip transfer curve for the master WaveShaper.
 *
 * Unity below the knee so ordinary playing passes through untouched, then a
 * tanh bend that can never reach 1.0 no matter how many notes are stacked. The
 * compressor in front of it does the musical work; this only guarantees that
 * the last sample out of the engine is in range.
 */
export function softClipCurve(length = 1024, { knee = 0.7 } = {}) {
  const n = Math.max(2, Math.floor(length));
  const k = clamp(knee, 0.1, 0.95);
  const span = 1 - k;
  const curve = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const x = (i / (n - 1)) * 2 - 1;
    const a = Math.abs(x);
    const y = a <= k ? a : k + span * Math.tanh((a - k) / span);
    curve[i] = Math.sign(x) * y;
  }
  return curve;
}

// ---------------------------------------------------------------------------
// REVERB
//
// No impulse files: the room is synthesized from decaying noise, seeded so it
// is byte-identical every run. A deterministic room is a room you can test.
// ---------------------------------------------------------------------------

/** mulberry32 — small, fast, and repeatable from a seed. */
export function makeRandom(seed = 0x9e3779b9) {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * One sample of the impulse response. Noise under an exponential decay, with a
 * few milliseconds of build at the front so it reads as a room rather than a
 * gunshot.
 */
export function impulseSample(i, length, { decay = 2.7, rand = Math.random } = {}) {
  const n = Math.max(1, length);
  const t = Math.min(1, Math.max(0, i / n));
  const build = Math.min(1, t * 60);
  return (rand() * 2 - 1) * build * Math.pow(1 - t, decay);
}

/** Fallback ambience when ConvolverNode is missing: a geometric tap delay. */
export function multitapPlan(taps = 5, { first = 0.037, growth = 1.51, decay = 0.62 } = {}) {
  const out = [];
  for (let i = 0; i < Math.max(1, taps); i++) {
    out.push({
      time: first * Math.pow(growth, i),
      gain: Math.pow(decay, i + 1),
      pan: i % 2 ? 0.62 : -0.62,
    });
  }
  return out;
}

// ---------------------------------------------------------------------------
// SCHEDULING
//
// Plans are pure timing: a list of {index, when, duration, velocityScale}. The
// engine zips them against real notes. Onsets are always computed as
// `start + i * step` and never accumulated, because float drift over sixteen
// notes is audible and makes the maths untestable.
// ---------------------------------------------------------------------------

/**
 * @typedef {object} PlannedEvent
 * @property {number} index          which note of the input this refers to
 * @property {number} when           seconds on the audio clock
 * @property {number} duration       how long it sounds
 * @property {number} velocityScale  multiplier on the caller's velocity
 */

/**
 * One note after another.
 *
 * SEMANTICS, pinned so four modules agree:
 *   step     = one beat (× `beats`) PLUS `gap`. `gap` moves onsets.
 *   duration = step × articulation. Articulation only shortens the sound.
 */
export function planSequence(count, {
  startTime = 0,
  tempo = DEFAULT_TEMPO,
  beats = 1,
  gap = 0,
  articulation = 'normal',
} = {}) {
  const step = beatsToSeconds(beats, tempo) + Math.max(0, gap);
  const duration = step * articulationFactor(articulation);
  const out = [];
  for (let i = 0; i < Math.max(0, count); i++) {
    out.push({ index: i, when: startTime + i * step, duration, velocityScale: 1 });
  }
  return out;
}

/**
 * Several notes as one chord.
 *
 * SEMANTICS:
 *   block     every note starts together and stops together.
 *   arpeggio  onsets `gap` apart; every note RELEASES TOGETHER, so the chord
 *             has assembled itself by the end rather than dissolving.
 *   roll      the same, with a much tighter default gap and a slight crescendo
 *             toward the top note — a strum, not a run.
 * `duration` is how long the LAST note sounds; earlier notes are lengthened to
 * match it.
 */
export function planChord(count, {
  style = 'block',
  startTime = 0,
  duration = 1.6,
  gap,
  tempo = DEFAULT_TEMPO,
} = {}) {
  const n = Math.max(0, count);
  const s = String(style).toLowerCase();
  if (!['block', 'arpeggio', 'roll'].includes(s)) throw new Error(`Unknown chord style: ${style}`);
  const step = s === 'block'
    ? 0
    : Math.max(0, gap ?? (s === 'roll' ? 0.032 : beatSeconds(tempo) / 4));
  const out = [];
  for (let i = 0; i < n; i++) {
    const lift = n > 1 ? i / (n - 1) : 1;
    out.push({
      index: i,
      when: startTime + i * step,
      duration: duration + (n - 1 - i) * step,
      velocityScale: s === 'roll' ? 0.86 + 0.14 * lift : 1,
    });
  }
  return out;
}

/**
 * Two notes, the three ways a teacher plays an interval.
 *
 * SEMANTICS: index 0 is always the LOWER note and index 1 the HIGHER one. The
 * engine sorts the pair by pitch before applying this, so argument order never
 * silently decides direction — `descending` means descending.
 */
export function planInterval(mode = 'ascending', {
  startTime = 0,
  duration = 0.85,
  gap = 0.05,
} = {}) {
  const m = String(mode).toLowerCase();
  const step = duration + Math.max(0, gap);
  if (m === 'harmonic') {
    return [
      { index: 0, when: startTime, duration, velocityScale: 1 },
      { index: 1, when: startTime, duration, velocityScale: 0.94 },
    ];
  }
  if (m === 'ascending') {
    return [
      { index: 0, when: startTime, duration, velocityScale: 1 },
      { index: 1, when: startTime + step, duration, velocityScale: 1 },
    ];
  }
  if (m === 'descending') {
    return [
      { index: 1, when: startTime, duration, velocityScale: 1 },
      { index: 0, when: startTime + step, duration, velocityScale: 1 },
    ];
  }
  throw new Error(`Unknown interval mode: ${mode}`);
}

/** When the last thing in a plan falls silent. */
export function planEndsAt(plan) {
  return plan.reduce((t, e) => Math.max(t, e.when + e.duration), 0);
}

// ---------------------------------------------------------------------------
// THE SCHEDULER'S DECISION FUNCTION
// ---------------------------------------------------------------------------

/**
 * Given the pending queue and the current audio time, say what has to happen.
 *
 * Splitting this out is what makes "stopAll during a sequence cancels the
 * future" testable: the rule is a pure function of (queue, now).
 *
 * An event may appear in both `toStart` and `toEnd` in one pass — that is the
 * correct answer when the clock jumped over a short note, and callers must
 * fire start before end rather than dropping one.
 *
 * @param {Array<{id:number, when:number, duration:number,
 *                voiced?:boolean, started?:boolean, ended?:boolean}>} queue
 * @param {number} now  audio-clock seconds
 * @returns {{toVoice:Array, toStart:Array, toEnd:Array, remaining:Array}}
 */
export function classifyEvents(queue, now, { lookahead = 0.12 } = {}) {
  const ordered = [...queue].sort((a, b) => (a.when - b.when) || (a.id - b.id));
  const toVoice = [];
  const toStart = [];
  const toEnd = [];
  const remaining = [];
  for (const ev of ordered) {
    if (ev.ended) continue;
    if (!ev.voiced && ev.when - now <= lookahead) toVoice.push(ev);
    if (!ev.started && now >= ev.when) toStart.push(ev);
    if (now >= ev.when + ev.duration) {
      toEnd.push(ev);
      continue;
    }
    remaining.push(ev);
  }
  return { toVoice, toStart, toEnd, remaining };
}

/**
 * Two calls for the same pitch inside this window are one strike, not two.
 * Guards against a double-fired click event stacking two identical voices,
 * which sounds like a phasing artefact rather than a louder note.
 */
export function isDuplicateOnset(existing, when, window = 0.02) {
  if (!existing || existing.ended) return false;
  return Math.abs(when - existing.when) < window;
}

/**
 * Which voice to sacrifice when the polyphony cap is hit.
 * Anything already in its release tail goes first — nobody hears that one
 * disappear. Otherwise the oldest note, because it is furthest into its decay.
 */
export function chooseVoiceToSteal(voices, now) {
  if (!voices || voices.length === 0) return null;
  const dying = voices.filter((v) => Number.isFinite(v.releaseAt) && v.releaseAt <= now);
  const pool = dying.length ? dying : voices;
  return pool.reduce((best, v) => (v.startedAt < best.startedAt ? v : best), pool[0]);
}
