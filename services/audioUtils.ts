
import { InstrumentDefinition, NoteData, TuningDefinition } from '../types';

const NOTE_STRINGS = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

// Frequency Map for precision and ease of data entry
export const F: Record<string, number> = {
  "B0": 30.87, 
  "C1": 32.70, "Db1": 34.65, "D1": 36.71, "Eb1": 38.89, "E1": 41.20, "F1": 43.65, "Gb1": 46.25, "G1": 49.00, "Ab1": 51.91, "A1": 55.00, "Bb1": 58.27, "B1": 61.74,
  "C2": 65.41, "C#2": 69.30, "Db2": 69.30, "D2": 73.42, "Eb2": 77.78, "E2": 82.41, "F2": 87.31, "F#2": 92.50, "Gb2": 92.50, "G2": 98.00, "Ab2": 103.83, "A2": 110.00, "Bb2": 116.54, "B2": 123.47,
  "C3": 130.81, "Db3": 138.59, "D3": 146.83, "Eb3": 155.56, "E3": 164.81, "F3": 174.61, "F#3": 185.00, "Gb3": 185.00, "G3": 196.00, "Ab3": 207.65, "A3": 220.00, "Bb3": 233.08, "B3": 246.94,
  "C4": 261.63, "C#4": 277.18, "D4": 293.66, "Eb4": 311.13, "E4": 329.63, "F4": 349.23, "F#4": 369.99, "G4": 392.00, "A4": 440.00, "Bb4": 466.16, "B4": 493.88,
  "C5": 523.25, "D5": 587.33, "E5": 659.25, "F5": 698.46, "G5": 783.99
};

// Helper to create notes easily
const n = (s: number, name: string) => ({ stringNum: s, note: name, freq: F[name] || 0 });

export const INSTRUMENT_DATA: Record<string, InstrumentDefinition> = {
  Guitar: {
    name: "Guitar",
    tunings: {
      "Standard": { name: "Standard", notes: [n(6,"E2"), n(5,"A2"), n(4,"D3"), n(3,"G3"), n(2,"B3"), n(1,"E4")] },
      "Drop D": { name: "Drop D", notes: [n(6,"D2"), n(5,"A2"), n(4,"D3"), n(3,"G3"), n(2,"B3"), n(1,"E4")] },
      "Double Drop D": { name: "Double Drop D", notes: [n(6,"D2"), n(5,"A2"), n(4,"D3"), n(3,"G3"), n(2,"B3"), n(1,"D4")] },
      "Drop C": { name: "Drop C", notes: [n(6,"C2"), n(5,"G2"), n(4,"C3"), n(3,"F3"), n(2,"A3"), n(1,"D4")] },
      "Open G": { name: "Open G", notes: [n(6,"D2"), n(5,"G2"), n(4,"D3"), n(3,"G3"), n(2,"B3"), n(1,"D4")] },
      "Open D": { name: "Open D", notes: [n(6,"D2"), n(5,"A2"), n(4,"D3"), n(3,"F#3"), n(2,"A3"), n(1,"D4")] },
      "Open A": { name: "Open A", notes: [n(6,"E2"), n(5,"A2"), n(4,"E3"), n(3,"A3"), n(2,"C#4"), n(1,"E4")] },
      "DADGAD": { name: "DADGAD", notes: [n(6,"D2"), n(5,"A2"), n(4,"D3"), n(3,"G3"), n(2,"A3"), n(1,"D4")] },
      "Half-step down": { name: "Half-step down", notes: [n(6,"Eb2"), n(5,"Ab2"), n(4,"Db3"), n(3,"Gb3"), n(2,"Bb3"), n(1,"Eb4")] },
      "Full-step down": { name: "Full-step down", notes: [n(6,"D2"), n(5,"G2"), n(4,"C3"), n(3,"F3"), n(2,"A3"), n(1,"D4")] },
    }
  },
  Bass: {
    name: "Bass",
    tunings: {
      "4-String Standard": { name: "4-String Standard", notes: [n(4,"E1"), n(3,"A1"), n(2,"D2"), n(1,"G2")] },
      "4-String Drop D": { name: "4-String Drop D", notes: [n(4,"D1"), n(3,"A1"), n(2,"D2"), n(1,"G2")] },
      "4-String Half-step": { name: "4-String Half-step", notes: [n(4,"Eb1"), n(3,"Ab1"), n(2,"Db2"), n(1,"Gb2")] },
      "4-String Full-step": { name: "4-String Full-step", notes: [n(4,"D1"), n(3,"G1"), n(2,"C2"), n(1,"F2")] },
      "5-String Standard": { name: "5-String Standard", notes: [n(5,"B0"), n(4,"E1"), n(3,"A1"), n(2,"D2"), n(1,"G2")] },
      "5-String High C": { name: "5-String High C", notes: [n(5,"E1"), n(4,"A1"), n(3,"D2"), n(2,"G2"), n(1,"C3")] },
      "6-String Standard": { name: "6-String Standard", notes: [n(6,"B0"), n(5,"E1"), n(4,"A1"), n(3,"D2"), n(2,"G2"), n(1,"C3")] },
    }
  },
  Ukulele: {
    name: "Ukulele",
    tunings: {
      "Soprano/Concert (Standard)": { name: "Standard (GCEA)", notes: [n(4,"G4"), n(3,"C4"), n(2,"E4"), n(1,"A4")] },
      "Low G": { name: "Low G", notes: [n(4,"G3"), n(3,"C4"), n(2,"E4"), n(1,"A4")] },
      "Baritone": { name: "Baritone (DGBE)", notes: [n(4,"D3"), n(3,"G3"), n(2,"B3"), n(1,"E4")] },
    }
  },
  Mandolin: {
    name: "Mandolin",
    tunings: {
      "Standard": { name: "Standard", notes: [n(4,"G3"), n(3,"D4"), n(2,"A4"), n(1,"E5")] }
    }
  },
  Violin: {
    name: "Violin",
    tunings: {
      "Standard": { name: "Standard", notes: [n(4,"G3"), n(3,"D4"), n(2,"A4"), n(1,"E5")] }
    }
  },
  Banjo: {
    name: "Banjo",
    tunings: {
      "5-String Open G": { name: "5-String Open G", notes: [n(5,"G4"), n(4,"D3"), n(3,"G3"), n(2,"B3"), n(1,"D4")] },
      "5-String Bluegrass": { name: "5-String Bluegrass", notes: [n(5,"G4"), n(4,"D3"), n(3,"G3"), n(2,"B3"), n(1,"D4")] },
      "5-String Double C": { name: "5-String Double C", notes: [n(5,"G4"), n(4,"C3"), n(3,"G3"), n(2,"C4"), n(1,"D4")] },
      "5-String Sawmill": { name: "5-String Sawmill", notes: [n(5,"G4"), n(4,"D3"), n(3,"G3"), n(2,"C4"), n(1,"D4")] },
      "4-String Tenor": { name: "4-String Tenor", notes: [n(4,"C3"), n(3,"G3"), n(2,"D4"), n(1,"A4")] },
      "4-String Chicago": { name: "4-String Chicago", notes: [n(4,"D3"), n(3,"G3"), n(2,"B3"), n(1,"E4")] },
      "4-String Plectrum": { name: "4-String Plectrum", notes: [n(4,"C3"), n(3,"G3"), n(2,"B3"), n(1,"D4")] },
      "6-String Banjo-Guitar": { name: "6-String Banjo-Guitar", notes: [n(6,"E2"), n(5,"A2"), n(4,"D3"), n(3,"G3"), n(2,"B3"), n(1,"E4")] },
    }
  }
};

// Guitar Voicings (Low to High Frequencies in Hz)
// Approximating standard open/barre chords
export const CHORD_VOICINGS: Record<string, number[]> = {
    // Majors
    "G": [98.00, 123.47, 146.83, 196.00, 246.94, 392.00], // 320003
    "C": [130.81, 164.81, 196.00, 261.63, 329.63],       // x32010
    "D": [146.83, 220.00, 293.66, 369.99],               // xx0232
    "A": [110.00, 164.81, 220.00, 277.18, 329.63],       // x02220
    "E": [82.41, 123.47, 164.81, 207.65, 246.94, 329.63],// 022100
    "F": [87.31, 130.81, 174.61, 220.00, 261.63, 349.23],// 133211
    "B": [123.47, 185.00, 246.94, 311.13, 369.99],       // x24442
    "Bb": [116.54, 174.61, 233.08, 293.66, 349.23],      // x13331
    
    // Minors
    "Em": [82.41, 123.47, 164.81, 196.00, 246.94, 329.63], // 022000
    "Am": [110.00, 164.81, 220.00, 261.63, 329.63],        // x02210
    "Dm": [146.83, 220.00, 293.66, 349.23],                // xx0231
    "Bm": [123.47, 185.00, 246.94, 293.66, 369.99],        // x24432
    "F#m": [92.50, 138.59, 185.00, 277.18, 369.99],        // 244222
    "Gm": [98.00, 146.83, 196.00, 233.08, 293.66],         // 355333
    
    // 7ths
    "G7": [98.00, 123.47, 146.83, 196.00, 246.94, 369.99],
    "C7": [130.81, 164.81, 233.08, 261.63, 329.63],
    "D7": [146.83, 220.00, 261.63, 369.99],
    "A7": [110.00, 164.81, 196.00, 277.18, 329.63],
    "E7": [82.41, 123.47, 146.83, 207.65, 246.94, 329.63],
    "B7": [123.47, 155.56, 220.00, 246.94, 369.99],
};

export const getChordFreqs = (chordName: string): number[] => {
    if (CHORD_VOICINGS[chordName]) return CHORD_VOICINGS[chordName];
    // Fallback logic
    const root = chordName.replace(/m|7|maj|dim|aug|sus|add|\d/g, '');
    const rootFreqs = CHORD_VOICINGS[root];
    if (rootFreqs) return rootFreqs; 
    return [261.63, 329.63, 392.00]; 
};

/**
 * Uses autocorrelation to determine the fundamental frequency (pitch) of a waveform.
 */
export const autoCorrelate = (buffer: Float32Array, sampleRate: number): number => {
  let size = buffer.length;
  let rms = 0;

  for (let i = 0; i < size; i++) {
    const val = buffer[i];
    rms += val * val;
  }
  rms = Math.sqrt(rms / size);

  if (rms < 0.001) return -1; // Not enough signal (Threshold lowered for sensitivity)

  let r1 = 0, r2 = size - 1, thres = 0.2;
  for (let i = 0; i < size / 2; i++) {
    if (Math.abs(buffer[i]) < thres) { r1 = i; break; }
  }
  for (let i = 1; i < size / 2; i++) {
    if (Math.abs(buffer[size - i]) < thres) { r2 = size - i; break; }
  }

  buffer = buffer.slice(r1, r2);
  size = buffer.length;

  const c = new Array(size).fill(0);
  for (let i = 0; i < size; i++) {
    for (let j = 0; j < size - i; j++) {
      c[i] = c[i] + buffer[j] * buffer[j + i];
    }
  }

  let d = 0;
  while (c[d] > c[d + 1]) d++;
  let maxval = -1, maxpos = -1;
  for (let i = d; i < size; i++) {
    if (c[i] > maxval) {
      maxval = c[i];
      maxpos = i;
    }
  }
  let T0 = maxpos;

  const x1 = c[T0 - 1], x2 = c[T0], x3 = c[T0 + 1];
  const a = (x1 + x3 - 2 * x2) / 2;
  const b = (x3 - x1) / 2;
  if (a) T0 = T0 - b / (2 * a);

  return sampleRate / T0;
};

export const getNoteFromFrequency = (frequency: number): NoteData => {
  const noteNum = 12 * (Math.log(frequency / 440) / Math.log(2));
  const roundedNoteNum = Math.round(noteNum) + 69;
  
  const noteIndex = roundedNoteNum % 12;
  const note = NOTE_STRINGS[noteIndex];
  const octave = Math.floor(roundedNoteNum / 12) - 1;
  const perfectFrequency = 440 * Math.pow(2, (roundedNoteNum - 69) / 12);
  const centsOff = Math.floor(1200 * Math.log(frequency / perfectFrequency) / Math.log(2));

  return {
    note,
    octave,
    frequency,
    centsOff,
    perfectFrequency
  };
};

export const getTargetNote = (frequency: number, preset: TuningDefinition, manualStringIndex: number | null): NoteData => {
  // If manual mode is active (a specific peg is selected)
  if (manualStringIndex !== null) {
      const targetNote = preset.notes.find(n => n.stringNum === manualStringIndex);
      if (targetNote) {
          const centsOff = Math.floor(1200 * Math.log(frequency / targetNote.freq) / Math.log(2));
          const octaveMatch = targetNote.note.match(/\d+/);
          const noteName = targetNote.note.replace(/\d+/, '');
          return {
              note: noteName,
              octave: octaveMatch ? parseInt(octaveMatch[0]) : 0,
              frequency,
              centsOff,
              perfectFrequency: targetNote.freq
          };
      }
  }

  // Auto-detect mode
  if (preset.notes.length === 0) return getNoteFromFrequency(frequency);

  let closestDiff = Infinity;
  let closestTarget = preset.notes[0];

  for (const target of preset.notes) {
    const diff = Math.abs(frequency - target.freq);
    if (diff < closestDiff) {
      closestDiff = diff;
      closestTarget = target;
    }
  }

  const centsOff = Math.floor(1200 * Math.log(frequency / closestTarget.freq) / Math.log(2));
  const octaveMatch = closestTarget.note.match(/\d+/);
  const noteName = closestTarget.note.replace(/\d+/, '');
  
  return {
    note: noteName,
    octave: octaveMatch ? parseInt(octaveMatch[0]) : 0,
    frequency,
    centsOff,
    perfectFrequency: closestTarget.freq
  };
};

// Singleton context for playback
let playbackContext: AudioContext | null = null;

// Simple Synth for reference tones
export const playTone = (frequency: number, type: OscillatorType = 'triangle') => {
  if (!Number.isFinite(frequency) || frequency <= 0) {
      return;
  }

  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return;
  
  // Reuse existing context or create new one
  if (!playbackContext) {
      playbackContext = new AudioContextClass();
  }

  const ctx = playbackContext;

  // Ensure context is running (it can be suspended by browser policies)
  if (ctx.state === 'suspended') {
      ctx.resume().catch(e => console.error("Audio resume failed", e));
  }

  const osc = ctx.createOscillator();
  const gainNode = ctx.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(frequency, ctx.currentTime);
  
  // Envelope to avoid popping
  gainNode.gain.setValueAtTime(0, ctx.currentTime);
  gainNode.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.05);
  gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 2);

  osc.connect(gainNode);
  gainNode.connect(ctx.destination);

  // Clean up nodes after playing to prevent memory leaks
  osc.onended = () => {
      osc.disconnect();
      gainNode.disconnect();
  };

  osc.start();
  osc.stop(ctx.currentTime + 2);
};

// --- CHORD CREATOR UTILS ---

export const getNoteAtFret = (baseFreq: number, fret: number): { note: string, freq: number } => {
    // Frequency = Base * 2^(fret/12)
    const freq = baseFreq * Math.pow(2, fret / 12);
    const noteData = getNoteFromFrequency(freq);
    return { note: noteData.note, freq };
};

export const identifyChord = (notes: string[]): string => {
    if (notes.length < 2) return "Unknown";
    
    // Normalize notes (remove octaves, handle sharps/flats if needed)
    // Here we assume inputs are like "C", "F#" from our standard list
    const uniqueNotes = Array.from(new Set(notes));
    const count = uniqueNotes.length;

    // Convert to indices 0-11
    const indices = uniqueNotes.map(n => NOTE_STRINGS.indexOf(n)).sort((a,b) => a-b);
    
    // Helper to check intervals relative to root
    const checkFormula = (rootIndex: number, intervals: number[]) => {
        const targetIndices = intervals.map(i => (rootIndex + i) % 12).sort((a,b) => a-b);
        // Check if indices match targetIndices exactly
        if (indices.length !== targetIndices.length) return false;
        return indices.every((val, i) => val === targetIndices[i]);
    };

    // Try each note as root
    for (let i = 0; i < indices.length; i++) {
        const root = indices[i];
        const rootName = NOTE_STRINGS[root];

        // Major Triad (0, 4, 7)
        if (checkFormula(root, [0, 4, 7])) return `${rootName} Major`;
        
        // Minor Triad (0, 3, 7)
        if (checkFormula(root, [0, 3, 7])) return `${rootName} Minor`;
        
        // Diminished (0, 3, 6)
        if (checkFormula(root, [0, 3, 6])) return `${rootName} Dim`;
        
        // Augmented (0, 4, 8)
        if (checkFormula(root, [0, 4, 8])) return `${rootName} Aug`;

        // Dominant 7 (0, 4, 7, 10)
        if (checkFormula(root, [0, 4, 7, 10])) return `${rootName}7`;
        
        // Major 7 (0, 4, 7, 11)
        if (checkFormula(root, [0, 4, 7, 11])) return `${rootName}maj7`;
        
        // Minor 7 (0, 3, 7, 10)
        if (checkFormula(root, [0, 3, 7, 10])) return `${rootName}m7`;

        // Sus4 (0, 5, 7)
        if (checkFormula(root, [0, 5, 7])) return `${rootName}sus4`;
        
        // Sus2 (0, 2, 7)
        if (checkFormula(root, [0, 2, 7])) return `${rootName}sus2`;
    }

    return "Unknown Chord";
};


// Game Data
export interface ChordQuizItem {
    name: string;
    notes: number[]; // frequencies
    noteNames: string[];
}

export const CHORD_QUIZ_DATA: ChordQuizItem[] = [
    { name: "G Major", notes: [F["G3"], F["B3"], F["D4"]], noteNames: ["G", "B", "D"] },
    { name: "C Major", notes: [F["C4"], F["E4"], F["G4"]], noteNames: ["C", "E", "G"] },
    { name: "D Major", notes: [F["D3"], F["F#3"], F["A3"]], noteNames: ["D", "F#", "A"] },
    { name: "A Major", notes: [F["A3"], F["C#4"], F["E4"]], noteNames: ["A", "C#", "E"] },
    { name: "E Major", notes: [F["E3"], F["G#3"], F["B3"]], noteNames: ["E", "G#", "B"] },
    { name: "F Major", notes: [F["F3"], F["A3"], F["C4"]], noteNames: ["F", "A", "C"] },
    { name: "E Minor", notes: [F["E3"], F["G3"], F["B3"]], noteNames: ["E", "G", "B"] },
    { name: "A Minor", notes: [F["A3"], F["C4"], F["E4"]], noteNames: ["A", "C", "E"] },
    { name: "B Minor", notes: [F["B3"], F["D4"], F["F#4"]], noteNames: ["B", "D", "F#"] },
    { name: "D Minor", notes: [F["D3"], F["F3"], F["A3"]], noteNames: ["D", "F", "A"] },
];

export const CIRCLE_OF_FIFTHS_ORDER = ["C", "G", "D", "A", "E", "B", "F#", "Db", "Ab", "Eb", "Bb", "F"];

export const NASHVILLE_DATA: Record<string, string[]> = {
  "C": ["C", "Dm", "Em", "F", "G", "Am", "Bdim"],
  "G": ["G", "Am", "Bm", "C", "D", "Em", "F#dim"],
  "D": ["D", "Em", "F#m", "G", "A", "Bm", "C#dim"],
  "A": ["A", "Bm", "C#m", "D", "E", "F#m", "G#dim"],
  "E": ["E", "F#m", "G#m", "A", "B", "C#m", "D#dim"],
  "F": ["F", "Gm", "Am", "Bb", "C", "Dm", "Edim"],
  "Bb": ["Bb", "Cm", "Dm", "Eb", "F", "Gm", "Adim"]
};
