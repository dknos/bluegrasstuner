
import React, { useState, useEffect, useCallback } from 'react';
import { CHORD_QUIZ_DATA, ChordQuizItem, playTone } from '../services/audioUtils';

interface GuessThatChordGameProps {
  onClose: () => void;
}

const GuessThatChordGame: React.FC<GuessThatChordGameProps> = ({ onClose }) => {
  const [currentChord, setCurrentChord] = useState<ChordQuizItem | null>(null);
  const [options, setOptions] = useState<ChordQuizItem[]>([]);
  const [gameState, setGameState] = useState<'start' | 'playing' | 'guessing' | 'result'>('start');
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean>(false);
  const [countdown, setCountdown] = useState<number>(0);

  const startNewRound = useCallback(() => {
    // Pick random chord
    const randomIndex = Math.floor(Math.random() * CHORD_QUIZ_DATA.length);
    const correct = CHORD_QUIZ_DATA[randomIndex];

    // Pick 2 wrong answers
    const distractors = CHORD_QUIZ_DATA.filter(c => c.name !== correct.name)
      .sort(() => 0.5 - Math.random())
      .slice(0, 2);

    // Shuffle options
    const roundOptions = [correct, ...distractors].sort(() => 0.5 - Math.random());

    setCurrentChord(correct);
    setOptions(roundOptions);
    setSelectedAnswer(null);
    setGameState('playing');
    playChordSequence(correct);
  }, []);

  const playChordSequence = async (chord: ChordQuizItem) => {
    // Play 3 notes, 1 second apart
    for (let i = 0; i < 3; i++) {
        setCountdown(i + 1); // Visual indicator
        playTone(chord.notes[i], 'triangle');
        await new Promise(r => setTimeout(r, 1000));
    }
    setCountdown(0);
    setGameState('guessing');
  };

  const handleGuess = (guessedName: string) => {
    if (!currentChord) return;
    
    setSelectedAnswer(guessedName);
    const correct = guessedName === currentChord.name;
    setIsCorrect(correct);
    setGameState('result');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-md shadow-2xl relative">
        
        {/* Close Button */}
        <button 
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-500 hover:text-white"
        >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
        </button>

        <h2 className="text-2xl font-black text-center mb-6 text-transparent bg-clip-text bg-gradient-to-r from-neon-blue to-purple-500">
            GUESS THAT CHORD
        </h2>

        {gameState === 'start' && (
            <div className="flex flex-col items-center justify-center space-y-6 py-8">
                <p className="text-gray-400 text-center max-w-xs">
                    Listen to three notes played in sequence and guess which chord they belong to.
                </p>
                <div className="w-16 h-16 rounded-full bg-gray-800 flex items-center justify-center mb-2 animate-pulse">
                    <span className="text-3xl">♪</span>
                </div>
                <button 
                    onClick={startNewRound}
                    className="px-8 py-3 bg-neon-blue hover:bg-cyan-400 text-black font-black rounded-full shadow-[0_0_20px_rgba(0,243,255,0.4)] transition-transform active:scale-95 text-xl"
                >
                    START GAME
                </button>
            </div>
        )}

        {gameState === 'playing' && (
            <div className="flex flex-col items-center justify-center h-48 space-y-4">
                <div className="text-neon-blue text-sm font-bold tracking-widest animate-pulse">
                    LISTENING...
                </div>
                <div className="flex gap-4">
                    {[1, 2, 3].map((n, i) => (
                        <div key={i} className={`w-4 h-4 rounded-full transition-all duration-300 ${countdown === n ? 'bg-neon-blue scale-125' : 'bg-gray-700'}`}></div>
                    ))}
                </div>
                <p className="text-gray-400 text-xs mt-2">Playing notes (1s each)</p>
            </div>
        )}

        {gameState === 'guessing' && (
            <div className="flex flex-col space-y-4">
                <div className="text-center text-gray-300 mb-4">Which chord was that?</div>
                <div className="grid grid-cols-1 gap-3">
                    {options.map((opt) => (
                        <button
                            key={opt.name}
                            onClick={() => handleGuess(opt.name)}
                            className="p-4 rounded-xl bg-gray-800 hover:bg-gray-700 border border-gray-600 hover:border-neon-blue transition-all font-bold text-lg text-white"
                        >
                            {opt.name}
                        </button>
                    ))}
                </div>
                <button 
                    onClick={() => currentChord && playChordSequence(currentChord)}
                    className="mt-4 text-xs text-gray-500 hover:text-white underline text-center w-full"
                >
                    Replay Audio
                </button>
            </div>
        )}

        {gameState === 'result' && currentChord && (
            <div className="flex flex-col items-center space-y-6">
                <div className={`text-6xl ${isCorrect ? 'text-green-500' : 'text-red-500'} mb-2`}>
                    {isCorrect ? '✓' : '✗'}
                </div>
                
                <div className="text-center">
                    <p className="text-gray-400 text-sm uppercase tracking-wider mb-1">The chord was</p>
                    <h3 className="text-3xl font-black text-white">{currentChord.name}</h3>
                </div>

                <div className="flex gap-3 justify-center">
                    {currentChord.noteNames.map((n, i) => (
                        <div key={i} className="w-12 h-12 rounded-full border border-gray-600 bg-gray-800 flex items-center justify-center font-bold text-neon-blue shadow-lg">
                            {n}
                        </div>
                    ))}
                </div>

                {!isCorrect && selectedAnswer && (
                    <p className="text-red-400 text-sm">You guessed: {selectedAnswer}</p>
                )}

                <button 
                    onClick={startNewRound}
                    className="w-full py-3 bg-neon-blue hover:bg-cyan-400 text-black font-bold rounded-xl shadow-lg shadow-neon-blue/20 transition-transform active:scale-95"
                >
                    NEXT CHORD
                </button>
            </div>
        )}

      </div>
    </div>
  );
};

export default GuessThatChordGame;
