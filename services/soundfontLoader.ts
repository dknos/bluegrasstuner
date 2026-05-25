
import { getChordFreqs, F } from './audioUtils';

// Helper to map frequency to Note Name (e.g. 82.41 -> "E2")
// We use the F lookup inverted roughly, or just math.
const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

const freqToNote = (freq: number): string => {
    const noteNum = 12 * (Math.log(freq / 440) / Math.log(2));
    const rounded = Math.round(noteNum) + 69;
    const note = NOTE_NAMES[rounded % 12];
    const oct = Math.floor(rounded / 12) - 1;
    return `${note}${oct}`;
};

export class SoundfontGuitarEngine {
    ctx: AudioContext;
    buffers: Record<string, AudioBuffer> = {};
    master: GainNode;
    loaded: boolean = false;

    constructor() {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        this.master = this.ctx.createGain();
        this.master.gain.value = 0.8;
        this.master.connect(this.ctx.destination);
    }

    async load() {
        if (this.loaded) return;
        
        try {
            // Fetch the JS file which contains base64 encoded MP3s
            const url = 'https://gleitz.github.io/midi-js-soundfonts/FluidR3_GM/acoustic_guitar_steel-mp3.js';
            const response = await fetch(url);
            const scriptContent = await response.text();
            
            // Execute the script content in a function to extract the data object.
            // This handles JS object literal syntax (trailing commas, unquoted keys) that JSON.parse fails on.
            // We mock the 'MIDI' global expected by the script.
            const getData = new Function(`
                var MIDI = { Soundfont: {} };
                ${scriptContent}
                // The script populates MIDI.Soundfont.acoustic_guitar_steel
                return MIDI.Soundfont.acoustic_guitar_steel;
            `);

            const noteData = getData();
            
            if (!noteData) throw new Error("Soundfont data object is empty or undefined");
            
            // Decode all notes
            const decodePromises = Object.entries(noteData).map(async ([noteName, dataUrl]) => {
                // dataUrl is "data:audio/mp3;base64,..."
                const res = await fetch(dataUrl as string);
                const arrayBuffer = await res.arrayBuffer();
                const audioBuffer = await this.ctx.decodeAudioData(arrayBuffer);
                this.buffers[noteName] = audioBuffer;
            });

            await Promise.all(decodePromises);
            this.loaded = true;
            console.log("Guitar Soundfont Loaded");
        } catch (e) {
            console.error("Failed to load soundfont", e);
            throw e; // Propagate error so consumer can fallback
        }
    }

    play(noteName: string, time: number, velocity: number = 1.0) {
        // Soundfont keys are like "A2", "C#4", etc.
        // Some might be missing sharps or have different naming.
        // The gleitz pack usually has all keys.
        
        // Handle flats if needed (map Bb to A#)
        let safeNote = noteName.replace("Eb", "D#").replace("Bb", "A#").replace("Ab", "G#").replace("Db", "C#").replace("Gb", "F#");
        
        const buffer = this.buffers[safeNote];
        if (!buffer) {
            // Try to find nearest neighbor? For now just skip.
            return;
        }

        const source = this.ctx.createBufferSource();
        source.buffer = buffer;
        
        const gain = this.ctx.createGain();
        
        source.connect(gain);
        gain.connect(this.master);
        
        // Velocity logic
        gain.gain.setValueAtTime(velocity, time);
        
        // Fade out
        gain.gain.exponentialRampToValueAtTime(0.001, time + 3.0); // Allow ring out
        
        source.start(time);
        source.stop(time + 3.5);
    }

    strum(chordName: string, time: number, type: 'DOWN' | 'UP' | 'BASS') {
        if (!this.loaded) return;
        
        const freqs = getChordFreqs(chordName);
        if (!freqs || freqs.length === 0) return;

        if (type === 'BASS') {
            const rootFreq = freqs[0];
            const rootNote = freqToNote(rootFreq);
            this.play(rootNote, time, 1.0);
            return;
        }

        const isUp = type === 'UP';
        const noteOrder = isUp ? [...freqs].reverse() : freqs;
        const speed = 0.04;

        noteOrder.forEach((f, i) => {
            const noteTime = time + (i * speed);
            const noteName = freqToNote(f);
            
            // Humanize velocity
            let vel = 0.6 + Math.random() * 0.3;
            if (i === 0) vel += 0.2; // Accent
            
            this.play(noteName, noteTime, vel);
        });
    }

    resume() {
        if(this.ctx.state === 'suspended') this.ctx.resume();
    }
    
    close() {
        this.ctx.close();
    }
}
