
import React, { useState, useEffect, useRef, useCallback } from 'react';

interface GuessThatTempoGameProps {
  onClose: () => void;
}

const GuessThatTempoGame: React.FC<GuessThatTempoGameProps> = ({ onClose }) => {
  const [gameState, setGameState] = useState<'start' | 'playing' | 'guessing' | 'result'>('start');
  const [targetBpm, setTargetBpm] = useState(0);
  const [options, setOptions] = useState<number[]>([]);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [isCorrect, setIsCorrect] = useState(false);
  const [countdown, setCountdown] = useState(0);

  // Audio Refs
  const audioCtxRef = useRef<AudioContext | null>(null);
  const nextNoteTimeRef = useRef<number>(0);
  const timerIDRef = useRef<number | null>(null);
  const isPlayingRef = useRef(false);

  const startNewRound = useCallback(() => {
    // Generate Random BPM (60 - 160) rounded to nearest 5 or 10
    const rawBpm = Math.floor(Math.random() * (160 - 60) + 60);
    const correct = Math.round(rawBpm / 5) * 5;
    
    // Generate Options
    const distractors = [
        correct - (Math.floor(Math.random() * 3 + 1) * 10), // e.g. -10, -20
        correct + (Math.floor(Math.random() * 3 + 1) * 10)  // e.g. +10, +20
    ].sort(() => 0.5 - Math.random());
    
    const roundOptions = [correct, ...distractors].sort(() => 0.5 - Math.random());

    setTargetBpm(correct);
    setOptions(roundOptions);
    setSelectedAnswer(null);
    setGameState('playing');
    
    playClickTrack(correct);
  }, []);

  const playClickTrack = (bpm: number) => {
    if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    const ctx = audioCtxRef.current;
    if (ctx.state === 'suspended') ctx.resume();

    isPlayingRef.current = true;
    nextNoteTimeRef.current = ctx.currentTime + 0.1;
    
    let beatsPlayed = 0;
    const maxBeats = 8; // Play 2 bars of 4/4

    const schedule = () => {
        if (!isPlayingRef.current) return;
        
        while (nextNoteTimeRef.current < ctx.currentTime + 0.1) {
            if (beatsPlayed >= maxBeats) {
                isPlayingRef.current = false;
                setGameState('guessing');
                return;
            }

            // Play Click
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.frequency.value = (beatsPlayed % 4 === 0) ? 1200 : 800;
            gain.gain.setValueAtTime(0.5, nextNoteTimeRef.current);
            gain.gain.exponentialRampToValueAtTime(0.001, nextNoteTimeRef.current + 0.05);

            osc.start(nextNoteTimeRef.current);
            osc.stop(nextNoteTimeRef.current + 0.05);

            // Visual feedback
            const beatNum = beatsPlayed + 1;
            // Use timeout to sync visual to audio roughly
            setTimeout(() => setCountdown(beatNum), (nextNoteTimeRef.current - ctx.currentTime) * 1000);

            // Advance
            const secondsPerBeat = 60.0 / bpm;
            nextNoteTimeRef.current += secondsPerBeat;
            beatsPlayed++;
        }
        timerIDRef.current = window.setTimeout(schedule, 25);
    };
    
    schedule();
  };

  const stopAudio = () => {
      isPlayingRef.current = false;
      if (timerIDRef.current) clearTimeout(timerIDRef.current);
      setCountdown(0);
  };

  const handleGuess = (guess: number) => {
      setSelectedAnswer(guess);
      const correct = guess === targetBpm;
      setIsCorrect(correct);
      setGameState('result');
  };

  // Cleanup
  useEffect(() => {
      return () => stopAudio();
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-md shadow-2xl relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-white">✕</button>

        <h2 className="text-2xl font-black text-center mb-6 text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-emerald-500 uppercase tracking-widest">
            GUESS THE TEMPO
        </h2>

        {gameState === 'start' && (
            <div className="flex flex-col items-center justify-center space-y-6 py-8">
                <p className="text-gray-400 text-center max-w-xs">
                    Listen to the click track and guess the BPM (Beats Per Minute).
                </p>
                <div className="w-16 h-16 rounded-full bg-gray-800 flex items-center justify-center mb-2 animate-pulse">
                    <span className="text-3xl">⏱</span>
                </div>
                <button 
                    onClick={startNewRound}
                    className="px-8 py-3 bg-teal-500 hover:bg-teal-400 text-black font-black rounded-full shadow-[0_0_20px_rgba(20,184,166,0.4)] transition-transform active:scale-95 text-xl"
                >
                    START GAME
                </button>
            </div>
        )}

        {gameState === 'playing' && (
            <div className="flex flex-col items-center justify-center h-48 space-y-4">
                <div className="text-teal-400 text-sm font-bold tracking-widest animate-pulse">
                    LISTENING...
                </div>
                <div className="text-6xl font-black text-white tabular-nums">
                    {countdown}
                </div>
                <p className="text-gray-500 text-xs">Beats</p>
            </div>
        )}

        {gameState === 'guessing' && (
            <div className="flex flex-col space-y-4">
                <div className="text-center text-gray-300 mb-4">What was the tempo?</div>
                <div className="grid grid-cols-1 gap-3">
                    {options.map((bpm) => (
                        <button
                            key={bpm}
                            onClick={() => handleGuess(bpm)}
                            className="p-4 rounded-xl bg-gray-800 hover:bg-gray-700 border border-gray-600 hover:border-teal-500 transition-all font-bold text-lg text-white"
                        >
                            {bpm} BPM
                        </button>
                    ))}
                </div>
                <button 
                    onClick={() => playClickTrack(targetBpm)}
                    className="mt-4 text-xs text-gray-500 hover:text-white underline text-center w-full"
                >
                    Replay Click Track
                </button>
            </div>
        )}

        {gameState === 'result' && (
            <div className="flex flex-col items-center space-y-6">
                <div className={`text-6xl ${isCorrect ? 'text-green-500' : 'text-red-500'} mb-2`}>
                    {isCorrect ? '✓' : '✗'}
                </div>
                
                <div className="text-center">
                    <p className="text-gray-400 text-sm uppercase tracking-wider mb-1">Actual Tempo</p>
                    <h3 className="text-4xl font-black text-white">{targetBpm} <span className="text-sm text-gray-500">BPM</span></h3>
                </div>

                {!isCorrect && selectedAnswer && (
                    <p className="text-red-400 text-sm">You guessed: {selectedAnswer} BPM</p>
                )}

                <button 
                    onClick={startNewRound}
                    className="w-full py-3 bg-teal-500 hover:bg-teal-400 text-black font-bold rounded-xl shadow-lg shadow-teal-500/20 transition-transform active:scale-95"
                >
                    NEXT ROUND
                </button>
            </div>
        )}
      </div>
    </div>
  );
};

export default GuessThatTempoGame;
