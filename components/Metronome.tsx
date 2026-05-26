
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { SynthShell, Knob, Engrave, PANEL } from './synthkit';

interface MetronomeProps {
  onClose: () => void;
}

const SERIF = '"DM Serif Display", Georgia, serif';
const MONO = '"JetBrains Mono", ui-monospace, monospace';

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

  // Tap-tempo (presentation input only — writes BPM through the existing setter)
  const tapTimesRef = useRef<number[]>([]);

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

  // Tap-tempo: average the last few intervals, feed result through handleBpmChange.
  const handleTap = () => {
      const now = performance.now();
      const taps = tapTimesRef.current;
      // Reset the rolling window if the last tap was a long time ago.
      if (taps.length && now - taps[taps.length - 1] > 2000) taps.length = 0;
      taps.push(now);
      if (taps.length > 5) taps.shift();
      if (taps.length >= 2) {
          let total = 0;
          for (let i = 1; i < taps.length; i++) total += taps[i] - taps[i - 1];
          const avgMs = total / (taps.length - 1);
          handleBpmChange(Math.round(60000 / avgMs));
      }
  };

  // Pendulum: one full left↔right swing spans two beats, so it pivots once per beat.
  const swingSeconds = (120 / bpm).toFixed(3);
  const isDownbeat = currentBeat === 0;

  return (
    <SynthShell name="Metronome" tag="Tempo · Time-Keeper" onClose={onClose} accent={PANEL.brass}>
      <style>{`
        @keyframes mtr-swing {
          0%   { transform: rotate(-26deg); }
          50%  { transform: rotate(26deg); }
          100% { transform: rotate(-26deg); }
        }
      `}</style>

      {/* ── Pendulum (recessed phosphor face; CSS-driven by bpm + isPlaying) ── */}
      <div style={{
        position: 'relative', height: 176, borderRadius: 12, overflow: 'hidden',
        background: 'radial-gradient(120% 130% at 50% 0%, #0e120c, #070907)',
        boxShadow: `inset 0 2px 14px rgba(0,0,0,0.85), inset 0 0 0 1px ${PANEL.brassDark}, 0 0 0 3px rgba(0,0,0,0.5)`,
      }}>
        {/* faint scale ticks behind the arm */}
        {[-26, -13, 0, 13, 26].map((deg) => (
          <div key={deg} style={{
            position: 'absolute', left: '50%', top: 18, width: 1, height: 14,
            background: 'rgba(143,209,122,0.18)', transformOrigin: '50% 138px',
            transform: `translateX(-50%) rotate(${deg}deg)`,
          }} />
        ))}
        {/* swinging arm — anchored at the base, pivots once per beat */}
        <div style={{
          position: 'absolute', left: '50%', bottom: 18, width: 5, height: 120,
          marginLeft: -2.5, borderRadius: 3, transformOrigin: '50% 100%',
          background: `linear-gradient(180deg, ${PANEL.brassLite}, ${PANEL.brassDark})`,
          boxShadow: isPlaying ? `0 0 8px ${PANEL.phosphor}55` : 'none',
          animation: isPlaying ? `mtr-swing ${swingSeconds}s ease-in-out infinite` : 'none',
          transform: isPlaying ? undefined : 'rotate(0deg)',
        }}>
          {/* sliding bob weight */}
          <div style={{
            position: 'absolute', left: '50%', top: 14, width: 22, height: 14, marginLeft: -11,
            borderRadius: 3, background: 'linear-gradient(180deg,#4a443c,#15110d)',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.18), 0 1px 3px rgba(0,0,0,0.7)',
          }}>
            <div style={{ position: 'absolute', top: '50%', left: 2, right: 2, height: 1, background: PANEL.brass }} />
          </div>
        </div>
        {/* brass pivot hub */}
        <div style={{
          position: 'absolute', left: '50%', bottom: 12, width: 14, height: 14, marginLeft: -7,
          borderRadius: 999, background: 'radial-gradient(circle at 35% 30%, #f6e2a0, #6b4f1c)',
          boxShadow: '0 1px 3px rgba(0,0,0,0.7)',
        }} />
        {/* big DM-Serif BPM readout, floated top-left on the screen */}
        <div style={{ position: 'absolute', top: 12, left: 16 }}>
          <div style={{
            fontFamily: SERIF, fontSize: 54, lineHeight: 0.9, color: PANEL.phosphor,
            textShadow: `0 0 16px ${PANEL.phosphor}88`, fontVariantNumeric: 'tabular-nums',
          }}>{bpm}</div>
          <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: 4, color: PANEL.inkMute, textTransform: 'uppercase' }}>BPM</div>
        </div>
        {/* time-sig stamp, top-right on the screen */}
        <div style={{ position: 'absolute', top: 14, right: 16, textAlign: 'right' }}>
          <div style={{ fontFamily: SERIF, fontSize: 24, color: PANEL.ink, lineHeight: 1 }}>{currentSignature.label}</div>
          <div style={{ fontFamily: MONO, fontSize: 8, letterSpacing: 2, color: PANEL.inkMute, textTransform: 'uppercase' }}>Meter</div>
        </div>
      </div>

      {/* ── Beat lamps (driven by currentBeat; downbeat brighter) ── */}
      <Engrave>Beat</Engrave>
      <div style={{
        display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap',
        padding: '12px 8px', borderRadius: 8, background: 'rgba(0,0,0,0.22)', boxShadow: `inset 0 0 0 1px ${PANEL.line}`,
      }}>
        {[...Array(currentSignature.beats)].map((_, i) => {
          const lit = currentBeat === i;
          const down = i === 0;
          const color = down ? PANEL.brassLite : PANEL.phosphor;
          const dia = down ? 16 : 13;
          return (
            <div key={i} style={{
              width: dia, height: dia, borderRadius: 999,
              background: lit ? color : 'rgba(0,0,0,0.55)',
              boxShadow: lit
                ? `0 0 ${down ? 16 : 11}px ${color}, inset 0 0 0 1px ${color}`
                : `inset 0 0 0 1px ${PANEL.line}, inset 0 1px 2px rgba(0,0,0,0.8)`,
              transition: 'background .06s, box-shadow .06s',
            }} />
          );
        })}
      </div>

      {/* ── Tempo: brass knob flanked by fine steppers ── */}
      <Engrave>Tempo</Engrave>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 18 }}>
        <button onClick={() => handleBpmChange(bpm - 1)} aria-label="Slower" style={{
          width: 44, height: 44, borderRadius: 10, cursor: 'pointer', flex: '0 0 auto',
          fontFamily: SERIF, fontSize: 22, color: PANEL.ink,
          background: 'linear-gradient(180deg,#2a2620,#15110d)', border: `1px solid ${PANEL.line}`,
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06), 0 2px 4px rgba(0,0,0,0.4)',
        }}>−</button>

        <Knob label="BPM" value={bpm} min={40} max={300} step={1} size={84} onChange={handleBpmChange} accent={PANEL.brass} />

        <button onClick={() => handleBpmChange(bpm + 1)} aria-label="Faster" style={{
          width: 44, height: 44, borderRadius: 10, cursor: 'pointer', flex: '0 0 auto',
          fontFamily: SERIF, fontSize: 22, color: PANEL.ink,
          background: 'linear-gradient(180deg,#2a2620,#15110d)', border: `1px solid ${PANEL.line}`,
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06), 0 2px 4px rgba(0,0,0,0.4)',
        }}>+</button>
      </div>

      {/* ── Time signature selector (wrap-grid so all 8 stay reachable on phones) ── */}
      <Engrave>Time Signature</Engrave>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {TIME_SIGNATURES.map((sig, i) => {
          const on = signatureIndex === i;
          return (
            <button key={sig.label} onClick={() => setSignatureIndex(i)} style={{
              flex: '1 1 calc(25% - 6px)', minWidth: 56, padding: '10px 0', borderRadius: 8, cursor: 'pointer', border: 'none',
              fontFamily: SERIF, fontSize: 18,
              background: on ? `linear-gradient(180deg,${PANEL.brassLite},${PANEL.brass})` : '#181410',
              color: on ? '#1a0d04' : PANEL.ink,
              boxShadow: on ? `0 0 14px rgba(202,160,82,0.4)` : `inset 0 0 0 1px ${PANEL.line}`,
            }}>{sig.label}</button>
          );
        })}
      </div>

      {/* ── Transport: brass START / STOP + tap tempo ── */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'stretch' }}>
        <button
          onClick={() => setIsPlaying(!isPlaying)}
          style={{
            flex: 2, padding: '18px 0', borderRadius: 12, cursor: 'pointer',
            fontFamily: SERIF, fontSize: 22, letterSpacing: 4, textTransform: 'uppercase',
            border: `2px solid ${isPlaying ? '#a8472a' : PANEL.brass}`,
            background: isPlaying
              ? 'linear-gradient(180deg,#3a1c1c,#2a1212)'
              : `linear-gradient(180deg, ${PANEL.brassLite}, ${PANEL.brassDark})`,
            color: isPlaying ? '#e6b0a0' : '#1a0d04',
            boxShadow: isPlaying
              ? '0 0 22px rgba(168,71,42,0.4), inset 0 1px 0 rgba(255,255,255,0.08)'
              : `0 0 22px ${PANEL.brass}55, inset 0 1px 0 rgba(255,255,255,0.3)`,
            transition: 'all .1s',
          }}>
          {isPlaying ? 'Stop' : 'Start'}
        </button>
        <button
          onClick={handleTap}
          style={{
            flex: 1, padding: '18px 0', borderRadius: 12, cursor: 'pointer',
            fontFamily: MONO, fontSize: 12, letterSpacing: 2, textTransform: 'uppercase', fontWeight: 700,
            border: `1px solid ${PANEL.line}`, color: PANEL.ink,
            background: 'linear-gradient(180deg,#221c15,#14100c)',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05), 0 2px 4px rgba(0,0,0,0.4)',
          }}>
          Tap
        </button>
      </div>

      {/* ── Quick presets ── */}
      <Engrave>Presets</Engrave>
      <div style={{ display: 'flex', gap: 6, justifyContent: 'center', flexWrap: 'wrap' }}>
        {[60, 80, 100, 120, 140].map((val) => {
          const on = bpm === val;
          return (
            <button key={val} onClick={() => setBpm(val)} style={{
              minWidth: 52, padding: '8px 0', borderRadius: 8, cursor: 'pointer',
              fontFamily: MONO, fontSize: 12, letterSpacing: 0.5,
              border: 'none', color: on ? '#1a0d04' : PANEL.inkMute,
              background: on ? `linear-gradient(180deg,${PANEL.brassLite},${PANEL.brass})` : '#181410',
              boxShadow: on ? `0 0 12px rgba(202,160,82,0.4)` : `inset 0 0 0 1px ${PANEL.line}`,
            }}>{val}</button>
          );
        })}
      </div>
    </SynthShell>
  );
};

export default Metronome;
