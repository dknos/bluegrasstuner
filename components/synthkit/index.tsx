import React, { useRef, useEffect, useCallback } from 'react';

// ──────────────────────────────────────────────────────────────────────────
// Synthkit — shared "vintage analog hardware" UI for all synth engines.
// Walnut end-cheeks, brushed-metal panel, brass screws, machined knobs,
// recessed phosphor scope, screen-printed labels. Mobile-first, touch-driven.
// Audio engines stay in each synth; this is presentation + input only.
// ──────────────────────────────────────────────────────────────────────────

const SERIF = '"DM Serif Display", Georgia, serif';
const MONO = '"JetBrains Mono", ui-monospace, monospace';

export const PANEL = {
  metalTop: '#2c2620',
  metalBot: '#1a1612',
  wood1: '#4a2c12',
  wood2: '#2a1808',
  brass: '#caa052',
  brassLite: '#f0d57f',
  brassDark: '#8a6a2e',
  ink: '#e8dcc4',
  inkMute: 'rgba(232,220,196,0.5)',
  line: 'rgba(232,220,196,0.14)',
  screen: '#0c0f0a',
  phosphor: '#8fd17a',
};

// Brushed-metal + grain background used by the panel.
const metalBg = `linear-gradient(180deg, ${PANEL.metalTop} 0%, ${PANEL.metalBot} 100%)`;

const BrassScrew: React.FC<{ style?: React.CSSProperties }> = ({ style }) => (
  <svg width="13" height="13" viewBox="0 0 14 14" style={style} aria-hidden>
    <circle cx="7" cy="7" r="6" fill="url(#sk-brass)" />
    <circle cx="7" cy="7" r="6" fill="none" stroke="rgba(0,0,0,0.45)" strokeWidth="0.6" />
    <line x1="3" y1="4" x2="11" y2="10" stroke="rgba(20,10,0,0.55)" strokeWidth="1.3" strokeLinecap="round" />
    <circle cx="5" cy="5" r="1.6" fill="rgba(255,235,180,0.5)" />
  </svg>
);

const Defs = () => (
  <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden>
    <defs>
      <radialGradient id="sk-brass" cx="35%" cy="28%" r="80%">
        <stop offset="0%" stopColor="#f6e2a0" /><stop offset="40%" stopColor="#caa052" /><stop offset="100%" stopColor="#6b4f1c" />
      </radialGradient>
      <radialGradient id="sk-knob" cx="38%" cy="30%" r="75%">
        <stop offset="0%" stopColor="#4a443c" /><stop offset="55%" stopColor="#2a2520" /><stop offset="100%" stopColor="#15110d" />
      </radialGradient>
      <linearGradient id="sk-knurl" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#5a5249" /><stop offset="100%" stopColor="#1a1510" />
      </linearGradient>
      <filter id="sk-grain"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="4" /><feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.04 0" /></filter>
    </defs>
  </svg>
);

// ── SynthShell ────────────────────────────────────────────────────────────
export const SynthShell: React.FC<{
  name: string; tag?: string; onClose: () => void; children: React.ReactNode;
  accent?: string;
}> = ({ name, tag, onClose, children, accent = PANEL.brass }) => (
  <div onClick={onClose} style={{
    position: 'fixed', inset: 0, zIndex: 120, background: 'rgba(8,5,3,0.82)',
    backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: 'env(safe-area-inset-top,8px) 8px 8px', fontFamily: MONO,
  }}>
    <Defs />
    <div onClick={(e) => e.stopPropagation()} style={{
      position: 'relative', width: '100%', maxWidth: 460, maxHeight: '94dvh', display: 'flex',
      borderRadius: 16, overflow: 'hidden', boxShadow: '0 24px 70px rgba(0,0,0,0.6)',
      background: `linear-gradient(180deg, ${PANEL.wood1}, ${PANEL.wood2})`,
      padding: '0 9px', // wood end-cheeks peek on left/right
    }}>
      {/* metal panel */}
      <div style={{
        position: 'relative', flex: 1, margin: '9px 0', borderRadius: 10, background: metalBg,
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06), inset 0 0 0 1px rgba(0,0,0,0.5), 0 0 0 1px rgba(202,160,82,0.25)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', inset: 0, opacity: 0.5, pointerEvents: 'none' }}>
          <svg width="100%" height="100%"><rect width="100%" height="100%" filter="url(#sk-grain)" /></svg>
        </div>
        {/* brass nameplate header */}
        <div style={{
          position: 'relative', flex: '0 0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 14px', borderBottom: `1px solid ${PANEL.line}`,
          background: 'linear-gradient(180deg, rgba(0,0,0,0.25), rgba(0,0,0,0))',
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <span style={{ fontFamily: SERIF, fontSize: 22, color: PANEL.ink, letterSpacing: 0.5, lineHeight: 1 }}>{name}</span>
            {tag && <span style={{ fontFamily: MONO, fontSize: 8.5, color: accent, letterSpacing: 2, textTransform: 'uppercase' }}>{tag}</span>}
          </div>
          <button onClick={onClose} aria-label="Close" style={{
            width: 30, height: 30, borderRadius: 8, cursor: 'pointer', flex: '0 0 auto',
            background: 'rgba(0,0,0,0.3)', border: `1px solid ${PANEL.line}`, color: PANEL.inkMute, fontSize: 15,
          }}>✕</button>
          <BrassScrew style={{ position: 'absolute', top: 6, left: 6 }} />
          <BrassScrew style={{ position: 'absolute', top: 6, right: 6, display: 'none' }} />
        </div>
        {/* body (scrolls) */}
        <div style={{ position: 'relative', flex: 1, overflowY: 'auto', padding: '16px 14px 18px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {children}
        </div>
        {/* bottom corner screws */}
        <BrassScrew style={{ position: 'absolute', bottom: 6, left: 6 }} />
        <BrassScrew style={{ position: 'absolute', bottom: 6, right: 6 }} />
      </div>
    </div>
  </div>
);

// ── Knob ── machined rotary, vertical-drag to turn ──────────────────────────
export const Knob: React.FC<{
  label: string; value: number; min: number; max: number; onChange: (v: number) => void;
  size?: number; step?: number; format?: (v: number) => string; accent?: string; log?: boolean;
}> = ({ label, value, min, max, onChange, size = 62, step, format, accent = PANEL.brass, log = false }) => {
  const ref = useRef<HTMLDivElement>(null);
  const drag = useRef<{ y: number; v: number } | null>(null);

  // normalized 0..1 (optionally logarithmic for frequency-like params)
  const toNorm = (v: number) => log
    ? Math.log(v / min) / Math.log(max / min)
    : (v - min) / (max - min);
  const fromNorm = (n: number) => log
    ? min * Math.pow(max / min, n)
    : min + n * (max - min);

  const norm = Math.max(0, Math.min(1, toNorm(value)));
  const SWEEP = 270; // degrees
  const angle = -135 + norm * SWEEP;

  const apply = useCallback((n: number) => {
    n = Math.max(0, Math.min(1, n));
    let v = fromNorm(n);
    if (step) v = Math.round(v / step) * step;
    onChange(v);
  }, [onChange, step, min, max, log]);

  const onPointerDown = (e: React.PointerEvent) => {
    (e.target as Element).setPointerCapture?.(e.pointerId);
    drag.current = { y: e.clientY, v: norm };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag.current) return;
    const dy = drag.current.y - e.clientY;
    apply(drag.current.v + dy / 180); // 180px = full sweep
  };
  const onPointerUp = () => { drag.current = null; };
  const onDouble = () => apply(toNorm((min + max) / 2));

  const cx = size / 2, r = size / 2 - 3;
  const arcR = r + 4;
  const polar = (deg: number, rad: number) => {
    const a = (deg - 90) * Math.PI / 180;
    return { x: cx + Math.cos(a) * rad, y: cx + Math.sin(a) * rad };
  };
  const aStart = polar(-135, arcR), aEnd = polar(angle, arcR), aMax = polar(135, arcR);
  const ptr = polar(angle, r - 6);
  const valTxt = format ? format(value) : (step && step >= 1 ? Math.round(value).toString() : value.toFixed(2));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, userSelect: 'none', width: size + 8 }}>
      <div ref={ref} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp}
        onDoubleClick={onDouble} style={{ width: size + 12, height: size + 12, cursor: 'ns-resize', touchAction: 'none' }}>
        <svg width={size + 12} height={size + 12} viewBox={`-6 -6 ${size + 12} ${size + 12}`} style={{ display: 'block' }}>
          {/* track + value arc */}
          <path d={`M ${aStart.x} ${aStart.y} A ${arcR} ${arcR} 0 1 1 ${aMax.x} ${aMax.y}`} fill="none" stroke="rgba(0,0,0,0.55)" strokeWidth="3" strokeLinecap="round" />
          <path d={`M ${aStart.x} ${aStart.y} A ${arcR} ${arcR} 0 ${norm > 0.5 ? 1 : 0} 1 ${aEnd.x} ${aEnd.y}`} fill="none" stroke={accent} strokeWidth="3" strokeLinecap="round" />
          {/* knurled body */}
          <circle cx={cx} cy={cx} r={r} fill="url(#sk-knurl)" />
          <circle cx={cx} cy={cx} r={r - 1.5} fill="url(#sk-knob)" stroke="rgba(0,0,0,0.6)" strokeWidth="0.8" />
          <circle cx={cx - r * 0.28} cy={cx - r * 0.3} r={r * 0.5} fill="rgba(255,255,255,0.05)" />
          {/* pointer */}
          <line x1={cx} y1={cx} x2={ptr.x} y2={ptr.y} stroke={PANEL.brassLite} strokeWidth="2.5" strokeLinecap="round" />
          <circle cx={cx} cy={cx} r="2.5" fill="#0a0805" />
        </svg>
      </div>
      <span style={{ fontFamily: MONO, fontSize: 8.5, color: PANEL.ink, letterSpacing: 1.4, textTransform: 'uppercase' }}>{label}</span>
      <span style={{ fontFamily: MONO, fontSize: 9, color: PANEL.inkMute }}>{valTxt}</span>
    </div>
  );
};

// ── Scope ── recessed phosphor oscilloscope fed by an AnalyserNode ──────────
export const Scope: React.FC<{ analyser: AnalyserNode | null; height?: number; color?: string }> = ({ analyser, height = 96, color = PANEL.phosphor }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    let raf = 0;
    const draw = () => {
      const cv = canvasRef.current;
      if (cv) {
        const c = cv.getContext('2d');
        if (c) {
          const w = cv.width, h = cv.height;
          c.fillStyle = PANEL.screen; c.fillRect(0, 0, w, h);
          // grid
          c.strokeStyle = 'rgba(143,209,122,0.10)'; c.lineWidth = 1;
          for (let i = 1; i < 6; i++) { c.beginPath(); c.moveTo((w / 6) * i, 0); c.lineTo((w / 6) * i, h); c.stroke(); }
          c.beginPath(); c.moveTo(0, h / 2); c.lineTo(w, h / 2); c.stroke();
          if (analyser) {
            const n = analyser.frequencyBinCount;
            const data = new Uint8Array(n);
            analyser.getByteTimeDomainData(data);
            c.lineWidth = 2; c.strokeStyle = color; c.shadowColor = color; c.shadowBlur = 6;
            c.beginPath();
            const sw = w / n; let x = 0;
            for (let i = 0; i < n; i++) { const y = (data[i] / 128) * h / 2; i === 0 ? c.moveTo(x, y) : c.lineTo(x, y); x += sw; }
            c.stroke(); c.shadowBlur = 0;
          }
        }
      }
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(raf);
  }, [analyser, color]);
  return (
    <div style={{
      borderRadius: 8, overflow: 'hidden', padding: 4,
      background: '#070907', boxShadow: `inset 0 2px 10px rgba(0,0,0,0.9), 0 0 0 1px ${PANEL.brassDark}, 0 0 0 3px rgba(0,0,0,0.5)`,
    }}>
      <canvas ref={canvasRef} width={600} height={height * 2} style={{ width: '100%', height, display: 'block', borderRadius: 5 }} />
    </div>
  );
};

// ── Row of labelled knobs ───────────────────────────────────────────────────
export const KnobRow: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, justifyContent: 'space-around', alignItems: 'flex-start',
    padding: '10px 6px', borderRadius: 8, background: 'rgba(0,0,0,0.18)', boxShadow: `inset 0 0 0 1px ${PANEL.line}` }}>
    {children}
  </div>
);

// ── Engage / trigger bar ────────────────────────────────────────────────────
export const EngageBar: React.FC<{
  label: string; active: boolean; onDown: () => void; onUp: () => void; accent?: string;
}> = ({ label, active, onDown, onUp, accent = PANEL.brass }) => (
  <button
    onPointerDown={(e) => { e.preventDefault(); onDown(); }}
    onPointerUp={(e) => { e.preventDefault(); onUp(); }}
    onPointerLeave={() => active && onUp()}
    style={{
      width: '100%', padding: '18px 0', borderRadius: 10, cursor: 'pointer', touchAction: 'none',
      fontFamily: SERIF, fontSize: 20, letterSpacing: 3, textTransform: 'uppercase',
      border: `2px solid ${active ? accent : 'rgba(0,0,0,0.5)'}`,
      background: active ? `linear-gradient(180deg, ${accent}, ${PANEL.brassDark})` : 'linear-gradient(180deg, #211c16, #14100c)',
      color: active ? '#1a0d04' : PANEL.inkMute,
      boxShadow: active ? `0 0 22px ${accent}66, inset 0 1px 0 rgba(255,255,255,0.3)` : 'inset 0 1px 0 rgba(255,255,255,0.05), 0 2px 4px rgba(0,0,0,0.4)',
      transition: 'all .08s',
    }}>{label}</button>
);

// ── Note row (semitone buttons / mini keys) ─────────────────────────────────
const NOTE_NAMES = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'];
export const NoteRow: React.FC<{ notes: number[]; onNote: (m: number) => void; active?: number | null }> = ({ notes, onNote, active }) => (
  <div style={{ display: 'flex', gap: 4, justifyContent: 'center', flexWrap: 'wrap' }}>
    {notes.map((m) => {
      const name = NOTE_NAMES[m % 12];
      const sharp = name.includes('♯');
      const on = active === m;
      return (
        <button key={m} onClick={() => onNote(m)} style={{
          minWidth: 36, padding: '10px 6px', borderRadius: 6, cursor: 'pointer',
          fontFamily: MONO, fontSize: 11, letterSpacing: 0.5,
          border: `1px solid ${on ? PANEL.brass : PANEL.line}`,
          background: on ? PANEL.brass : (sharp ? '#100c08' : '#221c15'),
          color: on ? '#1a0d04' : (sharp ? PANEL.inkMute : PANEL.ink),
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06), 0 2px 3px rgba(0,0,0,0.4)',
        }}>{name}<sub style={{ fontSize: 7, opacity: 0.6 }}>{Math.floor(m / 12) - 1}</sub></button>
      );
    })}
  </div>
);

// ── Section label ───────────────────────────────────────────────────────────
export const Engrave: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span style={{ fontFamily: MONO, fontSize: 9, color: PANEL.inkMute, letterSpacing: 2.5, textTransform: 'uppercase', alignSelf: 'flex-start' }}>{children}</span>
);
