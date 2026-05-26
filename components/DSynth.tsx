import React, { useState, useEffect, useRef } from 'react';
import { SynthShell, Scope, Knob, KnobRow, Rocker, Keys, Engrave, PANEL } from './synthkit';
import {
  SynthEngine, MasterBus, createMasterBus, mtof, clamp, ADSR, envOpen, envClose,
  PolyVoiceManager, ManagedVoice,
} from '../services/audio/core';

// ─── Engine: Minimoog-style 3-oscillator subtractive lead (poly) ─────────────

const WAVES: OscillatorType[] = ['sawtooth', 'square', 'triangle', 'sine'];

interface MoogParams {
  waves: OscillatorType[]; // 3 oscillators
  detune: number;          // cents spread between oscillators
  cutoff: number;          // base filter cutoff Hz
  resonance: number;       // filter Q
  envAmt: number;          // 0..1 filter-envelope amount
  drive: number;           // 0..1 saturation
  amp: ADSR;
  volume: number;
}

const defaultParams = (): MoogParams => ({
  waves: ['sawtooth', 'sawtooth', 'sawtooth'],
  detune: 12,
  cutoff: 1200,
  resonance: 6,
  envAmt: 0.55,
  drive: 0.25,
  amp: { a: 0.02, d: 0.3, s: 0.7, r: 0.4 },
  volume: 0.85,
});

function driveCurve(amount: number): Float32Array {
  const k = amount * 50;
  const n = 1024;
  const c = new Float32Array(n);
  const norm = Math.tanh(1 + k) || 1;
  for (let i = 0; i < n; i++) {
    const x = (i / (n - 1)) * 2 - 1;
    c[i] = Math.tanh((1 + k) * x) / norm;
  }
  return c;
}

class MoogVoice implements ManagedVoice {
  private oscs: OscillatorNode[] = [];
  private vca: GainNode;
  private f1: BiquadFilterNode;
  private f2: BiquadFilterNode;
  private shaper: WaveShaperNode;
  private ended = false;

  constructor(
    private ctx: BaseAudioContext,
    dest: AudioNode,
    midi: number,
    vel: number,
    private p: MoogParams,
    private onDone: (v: MoogVoice) => void,
  ) {
    const base = mtof(midi);
    const now = ctx.currentTime;

    // 24 dB/oct ladder approximation via two cascaded low-pass biquads
    this.f1 = ctx.createBiquadFilter(); this.f1.type = 'lowpass'; this.f1.Q.value = p.resonance;
    this.f2 = ctx.createBiquadFilter(); this.f2.type = 'lowpass'; this.f2.Q.value = p.resonance * 0.5;
    this.shaper = ctx.createWaveShaper(); this.shaper.curve = driveCurve(p.drive); this.shaper.oversample = '2x';
    this.vca = ctx.createGain(); this.vca.gain.value = 1e-4;

    const offsets = [0, 0, -12];           // osc3 is a sub-oscillator
    const detunes = [0, p.detune, -p.detune * 0.5];
    const levels = [0.5, 0.45, 0.42];
    const mix = ctx.createGain(); mix.gain.value = 1;

    p.waves.forEach((w, i) => {
      const o = ctx.createOscillator();
      o.type = w;
      o.frequency.value = base * Math.pow(2, offsets[i] / 12);
      o.detune.value = detunes[i];
      const g = ctx.createGain(); g.gain.value = levels[i];
      o.connect(g); g.connect(mix);
      o.start(now);
      this.oscs.push(o);
    });

    mix.connect(this.f1); this.f1.connect(this.f2); this.f2.connect(this.shaper);
    this.shaper.connect(this.vca); this.vca.connect(dest);

    envOpen(this.vca.gain, ctx, clamp(vel, 0.05, 1), p.amp, now);
    this.scheduleFilterEnv(now);
  }

  private scheduleFilterEnv(t: number): void {
    const base = clamp(this.p.cutoff, 30, 14000);
    const peak = clamp(base + this.p.envAmt * 8000, base, 16000);
    const sus = base + (peak - base) * this.p.amp.s;
    [this.f1, this.f2].forEach((f) => {
      f.frequency.cancelScheduledValues(t);
      f.frequency.setValueAtTime(base, t);
      f.frequency.linearRampToValueAtTime(peak, t + Math.max(0.001, this.p.amp.a));
      f.frequency.linearRampToValueAtTime(sus, t + this.p.amp.a + Math.max(0.001, this.p.amp.d));
    });
  }

  setLive(p: MoogParams): void {
    this.p = p;
    const t = this.ctx.currentTime;
    this.f1.Q.setTargetAtTime(p.resonance, t, 0.02);
    this.f2.Q.setTargetAtTime(p.resonance * 0.5, t, 0.02);
    this.f1.frequency.setTargetAtTime(clamp(p.cutoff, 30, 14000), t, 0.04);
    this.f2.frequency.setTargetAtTime(clamp(p.cutoff, 30, 14000), t, 0.04);
    this.shaper.curve = driveCurve(p.drive);
  }

  release(t: number): void {
    const end = envClose(this.vca.gain, this.ctx, this.p.amp, t);
    const base = clamp(this.p.cutoff, 30, 14000);
    [this.f1, this.f2].forEach((f) => {
      f.frequency.cancelScheduledValues(t);
      f.frequency.setValueAtTime(f.frequency.value, t);
      f.frequency.linearRampToValueAtTime(base, t + this.p.amp.r);
    });
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

export class DSynthEngine implements SynthEngine {
  private master: MasterBus;
  private mgr: PolyVoiceManager<MoogVoice>;
  private active = new Set<MoogVoice>();
  private p: MoogParams = defaultParams();
  readonly analyser: AnalyserNode;

  constructor(private ctx: BaseAudioContext) {
    this.master = createMasterBus(ctx, this.p.volume);
    this.analyser = this.master.analyser;
    this.mgr = new PolyVoiceManager<MoogVoice>(8);
  }

  noteOn(midi: number, velocity = 0.9): void {
    const v = new MoogVoice(this.ctx, this.master.input, midi, velocity, this.p, (vv) => this.active.delete(vv));
    this.active.add(v);
    this.mgr.add(midi, v);
  }

  noteOff(midi: number): void {
    this.mgr.release(midi, this.ctx.currentTime);
  }

  setParam(name: string, value: number | string): void {
    switch (name) {
      case 'wave1': this.p.waves[0] = value as OscillatorType; break;
      case 'wave2': this.p.waves[1] = value as OscillatorType; break;
      case 'wave3': this.p.waves[2] = value as OscillatorType; break;
      case 'detune': this.p.detune = value as number; break;
      case 'cutoff': this.p.cutoff = value as number; break;
      case 'resonance': this.p.resonance = value as number; break;
      case 'envAmt': this.p.envAmt = value as number; break;
      case 'drive': this.p.drive = value as number; break;
      case 'attack': this.p.amp.a = value as number; break;
      case 'decay': this.p.amp.d = value as number; break;
      case 'sustain': this.p.amp.s = value as number; break;
      case 'release': this.p.amp.r = value as number; break;
      case 'volume': this.p.volume = value as number; this.master.setVolume(value as number); break;
    }
    // live params reshape currently-held notes
    if (['cutoff', 'resonance', 'drive'].includes(name)) this.active.forEach((v) => v.setLive(this.p));
  }

  connect(dest: AudioNode): void { this.master.output.connect(dest); }

  dispose(): void {
    this.mgr.killAll();
    this.active.clear();
    try { this.master.output.disconnect(); } catch { /* */ }
  }
}

// ─── UI ──────────────────────────────────────────────────────────────────────

const WAVE_LABELS = ['Saw', 'Sqr', 'Tri', 'Sin'];

const DSynth: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const engine = useRef<DSynthEngine | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
  const [active, setActive] = useState<number[]>([]);

  const [wave, setWave] = useState([0, 0, 0]);
  const [detune, setDetune] = useState(12);
  const [cutoff, setCutoff] = useState(1200);
  const [resonance, setResonance] = useState(6);
  const [envAmt, setEnvAmt] = useState(0.55);
  const [drive, setDrive] = useState(0.25);
  const [attack, setAttack] = useState(0.02);
  const [decay, setDecay] = useState(0.3);
  const [sustain, setSustain] = useState(0.7);
  const [release, setRelease] = useState(0.4);

  useEffect(() => {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const e = new DSynthEngine(ctx);
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

  return (
    <SynthShell name="D Synth" tag="Model D · 3-Osc Analog Lead" onClose={onClose} accent={PANEL.brass}
      scope={<Scope analyser={analyser} />}
      keyboard={<Keys octaves={2} startMidi={48} activeNotes={active} onNoteOn={noteOn} onNoteOff={noteOff} />}>

      <Engrave>Oscillators</Engrave>
      <div style={{ display: 'flex', justifyContent: 'space-around', gap: 8 }}>
        {[0, 1, 2].map((i) => (
          <Rocker key={i} label={i === 2 ? 'Sub' : `Osc ${i + 1}`} options={WAVE_LABELS} value={wave[i]}
            onChange={(v) => { setWave((w) => { const n = [...w]; n[i] = v; return n; }); sp(`wave${i + 1}`, WAVES[v]); }} />
        ))}
      </div>

      <Engrave>Filter</Engrave>
      <KnobRow>
        <Knob label="Cutoff" value={cutoff} min={50} max={12000} log onChange={(v) => { setCutoff(v); sp('cutoff', v); }} format={(v) => `${Math.round(v)}`} />
        <Knob label="Reso" value={resonance} min={0} max={22} step={0.1} onChange={(v) => { setResonance(v); sp('resonance', v); }} format={(v) => v.toFixed(1)} />
        <Knob label="Env" value={envAmt} min={0} max={1} step={0.01} onChange={(v) => { setEnvAmt(v); sp('envAmt', v); }} format={(v) => `${Math.round(v * 100)}%`} />
        <Knob label="Detune" value={detune} min={0} max={40} step={0.5} onChange={(v) => { setDetune(v); sp('detune', v); }} format={(v) => `${Math.round(v)}¢`} />
      </KnobRow>

      <Engrave>Envelope · Drive</Engrave>
      <KnobRow>
        <Knob label="Atk" value={attack} min={0.001} max={2} step={0.001} log onChange={(v) => { setAttack(v); sp('attack', v); }} format={(v) => `${Math.round(v * 1000)}ms`} />
        <Knob label="Dec" value={decay} min={0.01} max={3} step={0.01} log onChange={(v) => { setDecay(v); sp('decay', v); }} format={(v) => `${v.toFixed(2)}s`} />
        <Knob label="Sus" value={sustain} min={0} max={1} step={0.01} onChange={(v) => { setSustain(v); sp('sustain', v); }} format={(v) => `${Math.round(v * 100)}%`} />
        <Knob label="Rel" value={release} min={0.01} max={4} step={0.01} log onChange={(v) => { setRelease(v); sp('release', v); }} format={(v) => `${v.toFixed(2)}s`} />
        <Knob label="Drive" value={drive} min={0} max={1} step={0.01} onChange={(v) => { setDrive(v); sp('drive', v); }} format={(v) => `${Math.round(v * 100)}%`} accent={PANEL.brassLite} />
      </KnobRow>

    </SynthShell>
  );
};

export default DSynth;
