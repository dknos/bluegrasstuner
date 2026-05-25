
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { SynthShell, Knob, KnobRow, Keys, Rocker, Engrave, PANEL } from './synthkit';

interface SerumSynthProps {
  onClose: () => void;
}

// --- TYPES ---
type FilterType = 'lowpass' | 'highpass' | 'bandpass';
type WarpMode = 'Off' | 'FM (Sub)' | 'AM (Sub)' | 'Sync';

interface Preset {
    name: string;
    category: string;
    settings: any;
}

// --- PRESETS ---
const PRESETS: Preset[] = [
    { name: "Init Patch", category: "Basics", settings: { wtPos: 0.5, unison: 1, detune: 0, cutoff: 20000, res: 0, envR: 0.1, fxDist: 0 } },
    { name: "Neuro Growl", category: "Bass", settings: { wtPos: 0.8, unison: 5, detune: 0.25, cutoff: 600, res: 10, warpMode: 'FM (Sub)', warpAmt: 0.6, lfoRate: 8, lfoDepth: 0.8, fxDist: 0.8, fxComp: 0.5 } },
    { name: "Super Saw", category: "Lead", settings: { wtPos: 1.0, unison: 7, detune: 0.3, cutoff: 12000, envA: 0.01, envR: 0.5, fxRev: 0.4 } },
    { name: "Plucky", category: "Pluck", settings: { wtPos: 0.2, cutoff: 800, envMod: 0.8, envD: 0.3, envS: 0, fxDelay: 0.4 } },
    { name: "Wub Wub", category: "Bass", settings: { wtPos: 0.6, unison: 3, detune: 0.1, cutoff: 400, lfoRate: 4, lfoDepth: 0.9, lfoShape: 'sine', fxDist: 0.4 } },
    { name: "Hyper Square", category: "Lead", settings: { wtPos: 0.95, unison: 4, detune: 0.1, warpMode: 'Sync', warpAmt: 0.3, cutoff: 8000 } },
    { name: "Deep Sub", category: "Bass", settings: { wtPos: 0.1, subVol: 1.0, cutoff: 300, envR: 0.2 } },
    { name: "Ghost Pad", category: "Pad", settings: { wtPos: 0.4, unison: 5, detune: 0.2, cutoff: 1500, envA: 1.0, envR: 2.0, fxRev: 0.8, fxCho: 0.6 } },
    { name: "Acid 303", category: "Bass", settings: { wtPos: 1.0, cutoff: 600, res: 15, envMod: 0.6, envD: 0.2, fxDist: 0.7 } },
    { name: "Metallic", category: "FX", settings: { wtPos: 0.7, warpMode: 'AM (Sub)', warpAmt: 0.9, cutoff: 5000, fxRev: 0.7 } },
    { name: "Ice Keys", category: "Keys", settings: { wtPos: 0.3, unison: 3, cutoff: 2000, envA: 0.05, envR: 0.8, fxDelay: 0.5, fxRev: 0.5 } },
    { name: "Reese Master", category: "Bass", settings: { wtPos: 0.8, unison: 7, detune: 0.4, cutoff: 800, lfoRate: 0.5, lfoDepth: 0.2, fxDist: 0.9 } },
    { name: "Laser Zap", category: "FX", settings: { wtPos: 0.9, envA: 0, envD: 0.1, envS: 0, modEnvToPitch: 1, fxDelay: 0.4 } },
    { name: "Organ", category: "Keys", settings: { wtPos: 0.1, unison: 1, cutoff: 10000, envA: 0.01, envS: 1.0 } },
    { name: "Retro Lead", category: "Lead", settings: { wtPos: 0.9, unison: 2, detune: 0.05, warpMode: 'Sync', warpAmt: 0.2, fxDelay: 0.3 } },
];

// --- AUDIO ENGINE ---
class SerumVoice {
    ctx: AudioContext;
    dest: AudioNode;
    
    oscs: OscillatorNode[] = [];
    gains: GainNode[] = [];
    panners: StereoPannerNode[] = [];
    
    subOsc: OscillatorNode;
    subGain: GainNode;
    
    filter: BiquadFilterNode;
    envGain: GainNode; // Amp Env
    
    // Modulation Inputs
    lfoTarget: GainNode; // LFO modulates filter freq via this gain

    constructor(ctx: AudioContext, dest: AudioNode, freq: number, params: any) {
        this.ctx = ctx;
        this.dest = dest;

        // 1. FILTER
        this.filter = ctx.createBiquadFilter();
        this.filter.type = params.filterType;
        this.filter.Q.value = params.res;
        
        // 2. AMP ENVELOPE (VCA)
        this.envGain = ctx.createGain();
        this.envGain.gain.value = 0;
        
        // Routing: Voice -> Filter -> Env -> Dest
        this.filter.connect(this.envGain);
        this.envGain.connect(this.dest);

        // 3. UNISON ENGINE (OSC A)
        const count = Math.max(1, params.unison);
        // Interpolate shape: 0=Sine, 0.33=Tri, 0.66=Saw, 1=Square
        const type = this.getOscType(params.wtPos);

        for (let i = 0; i < count; i++) {
            const osc = ctx.createOscillator();
            const g = ctx.createGain();
            const pan = ctx.createStereoPanner();

            osc.type = type;
            
            // Detune & Spread
            let dt = 0;
            let panVal = 0;
            if (count > 1) {
                // Spread -1 to 1
                const spread = (i / (count - 1)) * 2 - 1;
                dt = spread * params.detune * 100; // Cents
                panVal = spread * 0.8; // Stereo width
            }
            
            osc.detune.value = dt;
            osc.frequency.value = freq;

            // Warp Modes
            if (params.warpMode === 'Sync') {
                // Fake Sync: Pitch up harmonic
                osc.frequency.value = freq * (1 + params.warpAmt * 4);
            }

            // Connect
            osc.connect(g);
            g.connect(pan);
            pan.connect(this.filter);

            osc.start();
            
            // Unison Gain Compensation
            g.gain.value = 1.0 / Math.sqrt(count);

            this.oscs.push(osc);
            this.gains.push(g);
            this.panners.push(pan);
        }

        // 4. SUB OSC (Used for Sound or FM Source)
        this.subOsc = ctx.createOscillator();
        this.subOsc.type = params.subShape || 'sine';
        this.subOsc.frequency.value = freq / 2; // -1 Oct
        this.subOsc.start();

        this.subGain = ctx.createGain();
        this.subGain.gain.value = params.subVol;
        
        // Route Sub
        if (params.warpMode === 'FM (Sub)') {
            // FM: Sub -> Osc A Freq
            const fmGain = ctx.createGain();
            fmGain.gain.value = params.warpAmt * 2000;
            this.subOsc.connect(fmGain);
            this.oscs.forEach(o => fmGain.connect(o.frequency));
            // Sub audio also audible? Usually yes in Serum if level up
            this.subOsc.connect(this.subGain);
            this.subGain.connect(this.filter);
        } else if (params.warpMode === 'AM (Sub)') {
            // AM: Sub -> Osc A Gain
            // Not easily done per-voice without complex graph, skipping for mini
            this.subOsc.connect(this.subGain);
            this.subGain.connect(this.filter);
        } else {
            this.subOsc.connect(this.subGain);
            this.subGain.connect(this.filter);
        }

        // 5. ENVELOPE TRIGGER
        const now = ctx.currentTime;
        const { envA, envD, envS, envR, cutoff, envMod } = params;

        // Amp Env
        this.envGain.gain.cancelScheduledValues(now);
        this.envGain.gain.setValueAtTime(0, now);
        this.envGain.gain.linearRampToValueAtTime(1.0, now + Math.max(0.005, envA));
        this.envGain.gain.linearRampToValueAtTime(envS, now + Math.max(0.005, envA) + envD);

        // Filter Env & LFO Setup
        this.filter.frequency.value = cutoff;
        
        // Envelope to Filter
        if (envMod !== 0) {
            this.filter.frequency.setValueAtTime(cutoff, now);
            const peak = Math.min(20000, Math.max(10, cutoff + (envMod * 5000)));
            this.filter.frequency.linearRampToValueAtTime(peak, now + Math.max(0.005, envA));
            this.filter.frequency.linearRampToValueAtTime(cutoff + ((peak-cutoff)*envS), now + Math.max(0.005, envA) + envD);
        }

        // LFO Modulation Input (Dummy gain for external LFO connection)
        this.lfoTarget = ctx.createGain();
        this.lfoTarget.gain.value = params.lfoDepth * 2000;
        this.lfoTarget.connect(this.filter.frequency);
    }

    getOscType(pos: number): OscillatorType {
        if (pos < 0.25) return 'sine';
        if (pos < 0.5) return 'triangle';
        if (pos < 0.75) return 'sawtooth';
        return 'square';
    }

    release(rel: number) {
        const now = this.ctx.currentTime;
        this.envGain.gain.cancelScheduledValues(now);
        this.envGain.gain.setValueAtTime(this.envGain.gain.value, now);
        this.envGain.gain.exponentialRampToValueAtTime(0.001, now + rel);
        
        // Stop oscillators after release
        const stopTime = now + rel + 0.1;
        this.oscs.forEach(o => o.stop(stopTime));
        this.subOsc.stop(stopTime);
    }
}

// --- VISUAL COMPONENTS ---

const SerumKnob: React.FC<{ 
    label: string; value: number; min: number; max: number; step?: number; 
    onChange: (v: number) => void; color?: string; size?: 'lg'|'md'|'sm'; // Added size
}> = ({ label, value, min, max, step=0.01, onChange, color="#00ff00", size='md' }) => {
    const [dragging, setDragging] = useState(false);
    const startY = useRef(0);
    const startVal = useRef(0);

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
    const sizeClass = size === 'lg' ? 'w-14 h-14' : size === 'sm' ? 'w-8 h-8' : 'w-10 h-10';

    return (
        <div className="flex flex-col items-center gap-1 group w-12" onMouseDown={handleDown} onTouchStart={handleDown}>
            <div className={`${sizeClass} rounded-full bg-[#1a1c20] border-2 border-[#444] relative cursor-ns-resize shadow-md`} style={{ transform: `rotate(${rot}deg)` }}>
                <div className="absolute inset-0.5 rounded-full border border-gray-600"></div>
                <div className="absolute top-1 left-1/2 w-1 h-3 -translate-x-1/2 rounded-full shadow-[0_0_5px_currentColor]" style={{ backgroundColor: color }}></div>
            </div>
            <span className="text-[8px] font-bold uppercase text-gray-400 text-center leading-tight">{label}</span>
            {dragging && (
                <div className="absolute -top-6 bg-black text-white text-[9px] px-1 rounded border border-gray-700 z-50">
                    {value.toFixed(step < 1 ? 2 : 0)}
                </div>
            )}
        </div>
    );
};

const Wavetable3D: React.FC<{ pos: number; onChange: (v: number) => void }> = ({ pos, onChange }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const isDragging = useRef(false);

    useEffect(() => {
        const ctx = canvasRef.current?.getContext('2d');
        if (!ctx) return;
        
        const draw = () => {
            const w = ctx.canvas.width;
            const h = ctx.canvas.height;
            ctx.fillStyle = '#050505';
            ctx.fillRect(0, 0, w, h);
            
            // Draw Grid
            ctx.strokeStyle = '#222';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(0, h/2); ctx.lineTo(w, h/2);
            ctx.stroke();

            // Draw Morphing Waveform
            ctx.lineWidth = 2;
            ctx.strokeStyle = '#00ff00';
            ctx.beginPath();
            
            for(let i=0; i<w; i++) {
                const x = i;
                const phase = (i / w) * Math.PI * 2;
                
                // Interpolate Shapes
                // 0=Sine, 0.5=Saw, 1=Square (Approx)
                let ySine = Math.sin(phase);
                let ySaw = (phase / Math.PI) - 1; if (ySaw < -1) ySaw += 2;
                let ySqr = phase < Math.PI ? 1 : -1;
                
                let val = 0;
                if (pos < 0.5) {
                    val = ySine * (1 - pos*2) + ySaw * (pos*2);
                } else {
                    val = ySaw * (1 - (pos-0.5)*2) + ySqr * ((pos-0.5)*2);
                }
                
                // Add Serum-style 3D lines behind
                if (i % 20 === 0) {
                    ctx.fillStyle = `rgba(0,255,0,${0.1})`;
                    ctx.fillRect(x, h/2, 1, val * -40);
                }

                const y = h/2 + (val * -40);
                if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
            }
            ctx.stroke();
            
            // Glow
            ctx.shadowBlur = 10;
            ctx.shadowColor = '#00ff00';
            ctx.stroke();
            ctx.shadowBlur = 0;
        };
        draw();
    }, [pos]);

    const handleMove = (e: any) => {
        if (!isDragging.current) return;
        const rect = e.target.getBoundingClientRect();
        const y = e.clientY || e.touches[0].clientY;
        const val = 1 - Math.min(1, Math.max(0, (y - rect.top) / rect.height));
        onChange(val);
    };

    return (
        <canvas 
            ref={canvasRef} 
            width={300} height={150} 
            className="w-full h-full bg-black rounded border border-gray-700 cursor-ns-resize touch-none"
            onMouseDown={(e) => { isDragging.current = true; handleMove(e); }}
            onMouseMove={handleMove}
            onMouseUp={() => isDragging.current = false}
            onMouseLeave={() => isDragging.current = false}
            onTouchStart={(e) => { isDragging.current = true; handleMove(e); }}
            onTouchMove={handleMove}
            onTouchEnd={() => isDragging.current = false}
        />
    );
};

// --- MAIN COMPONENT ---
const SerumSynth: React.FC<SerumSynthProps> = ({ onClose }) => {
    // AUDIO REFS
    const ctx = useRef<AudioContext | null>(null);
    const master = useRef<GainNode | null>(null);
    const lfoOsc = useRef<OscillatorNode | null>(null);
    const lfoGain = useRef<GainNode | null>(null); // To filter mod
    const voices = useRef<Map<number, SerumVoice>>(new Map());
    
    // FX
    const fxInput = useRef<GainNode | null>(null);
    const dist = useRef<WaveShaperNode | null>(null);
    const delay = useRef<DelayNode | null>(null);
    const verb = useRef<ConvolverNode | null>(null); // Placeholder/Sim
    const comp = useRef<DynamicsCompressorNode | null>(null);

    // PARAM STATE
    const [wtPos, setWtPos] = useState(0.5);
    const [unison, setUnison] = useState(1);
    const [detune, setDetune] = useState(0.2);
    const [blend, setBlend] = useState(0.7);
    const [warpMode, setWarpMode] = useState<WarpMode>('Off');
    const [warpAmt, setWarpAmt] = useState(0);
    const [coarse, setCoarse] = useState(0);
    const [subVol, setSubVol] = useState(0);
    const [noiseVol, setNoiseVol] = useState(0);

    const [cutoff, setCutoff] = useState(2000);
    const [res, setRes] = useState(0);
    const [drive, setDrive] = useState(0);
    const [filterType, setFilterType] = useState<FilterType>('lowpass');

    const [envA, setEnvA] = useState(0.01);
    const [envD, setEnvD] = useState(0.4);
    const [envS, setEnvS] = useState(0.5);
    const [envR, setEnvR] = useState(0.4);
    
    const [envMod, setEnvMod] = useState(0); // Env 1 to Filter Amount

    const [lfoRate, setLfoRate] = useState(1);
    const [lfoDepth, setLfoDepth] = useState(0);
    const [lfoShape, setLfoShape] = useState<'sine'|'sawtooth'|'square'>('sine');

    // FX State
    const [fxDist, setFxDist] = useState(0);
    const [fxDelay, setFxDelay] = useState(0);
    const [fxRev, setFxRev] = useState(0);
    const [fxComp, setFxComp] = useState(0);

    const [activeNotes, setActiveNotes] = useState<number[]>([]);
    const [showPresets, setShowPresets] = useState(false);

    // INIT ENGINE
    useEffect(() => {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        ctx.current = audioCtx;

        const mGain = audioCtx.createGain();
        mGain.gain.value = 0.4;
        master.current = mGain;

        // FX Chain setup
        const fIn = audioCtx.createGain();
        fxInput.current = fIn;

        // 1. Distortion
        const dNode = audioCtx.createWaveShaper();
        dNode.curve = makeDistCurve(0); // Init
        dist.current = dNode;

        // 2. Delay
        const delNode = audioCtx.createDelay();
        delNode.delayTime.value = 0.3;
        const delFb = audioCtx.createGain();
        delFb.gain.value = 0.4;
        delNode.connect(delFb);
        delFb.connect(delNode);
        delay.current = delNode;

        // 3. Compressor
        const cNode = audioCtx.createDynamicsCompressor();
        comp.current = cNode;

        // Chain: VoiceSum -> Dist -> Delay -> Comp -> Master
        // We use wet/dry mix logic for each. Simplified serial chain for now.
        
        fIn.connect(dNode);
        dNode.connect(delNode);
        dNode.connect(cNode); // Dry signal bypassing delay
        delNode.connect(cNode);
        cNode.connect(mGain);
        mGain.connect(audioCtx.destination);

        // LFO (Global for visual/simple mod)
        const l = audioCtx.createOscillator();
        l.frequency.value = lfoRate;
        l.start();
        const lg = audioCtx.createGain();
        lg.gain.value = 0;
        l.connect(lg);
        lfoOsc.current = l;
        lfoGain.current = lg;

        return () => { audioCtx.close(); }
    }, []);

    // PARAM UPDATES
    useEffect(() => {
        if(lfoOsc.current) lfoOsc.current.frequency.setTargetAtTime(lfoRate, ctx.current!.currentTime, 0.1);
        if(lfoGain.current) lfoGain.current.gain.setTargetAtTime(lfoDepth, ctx.current!.currentTime, 0.1);
        
        if(dist.current) dist.current.curve = makeDistCurve(fxDist * 100);
        
        // Update live voices (optional optimization: only update on new note?)
        // For Filter cutoff/res/LFO, we want live updates
        voices.current.forEach(v => {
            v.filter.frequency.setTargetAtTime(cutoff, ctx.current!.currentTime, 0.1);
            v.filter.Q.setTargetAtTime(res, ctx.current!.currentTime, 0.1);
            
            // Connect global LFO to voice filter if depth > 0
            if (lfoDepth > 0) {
                // Reconnect logic if needed, or update gain
                // Since lfoGain is global, we need to connect it to voice lfoTargets
                // We'll do this on noteOn, but update gain here
            }
        });

    }, [lfoRate, lfoDepth, cutoff, res, fxDist]);

    const makeDistCurve = (amount: number) => {
        const k = amount;
        const n_samples = 44100;
        const curve = new Float32Array(n_samples);
        for (let i = 0; i < n_samples; ++i) {
            const x = i * 2 / n_samples - 1;
            curve[i] = (3 + k) * x * 20 * (Math.PI / 180) / (Math.PI + k * Math.abs(x));
        }
        return curve;
    };

    const handleNoteOn = (note: number) => {
        if (!ctx.current || !fxInput.current) return;
        if (ctx.current.state === 'suspended') ctx.current.resume();

        // Kill existing
        if (voices.current.has(note)) {
            voices.current.get(note)?.release(0.05);
        }

        const params = {
            wtPos, unison, detune, warpMode, warpAmt,
            subVol, cutoff, res, filterType,
            envA, envD, envS, envR, envMod,
            lfoDepth
        };

        const v = new SerumVoice(ctx.current, fxInput.current, 440 * Math.pow(2, (note-69)/12), params);
        
        // Connect LFO
        if (lfoGain.current) lfoGain.current.connect(v.lfoTarget);

        voices.current.set(note, v);
        setActiveNotes(prev => [...prev, note]);
    };

    const handleNoteOff = (note: number) => {
        const v = voices.current.get(note);
        if (v) {
            v.release(envR);
            setTimeout(() => {
                voices.current.delete(note);
            }, (envR * 1000) + 200);
        }
        setActiveNotes(prev => prev.filter(n => n !== note));
    };

    const loadPreset = (p: any) => {
        const s = p.settings;
        if(s.wtPos !== undefined) setWtPos(s.wtPos);
        if(s.unison !== undefined) setUnison(s.unison);
        if(s.detune !== undefined) setDetune(s.detune);
        if(s.cutoff !== undefined) setCutoff(s.cutoff);
        if(s.res !== undefined) setRes(s.res);
        if(s.warpMode) setWarpMode(s.warpMode);
        if(s.warpAmt !== undefined) setWarpAmt(s.warpAmt);
        if(s.envA !== undefined) setEnvA(s.envA);
        if(s.envD !== undefined) setEnvD(s.envD);
        if(s.envS !== undefined) setEnvS(s.envS);
        if(s.envR !== undefined) setEnvR(s.envR);
        if(s.envMod !== undefined) setEnvMod(s.envMod);
        if(s.lfoRate !== undefined) setLfoRate(s.lfoRate);
        if(s.lfoDepth !== undefined) setLfoDepth(s.lfoDepth);
        
        if(s.fxDist !== undefined) setFxDist(s.fxDist);

        setShowPresets(false);
    };

    const WARP = ['Off', 'Sync', 'FM (Sub)', 'AM (Sub)'] as WarpMode[];
    const FILT = ['lowpass', 'highpass', 'bandpass'] as FilterType[];
    const LFOS = ['sine', 'sawtooth', 'square'] as const;

    return (
        <SynthShell name="Serum Mini" tag="Wavetable · 3D Warp · Unison" onClose={onClose} accent={PANEL.brass}>
            <Engrave>Patch</Engrave>
            <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4 }}>
                {PRESETS.map((pr, i) => (
                    <button key={i} onClick={() => loadPreset(pr)} style={{ flex: '0 0 auto', padding: '8px 12px', borderRadius: 7, cursor: 'pointer', fontFamily: '"JetBrains Mono", monospace', fontSize: 10, letterSpacing: 0.5, textTransform: 'uppercase', whiteSpace: 'nowrap', border: `1px solid ${PANEL.line}`, background: '#181410', color: PANEL.inkMute }}>{pr.name}</button>
                ))}
            </div>

            <Engrave>Oscillator</Engrave>
            <KnobRow>
                <Knob label="WT Pos" value={wtPos} min={0} max={1} step={0.01} onChange={setWtPos} size={54} />
                <Knob label="Unison" value={unison} min={1} max={7} step={1} onChange={setUnison} size={54} />
                <Knob label="Detune" value={detune} min={0} max={1} step={0.01} onChange={setDetune} size={54} />
                <Knob label="Blend" value={blend} min={0} max={1} step={0.01} onChange={setBlend} size={54} />
                <Knob label="Coarse" value={coarse} min={-24} max={24} step={1} onChange={setCoarse} size={54} />
                <Knob label="Sub" value={subVol} min={0} max={1} step={0.01} onChange={setSubVol} size={54} />
                <Knob label="Noise" value={noiseVol} min={0} max={1} step={0.01} onChange={setNoiseVol} size={54} />
                <Knob label="Warp" value={warpAmt} min={0} max={1} step={0.01} onChange={setWarpAmt} size={54} />
            </KnobRow>
            <Rocker label="Warp Mode" options={WARP} value={WARP.indexOf(warpMode)} onChange={(i) => setWarpMode(WARP[i])} />

            <Engrave>Filter</Engrave>
            <KnobRow>
                <Knob label="Cutoff" value={cutoff} min={50} max={12000} log onChange={setCutoff} format={(v) => `${Math.round(v)}`} size={58} />
                <Knob label="Reso" value={res} min={0} max={30} onChange={setRes} size={58} />
                <Knob label="Drive" value={drive} min={0} max={1} step={0.01} onChange={setDrive} size={58} />
            </KnobRow>
            <Rocker label="Type" options={['LP', 'HP', 'BP']} value={FILT.indexOf(filterType)} onChange={(i) => setFilterType(FILT[i])} />

            <Engrave>Envelope</Engrave>
            <KnobRow>
                <Knob label="Attack" value={envA} min={0.001} max={4} step={0.01} onChange={setEnvA} format={(v) => `${v.toFixed(2)}s`} size={50} />
                <Knob label="Decay" value={envD} min={0.01} max={4} step={0.01} onChange={setEnvD} format={(v) => `${v.toFixed(2)}s`} size={50} />
                <Knob label="Sustain" value={envS} min={0} max={1} step={0.01} onChange={setEnvS} size={50} />
                <Knob label="Release" value={envR} min={0.01} max={5} step={0.01} onChange={setEnvR} format={(v) => `${v.toFixed(2)}s`} size={50} />
                <Knob label="Env→Cut" value={envMod} min={0} max={1} step={0.01} onChange={setEnvMod} size={50} />
            </KnobRow>

            <Engrave>LFO · FX</Engrave>
            <KnobRow>
                <Knob label="LFO Rate" value={lfoRate} min={0.1} max={20} step={0.1} onChange={setLfoRate} format={(v) => `${v.toFixed(1)}`} size={50} />
                <Knob label="LFO Dep" value={lfoDepth} min={0} max={1} step={0.01} onChange={setLfoDepth} size={50} />
                <Knob label="Dist" value={fxDist} min={0} max={1} step={0.01} onChange={setFxDist} size={50} />
                <Knob label="Delay" value={fxDelay} min={0} max={1} step={0.01} onChange={setFxDelay} size={50} />
                <Knob label="Reverb" value={fxRev} min={0} max={1} step={0.01} onChange={setFxRev} size={50} />
                <Knob label="Comp" value={fxComp} min={0} max={1} step={0.01} onChange={setFxComp} size={50} />
            </KnobRow>
            <Rocker label="LFO Shape" options={['Sin', 'Saw', 'Sqr']} value={LFOS.indexOf(lfoShape)} onChange={(i) => setLfoShape(LFOS[i])} />

            <Engrave>Keyboard</Engrave>
            <Keys octaves={2} startMidi={48} activeNotes={activeNotes} onNoteOn={handleNoteOn} onNoteOff={handleNoteOff} />
        </SynthShell>
    );
};

export default SerumSynth;
