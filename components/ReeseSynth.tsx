
import React, { useState, useEffect, useRef } from 'react';

interface ReeseSynthProps {
  onClose: () => void;
}

function makeDistortionCurve(amount: number) {
  const k = typeof amount === 'number' ? amount : 50;
  const n_samples = 44100;
  const curve = new Float32Array(n_samples);
  const deg = Math.PI / 180;
  for (let i = 0; i < n_samples; ++i) {
    const x = i * 2 / n_samples - 1;
    curve[i] = (3 + k) * x * 20 * deg / (Math.PI + k * Math.abs(x));
  }
  return curve;
}

class ReeseEngine {
    ctx: AudioContext;
    master: GainNode;
    analyser: AnalyserNode;
    
    // Voices
    oscs: OscillatorNode[] = [];
    gains: GainNode[] = [];
    
    // Processing
    filter: BiquadFilterNode;
    distortion: WaveShaperNode;
    compressor: DynamicsCompressorNode;

    constructor() {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        this.master = this.ctx.createGain();
        this.master.gain.value = 0.0; // Start silent, envelope controlled manually or gate
        
        this.analyser = this.ctx.createAnalyser();
        this.analyser.fftSize = 2048;

        this.filter = this.ctx.createBiquadFilter();
        this.filter.type = 'lowpass';
        this.filter.frequency.value = 800;
        this.filter.Q.value = 1;

        this.distortion = this.ctx.createWaveShaper();
        this.distortion.curve = makeDistortionCurve(50);
        this.distortion.oversample = '4x';

        this.compressor = this.ctx.createDynamicsCompressor();
        this.compressor.threshold.value = -20;
        this.compressor.ratio.value = 12;

        // Routing: Oscs -> Dist -> Filter -> Comp -> Master -> Analyser -> Out
        this.distortion.connect(this.filter);
        this.filter.connect(this.compressor);
        this.compressor.connect(this.master);
        this.master.connect(this.analyser);
        this.analyser.connect(this.ctx.destination);

        // Reese Generators: Multiple Sawtooths, Detuned
        const detunes = [-15, -5, 0, 5, 15]; // Cents
        const baseFreq = 55; // Low A (A1)

        detunes.forEach(d => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            
            osc.type = 'sawtooth';
            osc.frequency.value = baseFreq;
            osc.detune.value = d;
            
            gain.gain.value = 0.2; // Mix down

            osc.connect(gain);
            gain.connect(this.distortion);
            
            osc.start();
            
            this.oscs.push(osc);
            this.gains.push(gain);
        });
    }

    setCutoff(val: number) {
        this.filter.frequency.setTargetAtTime(val, this.ctx.currentTime, 0.1);
    }

    setDistortion(val: number) {
        this.distortion.curve = makeDistortionCurve(val);
    }

    setDetuneSpread(spread: number) {
        // spread multiplier
        const baseDetunes = [-15, -5, 0, 5, 15];
        this.oscs.forEach((osc, i) => {
            osc.detune.setTargetAtTime(baseDetunes[i] * spread, this.ctx.currentTime, 0.1);
        });
    }

    trigger(active: boolean) {
        const now = this.ctx.currentTime;
        if (active) {
            this.master.gain.cancelScheduledValues(now);
            this.master.gain.setValueAtTime(this.master.gain.value, now);
            this.master.gain.linearRampToValueAtTime(0.8, now + 0.1); // Attack
        } else {
            this.master.gain.cancelScheduledValues(now);
            this.master.gain.setValueAtTime(this.master.gain.value, now);
            this.master.gain.exponentialRampToValueAtTime(0.001, now + 0.5); // Release
        }
    }
    
    setNote(midiNote: number) {
        const freq = 440 * Math.pow(2, (midiNote - 69) / 12);
        this.oscs.forEach(osc => {
            osc.frequency.setTargetAtTime(freq, this.ctx.currentTime, 0.05); // Portamento
        });
    }
}

const ReeseSynth: React.FC<ReeseSynthProps> = ({ onClose }) => {
    const engine = useRef<ReeseEngine | null>(null);
    
    // Params
    const [cutoff, setCutoff] = useState(800);
    const [distortion, setDistortion] = useState(50);
    const [spread, setSpread] = useState(1);
    const [isPlaying, setIsPlaying] = useState(false);
    
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [isHold, setIsHold] = useState(false);
    
    // Canvas for Visualizer
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const rafRef = useRef<number | null>(null);

    useEffect(() => {
        engine.current = new ReeseEngine();
        
        // Init visualizer
        const draw = (_time?: number) => {
            if (!canvasRef.current || !engine.current) return;
            const ctx = canvasRef.current.getContext('2d');
            if (!ctx) return;
            
            const w = canvasRef.current.width;
            const h = canvasRef.current.height;
            const bufferLen = engine.current.analyser.frequencyBinCount;
            const data = new Uint8Array(bufferLen);
            engine.current.analyser.getByteTimeDomainData(data); // Waveform

            ctx.fillStyle = '#0f0716'; // Deep purple black
            ctx.fillRect(0, 0, w, h);
            
            ctx.lineWidth = 3;
            ctx.strokeStyle = '#a855f7'; // Purple 500
            ctx.beginPath();
            
            const sliceWidth = w * 1.0 / bufferLen;
            let x = 0;
            
            for (let i = 0; i < bufferLen; i++) {
                const v = data[i] / 128.0;
                const y = v * h / 2;
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
                x += sliceWidth;
            }
            ctx.stroke();
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
        engine.current?.setCutoff(cutoff);
    }, [cutoff]);

    useEffect(() => {
        engine.current?.setDistortion(distortion);
    }, [distortion]);

    useEffect(() => {
        engine.current?.setDetuneSpread(spread);
    }, [spread]);

    // Handle Pad Play
    const handlePadDown = () => {
        setIsPlaying(true);
        engine.current?.trigger(true);
    };
    const handlePadUp = () => {
        if(!isHold) {
            setIsPlaying(false);
            engine.current?.trigger(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 animate-fade-in font-mono select-none">
            <div className="relative w-full max-w-xl bg-[#150a20] rounded-xl shadow-[0_0_50px_rgba(168,85,247,0.3)] overflow-hidden border-2 border-purple-900 flex flex-col">
                
                {/* Header */}
                <div className="p-4 border-b border-purple-900/50 flex justify-between items-center bg-[#1e0e2e]">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-purple-600 rounded flex items-center justify-center font-black text-xl">R</div>
                        <h1 className="text-xl font-bold text-purple-100 uppercase tracking-widest">Reese Bass</h1>
                    </div>
                    <button onClick={onClose} className="text-purple-400 hover:text-white font-bold text-xl">✕</button>
                </div>

                {/* Visualizer */}
                <div className="h-40 w-full relative">
                    <canvas ref={canvasRef} width={600} height={200} className="w-full h-full" />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#150a20] to-transparent opacity-50"></div>
                </div>

                {/* Controls */}
                <div className="flex-1 p-6 flex flex-col gap-8">
                    
                    {/* XY-ish Sliders */}
                    <div className="grid grid-cols-3 gap-4">
                        <div className="flex flex-col items-center gap-2">
                            <span className="text-xs font-bold text-purple-400">CUTOFF</span>
                            <input 
                                type="range" min="50" max="5000" value={cutoff} 
                                onChange={(e) => setCutoff(parseFloat(e.target.value))}
                                className="h-32 w-2 appearance-none bg-purple-900 rounded outline-none slider-vertical accent-purple-500"
                                style={{ writingMode: 'vertical-lr' } as any}
                            />
                        </div>
                        <div className="flex flex-col items-center gap-2">
                            <span className="text-xs font-bold text-purple-400">DIRT</span>
                            <input 
                                type="range" min="0" max="400" value={distortion} 
                                onChange={(e) => setDistortion(parseFloat(e.target.value))}
                                className="h-32 w-2 appearance-none bg-purple-900 rounded outline-none slider-vertical accent-red-500"
                                style={{ writingMode: 'vertical-lr' } as any}
                            />
                        </div>
                        <div className="flex flex-col items-center gap-2">
                            <span className="text-xs font-bold text-purple-400">WIDTH</span>
                            <input 
                                type="range" min="0" max="3" step="0.1" value={spread} 
                                onChange={(e) => setSpread(parseFloat(e.target.value))}
                                className="h-32 w-2 appearance-none bg-purple-900 rounded outline-none slider-vertical accent-blue-500"
                                style={{ writingMode: 'vertical-lr' } as any}
                            />
                        </div>
                    </div>

                    {/* Trigger Pad */}
                    <button
                        onMouseDown={handlePadDown}
                        onMouseUp={handlePadUp}
                        onMouseLeave={handlePadUp}
                        onTouchStart={(e) => { e.preventDefault(); handlePadDown(); }}
                        onTouchEnd={(e) => { e.preventDefault(); handlePadUp(); }}
                        className={`w-full h-24 rounded-xl border-4 font-black text-2xl tracking-widest transition-all
                            ${isPlaying 
                                ? 'bg-purple-600 border-purple-400 text-white shadow-[0_0_30px_#a855f7] scale-95' 
                                : 'bg-[#2a1b3d] border-purple-900 text-purple-700 hover:bg-[#36234d] hover:text-purple-500'
                            }
                        `}
                    >
                        BASS DROP
                    </button>

                    {/* Note Selector (Simple) */}
                    <div className="flex justify-center gap-2">
                        {[36, 38, 40, 41, 43, 45, 47, 48].map(note => (
                            <button 
                                key={note}
                                onClick={() => engine.current?.setNote(note)}
                                className="w-8 h-8 rounded bg-purple-900/50 border border-purple-700 text-xs font-bold text-purple-300 hover:bg-purple-600 hover:text-white"
                            >
                                {note}
                            </button>
                        ))}
                    </div>

                </div>
            </div>
        </div>
    );
};

export default ReeseSynth;
