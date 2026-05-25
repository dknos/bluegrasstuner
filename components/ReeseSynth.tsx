
import React, { useState, useEffect, useRef } from 'react';
import { SynthShell, Scope, Knob, KnobRow, XYPad, NoteRow, Engrave, PANEL } from './synthkit';

interface ReeseSynthProps {
  onClose: () => void;
}

function makeDistortionCurve(amount: number) {
  const k = typeof amount === 'number' ? amount : 50;
  const n_samples = 44100;
  const curve = new Float32Array(n_samples);
  const deg = Math.PI / 180;
  for (let i = 0; i < n_samples; ++i) {
    const x = i * 2 / n_samples - 1;
    curve[i] = (3 + k) * x * 20 * deg / (Math.PI + k * Math.abs(x));
  }
  return curve;
}

class ReeseEngine {
    ctx: AudioContext;
    master: GainNode;
    analyser: AnalyserNode;
    
    // Voices
    oscs: OscillatorNode[] = [];
    gains: GainNode[] = [];
    
    // Processing
    filter: BiquadFilterNode;
    distortion: WaveShaperNode;
    compressor: DynamicsCompressorNode;

    // Wobble LFO (modulates filter cutoff) — driven by the XY pad
    lfo: OscillatorNode;
    lfoDepth: GainNode;

    constructor() {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        this.master = this.ctx.createGain();
        this.master.gain.value = 0.0; // Start silent, envelope controlled manually or gate
        
        this.analyser = this.ctx.createAnalyser();
        this.analyser.fftSize = 2048;

        this.filter = this.ctx.createBiquadFilter();
        this.filter.type = 'lowpass';
        this.filter.frequency.value = 800;
        this.filter.Q.value = 1;

        this.distortion = this.ctx.createWaveShaper();
        this.distortion.curve = makeDistortionCurve(50);
        this.distortion.oversample = '4x';

        this.compressor = this.ctx.createDynamicsCompressor();
        this.compressor.threshold.value = -20;
        this.compressor.ratio.value = 12;

        // Routing: Oscs -> Dist -> Filter -> Comp -> Master -> Analyser -> Out
        this.distortion.connect(this.filter);
        this.filter.connect(this.compressor);
        this.compressor.connect(this.master);
        this.master.connect(this.analyser);
        this.analyser.connect(this.ctx.destination);

        // Reese Generators: Multiple Sawtooths, Detuned
        const detunes = [-15, -5, 0, 5, 15]; // Cents
        const baseFreq = 55; // Low A (A1)

        detunes.forEach(d => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            
            osc.type = 'sawtooth';
            osc.frequency.value = baseFreq;
            osc.detune.value = d;
            
            gain.gain.value = 0.2; // Mix down

            osc.connect(gain);
            gain.connect(this.distortion);
            
            osc.start();

            this.oscs.push(osc);
            this.gains.push(gain);
        });

        // Wobble LFO → depth gain → filter cutoff (additive modulation around base cutoff)
        this.lfo = this.ctx.createOscillator();
        this.lfo.type = 'sine';
        this.lfo.frequency.value = 4;
        this.lfoDepth = this.ctx.createGain();
        this.lfoDepth.gain.value = 0;
        this.lfo.connect(this.lfoDepth);
        this.lfoDepth.connect(this.filter.frequency);
        this.lfo.start();
    }

    setWobbleRate(hz: number) {
        this.lfo.frequency.setTargetAtTime(hz, this.ctx.currentTime, 0.03);
    }

    setWobbleDepth(hz: number) {
        this.lfoDepth.gain.setTargetAtTime(hz, this.ctx.currentTime, 0.03);
    }

    setCutoff(val: number) {
        this.filter.frequency.setTargetAtTime(val, this.ctx.currentTime, 0.1);
    }

    setDistortion(val: number) {
        this.distortion.curve = makeDistortionCurve(val);
    }

    setDetuneSpread(spread: number) {
        // spread multiplier
        const baseDetunes = [-15, -5, 0, 5, 15];
        this.oscs.forEach((osc, i) => {
            osc.detune.setTargetAtTime(baseDetunes[i] * spread, this.ctx.currentTime, 0.1);
        });
    }

    trigger(active: boolean) {
        const now = this.ctx.currentTime;
        if (active) {
            this.master.gain.cancelScheduledValues(now);
            this.master.gain.setValueAtTime(this.master.gain.value, now);
            this.master.gain.linearRampToValueAtTime(0.8, now + 0.1); // Attack
        } else {
            this.master.gain.cancelScheduledValues(now);
            this.master.gain.setValueAtTime(this.master.gain.value, now);
            this.master.gain.exponentialRampToValueAtTime(0.001, now + 0.5); // Release
        }
    }
    
    setNote(midiNote: number) {
        const freq = 440 * Math.pow(2, (midiNote - 69) / 12);
        this.oscs.forEach(osc => {
            osc.frequency.setTargetAtTime(freq, this.ctx.currentTime, 0.05); // Portamento
        });
    }
}

// Wobble-pad X axis → LFO rate (Hz), logarithmic for musical feel
const RATE_MIN = 0.3, RATE_MAX = 18;
const rateHz = (x: number) => RATE_MIN * Math.pow(RATE_MAX / RATE_MIN, x);
const DEPTH_MAX = 3000; // Hz of cutoff swing at full depth

const ReeseSynth: React.FC<ReeseSynthProps> = ({ onClose }) => {
    const engine = useRef<ReeseEngine | null>(null);

    // Params
    const [cutoff, setCutoff] = useState(800);
    const [distortion, setDistortion] = useState(50);
    const [spread, setSpread] = useState(1);
    const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
    const [activeNote, setActiveNote] = useState<number | null>(null);

    // Wobble XY pad + hold latch
    const [padX, setPadX] = useState(0.35); // rate
    const [padY, setPadY] = useState(0.5);  // depth
    const [padDown, setPadDown] = useState(false);
    const [latched, setLatched] = useState(false);
    const playing = padDown || latched;

    useEffect(() => {
        const eng = new ReeseEngine();
        engine.current = eng;
        setAnalyser(eng.analyser);
        eng.setWobbleRate(rateHz(0.35));
        eng.setWobbleDepth(0.5 * DEPTH_MAX);
        return () => { eng.ctx.close(); };
    }, []);

    useEffect(() => { engine.current?.setCutoff(cutoff); }, [cutoff]);
    useEffect(() => { engine.current?.setDistortion(distortion); }, [distortion]);
    useEffect(() => { engine.current?.setDetuneSpread(spread); }, [spread]);
    // single gate: sound is on while the pad is held OR the latch is engaged
    useEffect(() => { engine.current?.trigger(playing); }, [playing]);

    const onPad = (x: number, y: number) => {
        setPadX(x); setPadY(y);
        engine.current?.setWobbleRate(rateHz(x));
        engine.current?.setWobbleDepth(y * DEPTH_MAX);
    };

    return (
        <SynthShell name="Reese Bass" tag="Neuro · Supersaw · Bass Engine" onClose={onClose} accent="#caa052">
            <Scope analyser={analyser} />
            <KnobRow>
                <Knob label="Cutoff" value={cutoff} min={50} max={5000} log onChange={setCutoff} format={(v) => `${Math.round(v)} Hz`} />
                <Knob label="Dirt" value={distortion} min={0} max={400} onChange={setDistortion} format={(v) => Math.round(v).toString()} />
                <Knob label="Width" value={spread} min={0} max={3} step={0.1} onChange={setSpread} format={(v) => `${v.toFixed(1)}×`} />
            </KnobRow>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Engrave>Wobble Pad · ↔ rate · ↕ depth</Engrave>
                <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 9, color: playing ? PANEL.phosphor : PANEL.inkMute, letterSpacing: 1 }}>
                    {rateHz(padX).toFixed(1)} Hz
                </span>
            </div>
            <XYPad x={padX} y={padY} active={playing} accent={PANEL.phosphor} labelX="Rate" labelY="Depth"
                height={200} onChange={onPad}
                onDown={() => setPadDown(true)} onUp={() => setPadDown(false)} />
            <button onClick={() => setLatched((v) => !v)} style={{
                width: '100%', padding: '11px 0', borderRadius: 9, cursor: 'pointer', border: 'none',
                fontFamily: '"JetBrains Mono", monospace', fontSize: 11, letterSpacing: 2, textTransform: 'uppercase',
                color: latched ? '#1a0d04' : PANEL.inkMute,
                background: latched ? `linear-gradient(180deg,${PANEL.brassLite},${PANEL.brass})` : '#181410',
                boxShadow: latched ? `0 0 18px rgba(202,160,82,0.4)` : `inset 0 0 0 1px ${PANEL.line}`,
            }}>{latched ? '● Hold — Sustaining' : 'Hold — tap to sustain drone'}</button>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <Engrave>Pitch</Engrave>
                <NoteRow
                    notes={[36, 38, 40, 41, 43, 45, 47, 48]}
                    active={activeNote}
                    onNote={(m) => { setActiveNote(m); engine.current?.setNote(m); }}
                />
            </div>
        </SynthShell>
    );
};

export default ReeseSynth;
