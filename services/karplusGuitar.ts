// ───────────────────────────────────────────────────────────────────────────
// Karplus-Strong plucked-string engine for the Open Jam backing reel.
//
// Replaces the old triangle+saw "synth guitar" with a real physical model:
// excite a delay line with a filtered noise burst, then feed it back through a
// one-pole loop filter. That IS how a plucked steel string behaves — bright
// attack, harmonics that damp from the top down, natural decay. It reads as a
// credible flat-picked guitar rather than an oscillator pretending to be one.
//
// Each distinct pitch is rendered once into a mono AudioBuffer and cached, so
// the model runs in plain JS (no AudioWorklet) and is fully deterministic —
// it renders identically in an OfflineAudioContext, which is how we RMS-test it.
// Follows the foundation contract: constructor takes a BaseAudioContext, voices
// route into a shared MasterBus (limiter + analyser). Never news up a context.
// ───────────────────────────────────────────────────────────────────────────

import { MasterBus, createMasterBus, clamp } from './audio/core';

type Kind = 'guitar' | 'chuck' | 'bass';

interface PluckParams {
  dur: number;     // rendered length, seconds
  decay: number;   // loop feedback gain — sustain (1 = forever, <1 dies)
  damping: number; // loop lowpass mix 0..0.5 — string brightness (low = bright)
  exTone: number;  // 0 dark .. 1 bright excitation (pick hardness)
  gain: number;    // per-voice output level
}

// Steel-string flatpick, muted backbeat chuck, and upright pizz bass.
const KIND: Record<Kind, PluckParams> = {
  guitar: { dur: 1.7,  decay: 0.9966, damping: 0.14, exTone: 0.62, gain: 0.20 },
  chuck:  { dur: 0.22, decay: 0.86,   damping: 0.50, exTone: 0.30, gain: 0.34 }, // short, dark, percussive
  bass:   { dur: 1.3,  decay: 0.9955, damping: 0.34, exTone: 0.34, gain: 0.52 },
};

/** Render one plucked string into a mono AudioBuffer (extended Karplus-Strong). */
function renderPluck(ctx: BaseAudioContext, freq: number, kind: Kind): AudioBuffer {
  const sr = ctx.sampleRate;
  const p = KIND[kind];
  const N = Math.max(1, Math.floor(sr * p.dur));
  const buf = ctx.createBuffer(1, N, sr);
  const out = buf.getChannelData(0);

  const L = Math.max(2, Math.round(sr / freq)); // delay-line length = one period
  const line = new Float32Array(L);

  // Excitation: a noise burst, one-pole lowpassed toward exTone (softer pick = darker).
  let lp = 0;
  const a = 0.04 + 0.92 * p.exTone;
  for (let i = 0; i < L; i++) {
    const w = Math.random() * 2 - 1;
    lp += a * (w - lp);
    line[i] = lp;
  }

  // KS loop: read sample, write back a damped 2-tap lowpass of it, scaled by decay.
  // DC-block the output so stacked voices don't pile up offset (would eat headroom).
  let idx = 0;
  let last = 0;
  let dcX = 0;
  let dcY = 0;
  for (let n = 0; n < N; n++) {
    const x = line[idx];
    line[idx] = (x * (1 - p.damping) + last * p.damping) * p.decay;
    last = x;
    idx = idx + 1 >= L ? 0 : idx + 1;
    dcY = x - dcX + 0.996 * dcY;
    dcX = x;
    out[n] = dcY;
  }

  // 4ms fade-out so the buffer never ends on a hard edge (click).
  const f = Math.min(N, (sr * 0.004) | 0);
  for (let i = 0; i < f; i++) out[N - 1 - i] *= i / f;
  return buf;
}

/** A couple of resonant peaks + a high shelf cut — the hollow "box" of an acoustic. */
function makeBody(ctx: BaseAudioContext): { input: GainNode; output: GainNode } {
  const input = ctx.createGain();
  const output = ctx.createGain();
  const peaks = [
    { f: 110, q: 1.2, g: 2.5 },   // air / low body
    { f: 240, q: 1.4, g: 1.5 },   // back-plate thump
    { f: 430, q: 1.6, g: -2.5 },  // tame the boxy midrange
    { f: 2600, q: 0.8, g: 2.0 },  // pick presence / string zing
  ];
  peaks.forEach((r) => {
    const bp = ctx.createBiquadFilter();
    bp.type = 'peaking';
    bp.frequency.value = r.f;
    bp.Q.value = r.q;
    bp.gain.value = r.g;
    input.connect(bp);
    bp.connect(output);
  });
  const dry = ctx.createGain();
  dry.gain.value = 0.7;
  input.connect(dry);
  dry.connect(output);
  return { input, output };
}

/** Short exponential-noise impulse response for a touch of room. */
function makeRoomIR(ctx: BaseAudioContext, seconds = 0.9, decay = 3.2): AudioBuffer {
  const len = Math.max(1, Math.floor(ctx.sampleRate * seconds));
  const buf = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
  }
  return buf;
}

export class KarplusGuitarEngine {
  ctx: BaseAudioContext;
  master: MasterBus;

  private body: { input: GainNode; output: GainNode };
  private bassLP: BiquadFilterNode; // woody upright lowpass
  private cache = new Map<string, AudioBuffer>();

  constructor(ctx: BaseAudioContext) {
    this.ctx = ctx;
    this.master = createMasterBus(ctx, 0.62);

    // Guitar / chuck → body box → (dry + short room) → master.
    this.body = makeBody(ctx);
    this.body.output.connect(this.master.input);

    const conv = ctx.createConvolver();
    conv.buffer = makeRoomIR(ctx);
    const wet = ctx.createGain();
    wet.gain.value = 0.13;
    this.body.output.connect(conv);
    conv.connect(wet);
    wet.connect(this.master.input);

    // Bass gets its own lowpass for the dark upright pizz tone (bypasses the box EQ).
    this.bassLP = ctx.createBiquadFilter();
    this.bassLP.type = 'lowpass';
    this.bassLP.frequency.value = 520;
    this.bassLP.Q.value = 0.7;
    this.bassLP.connect(this.master.input);
  }

  get analyser(): AnalyserNode { return this.master.analyser; }

  private getBuffer(freq: number, kind: Kind): AudioBuffer {
    // Quantize to ~half-Hz so a chord's repeated notes reuse one render.
    const key = `${kind}:${Math.round(freq * 2)}`;
    let buf = this.cache.get(key);
    if (!buf) {
      buf = renderPluck(this.ctx, freq, kind);
      this.cache.set(key, buf);
    }
    return buf;
  }

  private voice(freq: number, time: number, velocity: number, kind: Kind, dest: AudioNode): void {
    const src = this.ctx.createBufferSource();
    src.buffer = this.getBuffer(freq, kind);
    src.detune.value = (Math.random() * 2 - 1) * 4; // ±4¢ human pitch wander
    const g = this.ctx.createGain();
    g.gain.value = KIND[kind].gain * clamp(velocity, 0.05, 1);
    src.connect(g);
    g.connect(dest);
    const t = Math.max(time, this.ctx.currentTime);
    src.start(t);
    src.stop(t + src.buffer.duration + 0.02);
    src.onended = () => { try { src.disconnect(); g.disconnect(); } catch { /* already gone */ } };
  }

  // ── Public API (matches what the Open Jam scheduler calls) ────────────────

  /** Roll a full chord as a strum — staggered low→high (DOWN) or high→low (UP). */
  playGuitarStrum(freqs: number[], time: number, direction: 'DOWN' | 'UP', velocity: number, _bpm: number): void {
    const order = direction === 'DOWN' ? freqs : [...freqs].reverse();
    const spread = direction === 'DOWN' ? 0.020 : 0.014; // seconds across the strings
    const step = order.length > 1 ? spread / (order.length - 1) : 0;
    order.forEach((f, i) => this.voice(f, time + i * step, velocity * (1 - i * 0.04), 'guitar', this.body.input));
  }

  /** The boom-CHUCK backbeat: a tight, muted, percussive chord choke on 2 & 4. */
  playChuck(freqs: number[], time: number, velocity: number, _bpm: number): void {
    const step = 0.006;
    freqs.forEach((f, i) => this.voice(f, time + i * step, velocity, 'chuck', this.body.input));
  }

  /** Alternating root/fifth bass note (boom). */
  playBassNote(freq: number, time: number, velocity: number): void {
    this.voice(freq, time, velocity, 'bass', this.bassLP);
  }

  connect(dest: AudioNode): void { this.master.output.connect(dest); }

  resume(): void {
    const c = this.ctx as AudioContext;
    if (typeof c.resume === 'function' && c.state === 'suspended') c.resume();
  }

  dispose(): void {
    try { this.master.output.disconnect(); } catch { /* */ }
    this.cache.clear();
  }
}
