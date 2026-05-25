
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { EnhancedGuitarEngine } from '../services/enhancedSynthesis';
import { generatePattern, StrumStyle } from '../services/strummingEngine';
import { getChordData } from '../services/voicingEngine';
import { PANEL, Engrave, Rocker } from './synthkit';

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

const STYLES: StrumStyle[] = ['Bluegrass', 'Boom-Chuck', 'Waltz', 'Swing', 'Slo-Rock'];
const STYLE_LABELS = ['Grass', 'Boom', 'Waltz', 'Swing', 'Rock'];
const MIXES = ['GUITAR', 'FULL', 'BASS'] as const;
const MIX_LABELS = ['Gtr', 'Full', 'Bass'];

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

// ── Chord diagram ── renders the real fingering from voicingEngine.frets ──────
// frets[]: index 0 = low E (leftmost) … index 5 = high E. -1 muted, 0 open.
const ChordDiagram: React.FC<{ chord: string; size?: number }> = ({ chord, size = 132 }) => {
    const data = getChordData(chord);
    const frets: number[] = data.frets || [];
    const positives = frets.filter(f => f > 0);
    const maxF = positives.length ? Math.max(...positives) : 0;
    // Bluegrass open shapes all sit in frets 1-4; only shift the window if a voicing climbs higher.
    const startFret = maxF > 4 ? Math.min(...positives) : 1;
    const showNut = startFret === 1;

    const W = size, H = size * 1.18;
    const padX = size * 0.13, padTop = size * 0.2, padBot = size * 0.08;
    const cols = 6, rows = 4;
    const gw = (W - 2 * padX) / (cols - 1);
    const gh = (H - padTop - padBot) / rows;
    const sx = (i: number) => padX + i * gw;
    const fy = (r: number) => padTop + r * gh;

    return (
        <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ display: 'block' }}>
            {/* fret wires */}
            {[0, 1, 2, 3, 4].map(r => (
                <line key={'f' + r} x1={sx(0)} y1={fy(r)} x2={sx(5)} y2={fy(r)}
                    stroke={showNut && r === 0 ? PANEL.phosphor : 'rgba(143,209,122,0.32)'}
                    strokeWidth={showNut && r === 0 ? 4 : 1.4} strokeLinecap="round" />
            ))}
            {/* strings */}
            {[0, 1, 2, 3, 4, 5].map(i => (
                <line key={'s' + i} x1={sx(i)} y1={fy(0)} x2={sx(i)} y2={fy(4)}
                    stroke="rgba(143,209,122,0.32)" strokeWidth={1.1} />
            ))}
            {/* base-fret label when window is shifted up the neck */}
            {!showNut && (
                <text x={sx(0) - padX * 0.55} y={fy(0) + gh * 0.62} fill={PANEL.inkMute}
                    fontSize={size * 0.085} fontFamily='"JetBrains Mono", monospace' textAnchor="middle">{startFret}fr</text>
            )}
            {/* open / muted markers above the nut */}
            {frets.map((f, i) => {
                if (f > 0) return null;
                const cx = sx(i), cy = padTop - size * 0.085;
                if (f === 0) return <circle key={'o' + i} cx={cx} cy={cy} r={size * 0.032} fill="none" stroke={PANEL.ink} strokeWidth={1.4} />;
                return ( // muted ✕
                    <g key={'x' + i} stroke={PANEL.inkMute} strokeWidth={1.4} strokeLinecap="round">
                        <line x1={cx - size * 0.03} y1={cy - size * 0.03} x2={cx + size * 0.03} y2={cy + size * 0.03} />
                        <line x1={cx - size * 0.03} y1={cy + size * 0.03} x2={cx + size * 0.03} y2={cy - size * 0.03} />
                    </g>
                );
            })}
            {/* fingered dots */}
            {frets.map((f, i) => {
                if (f <= 0) return null;
                const row = f - startFret + 1; // 1..4 within window
                if (row < 1 || row > 4) return null;
                const cx = sx(i), cy = fy(row) - gh / 2;
                return <circle key={'d' + i} cx={cx} cy={cy} r={size * 0.05} fill={PANEL.phosphor} />;
            })}
        </svg>
    );
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

    // Display state for the teleprompter (set from the scheduler, audio timing untouched)
    const [resolvedProg, setResolvedProg] = useState<string[][]>([]);
    const [currentChord, setCurrentChord] = useState<string | null>(null);
    const [nextChord, setNextChord] = useState<string | null>(null);
    const [beatInBar, setBeatInBar] = useState(0);

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

    const stripRef = useRef<HTMLDivElement>(null);

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
        const resolved = resolveProgression(song.progression, selectedKey);
        activeSongRef.current = resolved;
        setResolvedProg(resolved);
    }, [selectedSongIndex, selectedKey]);

    // Keep the current measure centered in the progress strip
    useEffect(() => {
        if (currentMeasure < 0 || !stripRef.current) return;
        const cell = stripRef.current.children[currentMeasure] as HTMLElement | undefined;
        cell?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }, [currentMeasure]);

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

                // Figure out what's coming next (split-bar second half, or next measure's first chord)
                let upcoming = currentChordName;
                if (measureChords.length > 1 && currentBeat < beatsPerBar / measureChords.length) {
                    upcoming = measureChords[1];
                } else {
                    let nextM = effectiveMeasure + 1;
                    if (nextM > loopRef.current.end || nextM >= activeSongRef.current.length) nextM = loopRef.current.start;
                    const nm = activeSongRef.current[nextM];
                    if (nm) upcoming = nm[0];
                }

                // Push display state once per beat (NOT per audio event)
                const uiDelay = Math.max(0, (time - ctx.currentTime) * 1000);
                setTimeout(() => {
                    setCurrentChord(currentChordName);
                    setNextChord(upcoming);
                    setBeatInBar(currentBeat);
                }, uiDelay);

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
            setCurrentChord(null);
            setNextChord(null);
            setBeatInBar(0);
        }
        return () => { if (timerIDRef.current) window.clearTimeout(timerIDRef.current); };
    }, [isPlaying]);

    const beatsPerBar = strumStyle === 'Waltz' ? 3 : 4;
    // When idle, preview the first chord of the loop so the stage is never blank.
    const displayChord = currentChord ?? (resolvedProg[loopStart - 1]?.[0] ?? resolvedProg[0]?.[0] ?? null);

    // shared bits
    const wood = `linear-gradient(180deg, ${PANEL.wood1}, ${PANEL.wood2})`;
    const metal = `linear-gradient(180deg, ${PANEL.metalTop}, ${PANEL.metalBot})`;
    const stepBtn = (label: string, fn: () => void) => (
        <button onClick={fn} style={{
            flex: 1, padding: '9px 0', borderRadius: 7, cursor: 'pointer', fontFamily: '"JetBrains Mono", monospace',
            fontSize: 12, fontWeight: 700, color: PANEL.ink, background: '#181410', border: `1px solid ${PANEL.line}`,
        }}>{label}</button>
    );
    const selStyle: React.CSSProperties = {
        background: '#181410', color: PANEL.ink, border: `1px solid ${PANEL.line}`, borderRadius: 7,
        padding: '9px 8px', fontFamily: '"JetBrains Mono", monospace', fontSize: 12.5, outline: 'none', appearance: 'none',
    };
    const numStyle: React.CSSProperties = {
        width: 48, textAlign: 'center', background: '#181410', color: PANEL.ink, border: `1px solid ${PANEL.line}`,
        borderRadius: 6, padding: '5px 0', fontFamily: '"JetBrains Mono", monospace', fontSize: 12,
    };

    return (
        <div onClick={onClose} style={{
            position: 'fixed', inset: 0, zIndex: 120, background: 'rgba(8,5,3,0.82)', backdropFilter: 'blur(3px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 'env(safe-area-inset-top,8px) 8px 8px', fontFamily: '"JetBrains Mono", monospace',
        }}>
            <div onClick={(e) => e.stopPropagation()} className="synth-ui" style={{
                position: 'relative', width: '100%', maxWidth: 480, height: '94dvh', display: 'flex',
                borderRadius: 16, overflow: 'hidden', boxShadow: '0 24px 70px rgba(0,0,0,0.6)', background: wood, padding: '0 9px',
            }}>
                <div style={{
                    position: 'relative', flex: 1, margin: '9px 0', borderRadius: 10, background: metal,
                    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06), inset 0 0 0 1px rgba(0,0,0,0.5), 0 0 0 1px rgba(202,160,82,0.25)',
                    display: 'flex', flexDirection: 'column', overflow: 'hidden',
                }}>
                    {/* nameplate header */}
                    <div style={{
                        flex: '0 0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '12px 14px', borderBottom: `1px solid ${PANEL.line}`,
                        background: 'linear-gradient(180deg, rgba(0,0,0,0.25), rgba(0,0,0,0))',
                    }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                            <span style={{ fontFamily: '"DM Serif Display", serif', fontSize: 22, color: PANEL.ink, lineHeight: 1 }}>Open Jam</span>
                            <span style={{ fontSize: 8.5, color: PANEL.brass, letterSpacing: 2, textTransform: 'uppercase' }}>Bluegrass Backing Reel</span>
                        </div>
                        <button onClick={onClose} aria-label="Close" style={{
                            width: 34, height: 34, borderRadius: 8, cursor: 'pointer', flex: '0 0 auto',
                            background: 'rgba(0,0,0,0.3)', border: `1px solid ${PANEL.line}`, color: PANEL.ink, fontSize: 16,
                        }}>✕</button>
                    </div>

                    {/* scrolling body */}
                    <div style={{ position: 'relative', flex: 1, overflowY: 'auto', padding: '14px 14px 16px', display: 'flex', flexDirection: 'column', gap: 14 }}>

                        {/* ── STAGE (phosphor screen) ─────────────────────────── */}
                        <div style={{
                            position: 'relative', borderRadius: 12, background: PANEL.screen, padding: '16px 14px',
                            boxShadow: `inset 0 0 0 1px ${PANEL.brassDark}, inset 0 2px 22px rgba(0,0,0,0.7)`, overflow: 'hidden',
                        }}>
                            {/* scanline sheen */}
                            <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', opacity: 0.5,
                                background: 'repeating-linear-gradient(180deg, rgba(143,209,122,0.05) 0 2px, transparent 2px 4px)' }} />
                            {countInActive && (
                                <div style={{ position: 'absolute', inset: 0, zIndex: 5, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.55)' }}>
                                    <span style={{ fontFamily: '"DM Serif Display", serif', fontSize: 72, color: PANEL.phosphor, textShadow: `0 0 24px ${PANEL.phosphor}` }}>{(beatInBar % beatsPerBar) + 1}</span>
                                </div>
                            )}

                            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 14 }}>
                                {/* chord name + on-deck */}
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontSize: 9, letterSpacing: 2.5, color: PANEL.inkMute, textTransform: 'uppercase' }}>Now Playing</div>
                                    <div style={{
                                        fontFamily: '"DM Serif Display", serif', fontSize: 60, lineHeight: 1, color: PANEL.phosphor,
                                        textShadow: isPlaying ? `0 0 22px rgba(143,209,122,0.55)` : 'none', transition: 'text-shadow .15s',
                                    }}>{displayChord || '—'}</div>
                                    <div style={{ marginTop: 8, fontSize: 11, color: PANEL.inkMute, display: 'flex', alignItems: 'baseline', gap: 6 }}>
                                        <span style={{ letterSpacing: 1.5, textTransform: 'uppercase', fontSize: 8.5 }}>On Deck</span>
                                        <span style={{ fontSize: 17, color: PANEL.ink, fontFamily: '"DM Serif Display", serif' }}>{(isPlaying && nextChord) ? nextChord : '·'}</span>
                                    </div>
                                </div>
                                {/* chord diagram */}
                                <div style={{ flex: '0 0 auto' }}>
                                    {displayChord ? <ChordDiagram chord={displayChord} size={118} /> : null}
                                </div>
                            </div>

                            {/* beat dots + strum arrow */}
                            <div style={{ position: 'relative', marginTop: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <div style={{ display: 'flex', gap: 9 }}>
                                    {Array.from({ length: beatsPerBar }).map((_, i) => {
                                        const lit = isPlaying && !countInActive && i === beatInBar;
                                        return <span key={i} style={{
                                            width: 13, height: 13, borderRadius: 999,
                                            background: lit ? PANEL.phosphor : 'transparent',
                                            boxShadow: lit ? `0 0 12px ${PANEL.phosphor}` : `inset 0 0 0 1.5px rgba(143,209,122,0.4)`,
                                            transition: 'background .04s',
                                        }} />;
                                    })}
                                </div>
                                <span style={{
                                    fontSize: 26, lineHeight: 1, width: 26, textAlign: 'center',
                                    color: currentStrum === 'NONE' ? 'rgba(143,209,122,0.25)' : PANEL.phosphor,
                                    textShadow: currentStrum === 'NONE' ? 'none' : `0 0 12px ${PANEL.phosphor}`,
                                }}>{currentStrum === 'UP' ? '↑' : '↓'}</span>
                            </div>
                        </div>

                        {/* ── PROGRESS STRIP (whole tune) ─────────────────────── */}
                        <div>
                            <Engrave>Chart · Bar {currentMeasure >= 0 ? currentMeasure + 1 : '—'} / {resolvedProg.length}</Engrave>
                            <div ref={stripRef} style={{ display: 'flex', gap: 5, overflowX: 'auto', paddingBottom: 4, marginTop: 6 }}>
                                {resolvedProg.map((m, i) => {
                                    const active = i === currentMeasure;
                                    const inLoop = i >= loopStart - 1 && i <= loopEnd - 1;
                                    return (
                                        <div key={i} style={{
                                            flex: '0 0 auto', minWidth: 46, padding: '7px 4px', borderRadius: 7, textAlign: 'center',
                                            background: active ? PANEL.brass : (inLoop ? '#1f1a12' : '#141009'),
                                            boxShadow: active ? `0 0 16px rgba(202,160,82,0.5)` : `inset 0 0 0 1px ${PANEL.line}`,
                                            opacity: inLoop ? 1 : 0.4, transition: 'all .12s',
                                        }}>
                                            <div style={{ fontSize: 7.5, color: active ? 'rgba(26,13,4,0.7)' : PANEL.inkMute }}>{i + 1}</div>
                                            <div style={{ fontSize: 14, fontWeight: 700, color: active ? '#1a0d04' : PANEL.ink, fontFamily: '"DM Serif Display", serif' }}>{m.join(' ')}</div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* ── SETUP ───────────────────────────────────────────── */}
                        <Engrave>Tune</Engrave>
                        <div style={{ display: 'flex', gap: 8 }}>
                            <select value={selectedSongIndex} onChange={(e) => { setIsPlaying(false); setSelectedSongIndex(Number(e.target.value)); }}
                                style={{ ...selStyle, flex: 1 }}>
                                {SONG_LIBRARY.map((s, i) => <option key={i} value={i}>{s.title}</option>)}
                            </select>
                            <select value={selectedKey} onChange={(e) => { setIsPlaying(false); setSelectedKey(e.target.value); }} style={{ ...selStyle, width: 78 }}>
                                {NOTES_SHARP.map(n => <option key={n} value={n}>{n}</option>)}
                                <option value="Am">Am</option><option value="Em">Em</option><option value="Bm">Bm</option>
                            </select>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                            <Rocker label="Feel" options={STYLE_LABELS} value={STYLES.indexOf(strumStyle)} onChange={(i) => setStrumStyle(STYLES[i])} />
                            <Rocker label="Mix" options={MIX_LABELS} value={MIXES.indexOf(instrumentMix)} onChange={(i) => setInstrumentMix(MIXES[i])} />
                        </div>

                        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                            {/* count-in */}
                            <button onClick={() => setUseCountIn(v => !v)} style={{
                                flex: '1 1 120px', padding: '9px 10px', borderRadius: 7, cursor: 'pointer', fontFamily: '"JetBrains Mono", monospace',
                                fontSize: 10.5, letterSpacing: 1, textTransform: 'uppercase', color: useCountIn ? '#1a0d04' : PANEL.inkMute,
                                background: useCountIn ? PANEL.brass : '#181410', border: `1px solid ${PANEL.line}`,
                            }}>Count-In {useCountIn ? 'On' : 'Off'}</button>
                            {/* loop */}
                            <div style={{ flex: '1 1 150px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '5px 8px', borderRadius: 7, background: '#141009', boxShadow: `inset 0 0 0 1px ${PANEL.line}` }}>
                                <span style={{ fontSize: 9, color: PANEL.inkMute, letterSpacing: 1, textTransform: 'uppercase' }}>Loop</span>
                                <input type="number" min={1} max={resolvedProg.length} value={loopStart} onChange={(e) => setLoopStart(Math.max(1, Number(e.target.value)))} style={numStyle} />
                                <span style={{ color: PANEL.inkMute }}>–</span>
                                <input type="number" min={1} max={resolvedProg.length} value={loopEnd} onChange={(e) => setLoopEnd(Number(e.target.value))} style={numStyle} />
                            </div>
                        </div>

                        {/* auto-speedup */}
                        <div style={{ borderRadius: 8, background: '#141009', boxShadow: `inset 0 0 0 1px ${PANEL.line}`, padding: '10px 12px' }}>
                            <button onClick={() => setAutoSpeedup(v => !v)} style={{
                                display: 'flex', width: '100%', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer',
                                background: 'transparent', border: 'none', padding: 0,
                            }}>
                                <span style={{ fontSize: 10.5, letterSpacing: 1, textTransform: 'uppercase', color: PANEL.ink }}>Auto-Speedup</span>
                                <span style={{ width: 40, height: 22, borderRadius: 999, position: 'relative', background: autoSpeedup ? PANEL.brass : '#181410', boxShadow: `inset 0 0 0 1px ${PANEL.line}` }}>
                                    <span style={{ position: 'absolute', top: 2, left: autoSpeedup ? 20 : 2, width: 18, height: 18, borderRadius: 999, background: autoSpeedup ? '#1a0d04' : PANEL.inkMute, transition: 'left .12s' }} />
                                </span>
                            </button>
                            <div style={{ display: autoSpeedup ? 'flex' : 'none', gap: 14, marginTop: 10, fontSize: 11, color: PANEL.inkMute }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>+<input type="number" value={speedupAmount} onChange={(e) => setSpeedupAmount(Number(e.target.value))} style={numStyle} /> bpm</label>
                                <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>every<input type="number" value={speedupInterval} onChange={(e) => setSpeedupInterval(Number(e.target.value))} style={numStyle} /> bars</label>
                            </div>
                        </div>
                    </div>

                    {/* ── TRANSPORT (pinned, thumb reach) ──────────────────── */}
                    <div style={{
                        flex: '0 0 auto', display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px env(safe-area-inset-bottom,12px)',
                        borderTop: `1px solid ${PANEL.line}`, background: 'linear-gradient(0deg, rgba(0,0,0,0.3), rgba(0,0,0,0))',
                    }}>
                        <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                                <span style={{ fontFamily: '"DM Serif Display", serif', fontSize: 32, color: PANEL.ink, lineHeight: 1 }}>{bpm}</span>
                                <span style={{ fontSize: 9, color: PANEL.inkMute, letterSpacing: 1.5 }}>BPM</span>
                            </div>
                            <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                                {stepBtn('−5', () => setBpm(b => Math.max(40, b - 5)))}
                                {stepBtn('+5', () => setBpm(b => Math.min(300, b + 5)))}
                            </div>
                            <input type="range" min={40} max={300} value={bpm} onChange={(e) => setBpm(Number(e.target.value))}
                                style={{ width: '100%', marginTop: 8, accentColor: PANEL.brass }} />
                        </div>
                        <button onClick={() => setIsPlaying(p => !p)} style={{
                            flex: '0 0 auto', width: 92, height: 92, borderRadius: 16, cursor: 'pointer', border: 'none',
                            fontFamily: '"DM Serif Display", serif', fontSize: 19, letterSpacing: 0.5,
                            color: isPlaying ? '#1a0d04' : '#1a0d04',
                            background: isPlaying
                                ? 'linear-gradient(180deg,#d8895a,#a8472a)'
                                : `linear-gradient(180deg,${PANEL.brassLite},${PANEL.brass})`,
                            boxShadow: `0 4px 0 ${isPlaying ? '#7a2e18' : PANEL.brassDark}, 0 6px 16px rgba(0,0,0,0.5)`,
                        }}>{isPlaying ? 'STOP' : 'PLAY'}</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default OpenJamSimulator;
