import React, { useState, useEffect, useRef } from 'react';
import { SynthShell, Scope, Knob, KnobRow, Rocker, Keys, Engrave, PANEL } from './synthkit';
import {
  SynthEngine, MasterBus, createMasterBus, mtof, clamp, ADSR, envOpen, envClose,
  PolyVoiceManager, ManagedVoice,
} from '../services/audio/core';

// ─── Engine: 2-operator FM voice — 1990s AdLib / Sound Blaster character ─────
//
// Per voice:  modulator OscillatorNode → modGain (= modIndex × carrierFreq)
//             → carrier.frequency (the FM). Carrier → amp VCA (ADSR) → master.
// Optional self-feedback: modulator → fbGain (small, bounded) → modulator.freq.

interface FMParams {
  ratio: number;     // modulator : carrier frequency ratio
  modIndex: number;  // FM depth (0..12)
  feedback: number;  // modulator self-feedback 0..1
  amp: ADSR;
  volume: number;
}

interface FMPreset { ratio: number; modIndex: number; feedback: number; amp: ADSR; }

// Presets tuned to sound like their names (ratio + modIndex + ADSR shape).
const PRESETS: Record<string, FMPreset> = {
  // ratio 1, fast attack, high sustain — the classic FM organ drawbar tone.
  Organ: { ratio: 1, modIndex: 1.2, feedback: 0.0, amp: { a: 0.005, d: 0.1, s: 0.95, r: 0.18 } },
  // ratio 1, bright buzz, medium sustain — sustained FM brass swell.
  Brass: { ratio: 1, modIndex: 3.2, feedback: 0.15, amp: { a: 0.04, d: 0.25, s: 0.78, r: 0.3 } },
  // inharmonic ratio + long tail, near-zero sustain — metallic FM bell.
  Bell: { ratio: 3.5, modIndex: 6, feedback: 0.0, amp: { a: 0.002, d: 1.2, s: 0.0, r: 1.6 } },
  // ratio 2, punchy mid index, held — cutting square-ish FM lead.
  Lead: { ratio: 2, modIndex: 4, feedback: 0.25, amp: { a: 0.01, d: 0.2, s: 0.7, r: 0.25 } },
  // low ratio, snappy decay, no sustain — round FM bass.
  Bass: { ratio: 0.5, modIndex: 2.4, feedback: 0.1, amp: { a: 0.004, d: 0.18, s: 0.45, r: 0.18 } },
  // ratio 1, instant attack, fast decay to silence — plucked FM string.
  Pluck: { ratio: 1, modIndex: 5, feedback: 0.0, amp: { a: 0.002, d: 0.32, s: 0.0, r: 0.3 } },
};

const PRESET_NAMES = Object.keys(PRESETS); // Organ, Brass, Bell, Lead, Bass, Pluck

const defaultParams = (): FMParams => {
  // Default to Organ: high sustain + modIndex > 0 so a held note stays audible.
  const p = PRESETS.Organ;
  return { ratio: p.ratio, modIndex: p.modIndex, feedback: p.feedback, amp: { ...p.amp }, volume: 0.85 };
};

class FMVoice implements ManagedVoice {
  private mod: OscillatorNode;
  private modGain: GainNode;   // depth = modIndex × carrierFreq (Hz into carrier.frequency)
  private fbGain: GainNode;    // modulator self-feedback
  private car: OscillatorNode;
  private vca: GainNode;
  private base: number;
  private ended = false;

  constructor(
    private ctx: BaseAudioContext,
    dest: AudioNode,
    midi: number,
    vel: number,
    private p: FMParams,
    private onDone: (v: FMVoice) => void,
  ) {
    const now = ctx.currentTime;
    this.base = mtof(midi);

    // Carrier → VCA → master.input
    this.car = ctx.createOscillator();
    this.car.type = 'sine';
    this.car.frequency.value = this.base;

    this.vca = ctx.createGain();
    this.vca.gain.value = 1e-4;
    this.car.connect(this.vca);
    this.vca.connect(dest);

    // Modulator → modGain → carrier.frequency
    this.mod = ctx.createOscillator();
    this.mod.type = 'sine';
    this.mod.frequency.value = this.base * this.p.ratio;

    this.modGain = ctx.createGain();
    this.modGain.gain.value = this.p.modIndex * this.base;
    this.mod.connect(this.modGain);
    this.modGain.connect(this.car.frequency);

    // Bounded self-feedback: feedback × carrierFreq × 0.5 keeps fb=1 stable.
    this.fbGain = ctx.createGain();
    this.fbGain.gain.value = this.p.feedback * this.base * 0.5;
    this.mod.connect(this.fbGain);
    this.fbGain.connect(this.mod.frequency);

    this.car.start(now);
    this.mod.start(now);

    envOpen(this.vca.gain, ctx, clamp(vel, 0.05, 1), this.p.amp, now);
  }

  /** Live reshape of held notes (ratio / modIndex / feedback). */
  setLive(p: FMParams): void {
    this.p = p;
    const t = this.ctx.currentTime;
    this.mod.frequency.setTargetAtTime(this.base * p.ratio, t, 0.02);
    this.modGain.gain.setTargetAtTime(p.modIndex * this.base, t, 0.02);
    this.fbGain.gain.setTargetAtTime(p.feedback * this.base * 0.5, t, 0.02);
  }

  release(t: number): void {
    const end = envClose(this.vca.gain, this.ctx, this.p.amp, t);
    try { this.car.stop(end + 0.03); } catch { /* already stopped */ }
    try { this.mod.stop(end + 0.03); } catch { /* already stopped */ }
    this.car.onended = () => this.cleanup();
  }

  kill(): void {
    const t = this.ctx.currentTime;
    this.vca.gain.cancelScheduledValues(t);
    this.vca.gain.setValueAtTime(Math.max(1e-4, this.vca.gain.value), t);
    this.vca.gain.linearRampToValueAtTime(1e-4, t + 0.01);
    try { this.car.stop(t + 0.03); } catch { /* */ }
    try { this.mod.stop(t + 0.03); } catch { /* */ }
    this.cleanup();
  }

  private cleanup(): void {
    if (this.ended) return;
    this.ended = true;
    try { this.vca.disconnect(); } catch { /* */ }
    try { this.modGain.disconnect(); } catch { /* */ }
    try { this.fbGain.disconnect(); } catch { /* */ }
    this.onDone(this);
  }
}

export class OPL3Engine implements SynthEngine {
  private master: MasterBus;
  private mgr: PolyVoiceManager<FMVoice>;
  private active = new Set<FMVoice>();
  private p: FMParams = defaultParams();
  readonly analyser: AnalyserNode;

  constructor(private ctx: BaseAudioContext) {
    this.master = createMasterBus(ctx, this.p.volume);
    this.analyser = this.master.analyser;
    this.mgr = new PolyVoiceManager<FMVoice>(8);
  }

  noteOn(midi: number, velocity = 0.9): void {
    const v = new FMVoice(this.ctx, this.master.input, midi, velocity, this.p, (vv) => this.active.delete(vv));
    this.active.add(v);
    this.mgr.add(midi, v);
  }

  noteOff(midi: number): void {
    this.mgr.release(midi, this.ctx.currentTime);
  }

  setParam(name: string, value: number | string): void {
    switch (name) {
      case 'ratio': this.p.ratio = value as number; break;
      case 'modIndex': this.p.modIndex = value as number; break;
      case 'feedback': this.p.feedback = value as number; break;
      case 'attack': this.p.amp.a = value as number; break;
      case 'decay': this.p.amp.d = value as number; break;
      case 'sustain': this.p.amp.s = value as number; break;
      case 'release': this.p.amp.r = value as number; break;
      case 'volume': this.p.volume = value as number; this.master.setVolume(value as number); break;
      case 'preset': {
        const pr = PRESETS[value as string];
        if (pr) {
          this.p.ratio = pr.ratio;
          this.p.modIndex = pr.modIndex;
          this.p.feedback = pr.feedback;
          this.p.amp = { ...pr.amp };
        }
        break;
      }
    }
    // live params reshape currently-held notes
    if (['ratio', 'modIndex', 'feedback', 'preset'].includes(name)) {
      this.active.forEach((v) => v.setLive(this.p));
    }
  }

  connect(dest: AudioNode): void { this.master.output.connect(dest); }

  dispose(): void {
    this.mgr.killAll();
    this.active.clear();
    try { this.master.output.disconnect(); } catch { /* */ }
  }
}

// ─── UI ──────────────────────────────────────────────────────────────────────

const OPL3Synth: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const engine = useRef<OPL3Engine | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
  const [active, setActive] = useState<number[]>([]);

  const [preset, setPreset] = useState(0); // index into PRESET_NAMES (Organ default)
  const [chip, setChip] = useState(1);      // 0 = AdLib, 1 = SB16
  const [ratio, setRatio] = useState(PRESETS.Organ.ratio);
  const [modIndex, setModIndex] = useState(PRESETS.Organ.modIndex);
  const [feedback, setFeedback] = useState(PRESETS.Organ.feedback);
  const [attack, setAttack] = useState(PRESETS.Organ.amp.a);
  const [decay, setDecay] = useState(PRESETS.Organ.amp.d);
  const [sustain, setSustain] = useState(PRESETS.Organ.amp.s);
  const [release, setRelease] = useState(PRESETS.Organ.amp.r);

  useEffect(() => {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const e = new OPL3Engine(ctx);
    e.connect(ctx.destination);
    ctxRef.current = ctx; engine.current = e;
    setAnalyser(e.analyser);
    return () => { e.dispose(); ctx.close(); };
  }, []);

  const sp = (name: string, value: number | string) => engine.current?.setParam(name, value);

  const loadPreset = (i: number) => {
    setPreset(i);
    const name = PRESET_NAMES[i];
    const pr = PRESETS[name];
    sp('preset', name);
    // reflect preset values in the knobs
    setRatio(pr.ratio); setModIndex(pr.modIndex); setFeedback(pr.feedback);
    setAttack(pr.amp.a); setDecay(pr.amp.d); setSustain(pr.amp.s); setRelease(pr.amp.r);
  };

  // SB16 = full-range, brighter/louder; AdLib = slightly darker/quieter chip flavor.
  const setChipFlavor = (i: number) => {
    setChip(i);
    sp('volume', i === 0 ? 0.7 : 0.85);
  };

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
    <SynthShell name="OPL3" tag="FM · AdLib / SB16" onClose={onClose} accent={PANEL.phosphor}
      scope={<Scope analyser={analyser} mode="wave" />}
      keyboard={<Keys octaves={2} startMidi={48} activeNotes={active} onNoteOn={noteOn} onNoteOff={noteOff} />}>

      <Engrave>Voice · Patch</Engrave>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center' }}>
        {PRESET_NAMES.map((name, i) => (
          <button key={name} onClick={() => loadPreset(i)} style={{
            flex: '0 0 auto', padding: '8px 14px', borderRadius: 7, cursor: 'pointer',
            fontFamily: '"JetBrains Mono", ui-monospace, monospace', fontSize: 10, letterSpacing: 1, textTransform: 'uppercase',
            border: `1px solid ${preset === i ? PANEL.brass : PANEL.line}`,
            background: preset === i ? PANEL.brass : '#181410',
            color: preset === i ? '#1a0d04' : PANEL.inkMute,
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06), 0 2px 3px rgba(0,0,0,0.4)',
          }}>{name}</button>
        ))}
      </div>

      <Engrave>Operator · FM</Engrave>
      <KnobRow>
        <Knob label="Ratio" value={ratio} min={0.5} max={8} step={0.5} onChange={(v) => { setRatio(v); sp('ratio', v); }} format={(v) => `${v.toFixed(1)}:1`} />
        <Knob label="Mod" value={modIndex} min={0} max={12} step={0.1} onChange={(v) => { setModIndex(v); sp('modIndex', v); }} format={(v) => v.toFixed(1)} />
        <Knob label="Feedbk" value={feedback} min={0} max={1} step={0.01} onChange={(v) => { setFeedback(v); sp('feedback', v); }} format={(v) => `${Math.round(v * 100)}%`} accent={PANEL.brassLite} />
      </KnobRow>

      <Engrave>Envelope</Engrave>
      <KnobRow>
        <Knob label="Atk" value={attack} min={0.001} max={2} step={0.001} log onChange={(v) => { setAttack(v); sp('attack', v); }} format={(v) => `${Math.round(v * 1000)}ms`} />
        <Knob label="Dec" value={decay} min={0.01} max={3} step={0.01} log onChange={(v) => { setDecay(v); sp('decay', v); }} format={(v) => `${v.toFixed(2)}s`} />
        <Knob label="Sus" value={sustain} min={0} max={1} step={0.01} onChange={(v) => { setSustain(v); sp('sustain', v); }} format={(v) => `${Math.round(v * 100)}%`} />
        <Knob label="Rel" value={release} min={0.01} max={4} step={0.01} log onChange={(v) => { setRelease(v); sp('release', v); }} format={(v) => `${v.toFixed(2)}s`} />
      </KnobRow>

      <Engrave>Chip</Engrave>
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <Rocker label="Flavor" options={['AdLib', 'SB16']} value={chip} onChange={setChipFlavor} />
      </div>

    </SynthShell>
  );
};

export default OPL3Synth;
