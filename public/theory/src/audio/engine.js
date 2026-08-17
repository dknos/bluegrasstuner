/**
 * THE AUDIO ENGINE.
 *
 * A music-theory app that shows you a minor third without letting you hear one
 * has taught you a picture, not an interval. So this module has one job: turn
 * `Note` objects from the theory engine into sound that arrives when it said
 * it would, and tell the views — to the millisecond — which notes are ringing
 * so all four representations light up together.
 *
 * THREE RULES THIS FILE OBEYS
 *
 * 1. No AudioContext until a gesture. Constructing one at import time gets it
 *    born `suspended` in every browser and, in some, permanently wedged. The
 *    context is created inside `unlock()` and nowhere else.
 *
 * 2. Pitch comes from the theory engine. `frequency()` in `src/theory/pitch.js`
 *    is the only thing here allowed to know what a note sounds like. There is
 *    not a single `Math.pow(2, n/12)` in this file.
 *
 * 3. Every voice is disposable. A voice owns its nodes, disconnects all of
 *    them when its tail is finished, and drops out of the active set. A stuck
 *    note in a teaching app is worse than silence, because the learner cannot
 *    tell whether the drone is the app or the lesson.
 *
 * SOUND DESIGN
 * Three oscillators (detuned saw + triangle for body, a fast square an octave
 * up for the hammer), through a lowpass whose cutoff opens on the attack and
 * closes over the decay, into an amplitude envelope with a fast attack and an
 * exponential fall. Velocity moves loudness and brightness together. Voices are
 * panned by register and share a synthesized convolution room. The master bus
 * ends in a compressor and a soft-clip curve so a six-note chord cannot clip.
 *
 * TWO CLOCKS
 * Note starts are scheduled on the AudioContext clock, which is sample
 * accurate. UI callbacks are dispatched from a 25ms poll that reads that same
 * clock — the standard two-clock arrangement. A timer that is late fires late
 * but never out of order, and the audio does not move either way.
 *
 * All of the arithmetic lives in `./dsp.js` and is re-exported below, so
 * callers import from here and tests can check the maths without a sound card.
 *
 * ONE THING THE THEORY ENGINE DOES NOT HAVE
 * `frequency(note, a4)` takes a tuning reference per call, but there is no
 * engine-level notion of tuning to read it from — so `a4` is an option on this
 * module instead, threaded into every call. If a tuning concept ever lands in
 * `src/theory/`, this should defer to it rather than keep its own copy.
 */

import { asNote, midi, frequency as noteFrequency, noteName, sortNotes } from '../theory/pitch.js';
import * as dsp from './dsp.js';

export * from './dsp.js';

/** AudioParam values must stay positive to be ramped exponentially. */
const EPS = 0.0001;

/** How fast a note is taken away when it is cut off rather than released. */
const FAST_RELEASE = 0.06;
/** Faster still when the polyphony cap forces a voice out. */
const STEAL_RELEASE = 0.03;
/** Re-striking a key that is still ringing damps the old string first. */
const RESTRIKE_RELEASE = 0.05;

/**
 * Build the engine. Cheap, synchronous, and touches no browser API — safe to
 * call at module scope. Nothing makes a sound until `unlock()`.
 *
 * @param {object} [options]
 * @param {number} [options.tempo]        starting tempo in BPM
 * @param {number} [options.volume]       0..1 master level
 * @param {number} [options.a4]           tuning reference in Hz
 * @param {number} [options.maxVoices]    polyphony cap before voice stealing
 * @param {number} [options.lookahead]    seconds of audio scheduled ahead
 * @param {number} [options.tickInterval] scheduler poll in ms
 * @param {boolean} [options.autoUnlock]  first play() call opens the context
 * @param {function} [options.contextFactory] test seam; returns an AudioContext
 * @param {function} [options.onError]    non-fatal engine errors land here
 */
export function createAudioEngine({
  tempo = dsp.DEFAULT_TEMPO,
  volume = 0.75,
  a4 = 440,
  maxVoices = 24,
  lookahead = 0.12,
  tickInterval = 25,
  retriggerWindow = 0.02,
  autoUnlock = true,
  reverb = {},
  contextFactory,
  onError,
} = {}) {
  const room = {
    seconds: 1.7, decay: 2.7, mix: 0.2, damping: 4200, preDelay: 0.018, seed: 20260815,
    ...reverb,
  };

  let ctx = null;
  let out = null;          // master chain nodes
  let unlocking = null;    // in-flight unlock(), shared by concurrent callers
  let disposed = false;

  let queue = [];          // pending note events, in no particular order
  const voices = new Set();
  const byPitch = new Map(); // midi → newest event for that pitch
  const cleanupTimers = new Set();
  let timer = null;
  let nextId = 1;

  let bpm = clamp01Tempo(tempo);
  let level = clamp01(volume);

  const api = {};

  function clamp01(x) { return dsp.clamp(x, 0, 1); }
  function clamp01Tempo(x) { return dsp.clamp(x, dsp.MIN_TEMPO, dsp.MAX_TEMPO); }

  function report(err) {
    if (typeof onError === 'function') {
      try { onError(err); return; } catch { /* an error handler that throws is on its own */ }
    }
    if (typeof console !== 'undefined' && console.warn) console.warn('[audio]', err);
  }

  /** A listener that throws must not take the scheduler down with it. */
  function emit(fn, payload) {
    if (typeof fn !== 'function') return;
    try { fn(payload); } catch (err) { report(err); }
  }

  // -------------------------------------------------------------------------
  // CONTEXT
  // -------------------------------------------------------------------------

  function makeContext() {
    if (typeof contextFactory === 'function') return contextFactory();
    // Looked up here, never at module scope, so importing this file in Node
    // (or any other AudioContext-free environment) cannot throw.
    const g = typeof globalThis === 'undefined' ? null : globalThis;
    const Ctor = g && (g.AudioContext || g.webkitAudioContext);
    if (!Ctor) return null;
    try {
      return new Ctor({ latencyHint: 'interactive' });
    } catch {
      return new Ctor();
    }
  }

  function has(name) {
    return !!ctx && typeof ctx[name] === 'function';
  }

  /**
   * Open the context. Call it from a real user gesture — a click, a keypress,
   * a touch. Idempotent, and concurrent calls share one in-flight promise so
   * a double-tap cannot build two contexts and double every note.
   * @returns {Promise<object>} the engine
   */
  function unlock() {
    if (disposed) return Promise.resolve(api);
    if (unlocking) return unlocking;
    if (ctx && ctx.state !== 'closed') {
      if (ctx.state === 'suspended' && typeof ctx.resume === 'function') {
        return Promise.resolve(ctx.resume()).then(() => api, (err) => { report(err); return api; });
      }
      return Promise.resolve(api);
    }
    unlocking = (async () => {
      try {
        ctx = makeContext();
        if (!ctx) {
          report(new Error('Web Audio is not available in this environment.'));
          return api;
        }
        out = buildMasterChain();
        if (ctx.state === 'suspended' && typeof ctx.resume === 'function') {
          try { await ctx.resume(); } catch (err) { report(err); }
        }
        primeOutput();
        return api;
      } finally {
        unlocking = null;
      }
    })();
    return unlocking;
  }

  /**
   * iOS will not consider a context live until something has actually been
   * rendered through it, so push one silent sample.
   */
  function primeOutput() {
    if (!has('createBufferSource') || !has('createBuffer')) return;
    try {
      const src = ctx.createBufferSource();
      src.buffer = ctx.createBuffer(1, 1, ctx.sampleRate || 44100);
      src.connect(ctx.destination);
      src.start(0);
      src.onended = () => { try { src.disconnect(); } catch { /* already gone */ } };
    } catch (err) {
      report(err);
    }
  }

  // -------------------------------------------------------------------------
  // MASTER CHAIN
  //
  //   voices ──┬─────────────────────────────────────────┐
  //            └─ send ─ predelay ─ damping ─ room ──────┤
  //                                                      ▼
  //                              bus ─ compressor ─ softclip ─ master ─ out
  // -------------------------------------------------------------------------

  function buildMasterChain() {
    const bus = ctx.createGain();
    bus.gain.value = 0.5;

    let tail = bus;
    let comp = null;
    if (has('createDynamicsCompressor')) {
      comp = ctx.createDynamicsCompressor();
      setParam(comp.threshold, -14);
      setParam(comp.knee, 8);
      setParam(comp.ratio, 12);
      setParam(comp.attack, 0.003);
      setParam(comp.release, 0.2);
      tail.connect(comp);
      tail = comp;
    }

    let shaper = null;
    if (has('createWaveShaper')) {
      shaper = ctx.createWaveShaper();
      shaper.curve = dsp.softClipCurve(2048);
      if ('oversample' in shaper) shaper.oversample = '2x';
      tail.connect(shaper);
      tail = shaper;
    }

    const master = ctx.createGain();
    master.gain.value = level;
    tail.connect(master);
    master.connect(ctx.destination);

    const send = ctx.createGain();
    send.gain.value = dsp.clamp(room.mix, 0, 1);
    const roomNodes = buildRoom(bus);
    if (roomNodes) send.connect(roomNodes.input);
    else send.gain.value = 0;

    return { bus, send, master, comp, shaper, room: roomNodes };
  }

  function setParam(param, value) {
    if (!param) return;
    try { param.value = value; } catch (err) { report(err); }
  }

  /**
   * The room, synthesized. A convolver fed with seeded decaying noise if the
   * browser has one; a geometric tap delay if it does not. Either way there is
   * no impulse file to download and no dependency to install.
   */
  function buildRoom(destination) {
    const input = ctx.createGain();
    input.gain.value = 1;

    let head = input;
    if (has('createDelay')) {
      const pre = ctx.createDelay(0.5);
      setParam(pre.delayTime, room.preDelay);
      head.connect(pre);
      head = pre;
    }
    if (has('createBiquadFilter')) {
      const damp = ctx.createBiquadFilter();
      damp.type = 'lowpass';
      setParam(damp.frequency, room.damping);
      head.connect(damp);
      head = damp;
    }

    const impulse = makeImpulse();
    if (impulse && has('createConvolver')) {
      try {
        const conv = ctx.createConvolver();
        conv.normalize = true;
        conv.buffer = impulse;
        head.connect(conv);
        conv.connect(destination);
        return { input, node: conv };
      } catch (err) {
        report(err);
      }
    }

    if (has('createDelay')) {
      for (const tap of dsp.multitapPlan(5)) {
        const d = ctx.createDelay(1);
        setParam(d.delayTime, tap.time);
        const g = ctx.createGain();
        g.gain.value = tap.gain * 0.5;
        head.connect(d);
        d.connect(g);
        const p = makePanner(tap.pan);
        if (p) { g.connect(p); p.connect(destination); } else { g.connect(destination); }
      }
      return { input, node: null };
    }

    return null;
  }

  function makeImpulse() {
    if (!has('createBuffer')) return null;
    try {
      const rate = ctx.sampleRate || 44100;
      const length = Math.max(1, Math.floor(rate * room.seconds));
      const buf = ctx.createBuffer(2, length, rate);
      for (let channel = 0; channel < 2; channel++) {
        const rand = dsp.makeRandom(room.seed + channel * 7919);
        const data = buf.getChannelData(channel);
        for (let i = 0; i < length; i++) {
          data[i] = dsp.impulseSample(i, length, { decay: room.decay, rand });
        }
      }
      return buf;
    } catch (err) {
      report(err);
      return null;
    }
  }

  function makePanner(position) {
    if (has('createStereoPanner')) {
      const p = ctx.createStereoPanner();
      setParam(p.pan, position);
      return p;
    }
    return null;
  }

  // -------------------------------------------------------------------------
  // VOICES
  // -------------------------------------------------------------------------

  function liveVoiceCount() {
    let n = 0;
    for (const v of voices) if (!v.released) n++;
    return n;
  }

  function startVoice(ev) {
    if (voices.size >= maxVoices) {
      const victim = dsp.chooseVoiceToSteal([...voices], ctx.currentTime);
      if (victim) victim.release(ctx.currentTime, STEAL_RELEASE);
    }
    if (liveVoiceCount() >= maxVoices) {
      const victim = dsp.chooseVoiceToSteal([...voices].filter((v) => !v.released), ctx.currentTime);
      if (victim) victim.release(ctx.currentTime, STEAL_RELEASE);
    }

    const hz = ev.frequency;
    const nyquist = (ctx.sampleRate || 44100) / 2;
    const env = dsp.envelopeFor({ frequency: hz, velocity: ev.velocity, duration: ev.duration });
    const fenv = dsp.filterEnvelopeFor({
      frequency: hz, velocity: ev.velocity, duration: ev.duration, nyquist,
    });
    const t0 = Math.max(ev.when, ctx.currentTime);
    const offAt = t0 + env.hold;
    const nodes = [];

    // ---- amplitude ---------------------------------------------------------
    const amp = ctx.createGain();
    nodes.push(amp);
    const g = amp.gain;
    g.setValueAtTime(EPS, t0);
    g.linearRampToValueAtTime(Math.max(EPS, env.peak), t0 + env.attack);
    const decayEnds = t0 + env.attack + env.decay;
    if (offAt >= decayEnds) {
      g.exponentialRampToValueAtTime(Math.max(EPS, env.sustain), decayEnds);
      g.setValueAtTime(Math.max(EPS, env.sustain), offAt);
    } else {
      // Released mid-decay. Land the ramp on exactly the value the curve would
      // have had, so a short note and a long note share one shape.
      g.exponentialRampToValueAtTime(Math.max(EPS, dsp.envelopeValueAt(env.hold, env)), offAt);
    }
    g.linearRampToValueAtTime(0, offAt + env.release);

    // ---- timbre ------------------------------------------------------------
    let chainHead = amp;
    if (has('createBiquadFilter')) {
      const filter = ctx.createBiquadFilter();
      nodes.push(filter);
      filter.type = 'lowpass';
      setParam(filter.Q, fenv.q);
      const f = filter.frequency;
      f.setValueAtTime(Math.max(60, fenv.sustainHz), t0);
      f.linearRampToValueAtTime(Math.max(60, fenv.peakHz), t0 + fenv.attack);
      f.exponentialRampToValueAtTime(Math.max(60, fenv.sustainHz), t0 + fenv.attack + fenv.decay);
      filter.connect(amp);
      chainHead = filter;
    }

    const oscs = [];
    for (const spec of dsp.oscillatorPlan(ev.velocity)) {
      const osc = ctx.createOscillator();
      nodes.push(osc);
      osc.type = spec.type;
      setParam(osc.frequency, hz * spec.ratio);
      setParam(osc.detune, spec.detune);
      const mix = ctx.createGain();
      nodes.push(mix);
      if (spec.hammer) {
        // The strike itself: present for a few dozen milliseconds, then gone.
        mix.gain.setValueAtTime(EPS, t0);
        mix.gain.linearRampToValueAtTime(Math.max(EPS, spec.gain), t0 + 0.002);
        mix.gain.exponentialRampToValueAtTime(EPS, t0 + 0.075);
      } else {
        mix.gain.value = spec.gain;
      }
      osc.connect(mix);
      mix.connect(chainHead);
      oscs.push(osc);
    }

    // ---- placement ---------------------------------------------------------
    let outHead = amp;
    const pan = makePanner(dsp.panFor(ev.midi));
    if (pan) {
      nodes.push(pan);
      amp.connect(pan);
      outHead = pan;
    }
    outHead.connect(out.bus);
    if (out.send) outHead.connect(out.send);

    const voice = {
      id: ev.id,
      midi: ev.midi,
      env,
      startedAt: t0,
      releaseAt: offAt,
      stopAt: offAt + env.release + 0.02,
      released: false,
      finished: false,
      release(at, fast) {
        if (this.released || this.finished) return;
        this.released = true;
        const t = Math.max(Number.isFinite(at) ? at : 0, ctx.currentTime);
        const rel = Number.isFinite(fast) ? fast : env.release;
        // Start the ramp from wherever the envelope actually is right now.
        // Reading `.value` would give the level at currentTime, not at `t`.
        const held = t <= this.startedAt ? 0 : dsp.envelopeValueAt(t - this.startedAt, env);
        try {
          g.cancelScheduledValues(t);
          g.setValueAtTime(Math.max(EPS, held), t);
          g.linearRampToValueAtTime(0, t + rel);
        } catch (err) {
          report(err);
        }
        this.releaseAt = t;
        // Voices are only ever built inside the lookahead window, so even a
        // note stopped before it spoke is at most `lookahead` from its start
        // and cannot hold nodes alive for long. The gain ramp above already
        // guarantees silence; this only frees the oscillators.
        this.stopAt = Math.max(t, this.startedAt + 0.001) + rel + 0.02;
        for (const osc of oscs) {
          try { osc.stop(this.stopAt); } catch (err) { report(err); }
        }
        armCleanup(this);
      },
      finish() {
        if (this.finished) return;
        this.finished = true;
        voices.delete(this);
        for (const node of nodes) {
          try { node.disconnect(); } catch { /* already detached */ }
        }
      },
    };

    for (const osc of oscs) {
      try {
        osc.start(t0);
        osc.stop(voice.stopAt);
      } catch (err) {
        report(err);
      }
      osc.onended = () => voice.finish();
    }

    voices.add(voice);
    armCleanup(voice);
    return voice;
  }

  /**
   * Belt and braces. `onended` is reliable in every current browser, but a
   * voice that somehow never fires it would be a permanent leak, so a timer
   * sweeps it up shortly after its tail should be over.
   */
  function armCleanup(voice) {
    if (typeof setTimeout !== 'function') return;
    const ms = Math.max(0, (voice.stopAt - ctx.currentTime) * 1000) + 400;
    const handle = setTimeout(() => {
      cleanupTimers.delete(handle);
      voice.finish();
    }, ms);
    if (handle && typeof handle.unref === 'function') handle.unref();
    cleanupTimers.add(handle);
  }

  // -------------------------------------------------------------------------
  // SCHEDULER
  // -------------------------------------------------------------------------

  function eventPayload(ev) {
    return {
      id: ev.id,
      groupId: ev.groupId,
      note: ev.note,
      name: ev.name,
      midi: ev.midi,
      frequency: ev.frequency,
      velocity: ev.velocity,
      when: ev.when,
      duration: ev.duration,
    };
  }

  /**
   * Advance the scheduler. The interval calls this every `tickInterval` ms;
   * it is public so a host can drive it from requestAnimationFrame instead,
   * and so tests can step the clock by hand.
   */
  function tick() {
    if (!ctx) return;
    const now = ctx.currentTime;
    const { toVoice, toStart, toEnd, remaining } = dsp.classifyEvents(queue, now, { lookahead });

    for (const ev of toVoice) {
      ev.voiced = true;
      try {
        ev.voice = startVoice(ev);
      } catch (err) {
        report(err);
        ev.ended = true;
      }
    }
    for (const ev of toStart) {
      if (ev.ended) continue;
      ev.started = true;
      emit(api.onNoteStart, eventPayload(ev));
    }
    for (const ev of toEnd) {
      ev.ended = true;
      if (byPitch.get(ev.midi) === ev) byPitch.delete(ev.midi);
      emit(api.onNoteEnd, eventPayload(ev));
    }

    queue = remaining.filter((ev) => !ev.ended);
    if (queue.length === 0) stopTimer();
  }

  function ensureTimer() {
    if (timer || queue.length === 0) return;
    if (typeof setInterval !== 'function') return;
    timer = setInterval(tick, tickInterval);
    if (timer && typeof timer.unref === 'function') timer.unref();
  }

  function stopTimer() {
    if (timer && typeof clearInterval === 'function') clearInterval(timer);
    timer = null;
  }

  /** Turn a plan from dsp.js into live events and hand back a handle. */
  function schedule(notes, plan, { velocity = 0.8 } = {}) {
    const groupId = nextId++;
    const events = [];
    for (const step of plan) {
      const n = notes[step.index];
      if (!n) continue;
      const m = midi(n);
      const ev = {
        id: nextId++,
        groupId,
        note: n,
        name: noteName(n, { octave: true }),
        midi: m,
        frequency: noteFrequency(n, a4),
        velocity: dsp.clamp(velocity * step.velocityScale, 0, 1),
        when: step.when,
        duration: Math.max(0.02, step.duration),
        voiced: false,
        started: false,
        ended: false,
        voice: null,
      };
      // Re-striking a key that is still ringing damps the old string first,
      // which is both what a piano does and what stops rapid repeats stacking.
      const prev = byPitch.get(m);
      if (prev && !prev.ended && prev.voice && prev.when + prev.duration > ev.when) {
        prev.voice.release(ev.when, RESTRIKE_RELEASE);
      }
      byPitch.set(m, ev);
      events.push(ev);
      queue.push(ev);
    }
    tick();        // no added latency for anything due right now
    ensureTimer(); // the rest is the poll's problem
    return makeHandle(groupId, events);
  }

  function makeHandle(groupId, events) {
    const first = events[0] ?? null;
    return {
      id: groupId,
      events,
      notes: events.map((e) => e.note),
      note: first ? first.note : null,
      midi: first ? first.midi : null,
      when: first ? first.when : 0,
      duration: first ? first.duration : 0,
      get playing() { return events.some((e) => !e.ended); },
      stop(at) { stopEvents(events, at); return this; },
    };
  }

  /** What a play call returns before the context exists: inert, never null. */
  function inertHandle(notes = []) {
    const first = notes[0] ?? null;
    return {
      id: 0,
      events: [],
      notes,
      note: first,
      midi: first ? midi(first) : null,
      when: 0,
      duration: 0,
      playing: false,
      stop() { return this; },
    };
  }

  function stopEvents(events, at) {
    if (!ctx) return;
    const now = ctx.currentTime;
    const t = Math.max(Number.isFinite(at) ? at : now, now);
    for (const ev of events) {
      if (ev.ended) continue;
      ev.ended = true;
      if (ev.voice) ev.voice.release(t, FAST_RELEASE);
      if (byPitch.get(ev.midi) === ev) byPitch.delete(ev.midi);
      if (ev.started) emit(api.onNoteEnd, eventPayload(ev));
    }
    queue = queue.filter((ev) => !ev.ended);
    if (queue.length === 0) stopTimer();
  }

  /** Open the context on the first play call, so a click just works. */
  function ready() {
    if (disposed) return false;
    if (!ctx && autoUnlock) unlock();
    return !!ctx && !!out;
  }

  function startAt(when) {
    return Number.isFinite(when) ? Math.max(when, ctx.currentTime) : ctx.currentTime;
  }

  // -------------------------------------------------------------------------
  // PUBLIC API
  // -------------------------------------------------------------------------

  /**
   * One note.
   * @param {object|string} n
   * @param {{duration?:number, velocity?:number, when?:number}} [opts]
   * @returns {object} handle with `.stop()` and `.playing`
   */
  function playNote(n, { duration = 0.9, velocity = 0.8, when } = {}) {
    const note = asNote(n);
    if (!ready()) return inertHandle([note]);
    const t = startAt(when);
    const m = midi(note);
    // A double-fired pointer event is one strike, not two.
    const prev = byPitch.get(m);
    if (dsp.isDuplicateOnset(prev, t, retriggerWindow) && prev.handle) return prev.handle;

    const handle = schedule([note], [{ index: 0, when: t, duration, velocityScale: 1 }], { velocity });
    for (const ev of handle.events) ev.handle = handle;
    return handle;
  }

  /**
   * Several notes as one chord. See `planChord` for exactly what each style
   * does with `gap` and `duration`.
   * @param {Array<object|string>} notes
   * @param {{style?:'block'|'arpeggio'|'roll', duration?:number, gap?:number,
   *          velocity?:number, when?:number}} [opts]
   */
  function playChord(notes, {
    style = 'block', duration = 1.6, gap, velocity = 0.8, when,
  } = {}) {
    const list = (notes ?? []).map((n) => asNote(n));
    if (list.length === 0) return inertHandle([]);
    if (!ready()) return inertHandle(list);
    const plan = dsp.planChord(list.length, {
      style, duration, gap, tempo: bpm, startTime: startAt(when),
    });
    return schedule(list, plan, { velocity });
  }

  /**
   * One note after another. `tempo` defaults to the transport tempo, `beats`
   * is how many beats each note occupies, `gap` adds silence between onsets
   * and `articulation` shortens the sound inside its slot.
   */
  function playSequence(notes, {
    tempo: seqTempo, beats = 1, gap = 0, articulation = 'normal',
    velocity = 0.8, when,
  } = {}) {
    const list = (notes ?? []).map((n) => asNote(n));
    if (list.length === 0) return inertHandle([]);
    if (!ready()) return inertHandle(list);
    const plan = dsp.planSequence(list.length, {
      startTime: startAt(when),
      tempo: Number.isFinite(seqTempo) ? seqTempo : bpm,
      beats,
      gap,
      articulation,
    });
    return schedule(list, plan, { velocity });
  }

  /**
   * Two notes, melodically or together. The pair is sorted by pitch first, so
   * `descending` always descends regardless of argument order.
   */
  function playInterval(a, b, {
    mode = 'ascending', duration = 0.85, gap = 0.05, velocity = 0.8, when,
  } = {}) {
    const pair = sortNotes([asNote(a), asNote(b)]);
    if (!ready()) return inertHandle(pair);
    const plan = dsp.planInterval(mode, { startTime: startAt(when), duration, gap });
    return schedule(pair, plan, { velocity });
  }

  /**
   * Silence. Everything queued, everything sounding, everything scheduled —
   * including notes that have not started yet, which is the case that usually
   * survives a naive implementation and keeps playing after the stop button.
   */
  function stopAll() {
    // No context means nothing was ever scheduled, so there is no onNoteEnd
    // owed to anyone. Kept as an explicit branch rather than a lucky no-op.
    if (!ctx) { queue = []; byPitch.clear(); stopTimer(); return api; }
    const now = ctx.currentTime;
    // Anything that already reported a start must report an end, or every view
    // that lit up on onNoteStart stays lit for ever.
    const started = queue.filter((ev) => ev.started && !ev.ended);
    for (const ev of queue) ev.ended = true;
    queue = [];
    byPitch.clear();
    stopTimer();
    for (const ev of started) emit(api.onNoteEnd, eventPayload(ev));
    for (const voice of [...voices]) voice.release(now, FAST_RELEASE);
    return api;
  }

  function setTempo(value) {
    bpm = clamp01Tempo(value);
    return api;
  }

  function setVolume(value) {
    level = clamp01(value);
    if (out && out.master) {
      const t = ctx.currentTime;
      try {
        out.master.gain.cancelScheduledValues(t);
        out.master.gain.setValueAtTime(out.master.gain.value, t);
        out.master.gain.linearRampToValueAtTime(level, t + 0.03);
      } catch {
        setParam(out.master.gain, level);
      }
    }
    return api;
  }

  /**
   * MIDI numbers sounding right now — feeds `ViewState.sounding`.
   *
   * SEMANTICS: this is the KEY-DOWN window, from onNoteStart to onNoteEnd, and
   * deliberately excludes the decay tail. It matches the one-shot `ring`
   * animation in tokens.css, which blooms once per strike rather than holding
   * while a note fades. A note whose tail is still audible is not listed here.
   */
  function sounding() {
    const list = [];
    for (const ev of queue) if (ev.started && !ev.ended) list.push(ev.midi);
    return list;
  }

  /** Release the context and every node. The engine is unusable afterwards. */
  function dispose() {
    stopAll();
    disposed = true;
    for (const t of cleanupTimers) { try { clearTimeout(t); } catch { /* noop */ } }
    cleanupTimers.clear();
    for (const voice of [...voices]) voice.finish();
    voices.clear();
    if (ctx && typeof ctx.close === 'function') {
      try { ctx.close(); } catch (err) { report(err); }
    }
    ctx = null;
    out = null;
    return api;
  }

  Object.assign(api, {
    unlock,
    tick,
    playNote,
    playChord,
    playSequence,
    playInterval,
    stopAll,
    setTempo,
    setVolume,
    sounding,
    dispose,
    /** Fired the moment a note becomes audible. Assign a function. */
    onNoteStart: null,
    /** Fired when the key comes up — the tail may still be ringing. */
    onNoteEnd: null,
  });

  Object.defineProperties(api, {
    state: {
      enumerable: true,
      get() {
        if (!ctx || ctx.state === 'closed') return 'idle';
        return ctx.state === 'running' ? 'running' : 'suspended';
      },
    },
    tempo: { enumerable: true, get: () => bpm },
    volume: { enumerable: true, get: () => level },
    voiceCount: { enumerable: true, get: () => voices.size },
    pendingCount: { enumerable: true, get: () => queue.length },
    context: { enumerable: false, get: () => ctx },
  });

  return api;
}
