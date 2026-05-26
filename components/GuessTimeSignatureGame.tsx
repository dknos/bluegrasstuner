
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { SynthShell, ChoiceButton, StatChip, Engrave, PANEL } from './synthkit';

interface GuessTimeSignatureGameProps {
  onClose: () => void;
}

const SERIF = '"DM Serif Display", Georgia, serif';
const MONO = '"JetBrains Mono", ui-monospace, monospace';

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

  // ── presentation helpers (no state) ──────────────────────────────────────
  // During 'playing' we know the bar length (targetSig.beats); in 'guessing'
  // it is hidden until the player commits a guess. Render a phosphor meter
  // strip of cells, lighting the active beat and flaring the downbeat.
  const meterCells = gameState === 'playing' ? targetSig.beats : 0;
  const statusText =
    gameState === 'start' ? 'Standby'
    : gameState === 'playing' ? 'Listening'
    : gameState === 'guessing' ? 'Your Call'
    : isCorrect ? 'Correct' : 'Missed';
  const statusAccent =
    gameState === 'result' ? (isCorrect ? PANEL.phosphor : '#a8472a') : PANEL.ink;

  // shared brass action button
  const BrassButton: React.FC<{ label: string; onClick: () => void }> = ({ label, onClick }) => (
    <button onClick={onClick} style={{
      width: '100%', padding: '16px 0', borderRadius: 11, cursor: 'pointer',
      border: `2px solid ${PANEL.brassDark}`,
      fontFamily: MONO, fontSize: 13, letterSpacing: 3, textTransform: 'uppercase', fontWeight: 700,
      color: '#1a0d04', background: `linear-gradient(180deg,${PANEL.brassLite},${PANEL.brass})`,
      boxShadow: `0 0 20px rgba(202,160,82,0.32), inset 0 1px 0 rgba(255,255,255,0.35), 0 3px 6px rgba(0,0,0,0.45)`,
    }}>{label}</button>
  );

  return (
    <SynthShell name="Time Signature" tag="Ear Training · Meter" onClose={onClose} accent={PANEL.brass}>

      {/* ── phosphor meter readout (recessed screen) ── */}
      <div style={{
        position: 'relative', borderRadius: 8, padding: '14px 12px',
        background: PANEL.screen,
        boxShadow: `inset 0 2px 10px rgba(0,0,0,0.9), 0 0 0 1px ${PANEL.brassDark}, 0 0 0 3px rgba(0,0,0,0.5)`,
        display: 'flex', flexDirection: 'column', gap: 12, minHeight: 118, justifyContent: 'center',
      }}>
        {/* faint screen scanlines */}
        <div style={{ position: 'absolute', inset: 0, borderRadius: 8, pointerEvents: 'none',
          backgroundImage: 'repeating-linear-gradient(0deg, rgba(0,0,0,0.32) 0px, rgba(0,0,0,0.32) 1px, transparent 1px, transparent 3px)' }} />

        {/* status line */}
        <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontFamily: MONO, fontSize: 8.5, letterSpacing: 2.5, textTransform: 'uppercase', color: 'rgba(143,209,122,0.55)' }}>Meter</span>
          <span style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: 1.5, textTransform: 'uppercase', color: statusAccent, textShadow: gameState === 'playing' ? '0 0 8px rgba(143,209,122,0.6)' : 'none' }}>{statusText}</span>
        </div>

        {/* beat cells / reveal */}
        {gameState === 'result' ? (
          <div style={{ position: 'relative', textAlign: 'center' }}>
            <span style={{ fontFamily: SERIF, fontSize: 52, lineHeight: 1, color: isCorrect ? PANEL.phosphor : '#e6b0a0', textShadow: isCorrect ? `0 0 22px ${PANEL.phosphor}` : '0 0 16px rgba(168,71,42,0.7)' }}>{targetSig.label}</span>
          </div>
        ) : (
          <div style={{ position: 'relative', display: 'flex', gap: 7, justifyContent: 'center', alignItems: 'center', minHeight: 44 }}>
            {meterCells > 0 ? (
              Array.from({ length: meterCells }).map((_, i) => {
                const beatNum = i + 1;
                const lit = currentBeat === beatNum;
                const downbeat = beatNum === 1;
                return (
                  <div key={i} style={{
                    width: downbeat ? 34 : 26, height: 40, borderRadius: 5,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontFamily: MONO, fontSize: 12, fontWeight: 700,
                    color: lit ? '#0c0f0a' : (downbeat ? 'rgba(240,213,127,0.7)' : 'rgba(143,209,122,0.4)'),
                    background: lit
                      ? (downbeat ? PANEL.brassLite : PANEL.phosphor)
                      : 'rgba(143,209,122,0.06)',
                    boxShadow: lit
                      ? (downbeat ? `0 0 18px ${PANEL.brassLite}, inset 0 0 0 1px rgba(255,255,255,0.4)` : `0 0 14px ${PANEL.phosphor}`)
                      : `inset 0 0 0 1px ${downbeat ? 'rgba(240,213,127,0.35)' : 'rgba(143,209,122,0.18)'}`,
                    transition: 'all .06s',
                  }}>{beatNum}</div>
                );
              })
            ) : (
              <span style={{ fontFamily: MONO, fontSize: 11, letterSpacing: 2, color: 'rgba(143,209,122,0.45)' }}>
                {gameState === 'guessing' ? '? / ? / ?' : '— — —'}
              </span>
            )}
          </div>
        )}
      </div>

      {/* ── START ── */}
      {gameState === 'start' && (
        <>
          <span style={{ fontFamily: MONO, fontSize: 10, color: PANEL.inkMute, textAlign: 'center', lineHeight: 1.7 }}>
            A click track plays for two measures. Listen for the <b style={{ color: PANEL.brassLite }}>accented downbeat</b> and count the pulses — then name the meter.
          </span>
          <BrassButton label="▶  Play Rhythm" onClick={startNewRound} />
        </>
      )}

      {/* ── PLAYING ── */}
      {gameState === 'playing' && (
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <StatChip label="Beat" value={currentBeat || '—'} accent={currentBeat === 1 ? PANEL.brassLite : PANEL.phosphor} />
        </div>
      )}

      {/* ── GUESSING ── */}
      {gameState === 'guessing' && (
        <>
          <Engrave>Name the Meter</Engrave>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 9 }}>
            {TIME_SIG_OPTIONS.map((opt) => (
              <ChoiceButton key={opt.label} label={opt.label} onClick={() => handleGuess(opt.label)} />
            ))}
          </div>
          <button onClick={() => playClickTrack(targetSig.beats, 2)} style={{
            marginTop: 2, padding: '11px 0', width: '100%', borderRadius: 9, cursor: 'pointer',
            border: `1px solid ${PANEL.line}`, background: 'rgba(0,0,0,0.22)',
            fontFamily: MONO, fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: PANEL.inkMute,
          }}>↻ Replay Rhythm</button>
        </>
      )}

      {/* ── RESULT ── */}
      {gameState === 'result' && (
        <>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
            <StatChip label="Answer" value={targetSig.label} accent={PANEL.phosphor} />
            {selectedAnswer && (
              <StatChip label="You Said" value={selectedAnswer} accent={isCorrect ? PANEL.phosphor : '#e6b0a0'} />
            )}
          </div>

          <Engrave>The Options</Engrave>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 9 }}>
            {TIME_SIG_OPTIONS.map((opt) => {
              const isTarget = opt.label === targetSig.label;
              const isPicked = opt.label === selectedAnswer;
              const state: 'idle' | 'selected' | 'correct' | 'wrong' =
                isTarget ? 'correct' : (isPicked ? 'wrong' : 'idle');
              return (
                <ChoiceButton key={opt.label} label={opt.label} state={state} disabled />
              );
            })}
          </div>

          <BrassButton label="▶  Next Round" onClick={startNewRound} />
        </>
      )}
    </SynthShell>
  );
};

export default GuessTimeSignatureGame;
