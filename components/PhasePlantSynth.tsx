
import React, { useState, useEffect, useRef } from 'react';
import { SynthShell, Keys, Engrave, PANEL } from './synthkit';

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

    const addBtn = (label: string, fn: () => void) => (
        <button onClick={fn} style={{ padding: '8px 10px', borderRadius: 7, cursor: 'pointer', fontFamily: '"JetBrains Mono", monospace', fontSize: 9.5, letterSpacing: 0.5, textTransform: 'uppercase', border: `1px solid ${PANEL.line}`, background: '#181410', color: PANEL.inkMute }}>{label}</button>
    );
    const moduleCard = (title: string, onRemove: () => void, right?: React.ReactNode) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 8, background: 'rgba(0,0,0,0.22)', boxShadow: `inset 0 0 0 1px ${PANEL.line}`, borderLeft: `3px solid ${PANEL.brass}` }}>
            <span style={{ flex: 1, fontFamily: '"DM Serif Display", serif', fontSize: 15, color: PANEL.ink }}>{title}</span>
            {right}
            <button onClick={onRemove} style={{ background: 'transparent', border: 'none', color: PANEL.inkMute, fontSize: 14, cursor: 'pointer' }}>✕</button>
        </div>
    );

    return (
        <SynthShell name="Phase Plant" tag="Snap-In Modular Synth" onClose={onClose} accent={PANEL.brass}>
            <Engrave>Generators</Engrave>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {generators.map((gen) => moduleCard(gen.type, () => setGenerators(generators.filter(g => g.id !== gen.id))))}
                <div style={{ display: 'flex', gap: 6 }}>
                    {addBtn('+ Analog', () => addGenerator('ANALOG'))}
                    {addBtn('+ Wave', () => addGenerator('WAVETABLE'))}
                    {addBtn('+ Noise', () => addGenerator('NOISE'))}
                </div>
            </div>

            <Engrave>Snap-In Lane</Engrave>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {effects.map((fx, i) => moduleCard(fx.type, () => setEffects(effects.filter(f => f.id !== fx.id)),
                    <button onClick={() => { const n = [...effects]; n[i].enabled = !n[i].enabled; setEffects(n); }}
                        style={{ width: 38, height: 22, borderRadius: 999, cursor: 'pointer', border: 'none', position: 'relative',
                            background: fx.enabled ? PANEL.brass : '#181410', boxShadow: `inset 0 0 0 1px ${PANEL.line}` }}>
                        <span style={{ position: 'absolute', top: 2, left: fx.enabled ? 18 : 2, width: 18, height: 18, borderRadius: 999, background: fx.enabled ? '#1a0d04' : PANEL.inkMute, transition: 'left .12s' }} />
                    </button>
                ))}
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {(['DISTORTION', 'FILTER', 'REVERB', 'DELAY', 'PHASER', 'EQ'] as EffectType[]).map(t => addBtn(t, () => addEffect(t)))}
                </div>
            </div>

            <Engrave>Keyboard</Engrave>
            <Keys octaves={2} startMidi={48} activeNotes={activeNotes} onNoteOn={handleNoteOn} onNoteOff={handleNoteOff} />
        </SynthShell>
    );
};


export default PhasePlantSynth;
