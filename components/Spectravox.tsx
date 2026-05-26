import React, { useState, useEffect, useRef } from 'react';
import { SynthShell, Scope, Knob, KnobRow, Fader, Rocker, Engrave, Keys, PANEL } from './synthkit';
import {
  SynthEngine, MasterBus, createMasterBus, mtof, clamp, ADSR, envOpen, envClose,
  PolyVoiceManager, ManagedVoice,
} from '../services/audio/core';

// ─── Spectravox — formant / spectral drone (Moog-Spectravox-inspired) ────────
//
// A rich detuned-saw carrier per note feeds a SHARED parallel bank of 10
// bandpass filters (the "formant bank"). Each band has a center frequency and
// an output gain; together they sculpt a vowel-like spectrum. A vowel control
// morphs the band centers between vowel formant sets (A/E/I/O/U); an LFO slowly
// sweeps formant positions for movement. Paraphonic: many carrier pitches share
// one filter bank (cheap, and true to the original's design).
//
// Signal path:  saw stack → per-voice VCA (ADSR) → shared bankInput
//               bankInput → bandpass[i] → bandGain[i] → master.input   (×10)

const NUM_BANDS = 10;

// Vowel formant sets — 10 band center freqs (Hz) per vowel. The first few bands
// sit on the classic F1/F2/F3 formants; the rest are filler bands spread up the
// spectrum so the saw's harmonics always have something to excite.
const VOWELS = ['A', 'E', 'I', 'O', 'U'];
const VOWEL_FREQS: number[][] = [
  // A  (father)
  [700, 1220, 2600, 350, 950, 1700, 3200, 4200, 5400, 7000],
  // E  (bed)
  [530, 1840, 2480, 300, 1100, 2100, 3000, 4000, 5200, 6800],
  // I  (beet)
  [270, 2290, 3010, 400, 1300, 1900, 3600, 4400, 5600, 7200],
  // O  (boat)
  [570, 840, 2410, 320, 1200, 1700, 3000, 4000, 5200, 6600],
  // U  (boot)
  [300, 870, 2240, 380, 1100, 1600, 2900, 3800, 5000, 6400],
];

interface FormantParams {
  vowel: number;       // 0..(VOWELS.length-1) morph position (fractional = blend)
  shift: number;       // formant center frequency multiplier
  resonance: number;   // band Q
  lfoRate: number;     // Hz
  lfoDepth: number;    // 0..1 → fractional center sweep
  bandGains: number[]; // per-band output gain (0..~2)
  amp: ADSR;
  volume: number;
}

const defaultParams = (): FormantParams => ({
  vowel: 0,
  shift: 1,
  resonance: 2.6,
  lfoRate: 0.4,
  lfoDepth: 0,
  bandGains: new Array(NUM_BANDS).fill(1.0),
  amp: { a: 0.05, d: 0.3, s: 0.7, r: 0.5 },
  volume: 0.9,
});

// Interpolate the band center frequencies for a fractional vowel position.
function vowelCenters(vowel: number): number[] {
  const v = clamp(vowel, 0, VOWELS.length - 1);
  const lo = Math.floor(v);
  const hi = Math.min(lo + 1, VOWELS.length - 1);
  const f = v - lo;
  const out = new Array(NUM_BANDS);
  for (let i = 0; i < NUM_BANDS; i++) {
    out[i] = VOWEL_FREQS[lo][i] * (1 - f) + VOWEL_FREQS[hi][i] * f;
  }
  return out;
}

// ─── Voice: a detuned-saw carrier with an amp envelope ───────────────────────
// Carriers feed a SHARED bank input (passed as `dest`).

class FormantVoice implements ManagedVoice {
  private oscs: OscillatorNode[] = [];
  private vca: GainNode;
  private ended = false;

  constructor(
    private ctx: BaseAudioContext,
    dest: AudioNode,
    midi: number,
    vel: number,
    private p: FormantParams,
    private onDone: (v: FormantVoice) => void,
  ) {
    const base = mtof(midi);
    const now = ctx.currentTime;

    this.vca = ctx.createGain();
    this.vca.gain.value = 1e-4;

    // Rich carrier: detuned sawtooth stack + a sub. Carrier gain is HIGH — the
    // bandpass bank bleeds a lot of level, so we feed it hot.
    const detunes = [-9, -3, 4, 11];
    const offsets = [0, 0, 0, -12];
    const levels = [0.55, 0.5, 0.5, 0.45];
    detunes.forEach((dt, i) => {
      const o = ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.value = base * Math.pow(2, offsets[i] / 12);
      o.detune.value = dt;
      const g = ctx.createGain();
      g.gain.value = levels[i];
      o.connect(g);
      g.connect(this.vca);
      o.start(now);
      this.oscs.push(o);
    });

    this.vca.connect(dest);
    envOpen(this.vca.gain, ctx, clamp(vel, 0.05, 1), p.amp, now);
  }

  release(t: number): void {
    const end = envClose(this.vca.gain, this.ctx, this.p.amp, t);
    this.oscs.forEach((o) => { try { o.stop(end + 0.02); } catch { /* already stopped */ } });
    if (this.oscs[0]) this.oscs[0].onended = () => this.cleanup();
  }

  kill(): void {
    const t = this.ctx.currentTime;
    this.vca.gain.cancelScheduledValues(t);
    this.vca.gain.setValueAtTime(Math.max(1e-4, this.vca.gain.value), t);
    this.vca.gain.linearRampToValueAtTime(1e-4, t + 0.01);
    this.oscs.forEach((o) => { try { o.stop(t + 0.03); } catch { /* */ } });
    this.cleanup();
  }

  private cleanup(): void {
    if (this.ended) return;
    this.ended = true;
    try { this.vca.disconnect(); } catch { /* */ }
    this.onDone(this);
  }
}

export class SpectravoxEngine implements SynthEngine {
  private master: MasterBus;
  private mgr: PolyVoiceManager<FormantVoice>;
  private active = new Set<FormantVoice>();
  private p: FormantParams = defaultParams();
  readonly analyser: AnalyserNode;

  // shared formant bank
  private bankInput: GainNode;
  private bands: BiquadFilterNode[] = [];
  private bandGains: GainNode[] = [];

  // LFO sweeping formant centers
  private lfo: OscillatorNode;
  private lfoGain: GainNode;

  constructor(private ctx: BaseAudioContext) {
    this.master = createMasterBus(ctx, this.p.volume);
    this.analyser = this.master.analyser;
    this.mgr = new PolyVoiceManager<FormantVoice>(6);

    // Carriers sum into bankInput, which fans out to the parallel bandpass bank.
    this.bankInput = ctx.createGain();
    this.bankInput.gain.value = 1;

    const centers = vowelCenters(this.p.vowel);
    // LFO: bipolar; its gain (set live) scales how far it sweeps each center.
    this.lfo = ctx.createOscillator();
    this.lfo.type = 'sine';
    this.lfo.frequency.value = this.p.lfoRate;
    this.lfoGain = ctx.createGain();
    this.lfoGain.gain.value = 0; // depth 0 by default
    this.lfo.connect(this.lfoGain);
    this.lfo.start();

    for (let i = 0; i < NUM_BANDS; i++) {
      const f = ctx.createBiquadFilter();
      f.type = 'bandpass';
      f.frequency.value = clamp(centers[i] * this.p.shift, 20, 18000);
      f.Q.value = this.p.resonance;
      this.lfoGain.connect(f.frequency); // shared sweep across all bands

      const g = ctx.createGain();
      g.gain.value = this.p.bandGains[i];

      this.bankInput.connect(f);
      f.connect(g);
      g.connect(this.master.input);

      this.bands.push(f);
      this.bandGains.push(g);
    }
  }

  noteOn(midi: number, velocity = 0.9): void {
    const v = new FormantVoice(this.ctx, this.bankInput, midi, velocity, this.p, (vv) => this.active.delete(vv));
    this.active.add(v);
    this.mgr.add(midi, v);
  }

  noteOff(midi: number): void {
    this.mgr.release(midi, this.ctx.currentTime);
  }

  private applyCenters(): void {
    const t = this.ctx.currentTime;
    const centers = vowelCenters(this.p.vowel);
    for (let i = 0; i < NUM_BANDS; i++) {
      this.bands[i].frequency.setTargetAtTime(clamp(centers[i] * this.p.shift, 20, 18000), t, 0.06);
    }
  }

  setParam(name: string, value: number | string): void {
    const t = this.ctx.currentTime;
    if (typeof name === 'string' && name.startsWith('band')) {
      const idx = parseInt(name.slice(4), 10);
      if (idx >= 0 && idx < NUM_BANDS) {
        const val = value as number;
        this.p.bandGains[idx] = val;
        this.bandGains[idx].gain.setTargetAtTime(val, t, 0.04);
      }
      return;
    }
    switch (name) {
      case 'vowel':
        this.p.vowel = value as number;
        this.applyCenters();
        break;
      case 'shift':
        this.p.shift = value as number;
        this.applyCenters();
        break;
      case 'resonance':
        this.p.resonance = value as number;
        this.bands.forEach((f) => f.Q.setTargetAtTime(this.p.resonance, t, 0.04));
        break;
      case 'lfoRate':
        this.p.lfoRate = value as number;
        this.lfo.frequency.setTargetAtTime(this.p.lfoRate, t, 0.06);
        break;
      case 'lfoDepth':
        this.p.lfoDepth = value as number;
        // depth scales a fractional sweep of the average center frequency
        this.lfoGain.gain.setTargetAtTime(this.p.lfoDepth * 600, t, 0.06);
        break;
      case 'attack': this.p.amp.a = value as number; break;
      case 'decay': this.p.amp.d = value as number; break;
      case 'sustain': this.p.amp.s = value as number; break;
      case 'release': this.p.amp.r = value as number; break;
      case 'volume': this.p.volume = value as number; this.master.setVolume(value as number); break;
    }
  }

  connect(dest: AudioNode): void { this.master.output.connect(dest); }

  dispose(): void {
    this.mgr.killAll();
    this.active.clear();
    try { this.lfo.stop(); } catch { /* */ }
    try { this.lfo.disconnect(); } catch { /* */ }
    try { this.bankInput.disconnect(); } catch { /* */ }
    this.bands.forEach((f) => { try { f.disconnect(); } catch { /* */ } });
    this.bandGains.forEach((g) => { try { g.disconnect(); } catch { /* */ } });
    try { this.master.output.disconnect(); } catch { /* */ }
  }
}

// ─── UI ──────────────────────────────────────────────────────────────────────

const Spectravox: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const engine = useRef<SpectravoxEngine | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
  const [active, setActive] = useState<number[]>([]);

  const [vowel, setVowel] = useState(0);
  const [shift, setShift] = useState(1);
  const [resonance, setResonance] = useState(2.6);
  const [lfoRate, setLfoRate] = useState(0.4);
  const [lfoDepth, setLfoDepth] = useState(0);
  const [bands, setBands] = useState<number[]>(new Array(NUM_BANDS).fill(1.0));
  const [attack, setAttack] = useState(0.05);
  const [decay, setDecay] = useState(0.3);
  const [sustain, setSustain] = useState(0.7);
  const [release, setRelease] = useState(0.5);

  useEffect(() => {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const e = new SpectravoxEngine(ctx);
    e.connect(ctx.destination);
    ctxRef.current = ctx; engine.current = e;
    setAnalyser(e.analyser);
    return () => { e.dispose(); ctx.close(); };
  }, []);

  const sp = (name: string, value: number | string) => engine.current?.setParam(name, value);

  const noteOn = (m: number) => {
    if (ctxRef.current?.state === 'suspended') ctxRef.current.resume();
    engine.current?.noteOn(m, 0.9);
    setActive((a) => (a.includes(m) ? a : [...a, m]));
  };
  const noteOff = (m: number) => {
    engine.current?.noteOff(m);
    setActive((a) => a.filter((x) => x !== m));
  };

  const setBand = (i: number, v: number) => {
    setBands((b) => { const n = [...b]; n[i] = v; return n; });
    sp(`band${i}`, v);
  };

  return (
    <SynthShell name="Spectravox" tag="Formant · Spectral Vocoder" onClose={onClose} accent={PANEL.brass}
      scope={<Scope analyser={analyser} mode="bars" height={72} />}
      keyboard={<Keys octaves={2} startMidi={48} activeNotes={active} onNoteOn={noteOn} onNoteOff={noteOff} />}>

      <Engrave>Vowel</Engrave>
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <Rocker label="Formant" options={VOWELS} value={Math.round(vowel)}
          onChange={(i) => { setVowel(i); sp('vowel', i); }} />
      </div>

      <Engrave>Formant Bank</Engrave>
      <div style={{ display: 'flex', gap: 4, padding: '12px 8px', borderRadius: 8, background: 'rgba(0,0,0,0.2)', boxShadow: `inset 0 0 0 1px ${PANEL.line}` }}>
        {bands.map((val, i) => (
          <Fader key={i} label={`${i + 1}`} value={val} min={0} max={2} height={120}
            onChange={(v) => setBand(i, v)} />
        ))}
      </div>

      <Engrave>Spectrum</Engrave>
      <KnobRow>
        <Knob label="Shift" value={shift} min={0.5} max={2} step={0.01} log onChange={(v) => { setShift(v); sp('shift', v); }} format={(v) => `${v.toFixed(2)}×`} />
        <Knob label="Reso" value={resonance} min={0.5} max={12} step={0.1} onChange={(v) => { setResonance(v); sp('resonance', v); }} format={(v) => v.toFixed(1)} />
        <Knob label="LFO Rate" value={lfoRate} min={0.05} max={12} step={0.01} log onChange={(v) => { setLfoRate(v); sp('lfoRate', v); }} format={(v) => `${v.toFixed(2)}Hz`} />
        <Knob label="LFO Depth" value={lfoDepth} min={0} max={1} step={0.01} onChange={(v) => { setLfoDepth(v); sp('lfoDepth', v); }} format={(v) => `${Math.round(v * 100)}%`} accent={PANEL.brassLite} />
      </KnobRow>

      <Engrave>Envelope</Engrave>
      <KnobRow>
        <Knob label="Atk" value={attack} min={0.001} max={2} step={0.001} log onChange={(v) => { setAttack(v); sp('attack', v); }} format={(v) => `${Math.round(v * 1000)}ms`} />
        <Knob label="Dec" value={decay} min={0.01} max={3} step={0.01} log onChange={(v) => { setDecay(v); sp('decay', v); }} format={(v) => `${v.toFixed(2)}s`} />
        <Knob label="Sus" value={sustain} min={0} max={1} step={0.01} onChange={(v) => { setSustain(v); sp('sustain', v); }} format={(v) => `${Math.round(v * 100)}%`} />
        <Knob label="Rel" value={release} min={0.01} max={4} step={0.01} log onChange={(v) => { setRelease(v); sp('release', v); }} format={(v) => `${v.toFixed(2)}s`} />
      </KnobRow>

    </SynthShell>
  );
};

export default Spectravox;
