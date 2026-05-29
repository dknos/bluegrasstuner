// knurl.ts
// KNURL — physical-modeling groovebox engine. Wraps the `knurl` AudioWorklet.
//
// The worklet owns the sample-accurate transport, the 8 drum voices, the
// parameter-lock queue and the master finishing bus. This class is a thin,
// typed forwarder: it builds kits + patterns, posts immutable snapshots, and
// surfaces the throttled meter (per-track strike energy + playhead step) the
// visualizer reads. Exposes an `output` GainNode so it drops into any graph.

const PROCESSOR_URL = new URL('./knurl-processor.js', import.meta.url);

export const NUM_TRACKS = 8;
export const NUM_STEPS = 16;

// fixed roles; index 0 is the dedicated sine/pitch-env kick, 1..7 are modal bodies
export const TRACK_NAMES = ['KICK', 'SNARE', 'CL HAT', 'OP HAT', 'CLAP', 'TOM', 'RIM', 'PERC'];

// per-track sound-design parameters (the final values sent to the worklet)
export interface TrackParams {
  freq: number;      // Hz (final, after tune)
  decay: number;     // T60 seconds
  material: number;  // 0 warm/skin .. 1 bright/metal (modal only)
  snap: number;      // mallet hardness / click 0..1
  noise: number;     // direct noise burst (snare buzz / clap) 0..1
  tone: number;      // one-pole LP 0 dark .. 1 open
  drive: number;     // tanh pre-gain >= 1
  level: number;     // 0..1.5
  pan: number;       // -1..1
  send: number;      // reverb send 0..1
}

export interface StepData {
  on: boolean;
  vel: number;   // 0..1 (accent)
  prob: number;  // 0..1 trigger probability
}

// parameter locks: per track, per param, a value for specific steps (-1 = unlocked)
export type LockMap = Partial<Record<'freq' | 'decay' | 'material' | 'snap' | 'drive' | 'tone', number[]>>;

export interface TrackPattern {
  steps: StepData[];   // length NUM_STEPS
  locks: LockMap;
}

export interface Kit {
  name: string;
  // base frequency per track (the Pitch knob applies a semitone offset on top)
  tracks: TrackParams[];
}

const mkStep = (on = false, vel = 1, prob = 1): StepData => ({ on, vel, prob });
export const emptyTrackPattern = (): TrackPattern => ({
  steps: Array.from({ length: NUM_STEPS }, () => mkStep()),
  locks: {},
});

// ── kits ─────────────────────────────────────────────────────────────────────
// Values dialed in offline (scripts/knurl-sim.mjs): balanced peak ≈ 1.0 across
// pitch & decay, clean decay, differentiated brightness (HF: kick .08, snare .76,
// hat .33). Levels trim the mix so the kit sits together out of the box.
const ROOTS: TrackParams[] = [
  { freq: 55,   decay: 0.45, material: 0.30, snap: 0.70, noise: 0.00, tone: 0.85, drive: 1.6, level: 1.00, pan: 0,     send: 0.05 },
  { freq: 200,  decay: 0.16, material: 0.42, snap: 0.80, noise: 0.95, tone: 0.92, drive: 1.5, level: 0.82, pan: -0.05, send: 0.18 },
  { freq: 1100, decay: 0.04, material: 1.00, snap: 0.95, noise: 0.55, tone: 1.00, drive: 1.1, level: 0.52, pan: 0.18,  send: 0.04 },
  { freq: 1100, decay: 0.22, material: 1.00, snap: 0.90, noise: 0.50, tone: 1.00, drive: 1.1, level: 0.46, pan: 0.22,  send: 0.10 },
  { freq: 400,  decay: 0.12, material: 0.50, snap: 0.60, noise: 1.00, tone: 0.85, drive: 1.4, level: 0.62, pan: -0.30, send: 0.22 },
  { freq: 120,  decay: 0.50, material: 0.25, snap: 0.55, noise: 0.10, tone: 0.70, drive: 1.3, level: 0.72, pan: 0.34,  send: 0.16 },
  { freq: 420,  decay: 0.06, material: 0.15, snap: 0.90, noise: 0.15, tone: 0.80, drive: 1.3, level: 0.60, pan: -0.40, send: 0.06 },
  { freq: 660,  decay: 0.70, material: 1.00, snap: 0.80, noise: 0.05, tone: 0.90, drive: 1.1, level: 0.50, pan: 0.42,  send: 0.30 },
];

const clone = (t: TrackParams[]): TrackParams[] => t.map((x) => ({ ...x }));

export const KITS: Kit[] = [
  { name: 'Roots', tracks: clone(ROOTS) },
  {
    name: 'Electro',
    tracks: (() => {
      const k = clone(ROOTS);
      k[0] = { ...k[0], freq: 48, decay: 0.6, snap: 0.85, drive: 2.0 };       // long 909 sub
      k[1] = { ...k[1], freq: 230, decay: 0.13, material: 0.6, noise: 0.8, drive: 1.8 };
      k[2] = { ...k[2], freq: 1300, decay: 0.03, noise: 0.35, drive: 1.0 };
      k[3] = { ...k[3], freq: 1300, decay: 0.3, noise: 0.3 };
      k[4] = { ...k[4], freq: 500, decay: 0.1, noise: 1.0 };
      k[7] = { ...k[7], freq: 880, decay: 0.4, material: 1.0 };
      return k;
    })(),
  },
  {
    name: 'Glass',
    tracks: (() => {
      const k = clone(ROOTS);
      k[0] = { ...k[0], freq: 70, decay: 0.35, material: 0.5, snap: 0.6 };
      k[1] = { ...k[1], freq: 320, decay: 0.22, material: 0.85, noise: 0.6, send: 0.3 };
      k[2] = { ...k[2], freq: 1600, decay: 0.05, material: 1.0, noise: 0.3 };
      k[3] = { ...k[3], freq: 1600, decay: 0.4, material: 1.0, noise: 0.25, send: 0.25 };
      k[5] = { ...k[5], freq: 180, decay: 0.7, material: 0.7, send: 0.3 };
      k[6] = { ...k[6], freq: 900, decay: 0.12, material: 0.9 };
      k[7] = { ...k[7], freq: 990, decay: 1.1, material: 1.0, send: 0.45 };
      return k;
    })(),
  },
];

// a satisfying starter groove so PLAY makes a beat immediately
export function starterPattern(): TrackPattern[] {
  const p = Array.from({ length: NUM_TRACKS }, () => emptyTrackPattern());
  const set = (t: number, idxs: number[], vel = 1) => idxs.forEach((i) => { p[t].steps[i] = mkStep(true, vel); });
  set(0, [0, 8]);                                   // kick
  p[0].steps[11] = mkStep(true, 0.6, 0.6);          // ghost kick, 60% chance
  set(1, [4, 12]);                                  // snare backbeat
  set(2, [0, 2, 4, 6, 8, 10, 12, 14], 0.7);         // closed hats, 8ths
  p[2].steps[7] = mkStep(true, 0.45);               // hat ghost
  set(3, [14], 0.8);                                // open hat lift
  return p;
}

export interface KnurlMeter { energy: number[]; step: number; }

export class KnurlEngine {
  ctx: AudioContext;
  output: GainNode;
  private node: AudioWorkletNode | null = null;
  private ready: Promise<void>;
  meter: KnurlMeter = { energy: new Array(NUM_TRACKS).fill(0), step: -1 };

  constructor(ctx: AudioContext) {
    this.ctx = ctx;
    this.output = ctx.createGain();
    this.ready = this.init();
  }

  private async init(): Promise<void> {
    await this.ctx.audioWorklet.addModule(PROCESSOR_URL);
    this.node = new AudioWorkletNode(this.ctx, 'knurl', {
      numberOfInputs: 0,
      numberOfOutputs: 1,
      outputChannelCount: [2],
    });
    this.node.port.onmessage = (e) => {
      if (e.data?.type === 'meter') this.meter = { energy: e.data.energy, step: e.data.step };
    };
    this.node.connect(this.output);
  }

  whenReady(): Promise<void> { return this.ready; }

  setPlaying(playing: boolean): void {
    this.node?.port.postMessage({ type: 'transport', playing });
  }
  setTempo(bpm: number): void {
    this.node?.port.postMessage({ type: 'transport', bpm });
  }
  setSwing(swing: number): void {
    this.node?.port.postMessage({ type: 'transport', swing });
  }
  setMaster(m: { gain?: number; drive?: number; reverb?: number }): void {
    this.node?.port.postMessage({ type: 'master', ...m });
  }

  /** Push all 8 track param sets. */
  pushTracks(tracks: TrackParams[]): void {
    this.node?.port.postMessage({ type: 'tracks', tracks });
  }
  /** Update one track (live knob edit). */
  pushTrack(index: number, params: Partial<TrackParams>): void {
    this.node?.port.postMessage({ type: 'track', index, params });
  }

  /** Push the full pattern (steps + p-locks), converted to transferable arrays. */
  pushPattern(pattern: TrackPattern[]): void {
    if (!this.node) return;
    const out = pattern.map((tp) => {
      const on = new Uint8Array(NUM_STEPS);
      const vel = new Float32Array(NUM_STEPS);
      const prob = new Float32Array(NUM_STEPS);
      for (let i = 0; i < NUM_STEPS; i++) {
        on[i] = tp.steps[i].on ? 1 : 0;
        vel[i] = tp.steps[i].vel;
        prob[i] = tp.steps[i].prob;
      }
      let locks: Record<string, Float32Array> | null = null;
      const keys = Object.keys(tp.locks) as (keyof LockMap)[];
      if (keys.length) {
        locks = {};
        for (const k of keys) {
          const arr = tp.locks[k]!;
          const f = new Float32Array(NUM_STEPS);
          for (let i = 0; i < NUM_STEPS; i++) f[i] = arr[i] ?? -1;
          locks[k] = f;
        }
      }
      return { on, vel, prob, locks };
    });
    this.node.port.postMessage({ type: 'pattern', pattern: out });
  }

  /** Audition one track now (UI tap on a track header / pad). */
  trigger(index: number, vel = 1): void {
    this.node?.port.postMessage({ type: 'trigger', index, vel });
  }

  /** Schedule a track to fire at absolute AudioContext time `time` (sample-accurate
   *  in the worklet). Used by the Strudel bridge — Strudel is the clock. `freq` 0 =
   *  use the track's own tuning. */
  triggerAt(index: number, vel: number, time: number, freq = 0): void {
    this.node?.port.postMessage({ type: 'triggerAt', index, vel, time, freq });
  }

  dispose(): void {
    this.setPlaying(false);
    try { this.node?.disconnect(); } catch {}
    try { this.output.disconnect(); } catch {}
    if (this.node) this.node.port.onmessage = null;
  }
}
