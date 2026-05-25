
import React, { useState, useEffect, useRef } from 'react';

interface PhasePlantSynthProps {
  onClose: () => void;
}

// --- TYPES ---
type GeneratorType = 'ANALOG' | 'WAVETABLE' | 'NOISE' | 'SAMPLE';
type EffectType = 'DISTORTION' | 'REVERB' | 'DELAY' | 'FILTER' | 'PHASER' | 'EQ';

interface Generator {
    id: string;
    type: GeneratorType;
    params: { level: number; pan: number; tune: number; shape?: string };
}

interface Snapin {
    id: string;
    type: EffectType;
    enabled: boolean;
    params: { mix: number; p1: number; p2: number };
}

// --- ENGINE ---
class PhaseEngine {
    ctx: AudioContext;
    master: GainNode;
    
    // Nodes
    genNodes: Map<string, OscillatorNode | AudioBufferSourceNode> = new Map();
    genGains: Map<string, GainNode> = new Map();
    
    // The main bus where all generators sum
    generatorBus: GainNode;
    
    // FX Chain (Head and Tail)
    fxInput: GainNode; // Equals generatorBus
    fxOutput: GainNode; // Goes to master
    
    fxNodes: Map<string, AudioNode> = new Map();

    activeNotes: number[] = [];

    constructor() {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        this.master = this.ctx.createGain();
        this.master.gain.value = 0.4;
        this.master.connect(this.ctx.destination);

        this.generatorBus = this.ctx.createGain();
        this.fxInput = this.generatorBus;
        this.fxOutput = this.ctx.createGain();
        
        // Initial direct connection (No FX)
        this.fxInput.connect(this.fxOutput);
        this.fxOutput.connect(this.master);
    }

    trigger(note: number, generators: Generator[]) {
        if(this.ctx.state === 'suspended') this.ctx.resume();
        const now = this.ctx.currentTime;
        const freq = 440 * Math.pow(2, (note-69)/12);
        
        generators.forEach(gen => {
            const gain = this.ctx.createGain();
            gain.gain.value = gen.params.level;
            
            let source: AudioNode | null = null;

            if (gen.type === 'ANALOG') {
                const osc = this.ctx.createOscillator();
                osc.type = (gen.params.shape as OscillatorType) || 'sawtooth';
                osc.frequency.value = freq * Math.pow(2, gen.params.tune/12);
                osc.start(now);
                osc.stop(now + 2); // Auto stop safety if note off missed
                source = osc;
            } else if (gen.type === 'NOISE') {
                const bufferSize = this.ctx.sampleRate * 2; 
                const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
                const data = buffer.getChannelData(0);
                for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
                const n = this.ctx.createBufferSource();
                n.buffer = buffer;
                n.loop = true;
                n.start(now);
                n.stop(now + 2);
                source = n;
            } else {
                // Default simple osc for others
                const osc = this.ctx.createOscillator();
                osc.type = 'triangle';
                osc.frequency.value = freq;
                osc.start(now);
                osc.stop(now + 2);
                source = osc;
            }

            if (source) {
                // Env attack
                gain.gain.setValueAtTime(0, now);
                gain.gain.linearRampToValueAtTime(gen.params.level, now + 0.01);
                
                source.connect(gain);
                gain.connect(this.generatorBus);
                
                // Store active nodes with a unique key combining genID and note
                // For simplicity in this mono-ish engine, we just track active OSCs poorly
                // Real polyphony requires Voice class abstraction (see VitalSynth)
            }
        });
    }

    // Rebuild FX Chain
    rebuildChain(effects: Snapin[]) {
        // Disconnect everything
        this.generatorBus.disconnect();
        this.fxNodes.forEach(n => n.disconnect());
        this.fxNodes.clear();

        let currentNode: AudioNode = this.generatorBus;

        effects.forEach(fx => {
            if (!fx.enabled) return;

            let node: AudioNode;
            
            if (fx.type === 'DISTORTION') {
                const shaper = this.ctx.createWaveShaper();
                const curve = new Float32Array(44100);
                const k = fx.params.p1 * 100;
                for(let i=0; i<44100; i++) {
                    const x = (i/44100)*2 - 1; 
                    curve[i] = (3 + k) * x * 20 * (Math.PI / 180) / (Math.PI + k * Math.abs(x));
                }
                shaper.curve = curve;
                node = shaper;
            } else if (fx.type === 'FILTER') {
                const f = this.ctx.createBiquadFilter();
                f.type = 'lowpass';
                f.frequency.value = 50 + fx.params.p1 * 10000;
                f.Q.value = fx.params.p2 * 20;
                node = f;
            } else if (fx.type === 'REVERB') {
                // Simple Delay simulation for reverb
                const d = this.ctx.createDelay();
                d.delayTime.value = 0.1;
                node = d;
            } else {
                const g = this.ctx.createGain(); // Bypass
                node = g;
            }

            currentNode.connect(node);
            currentNode = node;
            this.fxNodes.set(fx.id, node);
        });

        currentNode.connect(this.master);
    }
}

// --- COMPONENTS ---

const PhaseKnob: React.FC<{ label: string; value: number; onChange: (v:number)=>void }> = ({ label, value, onChange }) => {
    return (
        <div className="flex flex-col items-center">
            <div className="w-8 h-8 rounded-full bg-[#111] border border-gray-600 relative">
                <div className="absolute bottom-0 left-0 right-0 bg-blue-500 opacity-50" style={{ height: `${value*100}%` }}></div>
            </div>
            <span className="text-[9px] text-gray-400 font-bold">{label}</span>
        </div>
    )
}

const PhasePlantSynth: React.FC<PhasePlantSynthProps> = ({ onClose }) => {
    const engine = useRef<PhaseEngine | null>(null);
    const [generators, setGenerators] = useState<Generator[]>([
        { id: '1', type: 'ANALOG', params: { level: 0.8, pan: 0, tune: 0, shape: 'sawtooth' } }
    ]);
    const [effects, setEffects] = useState<Snapin[]>([
        { id: '1', type: 'FILTER', enabled: true, params: { mix: 1, p1: 0.5, p2: 0 } }
    ]);
    const [activeNotes, setActiveNotes] = useState<number[]>([]);

    useEffect(() => {
        engine.current = new PhaseEngine();
        engine.current.rebuildChain(effects);
        return () => { engine.current?.ctx.close(); }
    }, []);

    // Rebuild audio graph when effects change
    useEffect(() => {
        engine.current?.rebuildChain(effects);
    }, [effects]);

    const addGenerator = (type: GeneratorType) => {
        const newGen: Generator = {
            id: Math.random().toString(36).substr(2, 9),
            type,
            params: { level: 0.8, pan: 0, tune: 0, shape: 'sawtooth' }
        };
        setGenerators([...generators, newGen]);
    };

    const addEffect = (type: EffectType) => {
        const newFx: Snapin = {
            id: Math.random().toString(36).substr(2, 9),
            type,
            enabled: true,
            params: { mix: 1, p1: 0.5, p2: 0.5 }
        };
        setEffects([...effects, newFx]);
    };

    const handleNoteOn = (n: number) => {
        if(!activeNotes.includes(n)) setActiveNotes(prev => [...prev, n]);
        engine.current?.trigger(n, generators);
    };
    const handleNoteOff = (n: number) => {
        setActiveNotes(prev => prev.filter(x => x !== n));
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 p-0 md:p-4 animate-fade-in font-sans select-none touch-manipulation">
            <div className="relative w-full max-w-7xl h-full md:h-auto bg-[#1e2329] rounded-xl shadow-2xl overflow-hidden border border-gray-700 flex flex-col pt-14 md:pt-0">
                
                {/* HEADER */}
                <div className="h-14 bg-[#161a1e] flex items-center px-6 gap-4 border-b border-gray-700 pl-16 z-50 relative">
                    <h1 className="text-xl font-bold text-white tracking-widest uppercase">PHASE PLANT <span className="text-xs text-blue-400 bg-[#222] px-2 py-0.5 rounded ml-2">MINI</span></h1>
                    <div className="flex gap-4 ml-auto">
                        <button className="text-xs font-bold text-gray-400 hover:text-white">SAVE</button>
                        <button className="text-xs font-bold text-gray-400 hover:text-white">LOAD</button>
                        <button className="text-xs font-bold text-blue-400 hover:text-blue-300">INIT</button>
                    </div>
                </div>

                {/* WORKSPACE */}
                <div className="flex-1 flex overflow-hidden bg-[#111316]">
                    
                    {/* COL 1: GENERATORS */}
                    <div className="flex-1 min-w-[300px] border-r border-gray-700 flex flex-col">
                        <div className="p-2 bg-[#252a30] text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-700">Generators</div>
                        <div className="flex-1 overflow-y-auto p-4 space-y-2">
                            {generators.map((gen, i) => (
                                <div key={gen.id} className="bg-[#2a2f36] rounded-l border-l-4 border-blue-500 p-3 relative group">
                                    <div className="flex justify-between items-center mb-2">
                                        <div className="font-bold text-white text-sm">{gen.type}</div>
                                        <button 
                                            onClick={() => setGenerators(generators.filter(g => g.id !== gen.id))}
                                            className="text-gray-600 hover:text-red-500 text-xs font-bold"
                                        >✕</button>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        {/* Volume Dot */}
                                        <div className="flex flex-col items-center gap-1">
                                            <div className="w-8 h-8 rounded-full border-2 border-blue-500 bg-black flex items-center justify-center cursor-ns-resize">
                                                <div className="w-4 h-4 bg-blue-500 rounded-full" style={{ opacity: gen.params.level }}></div>
                                            </div>
                                            <span className="text-[9px] text-gray-500 font-bold">VOL</span>
                                        </div>
                                        
                                        {/* Params */}
                                        <div className="flex-1 grid grid-cols-3 gap-2">
                                            <PhaseKnob label="Tune" value={0.5} onChange={()=>{}} />
                                            <PhaseKnob label="Pan" value={0.5} onChange={()=>{}} />
                                            {gen.type === 'ANALOG' && <PhaseKnob label="Shape" value={0} onChange={()=>{}} />}
                                        </div>
                                    </div>
                                </div>
                            ))}

                            {/* ADD BUTTONS */}
                            <div className="grid grid-cols-3 gap-2 mt-4">
                                <button onClick={() => addGenerator('ANALOG')} className="py-2 bg-[#1e2329] border border-blue-900 rounded text-blue-400 text-xs font-bold hover:bg-blue-900/20">+ ANALOG</button>
                                <button onClick={() => addGenerator('WAVETABLE')} className="py-2 bg-[#1e2329] border border-green-900 rounded text-green-400 text-xs font-bold hover:bg-green-900/20">+ WAVE</button>
                                <button onClick={() => addGenerator('NOISE')} className="py-2 bg-[#1e2329] border border-gray-600 rounded text-gray-400 text-xs font-bold hover:bg-gray-700">+ NOISE</button>
                            </div>
                        </div>
                    </div>

                    {/* COL 2: SNAP-IN EFFECTS */}
                    <div className="flex-1 min-w-[300px] border-r border-gray-700 flex flex-col bg-[#16191d]">
                        <div className="p-2 bg-[#252a30] text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-700">Snap-in Lane 1</div>
                        <div className="flex-1 overflow-y-auto p-4 space-y-1">
                            {/* Routing Line */}
                            <div className="w-0.5 bg-gray-700 h-4 mx-auto mb-1"></div>
                            
                            {effects.map((fx, i) => (
                                <div key={fx.id} className="flex flex-col items-center">
                                    <div className="w-full bg-[#2a2f36] rounded border-l-4 border-yellow-600 p-2 flex items-center gap-3 relative group">
                                        <div className="flex-1">
                                            <div className="flex justify-between">
                                                <span className="text-xs font-bold text-gray-200">{fx.type}</span>
                                                <input 
                                                    type="checkbox" 
                                                    checked={fx.enabled} 
                                                    onChange={() => {
                                                        const newFx = [...effects];
                                                        newFx[i].enabled = !newFx[i].enabled;
                                                        setEffects(newFx);
                                                    }}
                                                    className="accent-yellow-500"
                                                />
                                            </div>
                                            <div className="flex gap-2 mt-2">
                                                <div className="h-1 bg-black rounded flex-1 overflow-hidden">
                                                    <div className="h-full bg-yellow-600" style={{ width: `${fx.params.p1*100}%` }}></div>
                                                </div>
                                            </div>
                                        </div>
                                        <button 
                                            onClick={() => setEffects(effects.filter(f => f.id !== fx.id))}
                                            className="text-gray-600 hover:text-red-500 text-xs font-bold px-2"
                                        >✕</button>
                                    </div>
                                    {/* Link line */}
                                    <div className="w-0.5 bg-gray-700 h-2 my-1"></div>
                                </div>
                            ))}

                            <div className="text-center mt-4">
                                <span className="text-[9px] text-gray-600 font-bold block mb-2">ADD SNAPIN</span>
                                <div className="grid grid-cols-2 gap-2">
                                    {['DISTORTION', 'FILTER', 'REVERB', 'DELAY', 'PHASER', 'EQ'].map(t => (
                                        <button 
                                            key={t}
                                            onClick={() => addEffect(t as EffectType)}
                                            className="px-2 py-1 bg-[#1e2329] text-[9px] font-bold text-gray-400 rounded hover:text-white border border-transparent hover:border-gray-600"
                                        >
                                            {t}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* COL 3: MODULATORS & MACROS */}
                    <div className="w-48 hidden md:flex flex-col bg-[#111316] border-l border-gray-700 p-2 overflow-y-auto">
                        <div className="text-[10px] font-bold text-gray-500 uppercase mb-4 text-center">Modulators</div>
                        
                        <div className="space-y-4">
                            <div className="bg-[#1e2329] p-2 rounded border border-gray-700">
                                <div className="text-xs font-bold text-blue-400 mb-2">LFO 1</div>
                                <div className="h-10 bg-black rounded relative mb-2">
                                    <svg className="w-full h-full"><path d="M0,20 Q20,0 40,20 T80,20" stroke="cyan" fill="none" strokeWidth="2"/></svg>
                                </div>
                                <div className="flex justify-between">
                                    <PhaseKnob label="Rate" value={0.5} onChange={()=>{}} />
                                    <PhaseKnob label="Depth" value={1} onChange={()=>{}} />
                                </div>
                            </div>

                            <div className="bg-[#1e2329] p-2 rounded border border-gray-700">
                                <div className="text-xs font-bold text-green-400 mb-2">ENV 1</div>
                                <div className="h-10 bg-black rounded relative mb-2 opacity-50">
                                    <svg className="w-full h-full"><polyline points="0,40 10,0 30,20 100,40" stroke="green" fill="none" strokeWidth="2"/></svg>
                                </div>
                                <div className="flex justify-between">
                                    <PhaseKnob label="A" value={0} onChange={()=>{}} />
                                    <PhaseKnob label="D" value={0.4} onChange={()=>{}} />
                                    <PhaseKnob label="S" value={0.5} onChange={()=>{}} />
                                    <PhaseKnob label="R" value={0.4} onChange={()=>{}} />
                                </div>
                            </div>

                            <div className="bg-[#1e2329] p-2 rounded border border-gray-700">
                                <div className="text-xs font-bold text-yellow-400 mb-2">MACROS</div>
                                <div className="grid grid-cols-2 gap-2">
                                    {[1,2,3,4].map(i => (
                                        <div key={i} className="flex flex-col items-center">
                                            <div className="w-8 h-8 rounded-full border-2 border-yellow-600 bg-black"></div>
                                            <span className="text-[8px] text-gray-500 font-bold mt-1">M{i}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                </div>

                {/* FOOTER: KEYBOARD */}
                <div className="h-24 bg-[#0a0b0c] border-t border-gray-700 flex relative z-40">
                    {Array.from({length:25},(_,i)=>i+48).map(k => (
                        <div 
                            key={k} 
                            className={`flex-1 border-r border-gray-800 relative ${activeNotes.includes(k)?'bg-blue-500 shadow-[0_0_20px_blue] z-10':([1,3,6,8,10].includes(k%12)?'bg-[#111]':'bg-[#eee]')}`}
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

export default PhasePlantSynth;
