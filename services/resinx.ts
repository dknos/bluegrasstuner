// resinx.ts
// RESINX — microtonal resonator + polyphonic Karplus-Strong synth engine.
//
// Wraps the `resinx` AudioWorklet. Two modes:
//   MODAL       — the 6-voice tuned resonator bank as an effect (excite with kick/pluck/mic).
//   SYMPATHETIC — playable poly strings whose energy also blooms the resonator bank.
//
// Exposes `input` / `output` GainNodes, so it drops into any synth's node graph.

// Vite emits the processor as a separate asset via this URL form. Do NOT inline it.
const PROCESSOR_URL = new URL('./resinx-processor.js', import.meta.url);

export interface ResonatorScale {
  name: string;
  ratios: number[]; // pure ratios relative to the fundamental; first 6 are used
}

// Pure mathematical ratios. No equal-temperament — that's the whole point.
export const SCALES: ResonatorScale[] = [
  { name: 'Harmonic Series', ratios: [1, 2, 3, 4, 5, 6] },
  { name: 'Just Major',      ratios: [1, 9 / 8, 5 / 4, 3 / 2, 5 / 3, 2] },
  { name: 'Just Minor',      ratios: [1, 9 / 8, 6 / 5, 3 / 2, 8 / 5, 2] },
  { name: 'Pythagorean',     ratios: [1, 9 / 8, 81 / 64, 3 / 2, 27 / 16, 2] },
  { name: 'Otonal 8:13',     ratios: [8 / 8, 9 / 8, 10 / 8, 11 / 8, 12 / 8, 13 / 8] },
  { name: '7-Limit Tetrad',  ratios: [1, 9 / 8, 5 / 4, 7 / 5, 3 / 2, 7 / 4] },
  { name: 'Bohlen-Pierce',   ratios: [1, 25 / 21, 9 / 7, 7 / 5, 5 / 3, 3] },
  { name: 'Slendro',         ratios: [1, 1.14274, 1.31494, 1.51309, 1.73608, 2] },
  { name: 'Pelog',           ratios: [1, 1.07177, 1.16878, 1.36604, 1.47257, 1.57371] },
  { name: 'Golden φ',        ratios: [1, 1.6180, 2.6180, 4.2360, 6.8541, 11.0902] },
  { name: 'Octave Stack',    ratios: [1, 2, 4, 8, 16, 32] },
  { name: 'Subharmonic',     ratios: [1, 1 / 2, 1 / 3, 1 / 4, 1 / 5, 1 / 6] },
];

export type ResinxMode = 'MODAL' | 'SYMPATHETIC';

const DEFAULT_PAN = [-0.6, -0.36, -0.12, 0.12, 0.36, 0.6];

export interface ResinxLevels {
  res: number[]; // per resonator voice peak (length 6)
}

export class ResinxEngine {
  ctx: AudioContext;
  input: GainNode;
  output: GainNode;

  private node: AudioWorkletNode | null = null;
  private ready: Promise<void>;
  private noteId = 1;
  // keyed by UI source (e.code | pointerId), NOT midi — same pitch from two sources
  // must map to two distinct worklet voices or one release orphans the other.
  private activeIds = new Map<string | number, number>();

  /** Latest throttled levels from the worklet (read by the UI animation loop). */
  levels: ResinxLevels = { res: [0, 0, 0, 0, 0, 0] };

  // master / shared params
  mode: ResinxMode = 'MODAL';
  fundamental = 192;          // Hz (resonator root / key)
  scale: ResonatorScale = SCALES[0];
  decay = 2.8;                // T60 seconds (shared by strings + resonators)
  color = 0.6;                // loop brightness 0..1
  structure = 0.4;            // harmonic gain rolloff across the 6 voices 0..1
  dryWet = 0.5;               // MODAL dry/wet
  gain = 0.9;                 // master output gain
  // poly / sympathetic params
  attack = 0.003;             // string attack seconds
  release = 0.06;             // string release seconds
  sympSend = 0.35;            // string energy into resonator bank
  resMix = 0.5;               // resonator bloom level (SYMPATHETIC)
  dryStrings = 0.8;           // direct string level (SYMPATHETIC)
  polyphony = 8;
  keyVel = 0.8;

  // per-voice params
  voiceTune: number[] = [0, 0, 0, 0, 0, 0];
  voicePan: number[] = [...DEFAULT_PAN];
  voiceGain: number[] = [1, 1, 1, 1, 1, 1];
  voiceFb: number[] = [1, 1, 1, 1, 1, 1];
  voiceOn: boolean[] = [true, true, true, true, true, true];

  constructor(ctx: AudioContext) {
    this.ctx = ctx;
    this.input = ctx.createGain();
    this.output = ctx.createGain();
    this.ready = this.init();
  }

  private async init(): Promise<void> {
    await this.ctx.audioWorklet.addModule(PROCESSOR_URL);
    this.node = new AudioWorkletNode(this.ctx, 'resinx', {
      numberOfInputs: 1,
      numberOfOutputs: 1,
      outputChannelCount: [2],
    });
    this.node.port.onmessage = (e) => {
      if (e.data && e.data.type === 'levels') this.levels = e.data;
    };
    this.input.connect(this.node);
    this.node.connect(this.output);
    this.update();
    this.pushParams();
  }

  whenReady(): Promise<void> {
    return this.ready;
  }

  /** Resonator voice array + dry/wet + master gain. Call after voice/scale/fund changes. */
  update(): void {
    if (!this.node) return;
    const sr = this.ctx.sampleRate;
    const ratios = this.scale.ratios;
    const damp = 0.05 + 0.95 * this.color;
    const T60 = Math.max(0.05, this.decay);

    const voices = [];
    for (let i = 0; i < 6; i++) {
      const ratio = ratios[i] !== undefined ? ratios[i] : ratios[ratios.length - 1];
      const freq = this.fundamental * ratio * Math.pow(2, this.voiceTune[i] / 12);
      const period = 1 / freq;
      const fb = Math.min(0.9999, Math.pow(10, (-3 * period) / T60) * this.voiceFb[i]);
      const roll = i === 0 ? 1 : Math.pow(Math.max(0.0001, this.structure), i * 0.8);
      voices.push({
        delay: sr / freq,
        fb,
        damp,
        gain: this.voiceGain[i] * roll,
        pan: this.voicePan[i],
        enabled: this.voiceOn[i],
      });
    }
    this.node.port.postMessage({ voices, dryWet: this.dryWet, outGain: this.gain });
  }

  /** Mode + poly/sympathetic scalar params. */
  pushParams(): void {
    if (!this.node) return;
    this.node.port.postMessage({
      type: 'setParams',
      mode: this.mode,
      attack: this.attack,
      decay: Math.max(0.05, this.decay),
      brightness: this.color,
      sympSend: this.sympSend,
      resMix: this.resMix,
      dryStrings: this.dryStrings,
      release: this.release,
      masterGain: this.gain,
      polyphony: this.polyphony,
    });
  }

  setMode(m: ResinxMode): void {
    this.mode = m;
    this.releaseAll();
    this.pushParams();
  }

  /** XY morph pad: x -> color (brightness), y -> structure. */
  setMorph(x: number, y: number): void {
    this.color = Math.max(0, Math.min(1, x));
    this.structure = Math.max(0, Math.min(1, y));
    this.update();
    this.pushParams();
  }

  // ---- playable seam ------------------------------------------------------
  midiToFreq(midi: number): number {
    return 440 * Math.pow(2, (midi - 69) / 12);
  }

  /** `key` is the UI source identity (e.code or pointerId). */
  noteOn(key: string | number, midi: number, vel = this.keyVel, pan = 0): void {
    if (!this.node) return;
    const id = this.noteId++;
    this.activeIds.set(key, id);
    this.node.port.postMessage({ type: 'noteOn', id, freq: this.midiToFreq(midi), vel, pan });
  }

  noteOff(key: string | number): void {
    if (!this.node) return;
    const id = this.activeIds.get(key);
    if (id === undefined) return;
    this.activeIds.delete(key);
    this.node.port.postMessage({ type: 'noteOff', id });
  }

  releaseAll(): void {
    this.activeIds.clear();
    this.node?.port.postMessage({ type: 'allNotesOff' });
  }

  /** Live freq of each resonator voice in Hz (for UI readout). */
  voiceFreqs(): number[] {
    const ratios = this.scale.ratios;
    return Array.from({ length: 6 }, (_, i) => {
      const ratio = ratios[i] !== undefined ? ratios[i] : ratios[ratios.length - 1];
      return this.fundamental * ratio * Math.pow(2, this.voiceTune[i] / 12);
    });
  }

  dispose(): void {
    this.releaseAll();
    try { this.node?.disconnect(); } catch {}
    try { this.input.disconnect(); } catch {}
    try { this.output.disconnect(); } catch {}
  }
}
