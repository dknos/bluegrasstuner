
import React, { useState, useEffect, useRef, useCallback } from 'react';

interface MatriarchSynthProps {
  onClose: () => void;
}

// --- CONSTANTS ---
const NOTES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

// --- TYPES ---
type Waveform = 'sine' | 'square' | 'sawtooth' | 'triangle';
const WAVEFORMS: Waveform[] = ['triangle', 'sawtooth', 'square', 'sine'];

// --- AUDIO ENGINE ---
class MatriarchEngine {
    ctx: AudioContext;
    masterGain: GainNode;
    
    // Oscillators (4 Voice Paraphony)
    oscs: OscillatorNode[] = [];
    oscGains: GainNode[] = [];
    
    // Filter (Stereo Ladder Sim)
    filterL: BiquadFilterNode;
    filterR: BiquadFilterNode;
    
    // VCA
    vca: GainNode;
    
    // Delay
    delayL: DelayNode;
    delayR: DelayNode;
    delayFeedback: GainNode;
    delayWet: GainNode;

    // Mod
    lfo: OscillatorNode;
    lfoGain: GainNode;

    // Params
    vco1Octave: number = 2;
    vco1Wave: Waveform = 'sawtooth';
    vco2Freq: number = 0; // Semitones
    vco2Wave: Waveform = 'triangle';

    constructor() {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        
        // Master
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.value = 0.4;
        this.masterGain.connect(this.ctx.destination);

        // Delay Chain (Stereo Ping Pong-ish)
        this.delayL = this.ctx.createDelay();
        this.delayR = this.ctx.createDelay();
        this.delayFeedback = this.ctx.createGain();
        this.delayWet = this.ctx.createGain();
        
        this.delayL.delayTime.value = 0.3;
        this.delayR.delayTime.value = 0.31; // Slight offset for stereo
        this.delayFeedback.gain.value = 0.4;
        this.delayWet.gain.value = 0;

        // VCA -> Delay
        this.vca = this.ctx.createGain();
        this.vca.gain.value = 0;

        // Filters (24dB sim = 2x 12dB Biquad per channel? Or just 1 LP for simplicity but doubled for stereo)
        this.filterL = this.ctx.createBiquadFilter();
        this.filterR = this.ctx.createBiquadFilter();
        this.filterL.type = "lowpass";
        this.filterR.type = "lowpass";
        this.filterL.frequency.value = 2000;
        this.filterR.frequency.value = 2000;

        // Routing: Oscs -> Filters -> VCA -> Master & Delay
        this.filterL.connect(this.vca);
        this.filterR.connect(this.vca);
        
        this.vca.connect(this.masterGain);
        this.vca.connect(this.delayL);
        
        this.delayL.connect(this.delayR); // Series/PingPong rough sim
        this.delayR.connect(this.delayFeedback);
        this.delayFeedback.connect(this.delayL);
        
        this.delayL.connect(this.delayWet);
        this.delayR.connect(this.delayWet);
        this.delayWet.connect(this.masterGain);

        // LFO
        this.lfo = this.ctx.createOscillator();
        this.lfo.frequency.value = 2;
        this.lfoGain = this.ctx.createGain();
        this.lfoGain.gain.value = 0; // Depth
        this.lfo.connect(this.lfoGain);
        this.lfo.start();

        // Initialize 4 Oscs
        for(let i=0; i<4; i++) {
            const osc = this.ctx.createOscillator();
            const g = this.ctx.createGain();
            osc.start();
            osc.connect(g);
            // Split to stereo filters
            g.connect(this.filterL);
            g.connect(this.filterR);
            
            // Initial silence
            g.gain.value = 0;
            
            this.oscs.push(osc);
            this.oscGains.push(g);
        }
    }

    setParam(module: string, param: string, value: any) {
        const now = this.ctx.currentTime;
        if (module === 'filter') {
            if (param === 'cutoff') {
                this.filterL.frequency.setTargetAtTime(value, now, 0.1);
                this.filterR.frequency.setTargetAtTime(value, now, 0.1);
            }
            if (param === 'res') {
                this.filterL.Q.setTargetAtTime(value, now, 0.1);
                this.filterR.Q.setTargetAtTime(value, now, 0.1);
            }
        }
        if (module === 'delay') {
            if (param === 'time') {
                this.delayL.delayTime.setTargetAtTime(value, now, 0.5);
                this.delayR.delayTime.setTargetAtTime(value + 0.01, now, 0.5);
            }
            if (param === 'mix') {
                this.delayWet.gain.setTargetAtTime(value, now, 0.1);
            }
            if (param === 'feedback') {
                this.delayFeedback.gain.setTargetAtTime(value, now, 0.1);
            }
        }
        if (module === 'lfo') {
            if (param === 'rate') this.lfo.frequency.setTargetAtTime(value, now, 0.1);
            if (param === 'depth') this.lfoGain.gain.setTargetAtTime(value * 1000, now, 0.1);
        }
        if (module === 'osc') {
            if (param === 'vco1Octave') this.vco1Octave = value;
            if (param === 'vco1Wave') {
                this.vco1Wave = WAVEFORMS[value];
                // Update Osc 1 and 2 (as pair 1) type
                this.oscs[0].type = this.vco1Wave;
                if(this.oscs[1]) this.oscs[1].type = this.vco1Wave;
            }
            if (param === 'vco2Freq') this.vco2Freq = value;
            if (param === 'vco2Wave') {
                this.vco2Wave = WAVEFORMS[value];
                // Update Osc 3 and 4 (as pair 2) type
                if(this.oscs[2]) this.oscs[2].type = this.vco2Wave;
                if(this.oscs[3]) this.oscs[3].type = this.vco2Wave;
            }
        }
    }

    // Paraphonic Trigger
    trigger(notes: number[]) {
        const now = this.ctx.currentTime;
        const count = notes.length;
        
        if (count === 0) {
            this.vca.gain.setTargetAtTime(0, now, 0.2);
            return;
        }

        // Attack Envelope
        this.vca.gain.cancelScheduledValues(now);
        this.vca.gain.setValueAtTime(this.vca.gain.value, now);
        this.vca.gain.linearRampToValueAtTime(1.0, now + 0.05);

        this.oscs.forEach((osc, i) => {
            // Determine which note this osc plays
            const noteIndex = i % count; 
            const midiNote = notes[noteIndex];
            
            // Calculate Frequency based on MIDI note + Octave Offset + Detune
            let baseFreq = 440 * Math.pow(2, (midiNote - 69) / 12);
            
            // Apply Octave shift (Relative to "2" being standard)
            // VCO 1 controls Osc 0 and 1
            // VCO 2 controls Osc 2 and 3
            
            let octaveMult = 1;
            let semitoneOffset = 0;

            if (i < 2) {
                // VCO 1 Logic
                octaveMult = Math.pow(2, this.vco1Octave - 2); 
            } else {
                // VCO 2 Logic
                octaveMult = Math.pow(2, this.vco1Octave - 2); // Base octave matches VCO1
                semitoneOffset = this.vco2Freq; // Plus detune
            }

            // Apply offsets
            const finalFreq = baseFreq * octaveMult * Math.pow(2, semitoneOffset/12);
            
            // Unison spread if mono
            let detune = 0;
            if (count === 1) detune = (i - 1.5) * 8; 
            
            osc.frequency.setTargetAtTime(finalFreq, now, 0.05);
            osc.detune.setTargetAtTime(detune, now, 0.05);
            
            // Open gate for this osc
            this.oscGains[i].gain.setTargetAtTime(0.25, now, 0.02);
        });
    }

    release() {
        const now = this.ctx.currentTime;
        this.vca.gain.setTargetAtTime(0, now, 0.5); // Release
    }
}

// --- KNOB COMPONENT ---
const Knob: React.FC<{ 
    label: string; 
    value: number; 
    min: number; 
    max: number; 
    step?: number;
    onChange: (v: number) => void;
    color?: string;
    displayValue?: string | number;
}> = ({ label, value, min, max, step = 1, onChange, color = "border-gray-400", displayValue }) => {
    const [dragging, setDragging] = useState(false);
    const startY = useRef(0);
    const startVal = useRef(0);

    const handleDown = (e: React.MouseEvent | React.TouchEvent) => {
        setDragging(true);
        startY.current = 'touches' in e ? e.touches[0].clientY : e.clientY;
        startVal.current = value;
        e.preventDefault();
    };

    useEffect(() => {
        const handleMove = (e: MouseEvent | TouchEvent) => {
            if (!dragging) return;
            const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
            const delta = startY.current - clientY;
            const range = max - min;
            // Sensitivity
            let rawVal = Math.min(max, Math.max(min, startVal.current + (delta / 200) * range));
            
            // Snap to step
            if (step) {
                rawVal = Math.round(rawVal / step) * step;
            }
            
            onChange(rawVal);
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
    }, [dragging, min, max, step, onChange]);

    // Calculate rotation: -135deg to +135deg
    const percent = (value - min) / (max - min);
    const rotation = -135 + (percent * 270);

    return (
        <div className="flex flex-col items-center gap-1 select-none group relative" onMouseDown={handleDown} onTouchStart={handleDown}>
            <div className={`w-12 h-12 rounded-full border-2 ${color} bg-gray-800 relative shadow-xl transform transition-transform cursor-ns-resize`} style={{ transform: `rotate(${rotation}deg)` }}>
                <div className="absolute top-1 left-1/2 -translate-x-1/2 w-1 h-3 bg-white rounded-full shadow-[0_0_5px_white]"></div>
            </div>
            <div className="text-[9px] font-bold uppercase text-gray-400 tracking-wider text-center">{label}</div>
            {dragging && (
                <div className="absolute -top-8 bg-black border border-gray-600 text-white text-xs px-2 py-1 rounded z-50 pointer-events-none">
                    {displayValue !== undefined ? displayValue : value.toFixed(step < 1 ? 2 : 0)}
                </div>
            )}
        </div>
    );
};

// --- KEYBOARD COMPONENT ---
const SynthKeyboard: React.FC<{ 
    activeNotes: number[], 
    onNoteOn: (n: number) => void, 
    onNoteOff: (n: number) => void 
}> = ({ activeNotes, onNoteOn, onNoteOff }) => {
    // 25 Keys C3 (48) to C5 (72)
    const keys = [];
    for(let i=48; i<=72; i++) keys.push(i);

    return (
        <div className="flex w-full h-32 md:h-40 bg-[#111] relative overflow-hidden rounded-b-xl border-t-4 border-[#8B4513]">
            {keys.map(note => {
                const isBlack = [1,3,6,8,10].includes(note % 12);
                if (isBlack) return null; // Render blacks over whites
                
                // White Key
                const isActive = activeNotes.includes(note);
                return (
                    <div 
                        key={note} 
                        className={`flex-1 border-r border-gray-300 rounded-b-md relative active:bg-gray-300 transition-colors ${isActive ? 'bg-yellow-100 shadow-[inset_0_-10px_20px_rgba(255,200,0,0.5)]' : 'bg-white'}`}
                        onMouseDown={() => onNoteOn(note)}
                        onMouseUp={() => onNoteOff(note)}
                        onMouseLeave={() => onNoteOff(note)}
                        onTouchStart={(e) => { e.preventDefault(); onNoteOn(note); }}
                        onTouchEnd={(e) => { e.preventDefault(); onNoteOff(note); }}
                    >
                        {/* Black Key Logic */}
                        {[1,3,6,8,10].includes((note+1)%12) && (note+1 <= 72) && (
                            <div 
                                className={`absolute top-0 -right-[30%] w-[60%] h-[60%] z-10 border border-black rounded-b-sm shadow-md ${activeNotes.includes(note+1) ? 'bg-gray-700' : 'bg-black'}`}
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

// --- MAIN COMPONENT ---
const MatriarchSynth: React.FC<MatriarchSynthProps> = ({ onClose }) => {
    const engine = useRef<MatriarchEngine | null>(null);
    const [activeNotes, setActiveNotes] = useState<number[]>([]);
    const [arpMode, setArpMode] = useState(false);
    const [patchMode, setPatchMode] = useState(false);
    const [isHold, setIsHold] = useState(false);
    
    // Filter Params
    const [cutoff, setCutoff] = useState(2000);
    const [res, setRes] = useState(0);
    
    // Delay Params
    const [delayTime, setDelayTime] = useState(0.3);
    const [delayMix, setDelayMix] = useState(0.3);
    
    // Mod Params
    const [lfoRate, setLfoRate] = useState(2);

    // OSC Params
    const [vco1Octave, setVco1Octave] = useState(2);
    const [vco1WaveIdx, setVco1WaveIdx] = useState(1); // Saw
    const [vco2Freq, setVco2Freq] = useState(0);
    const [vco2WaveIdx, setVco2WaveIdx] = useState(0); // Tri

    // Init Engine
    useEffect(() => {
        engine.current = new MatriarchEngine();
        return () => { engine.current?.ctx.close(); };
    }, []);

    // Param Effect
    useEffect(() => {
        if (!engine.current) return;
        engine.current.setParam('filter', 'cutoff', cutoff);
        engine.current.setParam('filter', 'res', res);
        engine.current.setParam('delay', 'time', delayTime);
        engine.current.setParam('delay', 'mix', delayMix);
        engine.current.setParam('lfo', 'rate', lfoRate);
        
        // Osc Params
        engine.current.setParam('osc', 'vco1Octave', vco1Octave);
        engine.current.setParam('osc', 'vco1Wave', vco1WaveIdx);
        engine.current.setParam('osc', 'vco2Freq', vco2Freq);
        engine.current.setParam('osc', 'vco2Wave', vco2WaveIdx);

    }, [cutoff, res, delayTime, delayMix, lfoRate, vco1Octave, vco1WaveIdx, vco2Freq, vco2WaveIdx]);

    const handleNoteOn = (note: number) => {
        if (!engine.current) return;
        if (!activeNotes.includes(note)) {
            const newNotes = [...activeNotes, note];
            setActiveNotes(newNotes);
            engine.current.trigger(newNotes);
        } else if (isHold) {
            // Retrigger if holding? For now, do nothing if already playing
        }
    };

    const handleNoteOff = (note: number) => {
        if (isHold) return; // Ignore release if hold is active
        const newNotes = activeNotes.filter(n => n !== note);
        setActiveNotes(newNotes);
        if (newNotes.length > 0) {
            engine.current?.trigger(newNotes);
        } else {
            engine.current?.release();
        }
    };

    // Arp Clock
    useEffect(() => {
        if (!arpMode || activeNotes.length === 0) return;
        
        let idx = 0;
        const interval = setInterval(() => {
            const note = activeNotes[idx % activeNotes.length];
            // Brief trigger
            engine.current?.trigger([note]);
            setTimeout(() => {
                if(arpMode) engine.current?.release(); 
            }, 100);
            idx++;
        }, 200);

        return () => clearInterval(interval);
    }, [arpMode, activeNotes]);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-0 md:p-4 animate-fade-in font-sans touch-none">
            {/* Added padding for close button overlap fix */}
            <div className="relative w-full max-w-6xl h-full md:h-auto md:aspect-[16/9] bg-[#1a1a1a] rounded-xl shadow-2xl overflow-hidden border-4 border-[#8B4513] flex flex-col pt-14 md:pt-0">
                
                {/* --- HEADER --- */}
                <div className="min-h-16 bg-[#111] flex flex-wrap items-center justify-between px-6 border-b border-gray-800 z-50 relative gap-2 pl-14 md:pl-6 py-2">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full border-2 border-orange-500 flex items-center justify-center shadow-[0_0_15px_orange]">
                            <div className="w-6 h-6 bg-orange-500 rounded-full animate-pulse"></div>
                        </div>
                        <h1 className="text-xl md:text-2xl font-black tracking-widest text-white uppercase" style={{ fontFamily: 'serif' }}>MATRIARCH</h1>
                    </div>
                    
                    <div className="flex gap-4 items-center">
                        <button 
                            onClick={() => setIsHold(!isHold)}
                            className={`px-3 py-1 rounded text-xs font-bold uppercase tracking-wider border transition-all ${isHold ? 'bg-yellow-600 border-yellow-400 text-white shadow-[0_0_10px_yellow] animate-pulse' : 'bg-gray-800 border-gray-600 text-gray-400'}`}
                        >
                            HOLD
                        </button>
                        <button 
                            onClick={() => setPatchMode(!patchMode)}
                            className={`px-4 py-2 rounded font-bold uppercase text-xs tracking-wider border ${patchMode ? 'bg-pink-900 border-pink-500 text-pink-100 shadow-[0_0_10px_#db2777]' : 'bg-gray-800 border-gray-600 text-gray-400'}`}
                        >
                            {patchMode ? 'Hide Patch' : 'Patch Bay'}
                        </button>
                    </div>
                </div>

                {/* --- MAIN PANEL (Modules) --- */}
                <div className="flex-1 bg-[#222] relative flex flex-col md:flex-row overflow-y-auto md:overflow-hidden">
                    
                    {/* Module 1: Modulation */}
                    <div className="flex-1 p-4 border-r border-gray-800 flex flex-col items-center gap-6 bg-gradient-to-b from-[#2a2a2a] to-[#222]">
                        <h3 className="text-gray-500 font-bold text-xs uppercase tracking-widest mb-2">Modulation</h3>
                        <Knob label="Rate" value={lfoRate} min={0.1} max={20} onChange={setLfoRate} color="border-pink-500" />
                        <div className="w-full h-px bg-gray-700 my-2"></div>
                        <div className="w-20 h-20 bg-black rounded border border-gray-600 relative overflow-hidden">
                            <div className="absolute inset-0 opacity-30 bg-pink-900 animate-pulse"></div>
                            <svg className="w-full h-full" preserveAspectRatio="none">
                                <path d="M0,40 Q20,0 40,40 T80,40" stroke="pink" fill="none" strokeWidth="2" />
                            </svg>
                        </div>
                    </div>

                    {/* Module 2: Oscillators */}
                    <div className="flex-[2] p-4 border-r border-gray-800 flex flex-col bg-[#252525]">
                        <h3 className="text-gray-500 font-bold text-xs uppercase tracking-widest mb-4 text-center">Oscillators</h3>
                        <div className="flex justify-around">
                            <div className="flex flex-col items-center gap-4">
                                <span className="text-[10px] text-gray-400">VCO 1</span>
                                <Knob label="Octave" value={vco1Octave} min={1} max={4} step={1} onChange={setVco1Octave} color="border-red-500" />
                                <Knob label="Wave" value={vco1WaveIdx} min={0} max={3} step={1} onChange={setVco1WaveIdx} color="border-red-500" displayValue={WAVEFORMS[vco1WaveIdx]} />
                            </div>
                            <div className="flex flex-col items-center gap-4">
                                <span className="text-[10px] text-gray-400">VCO 2</span>
                                <Knob label="Tune" value={vco2Freq} min={-12} max={12} step={1} onChange={setVco2Freq} color="border-red-500" />
                                <Knob label="Wave" value={vco2WaveIdx} min={0} max={3} step={1} onChange={setVco2WaveIdx} color="border-red-500" displayValue={WAVEFORMS[vco2WaveIdx]} />
                            </div>
                        </div>
                    </div>

                    {/* Module 3: Filter (Main) */}
                    <div className="flex-[1.5] p-4 border-r border-gray-800 flex flex-col items-center gap-6 bg-[#222]">
                        <h3 className="text-gray-500 font-bold text-xs uppercase tracking-widest mb-2">Stereo Filter</h3>
                        <div className="relative">
                            <Knob label="Cutoff" value={cutoff} min={50} max={10000} onChange={setCutoff} color="border-white shadow-[0_0_20px_rgba(255,255,255,0.2)]" />
                        </div>
                        <Knob label="Resonance" value={res} min={0} max={30} onChange={setRes} color="border-white" />
                        <div className="flex gap-2 mt-4">
                            <button className="w-8 h-8 rounded bg-gray-800 border border-gray-600 text-[10px] text-gray-300">LP</button>
                            <button className="w-8 h-8 rounded bg-gray-800 border border-gray-600 text-[10px] text-gray-300">HP</button>
                        </div>
                    </div>

                    {/* Module 4: Delay / Output */}
                    <div className="flex-1 p-4 flex flex-col items-center gap-6 bg-gradient-to-b from-[#2a2a2a] to-[#222]">
                        <h3 className="text-gray-500 font-bold text-xs uppercase tracking-widest mb-2">Analog Delay</h3>
                        <Knob label="Time" value={delayTime} min={0.05} max={1.0} onChange={setDelayTime} color="border-blue-400" />
                        <Knob label="Mix" value={delayMix} min={0} max={1} onChange={setDelayMix} color="border-blue-400" />
                        
                        <div className="mt-auto w-full">
                            <h3 className="text-gray-500 font-bold text-xs uppercase tracking-widest mb-2 text-center">Output</h3>
                            <div className="w-full h-3 bg-gray-900 rounded-full overflow-hidden border border-gray-700">
                                <div className="h-full bg-gradient-to-r from-green-500 to-red-500 w-[70%] animate-pulse"></div>
                            </div>
                        </div>
                    </div>

                    {/* XY PAD */}
                    <div className="absolute bottom-4 right-4 w-32 h-32 bg-black border-2 border-gray-600 rounded opacity-80 md:block hidden">
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,_rgba(255,255,255,0.1),_transparent)]"></div>
                        <div className="text-[10px] text-gray-500 absolute top-1 left-1">XY PAD</div>
                        <div className="absolute w-4 h-4 bg-orange-500 rounded-full blur-sm top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 shadow-[0_0_10px_orange]"></div>
                    </div>

                    {/* Patch Overlay */}
                    {patchMode && (
                        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm z-40 flex items-center justify-center p-8 animate-fade-in patchbay-container">
                            <svg className="absolute inset-0 w-full h-full pointer-events-none z-20 opacity-70">
                                <path d="M 100 100 Q 200 300 400 150" stroke="pink" strokeWidth="4" fill="none" strokeLinecap="round" className="drop-shadow-lg" />
                                <path d="M 600 200 Q 700 400 800 100" stroke="cyan" strokeWidth="4" fill="none" strokeLinecap="round" className="drop-shadow-lg" />
                            </svg>
                            <div className="text-white text-center">
                                <h2 className="text-xl font-bold uppercase mb-4">Patch Bay</h2>
                                <p className="text-sm text-gray-400">Virtual cabling active. Visual simulation only.</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* --- KEYBOARD & PERFORMANCE --- */}
                <div className="flex-none bg-[#1a1a1a] p-2 border-t-4 border-[#8B4513]">
                    <div className="flex justify-between items-center px-4 mb-2">
                        <div className="flex gap-2">
                            <button 
                                onClick={() => setArpMode(!arpMode)}
                                className={`px-3 py-1 rounded text-xs font-bold uppercase tracking-wider ${arpMode ? 'bg-orange-600 text-white animate-pulse' : 'bg-gray-800 text-gray-400'}`}
                            >
                                Arp / Seq
                            </button>
                        </div>
                        <div className="text-xs text-gray-500 font-mono">PARAPHONIC MODE</div>
                    </div>
                    
                    <SynthKeyboard 
                        activeNotes={activeNotes} 
                        onNoteOn={handleNoteOn} 
                        onNoteOff={handleNoteOff}
                    />
                </div>

            </div>
        </div>
    );
};

export default MatriarchSynth;
