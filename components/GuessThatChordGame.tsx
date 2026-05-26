
import React, { useState, useEffect, useCallback } from 'react';
import { CHORD_QUIZ_DATA, ChordQuizItem, playTone } from '../services/audioUtils';
import { SynthShell, ChoiceButton, StatChip, Engrave, PANEL } from './synthkit';

const SERIF = '"DM Serif Display", serif';
const MONO = '"JetBrains Mono", monospace';

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

  // ── shared "recessed phosphor screen" wrapper (Scope-style, no analyser) ──
  const Screen: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div style={{
      borderRadius: 8, overflow: 'hidden', padding: '20px 16px', minHeight: 132,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10,
      background: PANEL.screen,
      boxShadow: `inset 0 2px 10px rgba(0,0,0,0.9), 0 0 0 1px ${PANEL.brassDark}, 0 0 0 3px rgba(0,0,0,0.5)`,
      backgroundImage: 'repeating-linear-gradient(0deg, rgba(143,209,122,0.05) 0 1px, transparent 1px 4px)',
    }}>{children}</div>
  );

  // ── big brass transport button (PLAY / REPLAY / NEXT) ──
  const BrassButton: React.FC<{ onClick: () => void; children: React.ReactNode }> = ({ onClick, children }) => (
    <button onClick={onClick} style={{
      width: '100%', padding: '16px 0', borderRadius: 11, cursor: 'pointer', touchAction: 'none',
      fontFamily: SERIF, fontSize: 21, letterSpacing: 2.5, textTransform: 'uppercase',
      border: `2px solid ${PANEL.brass}`, color: '#1a0d04',
      background: `linear-gradient(180deg, ${PANEL.brassLite}, ${PANEL.brass})`,
      boxShadow: `0 0 22px rgba(202,160,82,0.4), inset 0 1px 0 rgba(255,255,255,0.35)`,
      transition: 'all .08s',
    }}>{children}</button>
  );

  return (
    <SynthShell name="Chord Quiz" tag="Ear Training · Chords" onClose={onClose} accent={PANEL.brass}>

      {/* ── START ─────────────────────────────────────────── */}
      {gameState === 'start' && (
        <>
          <Engrave>Ear Training</Engrave>
          <Screen>
            <span style={{ fontFamily: SERIF, fontSize: 40, color: PANEL.phosphor, textShadow: `0 0 18px ${PANEL.phosphor}`, lineHeight: 1 }}>♪</span>
            <span style={{ fontFamily: MONO, fontSize: 10.5, color: PANEL.inkMute, textAlign: 'center', lineHeight: 1.7, maxWidth: 260 }}>
              Three notes play in sequence. Name the chord they belong to.
            </span>
          </Screen>
          <BrassButton onClick={startNewRound}>▶ Play Chord</BrassButton>
        </>
      )}

      {/* ── PLAYING (chord sounding) ──────────────────────── */}
      {gameState === 'playing' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 10 }}>
            <StatChip label="Status" value="Listen" accent={PANEL.phosphor} />
            <StatChip label="Note" value={`${countdown || '–'}/3`} accent={PANEL.brassLite} />
          </div>
          <Screen>
            <span style={{ fontFamily: MONO, fontSize: 10, letterSpacing: 3, color: PANEL.phosphor, textTransform: 'uppercase', textShadow: `0 0 10px ${PANEL.phosphor}` }}>
              Listening
            </span>
            <div style={{ display: 'flex', gap: 14 }}>
              {[1, 2, 3].map((n, i) => (
                <div key={i} style={{
                  width: 16, height: 16, borderRadius: 999, transition: 'all .2s',
                  background: countdown === n ? PANEL.phosphor : 'transparent',
                  boxShadow: countdown === n
                    ? `0 0 14px ${PANEL.phosphor}, inset 0 0 0 1px ${PANEL.phosphor}`
                    : `inset 0 0 0 1px rgba(143,209,122,0.3)`,
                }} />
              ))}
            </div>
            <span style={{ fontFamily: MONO, fontSize: 8.5, color: PANEL.inkMute, letterSpacing: 1.5 }}>3 notes · 1s each</span>
          </Screen>
        </>
      )}

      {/* ── GUESSING (pick an answer) ─────────────────────── */}
      {gameState === 'guessing' && (
        <>
          <Engrave>Which chord was that?</Engrave>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {options.map((opt) => (
              <div key={opt.name} style={{ flex: '1 1 calc(50% - 8px)', minWidth: 130 }}>
                <ChoiceButton label={opt.name} state="idle" onClick={() => handleGuess(opt.name)} />
              </div>
            ))}
          </div>
          <BrassButton onClick={() => currentChord && playChordSequence(currentChord)}>↻ Replay</BrassButton>
        </>
      )}

      {/* ── RESULT (reveal + feedback) ────────────────────── */}
      {gameState === 'result' && currentChord && (
        <>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 10 }}>
            <StatChip label="Result" value={isCorrect ? 'Correct' : 'Miss'} accent={isCorrect ? PANEL.phosphor : '#a8472a'} />
          </div>

          <Screen>
            <span style={{ fontFamily: MONO, fontSize: 8.5, letterSpacing: 2.5, color: PANEL.inkMute, textTransform: 'uppercase' }}>The chord was</span>
            <span style={{ fontFamily: SERIF, fontSize: 38, color: PANEL.phosphor, textShadow: `0 0 18px ${PANEL.phosphor}`, lineHeight: 1 }}>{currentChord.name}</span>
            <div style={{ display: 'flex', gap: 8, marginTop: 2 }}>
              {currentChord.noteNames.map((n, i) => (
                <div key={i} style={{
                  minWidth: 38, padding: '7px 0', borderRadius: 7, textAlign: 'center',
                  fontFamily: MONO, fontSize: 13, color: PANEL.phosphor,
                  background: 'rgba(143,209,122,0.08)', boxShadow: `inset 0 0 0 1px rgba(143,209,122,0.3)`,
                }}>{n}</div>
              ))}
            </div>
          </Screen>

          {/* options re-shown with correct / wrong / disabled feedback */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {options.map((opt) => {
              const state: 'idle' | 'correct' | 'wrong' =
                opt.name === currentChord.name ? 'correct'
                : (!isCorrect && opt.name === selectedAnswer) ? 'wrong'
                : 'idle';
              return (
                <div key={opt.name} style={{ flex: '1 1 calc(50% - 8px)', minWidth: 130 }}>
                  <ChoiceButton label={opt.name} state={state} disabled />
                </div>
              );
            })}
          </div>

          {!isCorrect && selectedAnswer && (
            <span style={{ fontFamily: MONO, fontSize: 10, color: '#e6b0a0', textAlign: 'center', letterSpacing: 0.5 }}>
              You guessed {selectedAnswer}
            </span>
          )}

          <BrassButton onClick={startNewRound}>▶ Next Chord</BrassButton>
        </>
      )}

    </SynthShell>
  );
};

export default GuessThatChordGame;
