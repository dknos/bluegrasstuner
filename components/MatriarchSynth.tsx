
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { SynthShell, Knob, KnobRow, Keys, Rocker, Engrave, PANEL } from './synthkit';

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
const LegacyKnob: React.FC<{
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

    const toggle = (on: boolean, label: string, fn: () => void) => (
        <button onClick={fn} style={{
            padding: '7px 14px', borderRadius: 999, cursor: 'pointer', fontFamily: '"JetBrains Mono", monospace', fontSize: 10, letterSpacing: 1, textTransform: 'uppercase',
            border: `1px solid ${on ? PANEL.brass : PANEL.line}`, background: on ? PANEL.brass : 'transparent', color: on ? '#1a0d04' : PANEL.inkMute,
        }}>{label}</button>
    );

    return (
        <SynthShell name="Matriarch" tag="Paraphonic · Semi-Modular · Stereo Delay" onClose={onClose} accent={PANEL.brass}>
            <div style={{ display: 'flex', gap: 8 }}>
                {toggle(isHold, 'Hold', () => setIsHold(!isHold))}
                {toggle(arpMode, 'Arp', () => setArpMode(!arpMode))}
            </div>

            <Engrave>Oscillator 1</Engrave>
            <KnobRow>
                <Knob label="Octave" value={vco1Octave} min={1} max={4} step={1} onChange={setVco1Octave} />
                <Rocker label="Wave" options={['Tri', 'Saw', 'Sqr', 'Sin']} value={vco1WaveIdx} onChange={setVco1WaveIdx} />
            </KnobRow>

            <Engrave>Oscillator 2</Engrave>
            <KnobRow>
                <Knob label="Tune" value={vco2Freq} min={-12} max={12} step={1} onChange={setVco2Freq} format={(v) => `${v > 0 ? '+' : ''}${v}`} />
                <Rocker label="Wave" options={['Tri', 'Saw', 'Sqr', 'Sin']} value={vco2WaveIdx} onChange={setVco2WaveIdx} />
            </KnobRow>

            <Engrave>Stereo Filter</Engrave>
            <KnobRow>
                <Knob label="Cutoff" value={cutoff} min={50} max={10000} log onChange={setCutoff} format={(v) => `${Math.round(v)}`} size={70} />
                <Knob label="Resonance" value={res} min={0} max={30} onChange={setRes} size={70} />
            </KnobRow>

            <Engrave>Analog Delay · Mod</Engrave>
            <KnobRow>
                <Knob label="Time" value={delayTime} min={0.05} max={1} step={0.01} onChange={setDelayTime} format={(v) => `${(v * 1000).toFixed(0)}ms`} />
                <Knob label="Mix" value={delayMix} min={0} max={1} step={0.01} onChange={setDelayMix} />
                <Knob label="LFO Rate" value={lfoRate} min={0.1} max={20} step={0.1} onChange={setLfoRate} format={(v) => `${v.toFixed(1)}Hz`} />
            </KnobRow>

            <Engrave>Keyboard · Paraphonic</Engrave>
            <Keys octaves={2} startMidi={48} activeNotes={activeNotes} onNoteOn={handleNoteOn} onNoteOff={handleNoteOff} />
        </SynthShell>
    );
};

export default MatriarchSynth;
