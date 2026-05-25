
import React, { useState, useEffect, useRef } from 'react';

interface SpectravoxProps {
  onClose: () => void;
}

class SpectravoxEngine {
    ctx: AudioContext;
    master: GainNode;
    analyser: AnalyserNode;
    
    // Source
    osc: OscillatorNode;
    modulator: OscillatorNode; // For FM or Vocoder carrier simulation
    
    // Filter Bank (10 Bands)
    filters: BiquadFilterNode[] = [];
    gains: GainNode[] = [];
    
    // LFO
    lfo: OscillatorNode;
    lfoGain: GainNode;

    constructor() {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        this.master = this.ctx.createGain();
        this.master.gain.value = 0.4;
        
        this.analyser = this.ctx.createAnalyser();
        this.analyser.fftSize = 256;
        
        this.master.connect(this.analyser);
        this.analyser.connect(this.ctx.destination);

        // Carrier Oscillator (Drone)
        this.osc = this.ctx.createOscillator();
        this.osc.type = 'sawtooth';
        this.osc.frequency.value = 110; // A2
        this.osc.start();

        // Modulator (for spectral movement)
        this.modulator = this.ctx.createOscillator();
        this.modulator.frequency.value = 5;
        this.modulator.start();

        // LFO
        this.lfo = this.ctx.createOscillator();
        this.lfo.frequency.value = 0.5;
        this.lfo.start();
        this.lfoGain = this.ctx.createGain();
        this.lfoGain.gain.value = 0;
        this.lfo.connect(this.lfoGain);

        // 10 Band Filter Bank
        // Frequencies based on Moog Spectravox (approx)
        const freqs = [110, 220, 330, 440, 660, 880, 1200, 1800, 2600, 4000];
        
        freqs.forEach(f => {
            const filter = this.ctx.createBiquadFilter();
            filter.type = 'bandpass';
            filter.frequency.value = f;
            filter.Q.value = 4.0; // High Q for formant sounds
            
            // Connect LFO to Filter Freq
            this.lfoGain.connect(filter.frequency);

            const gain = this.ctx.createGain();
            gain.gain.value = 0.5; 
            
            this.osc.connect(filter);
            filter.connect(gain);
            gain.connect(this.master);
            
            this.filters.push(filter);
            this.gains.push(gain);
        });
    }

    setMode(mode: 'DRONE' | 'VOCODER') {
        // Simulating mode switch by changing osc source type or routing
        if (mode === 'DRONE') {
            this.osc.type = 'sawtooth';
        } else {
            this.osc.type = 'square'; // Richer harmonics for "vocoder" feel
        }
    }

    setBandGain(index: number, value: number) {
        if (this.gains[index]) {
            this.gains[index].gain.setTargetAtTime(value, this.ctx.currentTime, 0.1);
        }
    }

    setShift(semitones: number) {
        const baseFreqs = [110, 220, 330, 440, 660, 880, 1200, 1800, 2600, 4000];
        const multiplier = Math.pow(2, semitones / 12);
        
        this.filters.forEach((f, i) => {
            f.frequency.setTargetAtTime(baseFreqs[i] * multiplier, this.ctx.currentTime, 0.1);
        });
    }

    setLfo(rate: number, depth: number) {
        this.lfo.frequency.setTargetAtTime(rate, this.ctx.currentTime, 0.1);
        this.lfoGain.gain.setTargetAtTime(depth * 500, this.ctx.currentTime, 0.1); // depth affects freq swing
    }

    setResonance(val: number) {
        // Scale Q
        const q = 1 + val * 20;
        this.filters.forEach(f => f.Q.setTargetAtTime(q, this.ctx.currentTime, 0.1));
    }
}

const Spectravox: React.FC<SpectravoxProps> = ({ onClose }) => {
    const engine = useRef<SpectravoxEngine | null>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const rafRef = useRef<number | null>(null);

    const [mode, setMode] = useState<'DRONE' | 'VOCODER'>('DRONE');
    const [sliderVals, setSliderVals] = useState<number[]>(new Array(10).fill(0.5));
    const [shift, setShift] = useState(0);
    const [lfoRate, setLfoRate] = useState(0.5);
    const [lfoDepth, setLfoDepth] = useState(0);
    const [resonance, setResonance] = useState(0.2);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [patchMode, setPatchMode] = useState(false);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [sourceJack, setSourceJack] = useState<string | null>(null);

    useEffect(() => {
        engine.current = new SpectravoxEngine();
        engine.current.setMode('DRONE');
        
        const draw = (_time?: number) => {
            if (!canvasRef.current || !engine.current) return;
            const ctx = canvasRef.current.getContext('2d');
            if (!ctx) return;
            
            const w = canvasRef.current.width;
            const h = canvasRef.current.height;
            const bufferLength = engine.current.analyser.frequencyBinCount;
            const dataArray = new Uint8Array(bufferLength);
            engine.current.analyser.getByteFrequencyData(dataArray);

            // Clear
            ctx.fillStyle = '#1a1a1a';
            ctx.fillRect(0, 0, w, h);

            // Grid
            ctx.strokeStyle = '#333';
            ctx.lineWidth = 1;
            for(let i=0; i<10; i++) {
                const x = (i/10) * w;
                ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,h); ctx.stroke();
            }

            // Spectrum Bars
            const barWidth = (w / bufferLength) * 2.5;
            let x = 0;

            for(let i = 0; i < bufferLength; i++) {
                const barHeight = dataArray[i];
                // Heatmap color
                const r = barHeight + 25 * (i/bufferLength);
                const g = 250 * (i/bufferLength);
                const b = 50;

                ctx.fillStyle = `rgba(${r},${g},${b}, 0.8)`;
                ctx.fillRect(x, h - (barHeight/255)*h, barWidth, (barHeight/255)*h);
                x += barWidth + 1;
            }
            rafRef.current = requestAnimationFrame(draw);
        };
        draw();

        return () => {
            if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
            engine.current?.ctx.close();
        };
    }, []);

    // Parameter Updates
    useEffect(() => {
        engine.current?.setMode(mode);
    }, [mode]);

    useEffect(() => {
        sliderVals.forEach((val, i) => engine.current?.setBandGain(i, val));
    }, [sliderVals]);

    useEffect(() => {
        engine.current?.setShift(shift);
    }, [shift]);

    useEffect(() => {
        engine.current?.setLfo(lfoRate, lfoDepth);
    }, [lfoRate, lfoDepth]);

    useEffect(() => {
        engine.current?.setResonance(resonance);
    }, [resonance]);

    const handleSliderChange = (index: number, val: number) => {
        const newVals = [...sliderVals];
        newVals[index] = val;
        setSliderVals(newVals);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 animate-fade-in font-sans select-none">
            <div className="relative w-full max-w-5xl bg-[#2b2b2b] rounded-xl shadow-2xl overflow-hidden border-8 border-[#111] flex flex-col">
                
                {/* Header */}
                <div className="flex-none p-4 bg-[#111] border-b border-[#333] flex justify-between items-center">
                    <h1 className="text-2xl font-black text-white tracking-widest uppercase">Spectravox</h1>
                    <button onClick={onClose} className="text-gray-500 hover:text-white font-bold">✕</button>
                </div>

                {/* Main Interface */}
                <div className="flex-1 p-6 flex flex-col gap-6">
                    
                    {/* Visualizer */}
                    <div className="w-full h-32 bg-black rounded border border-[#444] overflow-hidden relative shadow-inner">
                        <canvas ref={canvasRef} width={800} height={200} className="w-full h-full" />
                        <div className="absolute top-2 left-2 text-[10px] text-gray-500 font-bold">SPECTRAL ANALYSIS</div>
                    </div>

                    {/* Filter Bank */}
                    <div className="flex justify-between items-end h-64 px-4 bg-[#222] rounded border border-[#333] p-4 relative">
                        {/* Background Grid Lines */}
                        <div className="absolute inset-0 flex justify-between px-8 pointer-events-none opacity-20">
                            {Array(10).fill(0).map((_,i) => <div key={i} className="w-px h-full bg-white"></div>)}
                        </div>

                        {sliderVals.map((val, i) => (
                            <div key={i} className="flex flex-col items-center gap-2 w-full z-10">
                                <div className="h-48 w-8 bg-[#111] rounded-full relative border border-[#444] shadow-inner">
                                    <input 
                                        type="range" 
                                        min="0" max="1" step="0.01" 
                                        value={val} 
                                        onChange={(e) => handleSliderChange(i, parseFloat(e.target.value))}
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-ns-resize"
                                    />
                                    <div 
                                        className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-orange-900 to-orange-500 rounded-b-full transition-all duration-75 pointer-events-none"
                                        style={{ height: `${val * 100}%` }}
                                    >
                                        <div className="absolute top-0 left-0 right-0 h-1 bg-white opacity-50"></div>
                                    </div>
                                </div>
                                <span className="text-[10px] font-bold text-gray-400">{i+1}</span>
                            </div>
                        ))}
                    </div>

                    {/* Controls Row */}
                    <div className="flex gap-4 h-32">
                        {/* Master Section */}
                        <div className="flex-1 bg-[#1a1a1a] rounded border border-[#333] p-4 flex gap-4 items-center justify-around">
                            <div className="flex flex-col items-center gap-2">
                                <span className="text-[10px] text-gray-400 font-bold">SHIFT</span>
                                <input type="range" min="-12" max="12" value={shift} onChange={(e)=>setShift(parseFloat(e.target.value))} className="w-24 accent-orange-500" />
                            </div>
                            <div className="flex flex-col items-center gap-2">
                                <span className="text-[10px] text-gray-400 font-bold">RESONANCE</span>
                                <input type="range" min="0" max="1" step="0.01" value={resonance} onChange={(e)=>setResonance(parseFloat(e.target.value))} className="w-24 accent-orange-500" />
                            </div>
                        </div>

                        {/* LFO Section */}
                        <div className="flex-1 bg-[#1a1a1a] rounded border border-[#333] p-4 flex gap-4 items-center justify-around">
                            <div className="flex flex-col items-center gap-2">
                                <span className="text-[10px] text-gray-400 font-bold">LFO RATE</span>
                                <input type="range" min="0.1" max="20" step="0.1" value={lfoRate} onChange={(e)=>setLfoRate(parseFloat(e.target.value))} className="w-24 accent-blue-500" />
                            </div>
                            <div className="flex flex-col items-center gap-2">
                                <span className="text-[10px] text-gray-400 font-bold">LFO DEPTH</span>
                                <input type="range" min="0" max="1" step="0.01" value={lfoDepth} onChange={(e)=>setLfoDepth(parseFloat(e.target.value))} className="w-24 accent-blue-500" />
                            </div>
                        </div>

                        {/* Mode */}
                        <div className="w-32 bg-[#1a1a1a] rounded border border-[#333] p-4 flex flex-col justify-center gap-2">
                            <button 
                                onClick={() => setMode('DRONE')}
                                className={`flex-1 rounded text-xs font-bold ${mode === 'DRONE' ? 'bg-orange-600 text-white' : 'bg-[#333] text-gray-500'}`}
                            >
                                DRONE
                            </button>
                            <button 
                                onClick={() => setMode('VOCODER')}
                                className={`flex-1 rounded text-xs font-bold ${mode === 'VOCODER' ? 'bg-orange-600 text-white' : 'bg-[#333] text-gray-500'}`}
                            >
                                VOCODER
                            </button>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default Spectravox;
