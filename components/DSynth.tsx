
import React, { useState, useEffect, useRef } from 'react';
import { SynthShell, Knob, KnobRow, Keys, Rocker, Engrave, PANEL } from './synthkit';

interface DSynthProps {
  onClose: () => void;
}

// --- TYPES & CONSTANTS ---
type Waveform = 'sine' | 'triangle' | 'sawtooth' | 'square' | 'pulse-narrow' | 'pulse-wide';
type Range = 'LO' | '32' | '16' | '8' | '4' | '2';

const RANGES: Range[] = ['LO', '32', '16', '8', '4', '2'];
// Web Audio doesn't support all custom waves natively without periodic wave, 
// mapping closest approximations for the demo:
// 'pulse-narrow' -> high freq square, 'pulse-wide' -> square
const WAVE_MAP: Record<string, OscillatorType> = {
    'triangle': 'triangle',
    'tri-saw': 'sawtooth', // hybrid sim
    'sawtooth': 'sawtooth',
    'square': 'square',
    'pulse-narrow': 'square',
    'pulse-wide': 'square'
};

const PRESETS = [
    { name: "Geddy Bass", settings: { cutoff: 600, res: 4, vco1: 2, vco2: 2, vco3: 2, vco1Wave: 2, vco2Wave: 2, vco3Wave: 2, attack: 0.05, decay: 0.2, sustain: 0.8 } },
    { name: "Lucky Lead", settings: { cutoff: 2500, res: 2, vco1: 3, vco2: 3, vco3: 4, vco1Wave: 3, vco2Wave: 3, vco3Wave: 3, attack: 0.1, decay: 0.1, sustain: 1.0, glide: 0.2 } },
    { name: "Taurus Low", settings: { cutoff: 200, res: 0, vco1: 1, vco2: 1, vco3: 1, vco1Wave: 1, vco2Wave: 1, vco3Wave: 1, attack: 0.5, decay: 1.0, sustain: 1.0 } },
    { name: "Space noise", settings: { cutoff: 8000, res: 15, noise: 1, vco1Vol: 0, vco2Vol: 0, vco3Vol: 0, lfoRate: 15, modMix: 1 } },
];

// --- AUDIO ENGINE ---
class MiniMoogEngine {
    ctx: AudioContext;
    masterGain: GainNode;
    
    // Modules
    vco1: OscillatorNode;
    vco2: OscillatorNode;
    vco3: OscillatorNode;
    noise: AudioBufferSourceNode | null = null;
    noiseGain: GainNode;
    
    mixer1: GainNode;
    mixer2: GainNode;
    mixer3: GainNode;
    noiseMixer: GainNode;
    
    filter: BiquadFilterNode;
    filterEnvAmt: number = 0.5; // Controls how much envelope affects cutoff
    
    vca: GainNode;
    
    // Params
    glideTime: number = 0;
    lastNoteFreq: number = 0;
    
    // Ranges (Indices 0-5 mapping to LO, 32, 16, 8, 4, 2)
    // 8' is considered standard pitch (index 3)
    vcoRanges: number[] = [3, 3, 3]; 

    // Envelopes
    envFilter = { a: 0.1, d: 0.5, s: 0.5 };
    envAmp = { a: 0.05, d: 0.2, s: 0.8 };

    // State
    activeOscs: boolean = false;

    constructor() {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.value = 0.3;
        this.masterGain.connect(this.ctx.destination);

        this.vca = this.ctx.createGain();
        this.vca.gain.value = 0;
        this.vca.connect(this.masterGain);

        // Filter (4-pole ladder sim via biquad lowpass with steep roll-off logic usually, 
        // using single LP here for perf but Q pushed high)
        this.filter = this.ctx.createBiquadFilter();
        this.filter.type = 'lowpass';
        this.filter.frequency.value = 1000;
        this.filter.Q.value = 1;
        this.filter.connect(this.vca);

        // Mixers
        this.mixer1 = this.ctx.createGain();
        this.mixer2 = this.ctx.createGain();
        this.mixer3 = this.ctx.createGain();
        this.noiseMixer = this.ctx.createGain();
        
        this.mixer1.connect(this.filter);
        this.mixer2.connect(this.filter);
        this.mixer3.connect(this.filter);
        this.noiseMixer.connect(this.filter);

        // VCOs
        this.vco1 = this.ctx.createOscillator();
        this.vco2 = this.ctx.createOscillator();
        this.vco3 = this.ctx.createOscillator();
        
        this.vco1.start();
        this.vco2.start();
        this.vco3.start();
        
        this.vco1.connect(this.mixer1);
        this.vco2.connect(this.mixer2);
        this.vco3.connect(this.mixer3);
        
        // Initial Defaults
        this.mixer1.gain.value = 0.7;
        this.mixer2.gain.value = 0.7;
        this.mixer3.gain.value = 0;
        this.noiseMixer.gain.value = 0;
    }

    setParam(target: string, val: number) {
        const now = this.ctx.currentTime;
        
        if (target === 'cutoff') this.filter.frequency.setTargetAtTime(val, now, 0.1);
        if (target === 'res') this.filter.Q.setTargetAtTime(val, now, 0.1);
        if (target === 'filterEnvAmt') this.filterEnvAmt = val / 10; // Normalized 0-1
        
        if (target === 'glide') this.glideTime = val;
        
        // ENV
        if (target === 'attF') this.envFilter.a = val;
        if (target === 'decF') this.envFilter.d = val;
        if (target === 'susF') this.envFilter.s = val;
        
        if (target === 'attA') this.envAmp.a = val;
        if (target === 'decA') this.envAmp.d = val;
        if (target === 'susA') this.envAmp.s = val;

        // OSC Mix
        if (target === 'vco1Vol') this.mixer1.gain.setTargetAtTime(val, now, 0.05);
        if (target === 'vco2Vol') this.mixer2.gain.setTargetAtTime(val, now, 0.05);
        if (target === 'vco3Vol') this.mixer3.gain.setTargetAtTime(val, now, 0.05);
        
        // Tuning / Detune
        if (target === 'vco2Detune') this.vco2.detune.value = val * 100; // val is semi?
        if (target === 'vco3Detune') this.vco3.detune.value = val * 100;
    }

    setRange(oscIdx: number, rangeIdx: number) {
        // rangeIdx: 0=LO, 1=32, 2=16, 3=8(std), 4=4, 5=2
        if (oscIdx >= 1 && oscIdx <= 3) {
            this.vcoRanges[oscIdx - 1] = rangeIdx;
        }
    }

    setWaveform(oscIdx: number, typeIdx: number) {
        const types: OscillatorType[] = ['triangle', 'sawtooth', 'sawtooth', 'square', 'square', 'square'];
        const type = types[typeIdx] || 'sawtooth';
        
        if (oscIdx === 1) this.vco1.type = type;
        if (oscIdx === 2) this.vco2.type = type;
        if (oscIdx === 3) this.vco3.type = type;
    }

    noteOn(midiNote: number) {
        if (this.ctx.state === 'suspended') this.ctx.resume();
        const now = this.ctx.currentTime;
        const baseFreq = 440 * Math.pow(2, (midiNote - 69) / 12);

        // Calculate frequency with Octave Offset based on Range
        // Index 3 (8') is standard. 
        // 4' (Index 4) is +1 Octave. 
        // 32' (Index 1) is -2 Octave.
        // LO (Index 0) is -3 Octave or LFO mode
        
        const getFreq = (rangeIdx: number) => {
            const shift = rangeIdx - 3; 
            return baseFreq * Math.pow(2, shift);
        };

        const f1 = getFreq(this.vcoRanges[0]);
        const f2 = getFreq(this.vcoRanges[1]);
        const f3 = getFreq(this.vcoRanges[2]);

        // Glide Logic
        if (this.lastNoteFreq > 0 && this.glideTime > 0) {
            this.vco1.frequency.cancelScheduledValues(now);
            this.vco1.frequency.setValueAtTime(this.vco1.frequency.value, now);
            this.vco1.frequency.exponentialRampToValueAtTime(f1, now + this.glideTime);
            
            this.vco2.frequency.cancelScheduledValues(now);
            this.vco2.frequency.setValueAtTime(this.vco2.frequency.value, now);
            this.vco2.frequency.exponentialRampToValueAtTime(f2, now + this.glideTime);
            
            this.vco3.frequency.cancelScheduledValues(now);
            this.vco3.frequency.setValueAtTime(this.vco3.frequency.value, now);
            this.vco3.frequency.exponentialRampToValueAtTime(f3, now + this.glideTime);
        } else {
            this.vco1.frequency.setValueAtTime(f1, now);
            this.vco2.frequency.setValueAtTime(f2, now);
            this.vco3.frequency.setValueAtTime(f3, now);
        }
        
        this.lastNoteFreq = baseFreq; // Store base freq for glide reference? Or current

        // VCA Envelope (Loudness)
        this.vca.gain.cancelScheduledValues(now);
        this.vca.gain.setValueAtTime(this.vca.gain.value, now);
        this.vca.gain.linearRampToValueAtTime(1.0, now + this.envAmp.a);
        this.vca.gain.linearRampToValueAtTime(this.envAmp.s, now + this.envAmp.a + this.envAmp.d);

        // Filter Envelope
        const startCutoff = this.filter.frequency.value;
        // Amount determines how much envelope adds to cutoff
        const peakCutoff = Math.min(20000, startCutoff + (10000 * this.filterEnvAmt)); 
        
        this.filter.frequency.cancelScheduledValues(now);
        this.filter.frequency.setValueAtTime(startCutoff, now);
        this.filter.frequency.linearRampToValueAtTime(peakCutoff, now + this.envFilter.a);
        this.filter.frequency.linearRampToValueAtTime(startCutoff, now + this.envFilter.a + this.envFilter.d);
    }

    noteOff() {
        const now = this.ctx.currentTime;
        this.vca.gain.cancelScheduledValues(now);
        this.vca.gain.setValueAtTime(this.vca.gain.value, now);
        this.vca.gain.exponentialRampToValueAtTime(0.001, now + 0.2); // Short release
    }
}

// --- UI COMPONENTS ---

const RockerSwitch: React.FC<{ label: string; options: string[]; value: number; onChange: (i: number) => void }> = ({ label, options, value, onChange }) => (
    <div className="flex flex-col items-center gap-1">
        <div className="bg-[#111] p-1 rounded border border-gray-600 shadow-inner">
            <div className="flex flex-col gap-1 bg-black p-1 rounded">
                {options.map((opt, i) => (
                    <button 
                        key={i}
                        onClick={() => onChange(i)}
                        className={`w-8 h-4 text-[8px] font-bold rounded-sm transition-all ${value === i ? 'bg-blue-200 text-black shadow-[0_0_5px_white]' : 'bg-[#333] text-gray-500'}`}
                    >
                        {opt}
                    </button>
                ))}
            </div>
        </div>
        <span className="text-[8px] uppercase font-bold text-gray-300">{label}</span>
    </div>
);

const MoogKnob: React.FC<{ 
    label: string; value: number; min: number; max: number; onChange: (v: number) => void; size?: 'lg'|'md'|'sm' 
}> = ({ label, value, min, max, onChange, size = 'md' }) => {
    const [dragging, setDragging] = useState(false);
    const startY = useRef(0);
    const startVal = useRef(0);

    const handleDown = (e: React.MouseEvent | React.TouchEvent) => {
        setDragging(true);
        startY.current = 'touches' in e ? e.touches[0].clientY : e.clientY;
        startVal.current = value;
    };

    useEffect(() => {
        const handleMove = (e: MouseEvent | TouchEvent) => {
            if (!dragging) return;
            const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
            const delta = startY.current - clientY;
            const range = max - min;
            let newVal = Math.min(max, Math.max(min, startVal.current + (delta / 200) * range));
            onChange(newVal);
        };
        const handleUp = () => setDragging(false);

        if (dragging) {
            window.addEventListener('mousemove', handleMove);
            window.addEventListener('touchmove', handleMove, { passive: false });
            window.addEventListener('mouseup', handleUp);
            window.addEventListener('touchend', handleUp);
        }
        return () => {
            window.removeEventListener('mousemove', handleMove);
            window.removeEventListener('touchmove', handleMove);
            window.removeEventListener('mouseup', handleUp);
            window.removeEventListener('touchend', handleUp);
        };
    }, [dragging, min, max, onChange]);

    const percent = (value - min) / (max - min);
    const rotation = -135 + (percent * 270);
    const sizeClass = size === 'lg' ? 'w-16 h-16' : (size === 'sm' ? 'w-10 h-10' : 'w-12 h-12');

    return (
        <div className="flex flex-col items-center group cursor-ns-resize" onMouseDown={handleDown} onTouchStart={handleDown}>
            <div className={`${sizeClass} rounded-full bg-black border-2 border-gray-600 relative shadow-xl`} style={{ transform: `rotate(${rotation}deg)` }}>
                {/* Silver Cap */}
                <div className="absolute inset-2 rounded-full bg-gradient-to-br from-gray-300 to-gray-500 border border-gray-600"></div>
                {/* Indicator Line */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1 h-1/2 bg-white rounded-full z-10 shadow-md"></div>
            </div>
            <span className="text-[9px] font-bold text-gray-300 uppercase mt-1 tracking-wider bg-black/50 px-1 rounded">{label}</span>
        </div>
    );
};

const Keyboard: React.FC<{ activeNotes: number[]; onNoteOn: (n: number) => void; onNoteOff: (n: number) => void }> = ({ activeNotes, onNoteOn, onNoteOff }) => {
    // 44 Keys F0 (17) to C4 (52) approx? Or Standard F to C range
    const keys = [];
    for(let i=29; i<=53; i++) keys.push(i); 
    
    return (
        <div className="w-full h-32 bg-[#1a1a1a] flex border-t-8 border-[#3E2723] rounded-b-xl overflow-hidden relative shadow-inner">
            {keys.map(note => {
                const isBlack = [1,3,6,8,10].includes(note % 12);
                if (isBlack) return null;
                const isActive = activeNotes.includes(note);
                return (
                    <div 
                        key={note}
                        className={`flex-1 border-r border-gray-400 bg-white rounded-b-md relative active:bg-gray-200 ${isActive ? 'bg-yellow-100' : ''}`}
                        onMouseDown={() => onNoteOn(note)}
                        onMouseUp={() => onNoteOff(note)}
                        onMouseLeave={() => onNoteOff(note)}
                        onTouchStart={(e) => { e.preventDefault(); onNoteOn(note); }}
                        onTouchEnd={(e) => { e.preventDefault(); onNoteOff(note); }}
                    >
                        {/* Black Key */}
                        {[1,3,6,8,10].includes((note+1)%12) && (note+1 <= 53) && (
                            <div 
                                className={`absolute top-0 -right-[30%] w-[60%] h-[60%] bg-black z-10 border border-gray-800 rounded-b-sm ${activeNotes.includes(note+1) ? 'bg-gray-800 scale-y-95' : ''}`}
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

const DSynth: React.FC<DSynthProps> = ({ onClose }) => {
    const engine = useRef<MiniMoogEngine | null>(null);
    const [activeNotes, setActiveNotes] = useState<number[]>([]);
    const [isHold, setIsHold] = useState(false);

    // Controlled knob state (mirrors engine)
    const [cutoff, setCutoff] = useState(1000);
    const [emphasis, setEmphasis] = useState(0);
    const [glide, setGlide] = useState(0);
    const [contourAmt, setContourAmt] = useState(5);
    const [range1, setRange1] = useState(3);
    const [range2, setRange2] = useState(3);
    const [range3, setRange3] = useState(3);
    const [wave1, setWave1] = useState(1);
    const [wave2, setWave2] = useState(1);
    const [wave3, setWave3] = useState(1);
    const [vol1, setVol1] = useState(7);
    const [vol2, setVol2] = useState(5);
    const [vol3, setVol3] = useState(0);
    const [det2, setDet2] = useState(0);
    const [det3, setDet3] = useState(0);
    const [attA, setAttA] = useState(0.1);
    const [decA, setDecA] = useState(0.5);
    const [susA, setSusA] = useState(0.8);
    const [attF, setAttF] = useState(0.2);
    const [decF, setDecF] = useState(0.5);
    const [susF, setSusF] = useState(0.5);

    useEffect(() => {
        engine.current = new MiniMoogEngine();
        return () => { engine.current?.ctx.close(); };
    }, []);

    const set = (param: string, val: number) => engine.current?.setParam(param, val);

    const handleNoteOn = (note: number) => {
        if (!engine.current) return;
        if (!activeNotes.includes(note)) {
            setActiveNotes([...activeNotes, note]);
            engine.current.noteOn(note);
        }
    };
    const handleNoteOff = (note: number) => {
        if (isHold) return;
        const left = activeNotes.filter(n => n !== note);
        setActiveNotes(left);
        if (left.length > 0) engine.current?.noteOn(left[left.length - 1]);
        else engine.current?.noteOff();
    };

    const OscControls = (n: number, range: number, setRange: (i: number) => void, wave: number, setWave: (i: number) => void,
        vol: number, setVol: (v: number) => void, det?: number, setDet?: (v: number) => void) => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 10, borderRadius: 8, background: 'rgba(0,0,0,0.2)', boxShadow: `inset 0 0 0 1px ${PANEL.line}` }}>
            <Engrave>Oscillator {n}</Engrave>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
                <Rocker label="Range" options={RANGES} value={range} onChange={(i) => { setRange(i); engine.current?.setRange(n, i); }} />
                <Rocker label="Wave" options={['Tri', 'Saw', 'Sqr']} value={wave} onChange={(i) => { setWave(i); engine.current?.setWaveform(n, i); }} />
                <Knob label="Vol" value={vol} min={0} max={10} step={1} onChange={(v) => { setVol(v); set(`vco${n}Vol`, v / 10); }} size={52} />
                {setDet && <Knob label="Detune" value={det!} min={-7} max={7} step={1} onChange={(v) => { setDet(v); set(`vco${n}Detune`, v); }} size={52} />}
            </div>
        </div>
    );

    return (
        <SynthShell name="Minimoog D" tag="3-VCO · Ladder Filter" onClose={onClose} accent={PANEL.brass}>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                <button onClick={() => setIsHold(!isHold)} style={{
                    padding: '7px 14px', borderRadius: 999, cursor: 'pointer', fontFamily: '"JetBrains Mono", monospace', fontSize: 10, letterSpacing: 1,
                    border: `1px solid ${isHold ? PANEL.brass : PANEL.line}`, background: isHold ? PANEL.brass : 'transparent', color: isHold ? '#1a0d04' : PANEL.inkMute,
                }}>HOLD</button>
                {PRESETS.slice(0, 4).map((pr, i) => (
                    <button key={i} onClick={() => { const c = pr.settings.cutoff || 1000; setCutoff(c); set('cutoff', c); const r = pr.settings.res || 0; setEmphasis(r); set('res', r); }}
                        style={{ padding: '7px 10px', borderRadius: 8, cursor: 'pointer', fontFamily: '"JetBrains Mono", monospace', fontSize: 9, letterSpacing: 0.5, textTransform: 'uppercase', border: `1px solid ${PANEL.line}`, background: '#181410', color: PANEL.inkMute }}>{pr.name}</button>
                ))}
            </div>

            {OscControls(1, range1, setRange1, wave1, setWave1, vol1, setVol1)}
            {OscControls(2, range2, setRange2, wave2, setWave2, vol2, setVol2, det2, setDet2)}
            {OscControls(3, range3, setRange3, wave3, setWave3, vol3, setVol3, det3, setDet3)}

            <Engrave>Filter</Engrave>
            <KnobRow>
                <Knob label="Cutoff" value={cutoff} min={50} max={12000} log onChange={(v) => { setCutoff(v); set('cutoff', v); }} format={(v) => `${Math.round(v)}`} size={70} />
                <Knob label="Emphasis" value={emphasis} min={0} max={20} onChange={(v) => { setEmphasis(v); set('res', v); }} size={70} />
                <Knob label="Contour" value={contourAmt} min={0} max={10} onChange={(v) => { setContourAmt(v); set('filterEnvAmt', v); }} />
                <Knob label="Glide" value={glide} min={0} max={1} step={0.01} onChange={(v) => { setGlide(v); set('glide', v); }} />
            </KnobRow>

            <Engrave>Loudness Envelope</Engrave>
            <KnobRow>
                <Knob label="Attack" value={attA} min={0.01} max={5} step={0.01} onChange={(v) => { setAttA(v); set('attA', v); }} format={(v) => `${v.toFixed(2)}s`} />
                <Knob label="Decay" value={decA} min={0.1} max={5} step={0.01} onChange={(v) => { setDecA(v); set('decA', v); }} format={(v) => `${v.toFixed(2)}s`} />
                <Knob label="Sustain" value={susA} min={0} max={1} step={0.01} onChange={(v) => { setSusA(v); set('susA', v); }} />
            </KnobRow>

            <Engrave>Filter Envelope</Engrave>
            <KnobRow>
                <Knob label="Attack" value={attF} min={0.01} max={5} step={0.01} onChange={(v) => { setAttF(v); set('attF', v); }} format={(v) => `${v.toFixed(2)}s`} />
                <Knob label="Decay" value={decF} min={0.1} max={5} step={0.01} onChange={(v) => { setDecF(v); set('decF', v); }} format={(v) => `${v.toFixed(2)}s`} />
                <Knob label="Sustain" value={susF} min={0} max={1} step={0.01} onChange={(v) => { setSusF(v); set('susF', v); }} />
            </KnobRow>

            <Engrave>Keyboard</Engrave>
            <Keys octaves={2} startMidi={48} activeNotes={activeNotes} onNoteOn={handleNoteOn} onNoteOff={handleNoteOff} />
        </SynthShell>
    );
};

export default DSynth;
