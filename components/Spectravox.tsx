
import React, { useState, useEffect, useRef } from 'react';
import { SynthShell, Scope, Knob, KnobRow, Fader, Rocker, Engrave, PANEL } from './synthkit';

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
    const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);

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
        const eng = new SpectravoxEngine();
        engine.current = eng;
        eng.setMode('DRONE');
        setAnalyser(eng.analyser);
        return () => { eng.ctx.close(); };
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
        <SynthShell name="Spectravox" tag="10-Band Vocoder · Spectral Drone" onClose={onClose} accent={PANEL.brass}>
            <Scope analyser={analyser} mode="bars" height={88} />
            <Engrave>Formant Bank</Engrave>
            <div style={{ display: 'flex', gap: 4, padding: '12px 8px', borderRadius: 8, background: 'rgba(0,0,0,0.2)', boxShadow: `inset 0 0 0 1px ${PANEL.line}` }}>
                {sliderVals.map((val, i) => (
                    <Fader key={i} label={`${i + 1}`} value={val} onChange={(v) => handleSliderChange(i, v)} height={120} />
                ))}
            </div>
            <Engrave>Voice</Engrave>
            <KnobRow>
                <Knob label="Shift" value={shift} min={-12} max={12} step={1} onChange={setShift} format={(v) => `${v > 0 ? '+' : ''}${v}`} />
                <Knob label="Resonance" value={resonance} min={0} max={1} step={0.01} onChange={setResonance} />
                <Knob label="LFO Rate" value={lfoRate} min={0.1} max={20} step={0.1} onChange={setLfoRate} format={(v) => `${v.toFixed(1)}Hz`} />
                <Knob label="LFO Depth" value={lfoDepth} min={0} max={1} step={0.01} onChange={setLfoDepth} />
            </KnobRow>
            <Rocker label="Mode" options={['Drone', 'Vocoder']} value={mode === 'DRONE' ? 0 : 1} onChange={(i) => setMode(i === 0 ? 'DRONE' : 'VOCODER')} />
        </SynthShell>
    );
};

export default Spectravox;
