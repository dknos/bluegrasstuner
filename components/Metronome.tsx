
import React, { useState, useEffect, useRef, useCallback } from 'react';

interface MetronomeProps {
  onClose: () => void;
}

const TIME_SIGNATURES = [
  { label: '4/4', beats: 4, noteValue: 4 },
  { label: '2/4', beats: 2, noteValue: 4 },
  { label: '3/4', beats: 3, noteValue: 4 },
  { label: '5/4', beats: 5, noteValue: 4 },
  { label: '7/4', beats: 7, noteValue: 4 },
  { label: '6/8', beats: 6, noteValue: 8 },
  { label: '9/8', beats: 9, noteValue: 8 },
  { label: '12/8', beats: 12, noteValue: 8 },
];

const Metronome: React.FC<MetronomeProps> = ({ onClose }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [bpm, setBpm] = useState(120);
  const [signatureIndex, setSignatureIndex] = useState(0);
  const [currentBeat, setCurrentBeat] = useState(-1); // For visualizer

  // Audio Context Refs
  const audioCtxRef = useRef<AudioContext | null>(null);
  const nextNoteTimeRef = useRef<number>(0);
  const timerIDRef = useRef<number | null>(null);
  const beatCountRef = useRef<number>(0);

  // Constants
  const lookahead = 25.0; // How frequently to call scheduling function (in milliseconds)
  const scheduleAheadTime = 0.1; // How far ahead to schedule audio (sec)

  const currentSignature = TIME_SIGNATURES[signatureIndex];

  // Initialize Audio Context on user interaction (Start)
  const initAudio = () => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
  };

  const nextNote = () => {
    const secondsPerBeat = 60.0 / bpm;
    // Adjust for 6/8, 9/8, 12/8 where the beat unit is usually the dotted quarter or eighth?
    // Standard metronomes usually tick the denominator. 
    // So 6/8 at 120bpm means 120 eighth notes per minute.
    
    nextNoteTimeRef.current += secondsPerBeat;
    
    beatCountRef.current++;
    if (beatCountRef.current >= currentSignature.beats) {
        beatCountRef.current = 0;
    }
  };

  const scheduleNote = (beatNumber: number, time: number) => {
    if (!audioCtxRef.current) return;
    const ctx = audioCtxRef.current;

    // Create Oscillator
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc.connect(gainNode);
    gainNode.connect(ctx.destination);

    // Determine Pitch
    // Beat 0 (1st beat) is high pitch accent
    // For compound meters (6/8, 9/8, 12/8), maybe accent 1 and 4, 7, 10?
    // Let's stick to simple Downbeat accent for now.
    const isAccent = beatNumber === 0;
    
    // Optional: Secondary accents for 6/8 etc?
    // if (currentSignature.noteValue === 8 && beatNumber % 3 === 0) ... 

    osc.frequency.value = isAccent ? 1200 : 800; 
    
    // Envelope
    gainNode.gain.setValueAtTime(isAccent ? 1 : 0.6, time);
    gainNode.gain.exponentialRampToValueAtTime(0.001, time + 0.1);

    osc.start(time);
    osc.stop(time + 0.1);

    // Update Visual State (using draw callback to sync visually somewhat)
    // We can't sync React state perfectly to Audio time in the future, 
    // but we can set a timeout to update the UI when the note plays.
    const timeToNote = (time - ctx.currentTime) * 1000;
    setTimeout(() => {
        setCurrentBeat(beatNumber);
    }, Math.max(0, timeToNote));
  };

  const scheduler = useCallback(() => {
    if (!audioCtxRef.current) return;
    
    // While there are notes that will need to play before the next interval, 
    // schedule them and advance the pointer.
    while (nextNoteTimeRef.current < audioCtxRef.current.currentTime + scheduleAheadTime) {
        scheduleNote(beatCountRef.current, nextNoteTimeRef.current);
        nextNote();
    }
    timerIDRef.current = window.setTimeout(scheduler, lookahead);
  }, [bpm, currentSignature]); // dependencies usually handled by ref, but scheduler needs to see current state if accessed directly

  useEffect(() => {
    if (isPlaying) {
        initAudio();
        if (audioCtxRef.current) {
            beatCountRef.current = 0;
            nextNoteTimeRef.current = audioCtxRef.current.currentTime + 0.05;
            scheduler();
        }
    } else {
        if (timerIDRef.current) window.clearTimeout(timerIDRef.current);
        setCurrentBeat(-1);
    }
    return () => {
        if (timerIDRef.current) window.clearTimeout(timerIDRef.current);
    };
  }, [isPlaying, scheduler]);

  // Adjust BPM
  const handleBpmChange = (val: number) => {
      setBpm(Math.min(300, Math.max(40, val)));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-fade-in">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-md shadow-2xl relative flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="flex-none p-4 border-b border-gray-800 flex items-center justify-between bg-gray-950">
            <h2 className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-emerald-500 uppercase tracking-widest">
                METRONOME
            </h2>
            <button onClick={onClose} className="text-gray-500 hover:text-white">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
            </button>
        </div>

        {/* Content */}
        <div className="p-8 flex flex-col items-center gap-8">
            
            {/* BPM Display */}
            <div className="flex flex-col items-center">
                <div className="text-8xl font-black text-white tabular-nums tracking-tighter drop-shadow-lg">
                    {bpm}
                </div>
                <div className="text-gray-500 text-sm font-bold uppercase tracking-[0.3em]">BPM</div>
            </div>

            {/* Visualizer Dots */}
            <div className="flex gap-2 h-8 items-center justify-center">
                {[...Array(currentSignature.beats)].map((_, i) => (
                    <div 
                        key={i} 
                        className={`rounded-full transition-all duration-75 
                            ${currentBeat === i 
                                ? (i === 0 ? 'w-6 h-6 bg-teal-400 shadow-[0_0_15px_#2dd4bf]' : 'w-5 h-5 bg-emerald-600 shadow-[0_0_10px_#059669]') 
                                : 'w-3 h-3 bg-gray-800'
                            }
                        `}
                    ></div>
                ))}
            </div>

            {/* Slider */}
            <div className="w-full px-4">
                <input 
                    type="range" 
                    min="40" 
                    max="300" 
                    value={bpm} 
                    onChange={(e) => handleBpmChange(parseInt(e.target.value))}
                    className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-teal-500"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-2 font-mono">
                    <span>40</span>
                    <span>300</span>
                </div>
            </div>

            {/* Controls */}
            <div className="flex w-full gap-4">
                 {/* Time Signature Dropdown */}
                 <div className="flex-1">
                    <label className="block text-xs text-gray-500 font-bold mb-1 uppercase">Time Sig</label>
                    <select 
                        value={signatureIndex}
                        onChange={(e) => {
                            setSignatureIndex(parseInt(e.target.value));
                            // Optional: Reset beat count immediately or let it flow? Let it flow usually fine.
                        }}
                        className="w-full bg-gray-800 text-white font-bold rounded-lg p-3 border border-gray-700 focus:border-teal-500 outline-none appearance-none text-center"
                    >
                        {TIME_SIGNATURES.map((sig, i) => (
                            <option key={sig.label} value={i}>{sig.label}</option>
                        ))}
                    </select>
                 </div>

                 {/* Play Button */}
                 <button 
                    onClick={() => setIsPlaying(!isPlaying)}
                    className={`flex-1 rounded-lg font-black text-xl flex items-center justify-center transition-all shadow-lg active:scale-95
                        ${isPlaying 
                            ? 'bg-red-600 hover:bg-red-500 text-white shadow-red-900/50' 
                            : 'bg-teal-500 hover:bg-teal-400 text-gray-900 shadow-teal-900/50'
                        }
                    `}
                 >
                    {isPlaying ? 'STOP' : 'START'}
                 </button>
            </div>
            
            {/* Quick Presets (Optional Bonus) */}
            <div className="flex gap-2 overflow-x-auto w-full justify-center pb-2">
                {[60, 80, 100, 120, 140].map(val => (
                    <button 
                        key={val}
                        onClick={() => setBpm(val)}
                        className="px-3 py-1 bg-gray-800 rounded text-xs text-gray-400 hover:text-white hover:bg-gray-700 font-mono"
                    >
                        {val}
                    </button>
                ))}
            </div>

        </div>

      </div>
    </div>
  );
};

export default Metronome;
