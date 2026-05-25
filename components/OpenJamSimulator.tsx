
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { EnhancedGuitarEngine } from '../services/enhancedSynthesis';
import { generatePattern, StrumStyle } from '../services/strummingEngine';
import { getChordData } from '../services/voicingEngine';

interface OpenJamSimulatorProps {
  onClose: () => void;
}

interface Song {
    title: string;
    defaultBpm: number;
    defaultKey: string;
    progression: string[]; 
    style: StrumStyle;
}

const SONG_LIBRARY: Song[] = [
    { title: "12 Bar Blues", defaultBpm: 90, defaultKey: "G", style: "Swing", progression: ["I", "I", "I", "I", "IV", "IV", "I", "I", "V", "IV", "I", "V"] },
    { title: "Cripple Creek", defaultBpm: 110, defaultKey: "A", style: "Bluegrass", progression: ["I", "I", "I", "V", "I", "I", "I", "V I", "I", "V", "I", "V", "I", "V", "I", "V I"] },
    { title: "Old Joe Clark", defaultBpm: 120, defaultKey: "A", style: "Bluegrass", progression: ["I", "I", "I", "V", "I", "I", "V", "I", "I", "I", "I", "V", "I", "I", "V", "I"] },
    { title: "Blackberry Blossom", defaultBpm: 115, defaultKey: "G", style: "Bluegrass", progression: ["I V", "ii IV", "I V", "I V", "I V", "ii IV", "I V", "I I", "vi", "iii", "IV", "I V", "vi", "iii", "IV V", "I I"] },
    { title: "Salt Creek", defaultBpm: 115, defaultKey: "A", style: "Bluegrass", progression: ["I", "I", "I", "II", "I", "I", "V", "I", "I", "I", "I", "II", "I", "I", "V", "I"] },
    { title: "Foggy Mountain Breakdown", defaultBpm: 140, defaultKey: "G", style: "Bluegrass", progression: ["I", "I", "vi", "vi", "I", "I", "V", "V", "I", "I", "vi", "vi", "I", "V", "I", "I"] },
    { title: "Jerusalem Ridge", defaultBpm: 100, defaultKey: "Am", style: "Bluegrass", progression: ["Am", "Am", "Dm", "Am", "Am", "Am", "E", "Am", "Am", "Am", "Dm", "Am", "Am", "E", "Am", "Am"] },
    { title: "Wayfaring Stranger", defaultBpm: 70, defaultKey: "Am", style: "Waltz", progression: ["Am", "Am", "Dm", "Am", "Am", "Am", "E", "E", "Am", "Am", "Dm", "Am", "F", "E", "Am", "Am"] },
];

const NOTES_FLAT = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];
const NOTES_SHARP = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

const getRootFromRoman = (roman: string, key: string): string => {
    const scale = (key.includes('b') || key === 'F') ? NOTES_FLAT : NOTES_SHARP;
    const rootIndex = scale.indexOf(key.replace('m', ''));
    if (rootIndex === -1) return key; // Return as is if already a chord name
    
    let offset = 0;
    const r = roman.toUpperCase().replace('M', '').replace('7','').replace('°','');
    if (r === 'I') offset = 0;
    else if (r === 'II') offset = 2;
    else if (r === 'III') offset = 4;
    else if (r === 'IV') offset = 5;
    else if (r === 'V') offset = 7;
    else if (r === 'VI') offset = 9;
    else if (r === 'VII') offset = 11;
    
    const noteIndex = (rootIndex + offset) % 12;
    const noteName = scale[noteIndex];
    let suffix = "";
    if (roman.includes('m') || roman === roman.toLowerCase()) suffix = "m";
    if (roman.includes('7')) suffix += "7";
    return noteName + suffix;
};

const resolveProgression = (prog: string[], key: string): string[][] => {
    return prog.map(measure => {
        const parts = measure.split(" ");
        return parts.map(chordSymbol => {
            // Check if Roman Numeral or literal chord
            if (/^[ivIV]+/.test(chordSymbol) || chordSymbol === 'bVII') {
                return getRootFromRoman(chordSymbol, key);
            }
            return chordSymbol; 
        });
    });
};

const OpenJamSimulator: React.FC<OpenJamSimulatorProps> = ({ onClose }) => {
    const [selectedSongIndex, setSelectedSongIndex] = useState(0);
    const [bpm, setBpm] = useState(120);
    const [selectedKey, setSelectedKey] = useState("G");
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentMeasure, setCurrentMeasure] = useState(-1);
    const [countInActive, setCountInActive] = useState(false);
    const [useCountIn, setUseCountIn] = useState(true);
    
    // New Feature State
    const [strumStyle, setStrumStyle] = useState<StrumStyle>('Bluegrass');
    const [instrumentMix, setInstrumentMix] = useState<'GUITAR' | 'BASS' | 'FULL'>('FULL');
    const [autoSpeedup, setAutoSpeedup] = useState(false);
    const [speedupAmount, setSpeedupAmount] = useState(5);
    const [speedupInterval, setSpeedupInterval] = useState(4); // Measures
    const [loopStart, setLoopStart] = useState(1);
    const [loopEnd, setLoopEnd] = useState(16);
    const [currentStrum, setCurrentStrum] = useState<'DOWN' | 'UP' | 'NONE'>('NONE');

    // Engine Refs
    const synthEngineRef = useRef<EnhancedGuitarEngine | null>(null);
    
    // Playback Refs
    const nextNoteTimeRef = useRef<number>(0);
    const timerIDRef = useRef<number | null>(null);
    const beatInBarRef = useRef<number>(0);
    const measureIndexRef = useRef<number>(-1);
    const measuresPlayedRef = useRef(0);
    
    // Data Refs
    const activeSongRef = useRef<string[][]>([]);
    const bpmRef = useRef(bpm);
    const styleRef = useRef(strumStyle);
    const mixRef = useRef(instrumentMix);
    const isPlayingRef = useRef(isPlaying);
    const loopRef = useRef({ start: 0, end: 100 }); // 0-indexed internally

    // Init Engine
    useEffect(() => {
        synthEngineRef.current = new EnhancedGuitarEngine();
        return () => { synthEngineRef.current?.close(); };
    }, []);

    // Sync Refs
    useEffect(() => { bpmRef.current = bpm; }, [bpm]);
    useEffect(() => { styleRef.current = strumStyle; }, [strumStyle]);
    useEffect(() => { mixRef.current = instrumentMix; }, [instrumentMix]);
    useEffect(() => { isPlayingRef.current = isPlaying; }, [isPlaying]);
    useEffect(() => { loopRef.current = { start: loopStart - 1, end: loopEnd - 1 }; }, [loopStart, loopEnd]);

    // Update Song Data
    useEffect(() => {
        const song = SONG_LIBRARY[selectedSongIndex];
        setBpm(song.defaultBpm);
        setSelectedKey(song.defaultKey);
        setStrumStyle(song.style);
        setLoopStart(1);
        setLoopEnd(song.progression.length);
    }, [selectedSongIndex]);

    useEffect(() => {
        const song = SONG_LIBRARY[selectedSongIndex];
        activeSongRef.current = resolveProgression(song.progression, selectedKey);
    }, [selectedSongIndex, selectedKey]);

    // --- SCHEDULER ---
    const schedule = useCallback(() => {
        if (!isPlayingRef.current) return;
        const engine = synthEngineRef.current;
        if (!engine) return;
        
        const ctx = engine.ctx;
        const lookahead = 0.1;
        
        // 4/4 default, 3/4 for Waltz
        const beatsPerBar = styleRef.current === 'Waltz' ? 3 : 4;

        while (nextNoteTimeRef.current < ctx.currentTime + lookahead) {
            const currentBeat = beatInBarRef.current;
            const time = nextNoteTimeRef.current;

            // Handle Count-in or Start
            if (measureIndexRef.current === -1) {
                if (useCountIn) {
                    // Click
                    const osc = ctx.createOscillator();
                    const g = ctx.createGain();
                    osc.connect(g); g.connect(ctx.destination);
                    osc.frequency.value = currentBeat === 0 ? 1000 : 800;
                    g.gain.setValueAtTime(0.3, time);
                    g.gain.exponentialRampToValueAtTime(0.001, time + 0.1);
                    osc.start(time); osc.stop(time + 0.1);
                    
                    if (currentBeat === 0) setCountInActive(true);
                } else {
                    measureIndexRef.current = loopRef.current.start;
                    beatInBarRef.current = 0;
                    continue; 
                }
            } else {
                setCountInActive(false);
                
                // --- MUSICAL LOGIC ---
                // Get Current Measure Logic
                let effectiveMeasure = measureIndexRef.current;
                if (effectiveMeasure >= activeSongRef.current.length) effectiveMeasure = 0; // Wrap safety
                
                const measureChords = activeSongRef.current[effectiveMeasure];
                // Handle Split Measures (e.g. "G D")
                let currentChordName = measureChords[0];
                if (measureChords.length > 1) {
                    const switchBeat = beatsPerBar / measureChords.length;
                    if (currentBeat >= switchBeat) currentChordName = measureChords[1];
                }

                // Get Frequencies & Patterns
                const chordData = getChordData(currentChordName);
                const pattern = generatePattern(styleRef.current, beatsPerBar);
                
                // Find event for this beat (floor check, pattern events are beat offsets)
                // Filter pattern events that happen within this beat window
                const events = pattern.filter(e => Math.floor(e.beatOffset) === currentBeat);

                events.forEach(ev => {
                    const evTime = time + (ev.beatOffset % 1) * (60.0 / bpmRef.current);
                    
                    // -- PLAY BASS --
                    if ((ev.type === 'BASS_ROOT' || ev.type === 'BASS_ALT') && mixRef.current !== 'GUITAR') {
                        const note = ev.type === 'BASS_ROOT' ? chordData.rootFreq : chordData.altFreq;
                        engine.playBassNote(note, evTime, ev.velocity);
                    }

                    // -- PLAY GUITAR --
                    if ((ev.type === 'STRUM_DOWN' || ev.type === 'STRUM_UP') && mixRef.current !== 'BASS') {
                        const dir = ev.type === 'STRUM_DOWN' ? 'DOWN' : 'UP';
                        engine.playGuitarStrum(chordData.freqs, evTime, dir, ev.velocity, bpmRef.current);
                        
                        // Visual Trigger
                        setTimeout(() => {
                            setCurrentStrum(dir);
                            setTimeout(() => setCurrentStrum('NONE'), 150);
                        }, (evTime - ctx.currentTime) * 1000);
                    }
                });

                // UI Measure Update
                if (currentBeat === 0) {
                    const mIdx = measureIndexRef.current;
                    setTimeout(() => setCurrentMeasure(mIdx), (time - ctx.currentTime) * 1000);
                }
            }

            // ADVANCE TIME
            const secondsPerBeat = 60.0 / bpmRef.current;
            nextNoteTimeRef.current += secondsPerBeat;
            beatInBarRef.current++;

            if (beatInBarRef.current >= beatsPerBar) {
                beatInBarRef.current = 0;
                
                if (measureIndexRef.current !== -1) {
                    measureIndexRef.current++;
                    measuresPlayedRef.current++;

                    // Loop Logic
                    if (measureIndexRef.current > loopRef.current.end) {
                        measureIndexRef.current = loopRef.current.start;
                    }
                    if (measureIndexRef.current >= activeSongRef.current.length) {
                        measureIndexRef.current = 0;
                    }

                    // Auto-Speedup Logic
                    if (autoSpeedup && measuresPlayedRef.current > 0 && measuresPlayedRef.current % speedupInterval === 0) {
                        setBpm(b => Math.min(300, b + speedupAmount));
                    }
                } else {
                    // Count-in finished
                    measureIndexRef.current = loopRef.current.start;
                }
            }
        }
        
        timerIDRef.current = window.setTimeout(schedule, 25);
    }, [autoSpeedup, speedupAmount, speedupInterval, useCountIn]);

    useEffect(() => {
        if (isPlaying) {
            const engine = synthEngineRef.current;
            if (engine) {
                if(engine.ctx.state === 'suspended') engine.resume();
                nextNoteTimeRef.current = engine.ctx.currentTime + 0.1;
                measureIndexRef.current = useCountIn ? -1 : loopRef.current.start;
                beatInBarRef.current = 0;
                measuresPlayedRef.current = 0;
                schedule();
            }
        } else {
            if (timerIDRef.current) window.clearTimeout(timerIDRef.current);
            setCurrentMeasure(-1);
            setCountInActive(false);
        }
        return () => { if (timerIDRef.current) window.clearTimeout(timerIDRef.current); };
    }, [isPlaying]);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 animate-fade-in font-sans">
            <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-6xl h-[90vh] flex flex-col shadow-2xl overflow-hidden relative">
                
                {/* Header */}
                <div className="flex-none p-4 bg-gray-950 border-b border-gray-800 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-purple-700 rounded-lg flex items-center justify-center text-2xl shadow-lg">🎸</div>
                        <div>
                            <h2 className="text-xl font-black text-white uppercase tracking-wider">Open Jam Pro</h2>
                            <div className="flex items-center gap-2">
                                <p className="text-xs text-gray-500 font-bold">REALISTIC ENGINE</p>
                            </div>
                        </div>
                    </div>
                    <button onClick={onClose} className="w-10 h-10 flex items-center justify-center text-gray-500 hover:text-white rounded-full hover:bg-gray-800 transition-colors">✕</button>
                </div>

                {/* Main Content Split */}
                <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
                    
                    {/* LEFT: CONTROLS */}
                    <div className="flex-none w-full md:w-80 bg-gray-900 border-r border-gray-800 p-4 flex flex-col gap-6 overflow-y-auto">
                        
                        {/* Song Select */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-gray-500 uppercase">Song & Key</label>
                            <div className="flex gap-2">
                                <select 
                                    value={selectedSongIndex}
                                    onChange={(e) => { setIsPlaying(false); setSelectedSongIndex(Number(e.target.value)); }}
                                    className="flex-1 bg-gray-800 text-white font-bold rounded p-2 border border-gray-700 outline-none text-sm"
                                >
                                    {SONG_LIBRARY.map((s, i) => <option key={i} value={i}>{s.title}</option>)}
                                </select>
                                <select 
                                    value={selectedKey}
                                    onChange={(e) => { setIsPlaying(false); setSelectedKey(e.target.value); }}
                                    className="w-20 bg-gray-800 text-white font-bold rounded p-2 border border-gray-700 outline-none text-sm"
                                >
                                    {NOTES_SHARP.map(n => <option key={n} value={n}>{n}</option>)}
                                    <option value="Am">Am</option><option value="Em">Em</option><option value="Bm">Bm</option>
                                </select>
                            </div>
                        </div>

                        {/* Playback Controls */}
                        <div className="p-4 bg-gray-800/50 rounded-xl border border-gray-700 flex flex-col items-center gap-4">
                            <div className="flex items-center gap-2 w-full justify-center">
                                <span className="text-4xl font-black text-white">{bpm}</span>
                                <span className="text-xs text-gray-500 font-bold uppercase mt-2">BPM</span>
                            </div>
                            <input type="range" min="40" max="300" value={bpm} onChange={(e) => setBpm(Number(e.target.value))} className="w-full h-2 bg-gray-700 rounded-lg cursor-pointer accent-indigo-500" />
                            <div className="flex gap-2 w-full">
                                <button onClick={() => setBpm(b=>b-5)} className="flex-1 bg-gray-800 hover:bg-gray-700 py-1 rounded text-gray-300 font-bold">-5</button>
                                <button onClick={() => setBpm(b=>b+5)} className="flex-1 bg-gray-800 hover:bg-gray-700 py-1 rounded text-gray-300 font-bold">+5</button>
                            </div>
                            
                            <button 
                                onClick={() => setIsPlaying(!isPlaying)}
                                className={`w-full py-4 rounded-xl font-black text-xl shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 ${isPlaying ? 'bg-red-600 hover:bg-red-500 text-white' : 'bg-indigo-600 hover:bg-indigo-500 text-white'}`}
                            >
                                {isPlaying ? 'STOP' : 'PLAY'}
                            </button>
                        </div>

                        {/* Mix & Style */}
                        <div className="space-y-4">
                            <div>
                                <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">Instrument Mix</label>
                                <div className="flex bg-gray-800 rounded p-1">
                                    {(['GUITAR', 'FULL', 'BASS'] as const).map(m => (
                                        <button 
                                            key={m} 
                                            onClick={() => setInstrumentMix(m)} 
                                            className={`flex-1 py-1 text-[10px] font-bold rounded ${instrumentMix === m ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-gray-200'}`}
                                        >
                                            {m}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">Strum Pattern</label>
                                <select value={strumStyle} onChange={(e) => setStrumStyle(e.target.value as StrumStyle)} className="w-full bg-gray-800 text-white text-xs font-bold p-2 rounded border border-gray-700">
                                    <option value="Bluegrass">Bluegrass (Bass-Strum)</option>
                                    <option value="Boom-Chuck">Boom-Chuck</option>
                                    <option value="Waltz">Waltz (3/4)</option>
                                    <option value="Swing">Swing / Shuffle</option>
                                    <option value="Slo-Rock">Basic Rock</option>
                                </select>
                            </div>
                        </div>

                        {/* Auto-Speedup */}
                        <div className="bg-[#15151a] p-3 rounded border border-gray-800">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-bold text-gray-400">Auto-Speedup</span>
                                <input type="checkbox" checked={autoSpeedup} onChange={(e) => setAutoSpeedup(e.target.checked)} className="accent-indigo-500" />
                            </div>
                            <div className={`space-y-2 transition-opacity ${!autoSpeedup ? 'opacity-30 pointer-events-none' : ''}`}>
                                <div className="flex justify-between items-center text-xs">
                                    <span className="text-gray-500">Increase BPM</span>
                                    <input type="number" value={speedupAmount} onChange={(e) => setSpeedupAmount(Number(e.target.value))} className="w-12 bg-gray-800 text-white text-center rounded border border-gray-700" />
                                </div>
                                <div className="flex justify-between items-center text-xs">
                                    <span className="text-gray-500">Every X Measures</span>
                                    <input type="number" value={speedupInterval} onChange={(e) => setSpeedupInterval(Number(e.target.value))} className="w-12 bg-gray-800 text-white text-center rounded border border-gray-700" />
                                </div>
                            </div>
                        </div>

                        {/* Loop */}
                        <div className="bg-[#15151a] p-3 rounded border border-gray-800">
                            <span className="text-xs font-bold text-gray-400 block mb-2">Loop Measures</span>
                            <div className="flex items-center gap-2">
                                <input type="number" min="1" value={loopStart} onChange={(e) => setLoopStart(Number(e.target.value))} className="flex-1 bg-gray-800 text-white text-center p-1 rounded border border-gray-700" />
                                <span className="text-gray-500">-</span>
                                <input type="number" min="1" value={loopEnd} onChange={(e) => setLoopEnd(Number(e.target.value))} className="flex-1 bg-gray-800 text-white text-center p-1 rounded border border-gray-700" />
                            </div>
                        </div>

                    </div>

                    {/* RIGHT: VISUALIZER */}
                    <div className="flex-1 bg-[#0f0f11] p-8 flex flex-col relative overflow-hidden">
                        {/* Strum Indicator Overlay */}
                        <div className="absolute top-4 right-4 w-20 h-20 flex items-center justify-center">
                            {currentStrum === 'DOWN' && <div className="text-6xl text-indigo-500 animate-bounce">↓</div>}
                            {currentStrum === 'UP' && <div className="text-6xl text-purple-500 animate-bounce">↑</div>}
                        </div>

                        {countInActive && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/60 z-20">
                                <div className="text-9xl font-black text-white animate-ping">4</div>
                            </div>
                        )}

                        <div className="flex-1 overflow-y-auto">
                            <div className="grid grid-cols-4 gap-4 pb-20">
                                {activeSongRef.current.map((measure, i) => {
                                    const isActive = i === currentMeasure;
                                    const isLoop = i >= loopStart-1 && i <= loopEnd-1;
                                    return (
                                        <div 
                                            key={i}
                                            className={`aspect-video rounded-xl border-2 flex flex-col items-center justify-center relative transition-all duration-100 
                                                ${isActive ? 'bg-indigo-900/60 border-indigo-400 scale-105 shadow-[0_0_30px_rgba(99,102,241,0.3)] z-10' : (isLoop ? 'bg-gray-800 border-gray-700 opacity-90' : 'bg-gray-900 border-gray-800 opacity-40')}
                                            `}
                                        >
                                            <span className={`text-2xl md:text-3xl font-black ${isActive ? 'text-white' : 'text-gray-400'}`}>
                                                {measure.join("  ")}
                                            </span>
                                            <span className="absolute top-2 left-2 text-[10px] text-gray-500 font-mono">{i+1}</span>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default OpenJamSimulator;
