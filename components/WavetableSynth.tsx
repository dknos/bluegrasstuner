import React, { useState, useEffect, useRef } from 'react';
import { SynthShell, Scope, Knob, KnobRow, Rocker, Engrave, Keys, PANEL } from './synthkit';
import {
  SynthEngine, MasterBus, createMasterBus, mtof, clamp, ADSR, envOpen, envClose,
  PolyVoiceManager, ManagedVoice,
} from '../services/audio/core';

// ─── Engine: morphing wavetable flagship (poly, unison supersaw) ──────────────
//
// Wavetable frames are built once as PeriodicWaves from harmonic amplitude
// arrays (no samples — pure createPeriodicWave). A 'position' knob morphs
// across the frames by crossfading the two nearest frames inside every voice.
// Each unison row carries two oscillators (lo-frame + hi-frame) so the morph
// is continuous; rows are detuned for a fat supersaw stack.

const FILTER_TYPES: BiquadFilterType[] = ['lowpass', 'highpass', 'bandpass'];

interface WTParams {
  position: number;   // 0..1 wavetable morph
  unison: number;     // 1..7 detuned rows
  detune: number;     // cents spread across the unison stack
  cutoff: number;     // base filter cutoff Hz
  resonance: number;  // filter Q
  envAmt: number;     // 0..1 filter-envelope amount
  lfoRate: number;    // Hz
  lfoAmt: number;     // 0..1 → cents of cutoff modulation
  filterType: BiquadFilterType;
  amp: ADSR;
  volume: number;
}

const defaultParams = (): WTParams => ({
  position: 0.35,
  unison: 3,
  detune: 14,
  cutoff: 2200,
  resonance: 5,
  envAmt: 0.5,
  lfoRate: 4,
  lfoAmt: 0,
  filterType: 'lowpass',
  amp: { a: 0.02, d: 0.35, s: 0.7, r: 0.45 },
  volume: 0.85,
});

const MAX_UNISON = 7;
const FRAME_HARMONICS = 32;

/**
 * Build the wavetable frames as PeriodicWaves from harmonic series.
 *   frame0 = sine, frame1 = triangle-ish, frame2 = sawtooth-ish, frame3 = square-ish.
 * real[0]=imag[0]=0; equal-length arrays. Default normalization (peak≈1).
 */
function buildFrames(ctx: BaseAudioContext): PeriodicWave[] {
  const N = FRAME_HARMONICS;
  const mk = (fill: (k: number) => number) => {
    const real = new Float32Array(N + 1);
    const imag = new Float32Array(N + 1);
    for (let k = 1; k <= N; k++) imag[k] = fill(k);
    return ctx.createPeriodicWave(real, imag);
  };
  const sine = mk((k) => (k === 1 ? 1 : 0));
  const triangle = mk((k) => (k % 2 === 1 ? ((k - 1) / 2 % 2 === 0 ? 1 : -1) * (8 / (Math.PI * Math.PI * k * k)) : 0));
  const saw = mk((k) => -1 / k);
  const square = mk((k) => (k % 2 === 1 ? 1 / k : 0));
  return [sine, triangle, saw, square];
}

class WTVoice implements ManagedVoice {
  private oscA: OscillatorNode[] = []; // lo-frame oscillators (one per unison row)
  private oscB: OscillatorNode[] = []; // hi-frame oscillators (one per unison row)
  private gA: GainNode;                // crossfade gain for lo frame
  private gB: GainNode;                // crossfade gain for hi frame
  private vca: GainNode;
  private filter: BiquadFilterNode;
  private lfoDepth: GainNode;
  private ended = false;

  constructor(
    private ctx: BaseAudioContext,
    dest: AudioNode,
    private frames: PeriodicWave[],
    lfoDepth: GainNode,
    midi: number,
    vel: number,
    private p: WTParams,
    private onDone: (v: WTVoice) => void,
  ) {
    const base = mtof(midi);
    const now = ctx.currentTime;

    this.filter = ctx.createBiquadFilter();
    this.filter.type = p.filterType;
    this.filter.Q.value = p.resonance;
    this.vca = ctx.createGain(); this.vca.gain.value = 1e-4;

    // LFO fans into the filter cutoff via detune (cents) — connected per-voice.
    lfoDepth.connect(this.filter.detune);
    this.lfoDepth = lfoDepth;

    // morph: pick the two nearest frames and crossfade
    const { lo, hi, frac } = this.morphIndices(p.position);
    this.gA = ctx.createGain(); this.gA.gain.value = 1 - frac;
    this.gB = ctx.createGain(); this.gB.gain.value = frac;

    const U = clamp(Math.round(p.unison), 1, MAX_UNISON);
    // overall stack gain, loudness roughly even across unison counts
    const stackGain = 0.42 / Math.sqrt(U);
    for (let i = 0; i < U; i++) {
      // symmetric cents spread; guard U===1 so we never divide by zero
      const cents = U > 1 ? (i / (U - 1) - 0.5) * p.detune : 0;
      const oa = ctx.createOscillator();
      oa.setPeriodicWave(frames[lo]);
      oa.frequency.value = base; oa.detune.value = cents;
      const ob = ctx.createOscillator();
      ob.setPeriodicWave(frames[hi]);
      ob.frequency.value = base; ob.detune.value = cents;
      oa.connect(this.gA); ob.connect(this.gB);
      oa.start(now); ob.start(now);
      this.oscA.push(oa); this.oscB.push(ob);
    }

    // crossfaded frames → stack-level mix → filter → vca → dest
    const mix = ctx.createGain(); mix.gain.value = stackGain;
    this.gA.connect(mix); this.gB.connect(mix);
    mix.connect(this.filter); this.filter.connect(this.vca); this.vca.connect(dest);

    envOpen(this.vca.gain, ctx, clamp(vel, 0.05, 1), p.amp, now);
    this.scheduleFilterEnv(now);
  }

  private morphIndices(position: number): { lo: number; hi: number; frac: number } {
    const N = this.frames.length;
    const f = clamp(position, 0, 1) * (N - 1);
    const lo = Math.floor(f);
    const hi = Math.min(lo + 1, N - 1);
    return { lo, hi, frac: f - lo };
  }

  private scheduleFilterEnv(t: number): void {
    const base = clamp(this.p.cutoff, 30, 16000);
    const peak = clamp(base + this.p.envAmt * 7000, base, 18000);
    const sus = base + (peak - base) * this.p.amp.s;
    this.filter.frequency.cancelScheduledValues(t);
    this.filter.frequency.setValueAtTime(base, t);
    this.filter.frequency.linearRampToValueAtTime(peak, t + Math.max(0.001, this.p.amp.a));
    this.filter.frequency.linearRampToValueAtTime(sus, t + this.p.amp.a + Math.max(0.001, this.p.amp.d));
  }

  /** Live params reshape held notes: morph crossfade, cutoff, reso, type. */
  setLive(p: WTParams): void {
    this.p = p;
    const t = this.ctx.currentTime;
    this.filter.type = p.filterType;
    this.filter.Q.setTargetAtTime(p.resonance, t, 0.02);
    this.filter.frequency.setTargetAtTime(clamp(p.cutoff, 30, 16000), t, 0.04);
    const { lo, hi, frac } = this.morphIndices(p.position);
    this.oscA.forEach((o) => o.setPeriodicWave(this.frames[lo]));
    this.oscB.forEach((o) => o.setPeriodicWave(this.frames[hi]));
    this.gA.gain.setTargetAtTime(1 - frac, t, 0.02);
    this.gB.gain.setTargetAtTime(frac, t, 0.02);
  }

  release(t: number): void {
    const end = envClose(this.vca.gain, this.ctx, this.p.amp, t);
    const base = clamp(this.p.cutoff, 30, 16000);
    this.filter.frequency.cancelScheduledValues(t);
    this.filter.frequency.setValueAtTime(this.filter.frequency.value, t);
    this.filter.frequency.linearRampToValueAtTime(base, t + this.p.amp.r);
    const all = [...this.oscA, ...this.oscB];
    all.forEach((o) => { try { o.stop(end + 0.02); } catch { /* already stopped */ } });
    if (all[0]) all[0].onended = () => this.cleanup();
  }

  kill(): void {
    const t = this.ctx.currentTime;
    this.vca.gain.cancelScheduledValues(t);
    this.vca.gain.setValueAtTime(Math.max(1e-4, this.vca.gain.value), t);
    this.vca.gain.linearRampToValueAtTime(1e-4, t + 0.01);
    [...this.oscA, ...this.oscB].forEach((o) => { try { o.stop(t + 0.03); } catch { /* */ } });
    this.cleanup();
  }

  private cleanup(): void {
    if (this.ended) return;
    this.ended = true;
    try { this.lfoDepth.disconnect(this.filter.detune); } catch { /* */ }
    try { this.vca.disconnect(); } catch { /* */ }
    this.onDone(this);
  }
}

export class WavetableEngine implements SynthEngine {
  private master: MasterBus;
  private mgr: PolyVoiceManager<WTVoice>;
  private active = new Set<WTVoice>();
  private p: WTParams = defaultParams();
  private frames: PeriodicWave[];
  private lfo: OscillatorNode;
  private lfoDepth: GainNode;
  readonly analyser: AnalyserNode;

  constructor(private ctx: BaseAudioContext) {
    this.master = createMasterBus(ctx, this.p.volume);
    this.analyser = this.master.analyser;
    this.mgr = new PolyVoiceManager<WTVoice>(8);
    this.frames = buildFrames(ctx);

    // one free-running global LFO → depth gain → fans into each voice's filter.detune
    this.lfo = ctx.createOscillator();
    this.lfo.type = 'sine';
    this.lfo.frequency.value = this.p.lfoRate;
    this.lfoDepth = ctx.createGain();
    this.lfoDepth.gain.value = this.p.lfoAmt * 2400; // cents
    this.lfo.connect(this.lfoDepth);
    this.lfo.start();
  }

  noteOn(midi: number, velocity = 0.9): void {
    const v = new WTVoice(
      this.ctx, this.master.input, this.frames, this.lfoDepth,
      midi, velocity, this.p, (vv) => this.active.delete(vv),
    );
    this.active.add(v);
    this.mgr.add(midi, v);
  }

  noteOff(midi: number): void {
    this.mgr.release(midi, this.ctx.currentTime);
  }

  setParam(name: string, value: number | string): void {
    switch (name) {
      case 'position': this.p.position = value as number; break;
      case 'unison': this.p.unison = value as number; break;
      case 'detune': this.p.detune = value as number; break;
      case 'cutoff': this.p.cutoff = value as number; break;
      case 'resonance': this.p.resonance = value as number; break;
      case 'envAmt': this.p.envAmt = value as number; break;
      case 'lfoRate': this.p.lfoRate = value as number; this.lfo.frequency.setTargetAtTime(value as number, this.ctx.currentTime, 0.02); break;
      case 'lfoAmt': this.p.lfoAmt = value as number; this.lfoDepth.gain.setTargetAtTime((value as number) * 2400, this.ctx.currentTime, 0.02); break;
      case 'filterType': this.p.filterType = value as BiquadFilterType; break;
      case 'attack': this.p.amp.a = value as number; break;
      case 'decay': this.p.amp.d = value as number; break;
      case 'sustain': this.p.amp.s = value as number; break;
      case 'release': this.p.amp.r = value as number; break;
      case 'volume': this.p.volume = value as number; this.master.setVolume(value as number); break;
    }
    // live params reshape currently-held notes (mirror DSynth)
    if (['position', 'cutoff', 'resonance', 'envAmt', 'filterType'].includes(name)) {
      this.active.forEach((v) => v.setLive(this.p));
    }
  }

  connect(dest: AudioNode): void { this.master.output.connect(dest); }

  dispose(): void {
    this.mgr.killAll();
    this.active.clear();
    try { this.lfo.stop(); } catch { /* */ }
    try { this.lfo.disconnect(); } catch { /* */ }
    try { this.master.output.disconnect(); } catch { /* */ }
  }
}

// ─── UI ──────────────────────────────────────────────────────────────────────

const WavetableSynth: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const engine = useRef<WavetableEngine | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
  const [active, setActive] = useState<number[]>([]);

  const [position, setPosition] = useState(0.35);
  const [unison, setUnison] = useState(3);
  const [detune, setDetune] = useState(14);
  const [cutoff, setCutoff] = useState(2200);
  const [resonance, setResonance] = useState(5);
  const [envAmt, setEnvAmt] = useState(0.5);
  const [lfoRate, setLfoRate] = useState(4);
  const [lfoAmt, setLfoAmt] = useState(0);
  const [filterType, setFilterType] = useState(0);
  const [attack, setAttack] = useState(0.02);
  const [decay, setDecay] = useState(0.35);
  const [sustain, setSustain] = useState(0.7);
  const [release, setRelease] = useState(0.45);

  useEffect(() => {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const e = new WavetableEngine(ctx);
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

  const randomize = () => {
    const rnd = (lo: number, hi: number) => lo + Math.random() * (hi - lo);
    const np = rnd(0, 1); setPosition(np); sp('position', np);
    const nu = Math.round(rnd(1, MAX_UNISON)); setUnison(nu); sp('unison', nu);
    const nd = rnd(4, 30); setDetune(nd); sp('detune', nd);
    const nc = rnd(700, 6000); setCutoff(nc); sp('cutoff', nc);
    const nr = rnd(1, 14); setResonance(nr); sp('resonance', nr);
    const nl = rnd(0, 0.6); setLfoAmt(nl); sp('lfoAmt', nl);
  };

  return (
    <SynthShell name="Wavetable" tag="Wavetable · Morphing" onClose={onClose} accent={PANEL.brass}>
      <Scope analyser={analyser} mode="wave" />

      <Engrave>Wavetable</Engrave>
      <KnobRow>
        <Knob label="Position" value={position} min={0} max={1} step={0.001} onChange={(v) => { setPosition(v); sp('position', v); }} format={(v) => `${Math.round(v * 100)}%`} />
        <Knob label="Unison" value={unison} min={1} max={MAX_UNISON} step={1} onChange={(v) => { setUnison(v); sp('unison', v); }} format={(v) => `${Math.round(v)}`} />
        <Knob label="Detune" value={detune} min={0} max={50} step={0.5} onChange={(v) => { setDetune(v); sp('detune', v); }} format={(v) => `${Math.round(v)}¢`} />
      </KnobRow>

      <Engrave>Filter</Engrave>
      <KnobRow>
        <Knob label="Cutoff" value={cutoff} min={50} max={16000} log onChange={(v) => { setCutoff(v); sp('cutoff', v); }} format={(v) => `${Math.round(v)}`} />
        <Knob label="Reso" value={resonance} min={0} max={22} step={0.1} onChange={(v) => { setResonance(v); sp('resonance', v); }} format={(v) => v.toFixed(1)} />
        <Knob label="Env" value={envAmt} min={0} max={1} step={0.01} onChange={(v) => { setEnvAmt(v); sp('envAmt', v); }} format={(v) => `${Math.round(v * 100)}%`} />
      </KnobRow>

      <Engrave>LFO → Cutoff</Engrave>
      <KnobRow>
        <Knob label="Rate" value={lfoRate} min={0.05} max={20} step={0.05} log onChange={(v) => { setLfoRate(v); sp('lfoRate', v); }} format={(v) => `${v.toFixed(2)}Hz`} accent={PANEL.brassLite} />
        <Knob label="Amt" value={lfoAmt} min={0} max={1} step={0.01} onChange={(v) => { setLfoAmt(v); sp('lfoAmt', v); }} format={(v) => `${Math.round(v * 100)}%`} accent={PANEL.brassLite} />
        <Rocker label="Filter" options={['LP', 'HP', 'BP']} value={filterType}
          onChange={(i) => { setFilterType(i); sp('filterType', FILTER_TYPES[i]); }} />
      </KnobRow>

      <Engrave>Amp Envelope</Engrave>
      <KnobRow>
        <Knob label="Atk" value={attack} min={0.001} max={2} step={0.001} log onChange={(v) => { setAttack(v); sp('attack', v); }} format={(v) => `${Math.round(v * 1000)}ms`} />
        <Knob label="Dec" value={decay} min={0.01} max={3} step={0.01} log onChange={(v) => { setDecay(v); sp('decay', v); }} format={(v) => `${v.toFixed(2)}s`} />
        <Knob label="Sus" value={sustain} min={0} max={1} step={0.01} onChange={(v) => { setSustain(v); sp('sustain', v); }} format={(v) => `${Math.round(v * 100)}%`} />
        <Knob label="Rel" value={release} min={0.01} max={4} step={0.01} log onChange={(v) => { setRelease(v); sp('release', v); }} format={(v) => `${v.toFixed(2)}s`} />
      </KnobRow>

      <button onClick={randomize} style={{
        alignSelf: 'flex-start', padding: '7px 14px', borderRadius: 7, cursor: 'pointer',
        fontFamily: '"JetBrains Mono", ui-monospace, monospace', fontSize: 9, letterSpacing: 1.5, textTransform: 'uppercase',
        background: 'linear-gradient(180deg, #211c16, #14100c)', color: PANEL.brassLite,
        border: `1px solid ${PANEL.brassDark}`, boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05), 0 2px 4px rgba(0,0,0,0.4)',
      }}>⟳ Randomize</button>

      <Engrave>Keyboard</Engrave>
      <Keys octaves={2} startMidi={48} activeNotes={active} onNoteOn={noteOn} onNoteOff={noteOff} />
    </SynthShell>
  );
};

export default WavetableSynth;
