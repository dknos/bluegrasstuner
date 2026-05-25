
import React, { useState, useEffect, useRef } from 'react';
import { SynthShell, Scope, Knob, KnobRow, Keys, Rocker, Engrave, PANEL } from './synthkit';

interface OPL3SynthProps {
  onClose: () => void;
}

// --- DATA & PRESETS ---

// OPL3 Waveforms (Approximate logic for labels, generation happens in Audio)
const WAVES = ['Sine', 'Half-Sine', 'Abs-Sine', 'Pulse-Sine', 'Sine-Even', 'Abs-Even', 'Square', 'Derived-Saw'];

// Mapped from real OPL2/3 register dumps (approximate 0-15 scales)
const OPL_PRESETS = [
    { 
        name: "DOOM E1M1 (Gtr)", 
        category: "FPS", 
        ops: [
            { mult: 2, tl: 22, att: 15, dec: 2, sus: 1, rel: 2, wave: 7, fb: 4, ksr: 0 }, // Modulator
            { mult: 1, tl: 0, att: 15, dec: 3, sus: 0, rel: 2, wave: 0, fb: 0, ksr: 0 }   // Carrier
        ],
        alg: 0 // FM
    },
    { 
        name: "Duke Nukem (Lead)", 
        category: "FPS", 
        ops: [
            { mult: 2, tl: 18, att: 12, dec: 4, sus: 2, rel: 5, wave: 6, fb: 0, ksr: 1 }, 
            { mult: 1, tl: 0, att: 15, dec: 5, sus: 1, rel: 4, wave: 6, fb: 2, ksr: 0 }
        ],
        alg: 0 
    },
    { 
        name: "Wolf3D (Brass)", 
        category: "FPS", 
        ops: [
            { mult: 1, tl: 16, att: 15, dec: 6, sus: 10, rel: 3, wave: 0, fb: 2, ksr: 1 }, 
            { mult: 1, tl: 0, att: 12, dec: 5, sus: 12, rel: 4, wave: 0, fb: 0, ksr: 0 }
        ],
        alg: 0 
    },
    { 
        name: "Monkey Island (Flute)", 
        category: "ADV", 
        ops: [
            { mult: 0.5, tl: 30, att: 8, dec: 6, sus: 12, rel: 5, wave: 0, fb: 0, ksr: 1 }, 
            { mult: 1, tl: 0, att: 10, dec: 7, sus: 14, rel: 6, wave: 0, fb: 0, ksr: 0 }
        ],
        alg: 0 
    },
    { 
        name: "Keen Pogo (Bass)", 
        category: "PLAT", 
        ops: [
            { mult: 2, tl: 10, att: 15, dec: 8, sus: 0, rel: 5, wave: 2, fb: 3, ksr: 0 }, 
            { mult: 0.5, tl: 0, att: 15, dec: 6, sus: 0, rel: 5, wave: 0, fb: 0, ksr: 0 }
        ],
        alg: 0 
    },
    { 
        name: "AdLib Strings", 
        category: "GEN", 
        ops: [
            { mult: 1, tl: 20, att: 5, dec: 2, sus: 10, rel: 8, wave: 0, fb: 0, ksr: 1 }, 
            { mult: 1, tl: 0, att: 8, dec: 3, sus: 12, rel: 9, wave: 0, fb: 0, ksr: 0 }
        ],
        alg: 0 
    },
    { 
        name: "Cyber Drum (Kick)", 
        category: "DRUM", 
        ops: [
            { mult: 0.5, tl: 8, att: 15, dec: 9, sus: 0, rel: 5, wave: 0, fb: 5, ksr: 0 }, 
            { mult: 0.5, tl: 0, att: 15, dec: 7, sus: 0, rel: 6, wave: 0, fb: 0, ksr: 0 }
        ],
        alg: 0 
    },
    { 
        name: "OutRun (Lead)", 
        category: "ARC", 
        ops: [
            { mult: 4, tl: 24, att: 12, dec: 4, sus: 8, rel: 5, wave: 1, fb: 0, ksr: 0 }, 
            { mult: 1, tl: 0, att: 14, dec: 5, sus: 10, rel: 6, wave: 1, fb: 0, ksr: 0 }
        ],
        alg: 0 
    },
    { 
        name: "FM Bell", 
        category: "GEN", 
        ops: [
            { mult: 3, tl: 15, att: 15, dec: 6, sus: 0, rel: 6, wave: 0, fb: 0, ksr: 0 }, 
            { mult: 1, tl: 0, att: 15, dec: 6, sus: 0, rel: 6, wave: 0, fb: 0, ksr: 0 }
        ],
        alg: 0 
    },
    { 
        name: "Genesis (Bass)", 
        category: "CON", 
        ops: [
            { mult: 2, tl: 12, att: 15, dec: 8, sus: 6, rel: 4, wave: 6, fb: 4, ksr: 0 }, 
            { mult: 0.5, tl: 0, att: 15, dec: 5, sus: 10, rel: 3, wave: 6, fb: 0, ksr: 0 }
        ],
        alg: 0 
    },
];

const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

const getNoteName = (midi: number) => {
    const note = NOTE_NAMES[midi % 12];
    const oct = Math.floor(midi / 12) - 1;
    return `${note}${oct}`;
};

// --- AUDIO ENGINE ---

class OPLVoice {
    ctx: AudioContext;
    dest: AudioNode;
    
    mod: OscillatorNode;
    modGain: GainNode;
    
    car: OscillatorNode;
    carGain: GainNode;
    
    // Feedback
    fbGain: GainNode;
    
    params: any;
    freq: number;

    constructor(ctx: AudioContext, dest: AudioNode, freq: number, params: any) {
        this.ctx = ctx;
        this.dest = dest;
        this.freq = freq;
        this.params = params; // The full preset object

        const now = ctx.currentTime;
        const modP = params.ops[0];
        const carP = params.ops[1];

        // --- CARRIER ---
        this.car = ctx.createOscillator();
        this.car.frequency.value = freq * (carP.mult > 0 ? carP.mult : 0.5);
        this.setWave(this.car, carP.wave);
        
        this.carGain = ctx.createGain();
        this.carGain.gain.value = 0;
        
        this.car.connect(this.carGain);
        this.carGain.connect(dest);

        // --- MODULATOR ---
        this.mod = ctx.createOscillator();
        this.mod.frequency.value = freq * (modP.mult > 0 ? modP.mult : 0.5);
        this.setWave(this.mod, modP.wave);
        
        this.modGain = ctx.createGain();
        this.modGain.gain.value = 0;
        
        this.mod.connect(this.modGain);
        
        if (params.alg === 0) {
            // FM: Mod -> Car Freq
            this.modGain.connect(this.car.frequency);
        } else {
            // Additive: Mod -> Mix
            this.modGain.connect(dest);
        }

        // Feedback (Mod -> Mod Freq)
        if (modP.fb > 0) {
            this.fbGain = ctx.createGain();
            this.fbGain.gain.value = Math.pow(2, modP.fb) * 10; // Scaling
            this.modGain.connect(this.fbGain);
            this.fbGain.connect(this.mod.frequency);
        } else {
            this.fbGain = ctx.createGain(); // Dummy
        }

        this.car.start(now);
        this.mod.start(now);

        // TRIGGER ENVELOPES
        // OPL scale: 0-15. 15=Fastest/Loudest.
        // Convert to seconds.
        this.triggerEnv(this.carGain, carP, 1.0); // Carrier is master volume
        
        // Modulator level (tl) is attenuation. 0 = Max output. 63 = Silent.
        // FM Depth needs to be high for audible effect in Web Audio frequency param.
        const modIndex = 1000 * (1 - (modP.tl / 63)); 
        this.triggerEnv(this.modGain, modP, modIndex);
    }

    setWave(osc: OscillatorNode, waveIdx: number) {
        // Mapping OPL types to Web Audio standard for performance/stability
        // 0=Sine, 1=Half, 2=Abs, 3=Pulse, 4=SinE, 5=AbsE, 6=Square, 7=Saw
        const types: OscillatorType[] = ['sine', 'sine', 'sine', 'sine', 'sine', 'sine', 'square', 'sawtooth'];
        osc.type = types[waveIdx] || 'sine';
    }

    triggerEnv(param: GainNode, op: any, peakLevel: number) {
        const now = this.ctx.currentTime;
        const attTime = 0.01 + (15 - op.att) * 0.05; // 15=fast(0.01), 0=slow
        const decTime = 0.05 + (15 - op.dec) * 0.2;
        const susLevel = (15 - op.sus) / 15; 
        const susGain = peakLevel * (op.sus / 15);

        param.gain.cancelScheduledValues(now);
        param.gain.setValueAtTime(0, now);
        param.gain.linearRampToValueAtTime(peakLevel, now + attTime); // Attack
        param.gain.linearRampToValueAtTime(susGain, now + attTime + decTime); // Decay to Sustain
    }

    stop() {
        const now = this.ctx.currentTime;
        const carP = this.params.ops[1];
        const relTime = 0.05 + (15 - carP.rel) * 0.2;
        
        this.carGain.gain.cancelScheduledValues(now);
        this.carGain.gain.setValueAtTime(this.carGain.gain.value, now);
        this.carGain.gain.exponentialRampToValueAtTime(0.001, now + relTime);
        
        this.modGain.gain.cancelScheduledValues(now);
        this.modGain.gain.setValueAtTime(this.modGain.gain.value, now);
        this.modGain.gain.exponentialRampToValueAtTime(0.001, now + relTime);

        this.car.stop(now + relTime + 0.1);
        this.mod.stop(now + relTime + 0.1);
    }
}

class OPLEngine {
    ctx: AudioContext;
    master: GainNode;
    analyser: AnalyserNode;
    eq: BiquadFilterNode;
    
    activeVoices: { [key: number]: OPLVoice } = {};
    
    currentPreset = OPL_PRESETS[0];

    constructor() {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        
        this.master = this.ctx.createGain();
        this.master.gain.value = 0.3;
        
        this.eq = this.ctx.createBiquadFilter();
        this.eq.type = 'lowpass';
        this.eq.frequency.value = 18000;

        this.analyser = this.ctx.createAnalyser();
        
        this.master.connect(this.eq);
        this.eq.connect(this.analyser);
        this.analyser.connect(this.ctx.destination);
    }

    setSystem(sys: string) {
        const now = this.ctx.currentTime;
        if (sys === 'AdLib') { this.eq.frequency.setTargetAtTime(6000, now, 0.1); }
        else if (sys === 'Genesis') { this.eq.frequency.setTargetAtTime(12000, now, 0.1); }
        else { this.eq.frequency.setTargetAtTime(20000, now, 0.1); }
    }

    noteOn(note: number) {
        if (this.ctx.state === 'suspended') this.ctx.resume();
        if (this.activeVoices[note]) this.activeVoices[note].stop();
        
        const freq = 440 * Math.pow(2, (note - 69) / 12);
        const voice = new OPLVoice(this.ctx, this.master, freq, this.currentPreset);
        this.activeVoices[note] = voice;
    }

    noteOff(note: number) {
        if (this.activeVoices[note]) {
            this.activeVoices[note].stop();
            delete this.activeVoices[note];
        }
    }

    setPreset(p: any) {
        this.currentPreset = JSON.parse(JSON.stringify(p)); // Deep copy
    }
    
    updateOpParam(opIdx: number, param: string, val: number) {
        // @ts-ignore
        this.currentPreset.ops[opIdx][param] = val;
    }
}

// --- UI COMPONENTS ---

const DOSSlider: React.FC<{ label: string; value: number; min: number; max: number; step?: number; onChange: (v: number) => void }> = ({ label, value, min, max, step=1, onChange }) => {
    return (
        <div className="flex flex-col items-center gap-1 h-full w-full">
            <input 
                type="range" 
                min={min} max={max} step={step} value={value} 
                onChange={(e) => onChange(parseFloat(e.target.value))}
                className="flex-1 appearance-none bg-[#002200] border border-[#00ff00] w-2 rounded-none outline-none slider-vertical"
                style={{ WebkitAppearance: 'slider-vertical' as any, writingMode: 'vertical-lr' }}
            />
            <div className="text-center">
                <div className="text-[7px] font-mono text-[#00ff00] leading-none mb-0.5">{label}</div>
                <div className="text-[7px] font-mono text-[#008800] bg-black px-1 leading-none">{value}</div>
            </div>
        </div>
    )
}

const Keyboard: React.FC<{ activeNotes: number[]; onNoteOn: (n: number) => void; onNoteOff: (n: number) => void }> = ({ activeNotes, onNoteOn, onNoteOff }) => {
    const keys = [];
    for(let i=48; i<=72; i++) keys.push(i);

    return (
        <div className="w-full h-full bg-[#111] flex border-t-4 border-[#004400] relative select-none">
            {keys.map(note => {
                const isBlack = [1,3,6,8,10].includes(note % 12);
                if (isBlack) return null;
                const isActive = activeNotes.includes(note);
                return (
                    <div 
                        key={note}
                        className={`flex-1 border-r border-gray-800 relative ${isActive ? 'bg-[#00ff00]' : 'bg-[#002200]'}`}
                        onMouseDown={() => onNoteOn(note)}
                        onMouseUp={() => onNoteOff(note)}
                        onMouseLeave={() => onNoteOff(note)}
                        onTouchStart={(e) => { e.preventDefault(); onNoteOn(note); }}
                        onTouchEnd={(e) => { e.preventDefault(); onNoteOff(note); }}
                    >
                        {[1,3,6,8,10].includes((note+1)%12) && (note+1 <= 72) && (
                            <div 
                                className={`absolute top-0 -right-[30%] w-[60%] h-[60%] z-10 border border-green-900 ${activeNotes.includes(note+1) ? 'bg-[#ccffcc]' : 'bg-black'}`}
                                onMouseDown={(e) => { e.stopPropagation(); onNoteOn(note+1); }}
                                onMouseUp={(e) => { e.stopPropagation(); onNoteOff(note+1); }}
                                onMouseLeave={(e) => { e.stopPropagation(); onNoteOff(note+1); }}
                                onTouchStart={(e) => { e.stopPropagation(); e.preventDefault(); onNoteOn(note+1); }}
                                onTouchEnd={(e) => { e.stopPropagation(); e.preventDefault(); onNoteOff(note+1); }}
                            ></div>
                        )}
                    </div>
                )
            })}
        </div>
    )
};

const OPL3Synth: React.FC<OPL3SynthProps> = ({ onClose }) => {
    const engine = useRef<OPLEngine | null>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const rafRef = useRef<number | null>(null);
    
    const [activeNotes, setActiveNotes] = useState<number[]>([]);
    const [system, setSystem] = useState('SB16');
    const [presetName, setPresetName] = useState(OPL_PRESETS[0].name);
    const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
    
    // Editor State
    const [showEditor, setShowEditor] = useState(false);
    const [editOp, setEditOp] = useState(0); // 0 = Modulator, 1 = Carrier
    const [opParams, setOpParams] = useState(OPL_PRESETS[0].ops[0]);

    // Sequencer State
    const [seqStep, setSeqStep] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [sequence, setSequence] = useState<(number|null)[]>(new Array(16).fill(null));
    const [seqOctave, setSeqOctave] = useState(0);

    useEffect(() => {
        engine.current = new OPLEngine();
        setAnalyser(engine.current.analyser);

        // Visualizer Loop
        const draw = (_time?: number) => {
            if (!canvasRef.current || !engine.current) return;
            const ctx = canvasRef.current.getContext('2d');
            if (!ctx) return;
            const w = canvasRef.current.width;
            const h = canvasRef.current.height;
            const bufferLen = engine.current.analyser.frequencyBinCount;
            const data = new Uint8Array(bufferLen);
            engine.current.analyser.getByteFrequencyData(data);

            ctx.fillStyle = '#001100';
            ctx.fillRect(0, 0, w, h);
            
            // Grid
            ctx.strokeStyle = '#003300';
            ctx.lineWidth = 1;
            ctx.beginPath();
            for(let i=0; i<w; i+=40) { ctx.moveTo(i,0); ctx.lineTo(i,h); }
            for(let i=0; i<h; i+=20) { ctx.moveTo(0,i); ctx.lineTo(w,i); }
            ctx.stroke();

            // Spectrum Bars
            const barW = (w / 32) - 2;
            ctx.fillStyle = '#00ff00';
            for(let i=0; i<32; i++) {
                // Average a chunk
                let sum = 0;
                for(let j=0; j<4; j++) sum += data[i*4 + j];
                const avg = sum / 4;
                const barH = (avg / 255) * h;
                const steppedH = Math.floor(barH / 8) * 8; // Retro blocky look
                
                const x = i * (w / 32) + 2;
                ctx.fillRect(x, h - steppedH, barW, steppedH);
            }
            
            rafRef.current = requestAnimationFrame(draw);
        };
        draw();

        return () => {
            if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
            engine.current?.ctx.close();
        };
    }, []);

    // Sequencer Clock
    useEffect(() => {
        if (!isPlaying) return;
        const interval = setInterval(() => {
            setSeqStep(s => {
                const next = (s + 1) % 16;
                // Trigger note
                if (sequence[next] !== null) {
                    engine.current?.noteOn(sequence[next]!);
                    setTimeout(() => engine.current?.noteOff(sequence[next]!), 200);
                }
                return next;
            });
        }, 125); // 120 BPM approx 16th notes
        return () => clearInterval(interval);
    }, [isPlaying, sequence]);

    const loadPreset = (p: any) => {
        setPresetName(p.name);
        engine.current?.setPreset(p);
        setOpParams(p.ops[editOp]); // Update editor view
    };

    const handleOpChange = (param: string, val: number) => {
        setOpParams(prev => ({ ...prev, [param]: val }));
        engine.current?.updateOpParam(editOp, param, val);
    };

    const toggleSeqNote = (step: number) => {
        const newSeq = [...sequence];
        
        // Remove existing
        if (newSeq[step] !== null) {
            newSeq[step] = null;
        } else {
            // Add Note based on Octave setting
            const baseOctave = 48 + (seqOctave * 12);
            // Simple scale: C, D#, F, G, A# (Minor Pentatonic relative)
            const scaleOffsets = [0, 3, 5, 7, 10];
            const offset = scaleOffsets[Math.floor(Math.random() * scaleOffsets.length)];
            const note = baseOctave + offset;
            
            // Clamp to midi range 0-127
            newSeq[step] = Math.max(0, Math.min(127, note));
        }
        setSequence(newSeq);
    };

    const handleNoteOn = (n: number) => {
        if (!activeNotes.includes(n)) setActiveNotes([...activeNotes, n]);
        engine.current?.noteOn(n);
    };
    const handleNoteOff = (n: number) => {
        setActiveNotes(activeNotes.filter(x => x !== n));
        engine.current?.noteOff(n);
    };

    const tabBtn = (on: boolean, label: string, fn: () => void) => (
        <button onClick={fn} style={{ flex: 1, padding: '8px 0', borderRadius: 7, cursor: 'pointer', fontFamily: '"JetBrains Mono", monospace', fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', border: `1px solid ${on ? PANEL.brass : PANEL.line}`, background: on ? PANEL.brass : '#181410', color: on ? '#1a0d04' : PANEL.inkMute }}>{label}</button>
    );

    return (
        <SynthShell name="AdLib OPL3" tag="YM3812 · 2-Op FM Emulator" onClose={onClose} accent={PANEL.phosphor}>
            <Scope analyser={analyser} mode="bars" height={80} color={PANEL.phosphor} />
            <Rocker label="Chip" options={['AdLib', 'SB16', 'Genesis', 'Tandy']} value={['AdLib', 'SB16', 'Genesis', 'Tandy'].indexOf(system)} onChange={(i) => { const s = ['AdLib', 'SB16', 'Genesis', 'Tandy'][i]; setSystem(s); engine.current?.setSystem(s); }} />

            <Engrave>Patch · .INS</Engrave>
            <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4 }}>
                {OPL_PRESETS.map((pr, i) => (
                    <button key={i} onClick={() => loadPreset(pr)} style={{ flex: '0 0 auto', padding: '8px 12px', borderRadius: 7, cursor: 'pointer', fontFamily: '"JetBrains Mono", monospace', fontSize: 10, letterSpacing: 0.5, textTransform: 'uppercase', whiteSpace: 'nowrap', border: `1px solid ${presetName === pr.name ? PANEL.brass : PANEL.line}`, background: presetName === pr.name ? PANEL.brass : '#181410', color: presetName === pr.name ? '#1a0d04' : PANEL.inkMute }}>{pr.name}</button>
                ))}
            </div>

            <div style={{ display: 'flex', gap: 6 }}>
                {tabBtn(showEditor, 'Operators', () => setShowEditor(true))}
                {tabBtn(!showEditor, 'Sequencer', () => setShowEditor(false))}
            </div>

            {showEditor ? (
                <>
                    <Rocker options={['Op 1 · Mod', 'Op 2 · Car']} value={editOp} onChange={(i) => { setEditOp(i); setOpParams(engine.current?.currentPreset.ops[i]); }} />
                    <KnobRow>
                        <Knob label="Mult" value={opParams.mult} min={0} max={15} step={0.5} onChange={(v) => handleOpChange('mult', v)} size={50} />
                        <Knob label="Level" value={opParams.tl} min={0} max={63} step={1} onChange={(v) => handleOpChange('tl', v)} size={50} />
                        <Knob label="Attack" value={opParams.att} min={0} max={15} step={1} onChange={(v) => handleOpChange('att', v)} size={50} />
                        <Knob label="Decay" value={opParams.dec} min={0} max={15} step={1} onChange={(v) => handleOpChange('dec', v)} size={50} />
                        <Knob label="Sustain" value={opParams.sus} min={0} max={15} step={1} onChange={(v) => handleOpChange('sus', v)} size={50} />
                        <Knob label="Release" value={opParams.rel} min={0} max={15} step={1} onChange={(v) => handleOpChange('rel', v)} size={50} />
                        <Knob label="Wave" value={opParams.wave} min={0} max={7} step={1} onChange={(v) => handleOpChange('wave', v)} size={50} />
                        <Knob label="Feedbk" value={opParams.fb} min={0} max={7} step={1} onChange={(v) => handleOpChange('fb', v)} size={50} />
                    </KnobRow>
                </>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                            {[-2, -1, 0, 1, 2, 3, 4].map((oct) => (
                                <button key={oct} onClick={() => setSeqOctave(oct)} style={{ padding: '5px 8px', borderRadius: 6, cursor: 'pointer', fontFamily: '"JetBrains Mono", monospace', fontSize: 9, border: `1px solid ${seqOctave === oct ? PANEL.brass : PANEL.line}`, background: seqOctave === oct ? PANEL.brass : '#181410', color: seqOctave === oct ? '#1a0d04' : PANEL.inkMute }}>{oct > 0 ? `+${oct}` : oct}</button>
                            ))}
                        </div>
                        <button onClick={() => setIsPlaying(!isPlaying)} style={{ padding: '7px 16px', borderRadius: 999, cursor: 'pointer', fontFamily: '"DM Serif Display", serif', fontSize: 14, letterSpacing: 1, border: 'none', background: isPlaying ? '#7a1d10' : PANEL.brass, color: isPlaying ? '#f0d57f' : '#1a0d04' }}>{isPlaying ? '■' : '▶'}</button>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 4 }}>
                        {sequence.map((n, i) => (
                            <button key={i} onClick={() => toggleSeqNote(i)} style={{ aspectRatio: '1', borderRadius: 6, cursor: 'pointer', fontFamily: '"JetBrains Mono", monospace', fontSize: 9,
                                border: `1px solid ${i === seqStep ? PANEL.phosphor : PANEL.line}`,
                                background: n !== null ? 'rgba(202,160,82,0.25)' : '#100c08', color: n !== null ? PANEL.ink : PANEL.inkMute,
                                boxShadow: i === seqStep ? `0 0 8px ${PANEL.phosphor}66` : 'none' }}>{n !== null ? getNoteName(n) : i + 1}</button>
                        ))}
                    </div>
                </div>
            )}

            <Engrave>Keyboard · {activeNotes.length} voice</Engrave>
            <Keys octaves={2} startMidi={48} activeNotes={activeNotes} onNoteOn={handleNoteOn} onNoteOff={handleNoteOff} />
        </SynthShell>
    );
};

export default OPL3Synth;
