
import React, { useState, useEffect, useRef, useCallback } from 'react';

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

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 p-0 md:p-4 animate-fade-in font-sans select-none touch-manipulation">
            <div className="relative w-full max-w-7xl h-full md:h-auto bg-[#141414] rounded-xl shadow-[0_0_60px_rgba(255,100,0,0.15)] overflow-hidden border border-gray-800 flex flex-col pt-14 md:pt-0">
                
                {/* HEADER */}
                <div className="h-16 bg-[#1a1a1a] flex items-center px-6 gap-6 border-b border-gray-700 pl-16 z-50 relative">
                    <h1 className="text-2xl font-black text-white tracking-widest uppercase italic">VITAL <span className="text-sm text-orange-500 not-italic font-bold ml-1">SPECTRAL</span></h1>
                    
                    <div className="flex gap-4 ml-auto">
                        <button onClick={randomize} className="px-4 py-1.5 bg-[#222] hover:bg-[#333] border border-gray-600 rounded text-orange-500 font-bold text-xs uppercase flex items-center gap-2">
                            <span>🎲 Randomize</span>
                        </button>
                        <button className="px-4 py-1.5 bg-[#222] hover:bg-[#333] border border-gray-600 rounded text-gray-300 font-bold text-xs uppercase">
                            Init Preset
                        </button>
                    </div>
                </div>
                
                {/* MAIN CONTENT */}
                <div className="flex-1 bg-[#111] p-2 flex flex-col md:flex-row gap-2 overflow-y-auto">
                    
                    {/* LEFT COLUMN: OSCILLATORS */}
                    <div className="flex-1 flex flex-col gap-2 min-w-[320px]">
                        {/* OSC 1 */}
                        <div className="bg-[#1a1a1a] rounded border border-gray-700 p-3 relative overflow-hidden">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-orange-500 font-black text-sm bg-black px-2 rounded">OSC 1</span>
                                <div className="flex gap-2">
                                    <div className="w-2 h-2 rounded-full bg-green-500"></div>
                                    <div className="w-2 h-2 rounded-full bg-gray-600"></div>
                                </div>
                            </div>
                            
                            {/* Spectral Display */}
                            <div className="w-full h-32 bg-[#050505] border border-gray-600 rounded mb-3 relative overflow-hidden group">
                                {/* Spectral Warp Grid */}
                                <div className="absolute inset-0 bg-[linear-gradient(transparent_9px,#222_1px)] bg-[length:100%_10px] opacity-50"></div>
                                <svg className="w-full h-full absolute inset-0" preserveAspectRatio="none">
                                    <path d={`M0,64 C${100+warp*100},${64-warp*60} ${200-warp*100},${64+warp*60} 300,64`} stroke="orange" fill="none" strokeWidth="3" vectorEffect="non-scaling-stroke" className="drop-shadow-[0_0_10px_orange]" />
                                </svg>
                                <div className="absolute bottom-2 right-2 text-orange-500 text-[9px] font-bold">SPECTRAL MORPH</div>
                            </div>

                            <div className="flex justify-between px-2">
                                <VitalKnob label="Level" value={osc1Vol} min={0} max={1} onChange={setOsc1Vol} onDrop={(s)=>handleModDrop('osc1Vol', s)} modAmt={getModAmt('osc1Vol')} />
                                <VitalKnob label="Pitch" value={osc1Tune} min={-24} max={24} step={1} onChange={setOsc1Tune} />
                                <VitalKnob label="Pan" value={osc1Pan} min={-1} max={1} onChange={setOsc1Pan} />
                                <VitalKnob label="Wave" value={oscWave} min={0} max={1} onChange={setOscWave} />
                            </div>
                        </div>

                        {/* FILTER */}
                        <div className="bg-[#1a1a1a] rounded border border-gray-700 p-3">
                            <div className="flex justify-between mb-2">
                                <span className="text-orange-500 font-black text-sm">FILTER 1</span>
                                <span className="text-gray-500 text-[9px] font-bold">ANALOG 12dB</span>
                            </div>
                            <div className="flex justify-around">
                                <div className="scale-125">
                                    <VitalKnob label="Cutoff" value={cutoff} min={20} max={20000} onChange={setCutoff} onDrop={(s)=>handleModDrop('cutoff', s)} modAmt={getModAmt('cutoff')} />
                                </div>
                                <VitalKnob label="Res" value={res} min={0} max={20} onChange={setRes} />
                                <VitalKnob label="Drive" value={0} min={0} max={1} onChange={()=>{}} />
                            </div>
                        </div>
                    </div>

                    {/* CENTER COLUMN: MODULATION */}
                    <div className="flex-[1.5] flex flex-col gap-2 min-w-[320px]">
                        
                        {/* WARP & STRETCH */}
                        <div className="h-24 bg-[#1a1a1a] rounded border border-gray-700 p-3 flex items-center justify-around">
                            <VitalKnob label="Spectral Warp" value={warp} min={0} max={1} onChange={setWarp} onDrop={(s)=>handleModDrop('warp', s)} modAmt={getModAmt('warp')} />
                            <VitalKnob label="Formant" value={0.5} min={0} max={1} onChange={()=>{}} />
                            <VitalKnob label="Stretch" value={0} min={0} max={1} onChange={()=>{}} />
                            <div className="w-px h-12 bg-gray-700"></div>
                            <button className="px-4 py-2 bg-black border border-orange-500/50 text-orange-500 rounded text-xs font-bold hover:bg-orange-500/10">
                                RANDOMIZE PHASE
                            </button>
                        </div>

                        {/* LFO GRID */}
                        <div className="flex-1 grid grid-cols-2 grid-rows-2 gap-2">
                            {lfoParams.map((lfo, i) => (
                                <div key={i} className="bg-[#1a1a1a] rounded border border-gray-700 p-2 flex flex-col relative">
                                    <div className="flex justify-between items-center mb-1">
                                        <div className="flex items-center gap-2">
                                            <span className="text-gray-400 font-bold text-xs">LFO {i+1}</span>
                                            {/* DRAGGABLE MOD SOURCE */}
                                            <div 
                                                className="w-4 h-4 rounded-full bg-green-500 border border-white cursor-grab active:cursor-grabbing shadow-[0_0_10px_green]"
                                                draggable
                                                onDragStart={(e) => handleLfoDragStart(e, i)}
                                            ></div>
                                        </div>
                                        <select 
                                            value={lfo.shape}
                                            onChange={(e) => updateLfoParam(i, 'shape', e.target.value)}
                                            className="bg-black text-[9px] text-gray-400 border border-gray-600 rounded"
                                        >
                                            <option value="sine">Sine</option>
                                            <option value="triangle">Tri</option>
                                            <option value="sawtooth">Saw</option>
                                            <option value="square">Sqr</option>
                                        </select>
                                    </div>
                                    <div className="flex-1 relative">
                                        <LFOVisual index={i} rate={lfo.rate} shape={lfo.shape} />
                                    </div>
                                    <div className="mt-2 flex justify-between px-4">
                                        <VitalKnob label="Freq" value={lfo.rate} min={0.1} max={20} onChange={(v) => updateLfoParam(i, 'rate', v)} />
                                        <VitalKnob label="Smooth" value={0} min={0} max={1} onChange={()=>{}} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* RIGHT COLUMN: FX & ENV */}
                    <div className="w-full md:w-48 bg-[#1a1a1a] rounded border border-gray-700 p-2 flex flex-col gap-2">
                        <h3 className="text-gray-500 font-bold text-xs text-center border-b border-gray-700 pb-1">EFFECTS</h3>
                        {['Chorus', 'Compressor', 'Distortion', 'Delay', 'Reverb', 'EQ'].map(fx => (
                            <div key={fx} className="h-8 bg-black rounded border border-gray-800 flex items-center px-2 justify-between group hover:border-gray-600 cursor-pointer">
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full border border-gray-600 group-hover:bg-blue-500"></div>
                                    <span className="text-[10px] text-gray-400 font-bold uppercase">{fx}</span>
                                </div>
                                <div className="w-16 h-1 bg-gray-800 rounded overflow-hidden">
                                    <div className="h-full bg-blue-500 w-1/2"></div>
                                </div>
                            </div>
                        ))}
                        
                        <div className="mt-auto border-t border-gray-700 pt-2">
                            <h3 className="text-gray-500 font-bold text-xs text-center mb-2">ENV 1</h3>
                            <div className="h-16 w-full bg-black rounded relative opacity-70">
                                <svg className="w-full h-full"><polyline points="0,64 10,0 40,32 100,64" fill="none" stroke="orange" strokeWidth="2" /></svg>
                            </div>
                            <div className="flex justify-between mt-2">
                                <VitalKnob label="A" value={0} min={0} max={1} onChange={()=>{}} />
                                <VitalKnob label="D" value={0.4} min={0} max={1} onChange={()=>{}} />
                                <VitalKnob label="S" value={0.5} min={0} max={1} onChange={()=>{}} />
                                <VitalKnob label="R" value={0.4} min={0} max={1} onChange={()=>{}} />
                            </div>
                        </div>
                    </div>

                </div>

                {/* KEYBOARD */}
                <div className="h-24 bg-[#0a0a0a] border-t border-gray-700 flex relative z-40">
                    {Array.from({length:25},(_,i)=>i+48).map(k => (
                        <div 
                            key={k} 
                            className={`flex-1 border-r border-gray-800 relative ${activeNotes.includes(k)?'bg-orange-500 shadow-[0_0_20px_orange] z-10':([1,3,6,8,10].includes(k%12)?'bg-[#111]':'bg-[#ccc]')}`}
                            onMouseDown={() => handleNoteOn(k)}
                            onMouseUp={() => handleNoteOff(k)}
                            onMouseLeave={() => handleNoteOff(k)}
                            onTouchStart={(e) => { e.preventDefault(); handleNoteOn(k); }}
                            onTouchEnd={(e) => { e.preventDefault(); handleNoteOff(k); }}
                        ></div>
                    ))}
                </div>

            </div>
        </div>
    );
};

export default VitalSynth;
