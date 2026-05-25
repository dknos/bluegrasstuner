
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { SynthShell, Knob, KnobRow, Keys, Rocker, Engrave, PANEL } from './synthkit';

interface VitalSynthProps {
  onClose: () => void;
}

// --- TYPES ---
type ModSource = 'LFO1' | 'LFO2' | 'LFO3' | 'ENV1' | 'VEL' | null;

interface ModConnection {
    source: ModSource;
    target: string; // Param ID
    amount: number;
}

// --- ENGINE ---
class VitalEngine {
    ctx: AudioContext;
    master: GainNode;
    limiter: DynamicsCompressorNode;
    
    // Global LFOs
    lfos: OscillatorNode[] = [];
    lfoGains: GainNode[] = []; // Depth controls
    
    // FX Chain
    fxInput: GainNode;
    
    // Active Voices
    activeVoices: Map<number, VitalVoice> = new Map();
    
    // Modulation Matrix
    // Map<TargetParamID, Set<Source>> - In a real engine, this is complex. 
    // We will update params directly from the React loop for UI modulation visualization 
    // and use AudioParams for audio-rate modulation.

    constructor() {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        
        this.master = this.ctx.createGain();
        this.master.gain.value = 0.4;
        
        this.limiter = this.ctx.createDynamicsCompressor();
        
        this.fxInput = this.ctx.createGain();
        
        // Simple FX Chain (Distortion -> Delay -> Reverb)
        const dist = this.ctx.createWaveShaper();
        // soft clip
        const curve = new Float32Array(44100);
        for(let i=0; i<44100; i++) { 
            const x = (i/44100)*2 - 1; 
            curve[i] = (3 + 20) * x * 20 * (Math.PI / 180) / (Math.PI + 20 * Math.abs(x));
        }
        dist.curve = curve;

        const delay = this.ctx.createDelay();
        delay.delayTime.value = 0.4;
        const delayFb = this.ctx.createGain();
        delayFb.gain.value = 0.4;
        delay.connect(delayFb);
        delayFb.connect(delay);

        this.fxInput.connect(dist);
        dist.connect(delay);
        dist.connect(this.master); // Dry-ish
        delay.connect(this.master);
        
        this.master.connect(this.limiter);
        this.limiter.connect(this.ctx.destination);

        // Init LFOs (Global for now to save CPU, though Vital is per-voice usually)
        // We'll use 4 global LFOs for this "Mini" version
        for(let i=0; i<4; i++) {
            const lfo = this.ctx.createOscillator();
            lfo.frequency.value = 1; // Default rate
            lfo.start();
            const g = this.ctx.createGain();
            g.gain.value = 1000; // Default mod depth
            lfo.connect(g);
            this.lfos.push(lfo);
            this.lfoGains.push(g);
        }
    }

    trigger(note: number, params: any) {
        if(this.ctx.state === 'suspended') this.ctx.resume();
        
        if(this.activeVoices.has(note)) {
            this.activeVoices.get(note)?.stop();
        }

        const voice = new VitalVoice(this.ctx, this.fxInput, note, params, this.lfoGains);
        this.activeVoices.set(note, voice);
    }

    release(note: number) {
        const voice = this.activeVoices.get(note);
        if(voice) {
            voice.stop();
            this.activeVoices.delete(note);
        }
    }

    updateLFO(index: number, rate: number, shape: OscillatorType) {
        if (this.lfos[index]) {
            this.lfos[index].frequency.setTargetAtTime(rate, this.ctx.currentTime, 0.1);
            this.lfos[index].type = shape;
        }
    }
    
    // Updates global FX, Filter etc
    setParam(target: string, value: number) {
        // Implementation for live parameter tweaking
        this.activeVoices.forEach(v => v.update(target, value));
    }
}

class VitalVoice {
    ctx: AudioContext;
    osc1: OscillatorNode;
    osc2: OscillatorNode;
    osc3: OscillatorNode; // Sub/Texture
    filter: BiquadFilterNode;
    vca: GainNode;
    
    // Mod Inputs
    filterMod: GainNode; 

    constructor(ctx: AudioContext, dest: AudioNode, note: number, params: any, lfoSources: GainNode[]) {
        this.ctx = ctx;
        const freq = 440 * Math.pow(2, (note-69)/12);
        const now = ctx.currentTime;

        // 3 Oscillators
        this.osc1 = ctx.createOscillator();
        this.osc2 = ctx.createOscillator();
        this.osc3 = ctx.createOscillator();

        this.osc1.frequency.value = freq;
        this.osc2.frequency.value = freq * 1.001; // Detuned
        this.osc3.frequency.value = freq / 2; // Sub

        // Waveforms (Simulating Spectral Morph via basic shapes + filters)
        this.osc1.type = params.osc1Wave || 'sawtooth';
        this.osc2.type = params.osc2Wave || 'square';
        this.osc3.type = 'sine';

        // Mixer
        const mix = ctx.createGain();
        mix.gain.value = 0.3;

        this.osc1.connect(mix);
        this.osc2.connect(mix);
        this.osc3.connect(mix);

        // Filter
        this.filter = ctx.createBiquadFilter();
        this.filter.type = 'lowpass';
        this.filter.frequency.value = params.cutoff;
        this.filter.Q.value = params.res;

        // Modulation Input for Filter
        this.filterMod = ctx.createGain();
        this.filterMod.gain.value = 1.0; 
        this.filterMod.connect(this.filter.frequency);

        // Connect Global LFOs if modulated
        // In a full engine, we'd check the matrix. 
        // For this demo, we hardwire LFO 1 to Filter if 'spectral warp' is high
        if (params.spectralWarp > 0.1) {
            lfoSources[0].connect(this.filterMod);
        }

        // VCA (Env 1)
        this.vca = ctx.createGain();
        this.vca.gain.value = 0;

        mix.connect(this.filter);
        this.filter.connect(this.vca);
        this.vca.connect(dest);

        // Start
        this.osc1.start(now);
        this.osc2.start(now);
        this.osc3.start(now);

        // Attack
        this.vca.gain.linearRampToValueAtTime(1.0, now + 0.01);
        this.vca.gain.exponentialRampToValueAtTime(0.5, now + 0.4); // Decay
    }

    update(target: string, value: number) {
        if(target === 'cutoff') this.filter.frequency.setTargetAtTime(value, this.ctx.currentTime, 0.1);
        if(target === 'res') this.filter.Q.setTargetAtTime(value, this.ctx.currentTime, 0.1);
    }

    stop() {
        const now = this.ctx.currentTime;
        this.vca.gain.cancelScheduledValues(now);
        this.vca.gain.setValueAtTime(this.vca.gain.value, now);
        this.vca.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
        
        this.osc1.stop(now + 0.1);
        this.osc2.stop(now + 0.1);
        this.osc3.stop(now + 0.1);
    }
}

// --- COMPONENTS ---

const VitalKnob: React.FC<{ 
    label: string; value: number; min: number; max: number; step?: number; // Added step
    onChange: (v: number) => void; 
    modAmt?: number;
    onDrop?: (source: ModSource) => void;
}> = ({ label, value, min, max, step=0.01, onChange, modAmt = 0, onDrop }) => {
    const [dragging, setDragging] = useState(false);
    const startY = useRef(0);
    const startVal = useRef(0);

    // DnD
    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault(); // Allow drop
    };
    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        const source = e.dataTransfer.getData("source") as ModSource;
        if (source && onDrop) onDrop(source);
    };

    const handleDown = (e: any) => {
        setDragging(true);
        startY.current = e.clientY || e.touches[0].clientY;
        startVal.current = value;
    };

    useEffect(() => {
        const handleMove = (e: any) => {
            if (!dragging) return;
            const y = e.clientY || e.touches[0].clientY;
            const delta = startY.current - y;
            const range = max - min;
            let val = Math.min(max, Math.max(min, startVal.current + (delta / 200) * range));
            if(step) val = Math.round(val/step)*step;
            onChange(val);
        };
        const handleUp = () => setDragging(false);

        if (dragging) {
            window.addEventListener('mousemove', handleMove);
            window.addEventListener('mouseup', handleUp);
            window.addEventListener('touchmove', handleMove);
            window.addEventListener('touchend', handleUp);
        }
        return () => {
            window.removeEventListener('mousemove', handleMove);
            window.removeEventListener('mouseup', handleUp);
            window.removeEventListener('touchmove', handleMove);
            window.removeEventListener('touchend', handleUp);
        };
    }, [dragging, min, max, step, onChange]);

    const pct = (value - min) / (max - min);
    const rot = -135 + pct * 270;

    return (
        <div 
            className="flex flex-col items-center gap-1 group relative w-12" 
            onMouseDown={handleDown} 
            onTouchStart={handleDown}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
        >
            <div className="w-10 h-10 rounded-full bg-[#181818] border-2 border-[#444] relative cursor-ns-resize shadow-md" style={{ transform: `rotate(${rot}deg)` }}>
                {/* Mod Ring */}
                {modAmt > 0 && (
                    <div className="absolute -inset-1 rounded-full border-2 border-green-500 opacity-50 animate-pulse"></div>
                )}
                <div className="absolute inset-0.5 rounded-full border border-gray-600"></div>
                <div className="absolute top-1 left-1/2 w-1 h-3 -translate-x-1/2 rounded-full bg-white shadow-[0_0_5px_white]"></div>
            </div>
            <span className="text-[8px] font-bold uppercase text-gray-400 text-center leading-tight select-none">{label}</span>
        </div>
    );
};

const LFOVisual: React.FC<{ index: number; rate: number; shape: string }> = ({ index, rate, shape }) => {
    return (
        <div className="w-full h-full bg-[#0a0a0a] rounded relative overflow-hidden group">
            {/* Grid */}
            <div className="absolute inset-0 bg-[linear-gradient(90deg,#222_1px,transparent_1px)] bg-[length:25%_100%]"></div>
            
            {/* Wave */}
            <svg className="w-full h-full absolute inset-0" preserveAspectRatio="none">
                {shape === 'sine' && <path d="M0,32 Q25,0 50,32 T100,32" stroke="orange" fill="none" strokeWidth="2" vectorEffect="non-scaling-stroke" />}
                {shape === 'sawtooth' && <path d="M0,64 L100,0" stroke="orange" fill="none" strokeWidth="2" vectorEffect="non-scaling-stroke" />}
                {shape === 'square' && <path d="M0,64 L0,0 L50,0 L50,64 L100,64" stroke="orange" fill="none" strokeWidth="2" vectorEffect="non-scaling-stroke" />}
                {shape === 'triangle' && <path d="M0,64 L50,0 L100,64" stroke="orange" fill="none" strokeWidth="2" vectorEffect="non-scaling-stroke" />}
            </svg>

            {/* Scanning Playhead */}
            <div className="absolute top-0 bottom-0 w-0.5 bg-white opacity-50 animate-ping" style={{ left: '0%', animation: `scan ${1/rate}s linear infinite` }}></div>
            
            <div className="absolute top-1 left-1 text-[9px] font-bold text-gray-500">LFO {index+1}</div>
        </div>
    )
}

const VitalSynth: React.FC<VitalSynthProps> = ({ onClose }) => {
    const engine = useRef<VitalEngine | null>(null);
    const [activeNotes, setActiveNotes] = useState<number[]>([]);
    
    // Params
    const [osc1Vol, setOsc1Vol] = useState(0.8);
    const [osc1Pan, setOsc1Pan] = useState(0);
    const [osc1Tune, setOsc1Tune] = useState(0);
    const [oscWave, setOscWave] = useState(0); // 0-1
    
    const [cutoff, setCutoff] = useState(2000);
    const [res, setRes] = useState(0);
    
    const [warp, setWarp] = useState(0);
    
    // LFOs
    const [lfoParams, setLfoParams] = useState([
        { rate: 1, shape: 'sine' },
        { rate: 4, shape: 'triangle' },
        { rate: 0.5, shape: 'sawtooth' },
        { rate: 8, shape: 'square' },
    ]);

    // Mod Matrix
    const [mods, setMods] = useState<ModConnection[]>([]);

    useEffect(() => {
        engine.current = new VitalEngine();
        return () => { engine.current?.ctx.close(); }
    }, []);

    // Update Engine LFOs
    useEffect(() => {
        lfoParams.forEach((p, i) => {
            engine.current?.updateLFO(i, p.rate, p.shape as OscillatorType);
        });
    }, [lfoParams]);

    // Update Filter
    useEffect(() => {
        engine.current?.setParam('cutoff', cutoff);
        engine.current?.setParam('res', res);
    }, [cutoff, res]);

    const handleNoteOn = (n: number) => {
        if(!activeNotes.includes(n)) setActiveNotes(prev => [...prev, n]);
        engine.current?.trigger(n, {
            osc1Wave: oscWave < 0.5 ? 'sawtooth' : 'square',
            osc2Wave: 'triangle',
            cutoff, res, spectralWarp: warp
        });
    };

    const handleNoteOff = (n: number) => {
        setActiveNotes(prev => prev.filter(x => x !== n));
        engine.current?.release(n);
    };

    const handleLfoDragStart = (e: React.DragEvent, index: number) => {
        e.dataTransfer.setData("source", `LFO${index+1}`);
        e.dataTransfer.effectAllowed = "link";
    };

    const handleModDrop = (target: string, source: ModSource) => {
        if (!source) return;
        setMods([...mods, { source, target, amount: 0.5 }]);
    };

    const getModAmt = (target: string) => {
        const mod = mods.find(m => m.target === target);
        return mod ? mod.amount : 0;
    };

    const updateLfoParam = (idx: number, key: 'rate'|'shape', val: any) => {
        const newP = [...lfoParams];
        newP[idx] = { ...newP[idx], [key]: val };
        setLfoParams(newP);
    };

    const randomize = () => {
        setCutoff(Math.random() * 5000 + 100);
        setWarp(Math.random());
        setOscWave(Math.random());
        const newLfos = lfoParams.map(l => ({ ...l, rate: Math.random() * 10 }));
        setLfoParams(newLfos);
    };

    const SHAPES = ['sine', 'triangle', 'sawtooth', 'square'];

    return (
        <SynthShell name="Vital" tag="Spectral Wavetable" onClose={onClose} accent={PANEL.brass}>
            <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={randomize} style={{ padding: '7px 14px', borderRadius: 999, cursor: 'pointer', fontFamily: '"JetBrains Mono", monospace', fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', border: `1px solid ${PANEL.brass}`, background: PANEL.brass, color: '#1a0d04' }}>⚄ Randomize</button>
            </div>

            <Engrave>Oscillator · Wavetable</Engrave>
            <KnobRow>
                <Knob label="Wave" value={oscWave} min={0} max={1} step={0.01} onChange={setOscWave} size={70} />
                <Knob label="Warp" value={warp} min={0} max={1} step={0.01} onChange={setWarp} size={70} />
            </KnobRow>

            <Engrave>Filter</Engrave>
            <KnobRow>
                <Knob label="Cutoff" value={cutoff} min={50} max={8000} log onChange={setCutoff} format={(v) => `${Math.round(v)}`} size={70} />
                <Knob label="Resonance" value={res} min={0} max={30} onChange={setRes} size={70} />
            </KnobRow>

            <Engrave>Modulation · LFO</Engrave>
            {lfoParams.map((p, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '8px 12px', borderRadius: 8, background: 'rgba(0,0,0,0.2)', boxShadow: `inset 0 0 0 1px ${PANEL.line}` }}>
                    <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 10, color: PANEL.inkMute, letterSpacing: 1, width: 44 }}>LFO {i + 1}</span>
                    <Knob label="Rate" value={p.rate} min={0.1} max={20} step={0.1} onChange={(v) => updateLfoParam(i, 'rate', v)} size={48} format={(v) => `${v.toFixed(1)}`} />
                    <Rocker options={['Sin', 'Tri', 'Saw', 'Sqr']} value={SHAPES.indexOf(p.shape)} onChange={(idx) => updateLfoParam(i, 'shape', SHAPES[idx])} />
                </div>
            ))}

            <Engrave>Keyboard</Engrave>
            <Keys octaves={2} startMidi={48} activeNotes={activeNotes} onNoteOn={handleNoteOn} onNoteOff={handleNoteOff} />
        </SynthShell>
    );
};

export default VitalSynth;
