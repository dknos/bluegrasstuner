/**
 * The app's single audio handle.
 *
 * Two things this file exists to guarantee:
 *
 * 1. No AudioContext is created until the user has actually clicked something.
 *    Browsers block audio before a gesture, and a music site that is silent on
 *    load reads as broken rather than as blocked.
 * 2. Nothing in the UI ever holds a direct reference to the engine, so a
 *    failure to load audio degrades to a silent-but-working app instead of a
 *    blank page.
 */

let enginePromise = null;
let engine = null;
let unlocked = false;

/**
 * Subscribers live here, not on the engine.
 *
 * The engine exposes ONE assignable `onNoteStart` / `onNoteEnd` slot each —
 * `engine.onNoteStart = fn` — because a scheduler should not also be an event
 * bus. But several views subscribe at once, and they subscribe long before the
 * engine exists. So this file owns the subscriber lists, claims the engine's
 * single slot the moment it is built, and fans out. Lists are the source of
 * truth, so a subscription made before or after the engine appears behaves
 * identically and there is nothing to "drain".
 */
const listeners = { start: [], end: [] };

/**
 * Views only ever want the pitch, and both of the shapes they already accept —
 * a Note or a MIDI number — go through `midi()`. Hand them the Note, so
 * spelling survives the trip, with the full event as a second argument for
 * anything that wants velocity or timing.
 */
function fanOut(list) {
  return (payload) => {
    // Copy: a listener is allowed to unsubscribe itself from inside the call.
    for (const fn of [...list]) {
      try {
        fn(payload.note, payload);
      } catch (err) {
        // One broken view must not silence the rest of them.
        console.warn('[audio] a note listener threw:', err);
      }
    }
  };
}

function subscribe(list, fn) {
  if (typeof fn !== 'function') return () => {};
  list.push(fn);
  return function unsubscribe() {
    const i = list.indexOf(fn);
    if (i >= 0) list.splice(i, 1);
  };
}

/**
 * The AudioContext, created the instant a real gesture happens.
 *
 * THIS IS THE WHOLE BALLGAME FOR AUDIO WORKING AT ALL.
 *
 * A browser only lets you start audio from inside a user gesture, and that
 * permission is spent the moment you await anything. The previous version did
 *
 *     click → await import('./engine.js') → createAudioEngine() → ctx.resume()
 *
 * and the dynamic import, however fast, ends the user activation. By the time
 * resume() ran the gesture was gone, so Chromium refused it and returned a
 * promise that simply never settles. Nothing threw. Note events still fired,
 * the keys still lit up, every view still animated. There was just no sound,
 * which is the most confusing possible failure.
 *
 * So the context is built and resumed SYNCHRONOUSLY here, before anything is
 * awaited, and handed to the engine afterwards via its contextFactory seam.
 */
let primedCtx = null;

export function primeContext() {
  // A context that already exists may still be suspended, because something
  // built it outside a gesture. Retry the resume every time: this is the call
  // that actually turns sound on, and it must happen on a real gesture.
  if (primedCtx) {
    if (primedCtx.state === 'suspended') {
      try { primedCtx.resume?.(); } catch { /* refused; a later gesture retries */ }
    }
    return primedCtx;
  }
  // Never open a context before the user has interacted with the page at all.
  // A context created without activation is born suspended and the browser
  // then refuses to start it, which is how a page ends up permanently silent
  // while every other symptom looks healthy. Anything that wants to make a
  // sound this early (a game auto-playing its first question, say) simply
  // waits for the first real interaction instead.
  const activation = typeof navigator !== 'undefined' ? navigator.userActivation : null;
  if (activation && activation.hasBeenActive === false) return null;

  const Ctor = typeof AudioContext !== 'undefined' ? AudioContext
    : (typeof webkitAudioContext !== 'undefined' ? webkitAudioContext : null);
  if (!Ctor) return null;
  try {
    primedCtx = new Ctor();
    // Deliberately not awaited: awaiting is what loses the gesture.
    if (primedCtx.state === 'suspended') primedCtx.resume?.();
    // Playing one silent sample is the long-standing way to convince a
    // browser the context is genuinely gesture-initiated.
    const buf = primedCtx.createBuffer(1, 1, primedCtx.sampleRate);
    const src = primedCtx.createBufferSource();
    src.buffer = buf;
    src.connect(primedCtx.destination);
    src.start(0);
  } catch (err) {
    console.warn('[audio] could not open an audio context:', err?.message ?? err);
    primedCtx = null;
  }
  return primedCtx;
}

async function ensureEngine() {
  if (engine) return engine;
  if (!enginePromise) {
    enginePromise = import('./engine.js')
      .then((m) => {
        // Hand over the context that was opened during the gesture.
        engine = m.createAudioEngine(
          primedCtx ? { contextFactory: () => primedCtx } : {},
        );
        engine.onNoteStart = fanOut(listeners.start);
        engine.onNoteEnd = fanOut(listeners.end);
        return engine;
      })
      .catch((err) => {
        console.warn('[audio] engine unavailable:', err?.message ?? err);
        enginePromise = null;
        return null;
      });
  }
  return enginePromise;
}

/**
 * Call from any real user gesture. Safe to call repeatedly.
 *
 * The first statement must stay synchronous. Everything after the first await
 * has already lost the user activation, so the context has to exist by then.
 */
export async function unlockAudio() {
  // If this returns null the user has not interacted yet. Bail before building
  // the engine too: the engine opens its own context when it is not handed
  // one, which would put it permanently on a suspended context that the
  // browser will never start. Silent until the first real gesture is correct.
  if (!primeContext()) return false;
  const e = await ensureEngine();
  if (!e) return false;
  if (!unlocked) {
    await e.unlock();
    unlocked = true;
    // Guarded so this module stays loadable outside a browser — the audio
    // bridge is testable in Node, and a missing `document` must not be the
    // thing that stops sound working.
    if (typeof document !== 'undefined' && document.documentElement) {
      document.documentElement.dataset.audio = 'on';
    }
  }
  return true;
}

/** True once sound can actually be produced. */
export function isAudioReady() { return unlocked; }

/**
 * Run something on the engine, unlocking first if needed. Every call site is
 * a user gesture, so unlocking here is legitimate and keeps the callers clean.
 */
async function withEngine(fn) {
  const ok = await unlockAudio();
  if (!ok || !engine) return null;
  try { return fn(engine); } catch (err) { console.warn('[audio]', err); return null; }
}

/**
 * For calls that must never *start* audio: stopping, and setting levels.
 *
 * The router silences audio on every navigation, including the very first
 * render at boot. Routing that through unlockAudio() built an AudioContext
 * before the user had touched anything, so the browser created it suspended
 * and then refused to start it. Silence costs nothing when there is no engine,
 * so these calls simply do nothing until one exists.
 */
function withExistingEngine(fn) {
  if (!engine) return null;
  try { return fn(engine); } catch (err) { console.warn('[audio]', err); return null; }
}

export const audio = {
  note: (note, opts) => withEngine((e) => e.playNote(note, opts)),
  chord: (notes, opts) => withEngine((e) => e.playChord(notes, opts)),
  sequence: (notes, opts) => withEngine((e) => e.playSequence(notes, opts)),
  interval: (a, b, opts) => withEngine((e) => e.playInterval(a, b, opts)),
  stopAll: () => withExistingEngine((e) => e.stopAll()),
  setTempo: (bpm) => withExistingEngine((e) => e.setTempo(bpm)),
  setVolume: (v) => withExistingEngine((e) => e.setVolume(v)),

  /**
   * MIDI numbers sounding right now, for `ViewState.sounding`.
   *
   * Synchronous and safe before any audio exists, because views call it while
   * rendering. The note callbacks above are the live feed; this is the answer
   * for a view that mounts in the middle of a phrase and would otherwise draw
   * nothing until the next onset.
   */
  sounding: () => (engine ? engine.sounding() : []),

  /**
   * Views subscribe here to light up in time with the sound. Safe to call
   * before any audio exists. Receives `(note, event)`; returns an unsubscribe.
   */
  onNoteStart(fn) { return subscribe(listeners.start, fn); },
  onNoteEnd(fn) { return subscribe(listeners.end, fn); },
};
