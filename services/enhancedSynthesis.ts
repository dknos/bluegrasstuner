
import { humanizeVelocity, humanizeTiming, humanizePitch, getStrumDuration } from './humanizationEngine';

class BodyResonanceFilter {
    input: GainNode;
    output: GainNode;
    filters: BiquadFilterNode[] = [];

    constructor(ctx: AudioContext) {
        this.input = ctx.createGain();
        this.output = ctx.createGain();
        
        // Reduced gain on body resonances to prevent boominess
        const resonances = [
            { f: 98, q: 2.5, g: 1.5 },   
            { f: 200, q: 2.0, g: 1.0 },  
            { f: 400, q: 1.5, g: 0.8 },  
            { f: 800, q: 1.0, g: -2.0 }, 
            { f: 2500, q: 0.8, g: 1.0 }, 
            { f: 5000, q: 0.5, g: 0.8 }  
        ];

        resonances.forEach(res => {
            const filter = ctx.createBiquadFilter();
            filter.type = 'peaking';
            filter.frequency.value = res.f;
            filter.Q.value = res.q;
            filter.gain.value = res.g;
            
            this.input.connect(filter);
            filter.connect(this.output);
            this.filters.push(filter);
        });
        
        const dry = ctx.createGain();
        dry.gain.value = 0.6; // More dry signal for clarity
        this.input.connect(dry);
        dry.connect(this.output);
    }
}

class GuitarStringOscillator {
    ctx: AudioContext;
    constructor(ctx: AudioContext) { this.ctx = ctx; }

    play(dest: AudioNode, freq: number, time: number, velocity: number) {
        const osc1 = this.ctx.createOscillator();
        osc1.type = 'triangle';
        osc1.frequency.value = humanizePitch(freq, 2); // Less detune

        const osc2 = this.ctx.createOscillator();
        osc2.type = 'sawtooth';
        osc2.frequency.value = humanizePitch(freq, 2); 
        osc2.detune.value = 3; 

        const env = this.ctx.createGain();
        env.gain.value = 0;

        osc1.connect(env);
        osc2.connect(env);
        env.connect(dest);

        // Mix: Lower gain to prevent clipping when summing 6 strings
        // Reduced oscillator gains significantly
        const sawGain = this.ctx.createGain();
        sawGain.gain.value = 0.08 + (velocity * 0.05); // Max ~0.13
        osc2.disconnect(); osc2.connect(sawGain); sawGain.connect(env);

        // ADSR - Tighter for Strum Machine feel
        const attack = 0.005; // Snap attack
        const decay = 0.3;
        const sustain = 0.4 * velocity; // Lower sustain
        const release = 1.2; // Moderate ring, not endless

        const startTime = humanizeTiming(time, 8);
        const startVel = humanizeVelocity(velocity) * 0.4; // Global attenuation

        osc1.start(startTime);
        osc2.start(startTime);
        
        env.gain.cancelScheduledValues(startTime);
        env.gain.setValueAtTime(0, startTime);
        env.gain.linearRampToValueAtTime(startVel, startTime + attack);
        env.gain.exponentialRampToValueAtTime(sustain * startVel, startTime + attack + decay);
        env.gain.exponentialRampToValueAtTime(0.001, startTime + release);
        
        const stopTime = startTime + release;
        osc1.stop(stopTime);
        osc2.stop(stopTime);
    }
}

class BassStringOscillator {
    ctx: AudioContext;
    constructor(ctx: AudioContext) { this.ctx = ctx; }

    play(dest: AudioNode, freq: number, time: number, velocity: number) {
        // Bass is one octave down, sine/tri blend, mono
        const osc = this.ctx.createOscillator();
        osc.type = 'triangle';
        const bassFreq = freq < 70 ? freq : freq / 2;
        osc.frequency.value = bassFreq;

        const sub = this.ctx.createOscillator();
        sub.type = 'sine';
        sub.frequency.value = bassFreq;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 600;

        const env = this.ctx.createGain();
        env.gain.value = 0;

        osc.connect(filter);
        sub.connect(filter);
        filter.connect(env);
        env.connect(dest);

        const startTime = humanizeTiming(time, 5);
        const startVel = humanizeVelocity(velocity, 0.05) * 0.5; // Attenuated

        osc.start(startTime);
        sub.start(startTime);

        // Envelope - Punchy
        env.gain.setValueAtTime(0, startTime);
        env.gain.linearRampToValueAtTime(startVel, startTime + 0.01);
        env.gain.exponentialRampToValueAtTime(startVel * 0.6, startTime + 0.3); // Decay
        env.gain.exponentialRampToValueAtTime(0.001, startTime + 1.5); // Release/Sustain

        // Filter Envelope for pluck
        filter.frequency.setValueAtTime(600, startTime);
        filter.frequency.exponentialRampToValueAtTime(80, startTime + 0.3);

        osc.stop(startTime + 1.5);
        sub.stop(startTime + 1.5);
    }
}

export class EnhancedGuitarEngine {
    ctx: AudioContext;
    master: GainNode;
    limiter: DynamicsCompressorNode;
    
    body: BodyResonanceFilter;
    convolver: ConvolverNode;
    
    guitarStrings: GuitarStringOscillator;
    bassStrings: BassStringOscillator;
    
    constructor() {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        
        // Master Bus with Limiter
        this.master = this.ctx.createGain();
        this.master.gain.value = 0.4; // Conservative master level
        
        this.limiter = this.ctx.createDynamicsCompressor();
        this.limiter.threshold.value = -12;
        this.limiter.ratio.value = 12;
        this.limiter.knee.value = 6;
        this.limiter.attack.value = 0.005;
        this.limiter.release.value = 0.1;
        
        this.body = new BodyResonanceFilter(this.ctx);
        this.guitarStrings = new GuitarStringOscillator(this.ctx);
        this.bassStrings = new BassStringOscillator(this.ctx);
        
        // Reverb - Reduced wetness
        this.convolver = this.ctx.createConvolver();
        this.convolver.buffer = this.createImpulseResponse(1.5, 3.0);
        const revGain = this.ctx.createGain();
        revGain.gain.value = 0.15; // Clean, not muddy

        // Routing
        // Signals -> Body -> Limiter -> Master -> Out
        // Signals -> Body -> Convolver -> RevGain -> Master -> Out
        
        // Main Chain
        this.body.output.connect(this.limiter);
        this.limiter.connect(this.master);
        this.master.connect(this.ctx.destination);
        
        // Reverb Chain (Parallel)
        this.body.output.connect(this.convolver);
        this.convolver.connect(revGain);
        revGain.connect(this.master);
    }

    createImpulseResponse(duration: number, decay: number) {
        const length = this.ctx.sampleRate * duration;
        const impulse = this.ctx.createBuffer(2, length, this.ctx.sampleRate);
        for (let channel = 0; channel < 2; channel++) {
            const data = impulse.getChannelData(channel);
            for (let i = 0; i < length; i++) {
                // Exponential decay white noise
                data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay);
            }
        }
        return impulse;
    }

    // High Level Play Methods
    playGuitarStrum(freqs: number[], time: number, direction: 'DOWN' | 'UP', velocity: number, bpm: number) {
        const strumLen = getStrumDuration(bpm);
        
        // Optimization: Reduce max voice count to 4 to prevent clipping/CPU load
        // Prioritize Root, Low 3rd, High root
        let notesToPlay = [...freqs];
        if (notesToPlay.length > 4) {
            // Keep lowest and highest, drop middle
            const low = notesToPlay.slice(0, 2);
            const high = notesToPlay.slice(notesToPlay.length - 2);
            notesToPlay = [...low, ...high];
        }

        const orderedFreqs = direction === 'DOWN' ? notesToPlay : [...notesToPlay].reverse();
        const noteSpacing = strumLen / orderedFreqs.length;

        orderedFreqs.forEach((f, i) => {
            // Slight velocity ramp for strum realism (first note hit harder)
            const noteVel = velocity * (1 - (i * 0.05));
            this.guitarStrings.play(this.body.input, f, time + (i * noteSpacing), noteVel);
        });
    }

    playBassNote(freq: number, time: number, velocity: number) {
        this.bassStrings.play(this.body.input, freq, time, velocity); 
    }
    
    resume() { if(this.ctx.state === 'suspended') this.ctx.resume(); }
    close() { this.ctx.close(); }
}
