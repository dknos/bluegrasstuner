// ───────────────────────────────────────────────────────────────────────────
// Shared audio foundation for all synth engines.
//
// Design rules (so every engine is testable + well-behaved):
//   • Engines take a BaseAudioContext in their constructor — they NEVER call
//     `new AudioContext()` themselves. This lets us render them in an
//     OfflineAudioContext and assert RMS > threshold (deterministic tests),
//     and lets the host share one context.
//   • Engines route their voices into a MasterBus (soft limiter + analyser)
//     so nothing clips and every synth gets a scope for free.
//   • Voices are managed (polyphony + voice-stealing) and always ramp to/from
//     zero to avoid clicks. noteOff schedules release then frees the voice.
// ───────────────────────────────────────────────────────────────────────────

export const mtof = (midi: number): number => 440 * Math.pow(2, (midi - 69) / 12);
export const clamp = (v: number, min: number, max: number): number => Math.max(min, Math.min(max, v));
export const dbToGain = (db: number): number => Math.pow(10, db / 20);
/** Map a normalized 0..1 value onto a logarithmic range (musical for freq/rate). */
export const expScale = (n: number, min: number, max: number): number => min * Math.pow(max / min, clamp(n, 0, 1));

/** The contract every rebuilt engine implements. */
export interface SynthEngine {
  /** Start (or retrigger) a note. velocity 0..1. */
  noteOn(midi: number, velocity?: number): void;
  /** Release a note into its envelope tail. */
  noteOff(midi: number): void;
  /** Set a named parameter. value is engine-defined (number or enum string). */
  setParam(name: string, value: number | string): void;
  /** Connect the engine output to a destination (e.g. ctx.destination). */
  connect(dest: AudioNode): void;
  /** Tear everything down (stop oscillators, disconnect). */
  dispose(): void;
  /** Post-master analyser for scopes/spectrum. */
  readonly analyser: AnalyserNode;
}

export interface MasterBus {
  /** Engines connect their voices/effects into here. */
  input: GainNode;
  /** Tap for scopes (sits just before final output). */
  analyser: AnalyserNode;
  /** Final node — call .connect(dest) to route to speakers/offline dest. */
  output: GainNode;
  setVolume(v: number, ramp?: number): void;
}

/**
 * input → soft compressor/limiter → analyser → output(gain).
 * The limiter keeps stacked voices / distortion from clipping harshly.
 */
export function createMasterBus(ctx: BaseAudioContext, volume = 0.85): MasterBus {
  const input = ctx.createGain();
  input.gain.value = 1;

  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -8;
  comp.knee.value = 8;
  comp.ratio.value = 8;
  comp.attack.value = 0.004;
  comp.release.value = 0.2;

  const analyser = ctx.createAnalyser();
  analyser.fftSize = 2048;
  analyser.smoothingTimeConstant = 0.8;

  const output = ctx.createGain();
  output.gain.value = volume;

  input.connect(comp);
  comp.connect(analyser);
  analyser.connect(output);

  return {
    input,
    analyser,
    output,
    setVolume: (v: number, ramp = 0.02) => output.gain.setTargetAtTime(clamp(v, 0, 1), ctx.currentTime, ramp),
  };
}

export interface ADSR {
  a: number; // attack seconds
  d: number; // decay seconds
  s: number; // sustain level 0..1
  r: number; // release seconds
}

const MIN = 1e-4; // floor so exponential ramps stay valid

/** Open an amplitude/cutoff envelope: ramp param to peak, decay to peak*sustain. */
export function envOpen(param: AudioParam, ctx: BaseAudioContext, peak: number, env: ADSR, t0 = ctx.currentTime): void {
  const a = Math.max(0.001, env.a);
  const d = Math.max(0.001, env.d);
  param.cancelScheduledValues(t0);
  param.setValueAtTime(Math.max(MIN, param.value), t0);
  param.linearRampToValueAtTime(Math.max(MIN, peak), t0 + a);
  param.linearRampToValueAtTime(Math.max(MIN, peak * env.s), t0 + a + d);
}

/** Close an envelope: ramp param to ~zero over release. Returns when it ends. */
export function envClose(param: AudioParam, ctx: BaseAudioContext, env: ADSR, t0 = ctx.currentTime): number {
  const r = Math.max(0.005, env.r);
  param.cancelScheduledValues(t0);
  param.setValueAtTime(Math.max(MIN, param.value), t0);
  param.linearRampToValueAtTime(MIN, t0 + r);
  return t0 + r;
}

/** Minimal interface a managed voice must expose. */
export interface ManagedVoice {
  /** Begin release; free internal nodes after the tail. */
  release(t: number): void;
  /** Hard-stop immediately (used when stolen / disposed). */
  kill(): void;
}

/**
 * Polyphony with oldest-first voice stealing. Engines create a voice object,
 * hand it here on noteOn, and call release/releaseAll. One active voice per
 * midi note (retrigger kills the previous instance of that note).
 */
export class PolyVoiceManager<V extends ManagedVoice> {
  private voices: { midi: number; voice: V }[] = [];
  constructor(private maxVoices = 8) {}

  add(midi: number, voice: V): void {
    // retrigger same note: kill prior instance
    const existing = this.voices.findIndex((e) => e.midi === midi);
    if (existing >= 0) {
      this.voices[existing].voice.kill();
      this.voices.splice(existing, 1);
    }
    // steal oldest when full
    while (this.voices.length >= this.maxVoices) {
      this.voices.shift()?.voice.kill();
    }
    this.voices.push({ midi, voice });
  }

  release(midi: number, t: number): void {
    for (let i = this.voices.length - 1; i >= 0; i--) {
      if (this.voices[i].midi === midi) {
        this.voices[i].voice.release(t);
        this.voices.splice(i, 1);
      }
    }
  }

  releaseAll(t: number): void {
    this.voices.forEach((e) => e.voice.release(t));
    this.voices = [];
  }

  killAll(): void {
    this.voices.forEach((e) => e.voice.kill());
    this.voices = [];
  }
}

/** Make a periodic noise buffer (white) sized to the context sample rate. */
export function makeNoiseBuffer(ctx: BaseAudioContext, seconds = 2): AudioBuffer {
  const len = Math.floor(ctx.sampleRate * seconds);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  return buf;
}
