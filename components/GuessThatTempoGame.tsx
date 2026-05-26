
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { SynthShell, ChoiceButton, StatChip, Engrave, PANEL } from './synthkit';

interface GuessThatTempoGameProps {
  onClose: () => void;
}

const SERIF = '"DM Serif Display", Georgia, serif';
const MONO = '"JetBrains Mono", ui-monospace, monospace';
const MAX_BEATS = 8; // matches playClickTrack's 2 bars of 4/4

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

  // ── presentation helpers (no wiring) ──────────────────────────────────────
  const brassBtn: React.CSSProperties = {
    width: '100%', padding: '16px 0', borderRadius: 11, border: 'none', cursor: 'pointer',
    fontFamily: MONO, fontSize: 13, letterSpacing: 2.5, textTransform: 'uppercase', fontWeight: 700,
    color: '#1a0d04', background: `linear-gradient(180deg,${PANEL.brassLite},${PANEL.brass})`,
    boxShadow: `0 0 22px rgba(202,160,82,0.35), inset 0 1px 0 rgba(255,255,255,0.4)`,
  };

  // recessed phosphor screen that pulses on every beat (driven by existing `countdown`)
  const onBeat = countdown > 0;
  const phosphorScreen = (children: React.ReactNode, lit: boolean) => (
    <div style={{
      borderRadius: 10, padding: '22px 16px', overflow: 'hidden',
      background: 'radial-gradient(120% 120% at 50% 0%, #0e120c, #070907)',
      boxShadow: `inset 0 2px 12px rgba(0,0,0,0.9), 0 0 0 1px ${PANEL.brassDark}, 0 0 0 3px rgba(0,0,0,0.5)`,
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
      transition: 'box-shadow .09s',
      ...(lit ? { boxShadow: `inset 0 2px 12px rgba(0,0,0,0.9), 0 0 0 1px ${PANEL.brassDark}, 0 0 0 3px rgba(0,0,0,0.5), 0 0 26px rgba(143,209,122,0.45)` } : {}),
    }}>{children}</div>
  );

  return (
    <SynthShell name="Guess the Tempo" tag="Ear Training · BPM" onClose={onClose}>

      {/* ── START ── */}
      {gameState === 'start' && (
        <>
          <Engrave>How it works</Engrave>
          {phosphorScreen(
            <>
              <span style={{ fontFamily: SERIF, fontSize: 26, color: PANEL.phosphor, textShadow: `0 0 16px ${PANEL.phosphor}`, lineHeight: 1 }}>♩ = ?</span>
              <span style={{ fontFamily: MONO, fontSize: 10.5, color: PANEL.inkMute, letterSpacing: 0.5, textAlign: 'center', lineHeight: 1.6, maxWidth: 260 }}>
                Two bars of click track will play. Listen, then call the <b style={{ color: PANEL.phosphor }}>tempo</b> in beats per minute.
              </span>
            </>, false)}
          <button onClick={startNewRound} style={brassBtn}>▶  Play Click Track</button>
        </>
      )}

      {/* ── PLAYING ── phosphor BPM readout flashes on each beat ── */}
      {gameState === 'playing' && (
        <>
          <Engrave>Listening</Engrave>
          {phosphorScreen(
            <>
              {/* key by `countdown` so the glow re-triggers each beat */}
              <span key={countdown} style={{
                fontFamily: SERIF, fontSize: 58, lineHeight: 1, color: PANEL.phosphor,
                textShadow: onBeat ? `0 0 28px ${PANEL.phosphor}, 0 0 10px ${PANEL.phosphor}` : `0 0 8px ${PANEL.phosphor}`,
                fontVariantNumeric: 'tabular-nums', transform: onBeat ? 'scale(1.06)' : 'scale(1)', transition: 'transform .09s, text-shadow .09s',
              }}>{countdown || '•'}</span>
              {/* 8-beat tracker dots */}
              <div style={{ display: 'flex', gap: 6 }}>
                {Array.from({ length: MAX_BEATS }).map((_, i) => {
                  const past = i < countdown;
                  const downbeat = i % 4 === 0;
                  return <span key={i} style={{
                    width: downbeat ? 9 : 7, height: downbeat ? 9 : 7, borderRadius: 999,
                    background: past ? PANEL.phosphor : 'rgba(143,209,122,0.18)',
                    boxShadow: i === countdown - 1 ? `0 0 10px ${PANEL.phosphor}` : 'none', transition: 'background .08s',
                  }} />;
                })}
              </div>
              <span style={{ fontFamily: MONO, fontSize: 9, color: PANEL.inkMute, letterSpacing: 3, textTransform: 'uppercase' }}>Listening…</span>
            </>, onBeat)}
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <StatChip label="Beat" value={`${countdown}/${MAX_BEATS}`} accent={PANEL.phosphor} />
          </div>
        </>
      )}

      {/* ── GUESSING & RESULT share the choice grid (result computes correct/wrong) ── */}
      {(gameState === 'guessing' || gameState === 'result') && (
        <>
          {gameState === 'result' && (
            <>
              <Engrave>{isCorrect ? 'Nailed it' : 'Not quite'}</Engrave>
              {phosphorScreen(
                <>
                  <span style={{ fontFamily: MONO, fontSize: 9, color: PANEL.inkMute, letterSpacing: 2.5, textTransform: 'uppercase' }}>Actual Tempo</span>
                  <span style={{ fontFamily: SERIF, fontSize: 54, lineHeight: 1, color: isCorrect ? PANEL.phosphor : '#e6b0a0', textShadow: isCorrect ? `0 0 26px ${PANEL.phosphor}` : `0 0 18px rgba(168,71,42,0.7)`, fontVariantNumeric: 'tabular-nums' }}>
                    {targetBpm}<span style={{ fontFamily: MONO, fontSize: 14, color: PANEL.inkMute, letterSpacing: 1 }}> BPM</span>
                  </span>
                </>, isCorrect)}
            </>
          )}

          {gameState === 'guessing' && <Engrave>What was the tempo?</Engrave>}

          <div style={{ display: 'flex', justifyContent: 'center', gap: 8 }}>
            {options.map((bpm) => {
              const state: 'idle' | 'selected' | 'correct' | 'wrong' =
                gameState === 'result'
                  ? (bpm === targetBpm ? 'correct' : (bpm === selectedAnswer ? 'wrong' : 'idle'))
                  : 'idle';
              return (
                <div key={bpm} style={{ flex: 1 }}>
                  <ChoiceButton
                    label={bpm}
                    sub="BPM"
                    state={state}
                    disabled={gameState === 'result'}
                    onClick={() => handleGuess(bpm)}
                  />
                </div>
              );
            })}
          </div>

          {gameState === 'guessing' && (
            <button onClick={() => playClickTrack(targetBpm)} style={{
              background: 'none', border: 'none', cursor: 'pointer', alignSelf: 'center',
              fontFamily: MONO, fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase',
              color: PANEL.inkMute, textDecoration: 'underline', textUnderlineOffset: 3, padding: 6,
            }}>↻ Replay Click Track</button>
          )}

          {gameState === 'result' && (
            <>
              {!isCorrect && selectedAnswer !== null && (
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <StatChip label="You Called" value={`${selectedAnswer}`} accent="#e6b0a0" />
                </div>
              )}
              <button onClick={startNewRound} style={brassBtn}>Next Round  ▶</button>
            </>
          )}
        </>
      )}
    </SynthShell>
  );
};

export default GuessThatTempoGame;
