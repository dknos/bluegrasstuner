
import React, { useState, useEffect, useRef, useCallback } from 'react';

interface GuessTimeSignatureGameProps {
  onClose: () => void;
}

const TIME_SIG_OPTIONS = [
    { label: "3/4", beats: 3 },
    { label: "4/4", beats: 4 },
    { label: "5/4", beats: 5 },
    { label: "6/8", beats: 6 }, // 6/8 often felt as 2 big beats, but for click track usually 6 clicks with accent on 1
    { label: "7/4", beats: 7 }
];

const GuessTimeSignatureGame: React.FC<GuessTimeSignatureGameProps> = ({ onClose }) => {
  const [gameState, setGameState] = useState<'start' | 'playing' | 'guessing' | 'result'>('start');
  const [targetSig, setTargetSig] = useState(TIME_SIG_OPTIONS[0]);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState(false);
  const [currentBeat, setCurrentBeat] = useState(0);

  // Audio Refs
  const audioCtxRef = useRef<AudioContext | null>(null);
  const nextNoteTimeRef = useRef<number>(0);
  const timerIDRef = useRef<number | null>(null);
  const isPlayingRef = useRef(false);
  const beatCountRef = useRef(0);

  const startNewRound = useCallback(() => {
    // Pick Random Time Signature
    const randomIdx = Math.floor(Math.random() * TIME_SIG_OPTIONS.length);
    const correct = TIME_SIG_OPTIONS[randomIdx];
    
    setTargetSig(correct);
    setSelectedAnswer(null);
    setGameState('playing');
    
    // Play for 2 measures
    playClickTrack(correct.beats, 2);
  }, []);

  const playClickTrack = (beatsPerBar: number, barsToPlay: number) => {
    if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    const ctx = audioCtxRef.current;
    if (ctx.state === 'suspended') ctx.resume();

    isPlayingRef.current = true;
    nextNoteTimeRef.current = ctx.currentTime + 0.1;
    beatCountRef.current = 0;
    
    const totalBeats = beatsPerBar * barsToPlay;
    const tempo = 100; // Fixed tempo for consistency

    const schedule = () => {
        if (!isPlayingRef.current) return;
        
        while (nextNoteTimeRef.current < ctx.currentTime + 0.1) {
            if (beatCountRef.current >= totalBeats) {
                isPlayingRef.current = false;
                setGameState('guessing');
                setCurrentBeat(0);
                return;
            }

            const currentBarBeat = beatCountRef.current % beatsPerBar;

            // Play Click
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);

            // Accent on Beat 1 (Index 0)
            const isAccent = currentBarBeat === 0;
            osc.frequency.value = isAccent ? 1500 : 800;
            gain.gain.setValueAtTime(isAccent ? 0.8 : 0.4, nextNoteTimeRef.current);
            gain.gain.exponentialRampToValueAtTime(0.001, nextNoteTimeRef.current + 0.05);

            osc.start(nextNoteTimeRef.current);
            osc.stop(nextNoteTimeRef.current + 0.05);

            // Visual Sync
            const visualBeat = currentBarBeat + 1;
            setTimeout(() => setCurrentBeat(visualBeat), (nextNoteTimeRef.current - ctx.currentTime) * 1000);

            // Advance
            const secondsPerBeat = 60.0 / tempo;
            nextNoteTimeRef.current += secondsPerBeat;
            beatCountRef.current++;
        }
        timerIDRef.current = window.setTimeout(schedule, 25);
    };
    
    schedule();
  };

  const stopAudio = () => {
      isPlayingRef.current = false;
      if (timerIDRef.current) clearTimeout(timerIDRef.current);
      setCurrentBeat(0);
  };

  const handleGuess = (guessLabel: string) => {
      setSelectedAnswer(guessLabel);
      const correct = guessLabel === targetSig.label;
      setIsCorrect(correct);
      setGameState('result');
  };

  useEffect(() => {
      return () => stopAudio();
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-md shadow-2xl relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-white">✕</button>

        <h2 className="text-2xl font-black text-center mb-6 text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-500 uppercase tracking-widest">
            GUESS THE SIGNATURE
        </h2>

        {gameState === 'start' && (
            <div className="flex flex-col items-center justify-center space-y-6 py-8">
                <p className="text-gray-400 text-center max-w-xs">
                    Listen to the click track accents and determine the Time Signature.
                </p>
                <div className="w-16 h-16 rounded-full bg-gray-800 flex items-center justify-center mb-2 animate-pulse">
                    <span className="text-3xl">🎼</span>
                </div>
                <button 
                    onClick={startNewRound}
                    className="px-8 py-3 bg-indigo-500 hover:bg-indigo-400 text-white font-black rounded-full shadow-[0_0_20px_rgba(99,102,241,0.4)] transition-transform active:scale-95 text-xl"
                >
                    START GAME
                </button>
            </div>
        )}

        {gameState === 'playing' && (
            <div className="flex flex-col items-center justify-center h-48 space-y-6">
                <div className="text-indigo-400 text-sm font-bold tracking-widest animate-pulse">
                    LISTENING...
                </div>
                <div className="w-full flex justify-center gap-2">
                    {/* Visual Beat Indicator */}
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl font-black transition-all ${currentBeat === 1 ? 'bg-indigo-500 text-white scale-110 shadow-lg' : 'bg-gray-800 text-gray-500'}`}>
                        {currentBeat || '-'}
                    </div>
                </div>
                <p className="text-gray-500 text-xs">Count the beats per measure!</p>
            </div>
        )}

        {gameState === 'guessing' && (
            <div className="flex flex-col space-y-4">
                <div className="text-center text-gray-300 mb-4">What was the time signature?</div>
                <div className="grid grid-cols-2 gap-3">
                    {TIME_SIG_OPTIONS.map((opt) => (
                        <button
                            key={opt.label}
                            onClick={() => handleGuess(opt.label)}
                            className="p-4 rounded-xl bg-gray-800 hover:bg-gray-700 border border-gray-600 hover:border-indigo-500 transition-all font-bold text-lg text-white"
                        >
                            {opt.label}
                        </button>
                    ))}
                </div>
                <button 
                    onClick={() => playClickTrack(targetSig.beats, 2)}
                    className="mt-4 text-xs text-gray-500 hover:text-white underline text-center w-full"
                >
                    Replay Audio
                </button>
            </div>
        )}

        {gameState === 'result' && (
            <div className="flex flex-col items-center space-y-6">
                <div className={`text-6xl ${isCorrect ? 'text-green-500' : 'text-red-500'} mb-2`}>
                    {isCorrect ? '✓' : '✗'}
                </div>
                
                <div className="text-center">
                    <p className="text-gray-400 text-sm uppercase tracking-wider mb-1">Correct Signature</p>
                    <h3 className="text-4xl font-black text-white">{targetSig.label}</h3>
                </div>

                {!isCorrect && selectedAnswer && (
                    <p className="text-red-400 text-sm">You guessed: {selectedAnswer}</p>
                )}

                <button 
                    onClick={startNewRound}
                    className="w-full py-3 bg-indigo-500 hover:bg-indigo-400 text-white font-bold rounded-xl shadow-lg shadow-indigo-500/20 transition-transform active:scale-95"
                >
                    NEXT ROUND
                </button>
            </div>
        )}
      </div>
    </div>
  );
};

export default GuessTimeSignatureGame;
