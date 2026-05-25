
export const GUITAR_TUNING_E2 = [82.41, 110.00, 146.83, 196.00, 246.94, 329.63]; // Standard E A D G B E

export interface ChordShape {
    frets: number[]; // 6 values, -1 = muted
    rootStr: number; // Index 0-5 (0 is Low E)
    altStr: number;  // Index for alternating bass (5th degree usually)
}

// Library of open position shapes tailored for Bluegrass/Folk
export const CHORD_SHAPES: Record<string, ChordShape> = {
    // Majors
    "G":  { frets: [3, 2, 0, 0, 0, 3], rootStr: 0, altStr: 2 }, // G (low E) -> D (open D)
    "C":  { frets: [-1, 3, 2, 0, 1, 0], rootStr: 1, altStr: 0 }, // C (A string) -> G (low E, 3rd fret usually played by moving finger, but mapped to 3 here for sim)
    "D":  { frets: [-1, -1, 0, 2, 3, 2], rootStr: 2, altStr: 1 }, // D (open D) -> A (open A)
    "A":  { frets: [-1, 0, 2, 2, 2, 0], rootStr: 1, altStr: 0 }, // A (open A) -> E (open E)
    "E":  { frets: [0, 2, 2, 1, 0, 0], rootStr: 0, altStr: 1 },  // E (low E) -> B (A string)
    "F":  { frets: [1, 3, 3, 2, 1, 1], rootStr: 0, altStr: 1 },  // Barre F
    "B":  { frets: [-1, 2, 4, 4, 4, 2], rootStr: 1, altStr: 0 }, // B (A string) -> F# (Low E)
    "Bb": { frets: [-1, 1, 3, 3, 3, 1], rootStr: 1, altStr: 0 },

    // Minors
    "Em": { frets: [0, 2, 2, 0, 0, 0], rootStr: 0, altStr: 1 },
    "Am": { frets: [-1, 0, 2, 2, 1, 0], rootStr: 1, altStr: 0 }, // Am -> E
    "Dm": { frets: [-1, -1, 0, 2, 3, 1], rootStr: 2, altStr: 1 },
    "Bm": { frets: [-1, 2, 4, 4, 3, 2], rootStr: 1, altStr: 0 },
    "F#m":{ frets: [2, 4, 4, 2, 2, 2], rootStr: 0, altStr: 1 },
    
    // 7ths
    "G7": { frets: [3, 2, 0, 0, 0, 1], rootStr: 0, altStr: 2 },
    "C7": { frets: [-1, 3, 2, 3, 1, 0], rootStr: 1, altStr: 0 },
    "D7": { frets: [-1, -1, 0, 2, 1, 2], rootStr: 2, altStr: 1 },
    "A7": { frets: [-1, 0, 2, 0, 2, 0], rootStr: 1, altStr: 0 },
    "E7": { frets: [0, 2, 0, 1, 0, 0], rootStr: 0, altStr: 1 },
    "B7": { frets: [-1, 2, 1, 2, 0, 2], rootStr: 1, altStr: 0 },
};

// Helper for "C chord with G bass" logic if needed, but for now standard shapes
// returns { freqs: number[], rootFreq: number, altFreq: number }
export const getChordData = (chordName: string) => {
    // Strip complex extensions for lookup, but keep sharp/flat
    // e.g. "G" -> "G", "Am" -> "Am"
    let baseName = chordName.split('/')[0];
    
    // Handle flats to sharps map if needed, simple map here
    const map: Record<string, string> = { "Db": "C#", "Eb": "D#", "Gb": "F#", "Ab": "G#", "Bb": "A#" };
    // naive replace
    Object.keys(map).forEach(k => {
        if(baseName.includes(k) && !CHORD_SHAPES[baseName]) baseName = baseName.replace(k, map[k]);
    });

    // Fallback to major if not found (e.g. Gsus4 -> G)
    if (!CHORD_SHAPES[baseName]) {
        baseName = baseName.replace(/7|maj|sus|dim|aug|\d/g, '');
    }
    
    const shape = CHORD_SHAPES[baseName] || CHORD_SHAPES["G"]; // Default G

    // Calculate freqs
    const freqs: number[] = [];
    shape.frets.forEach((fret, strIdx) => {
        if (fret === -1) return;
        const openFreq = GUITAR_TUNING_E2[strIdx];
        const freq = openFreq * Math.pow(2, fret / 12);
        freqs.push(freq);
    });

    // Calculate Bass Freqs
    // Root
    const rOpen = GUITAR_TUNING_E2[shape.rootStr];
    const rFret = shape.frets[shape.rootStr];
    // Special handling: For C chord, alt bass is G on Low E (3rd fret). 
    // Standard shape has -1 there. We simulate the finger move.
    let aFret = shape.frets[shape.altStr];
    if (baseName === 'C' && shape.altStr === 0) aFret = 3; 
    
    const rootFreq = rOpen * Math.pow(2, (rFret === -1 ? 0 : rFret) / 12);
    const altOpen = GUITAR_TUNING_E2[shape.altStr];
    const altFreq = altOpen * Math.pow(2, (aFret === -1 ? 0 : aFret) / 12);

    // frets/name exposed for chord-diagram rendering (callers reading freqs/root/alt are unaffected)
    return { freqs, rootFreq, altFreq, frets: shape.frets, name: baseName };
};
