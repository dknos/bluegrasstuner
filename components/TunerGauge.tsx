
import React from 'react';
import { NoteData } from '../types';

export type Cabinet = 'heirloom' | 'studio' | 'workshop' | 'happygirl' | 'festival' | 'pocket-watch' | 'hymnal' | 'radio' | 'split-flap' | 'banjo-head' | 'weathervane' | 'apothecary' | 'oscilloscope' | 'spirit-level' | 'turntable' | 'pressure-gauge' | 'semaphore' | 'mason-jar' | 'sundial' | 'metronome' | 'balance' | 'plumb-bob' | 'moon-dial' | 'high-striker' | 'lantern';

interface TunerGaugeProps {
  noteData: NoteData | null;
  cabinet?: Cabinet;
}

// ──────────────────────────────────────────────────────────────
// Shared SVG defs (textures + brass). IDs prefixed `bgt-` to avoid
// collisions with the many other SVG-heavy components in this app.
// Rendered once, hidden, so filters/gradients resolve document-wide.
// ──────────────────────────────────────────────────────────────
const TextureDefs: React.FC = () => (
  <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden>
    <defs>
      <filter id="bgt-paperGrain" x="0" y="0" width="100%" height="100%">
        <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves={2} seed={3} />
        <feColorMatrix values="0 0 0 0 0.18  0 0 0 0 0.10  0 0 0 0 0.04  0 0 0 0.35 0" />
        <feComposite in2="SourceGraphic" operator="in" />
      </filter>
      <filter id="bgt-woodGrain" x="0" y="0" width="100%" height="100%">
        <feTurbulence type="fractalNoise" baseFrequency="0.018 0.7" numOctaves={3} seed={5} />
        <feColorMatrix values="0 0 0 0 0.10  0 0 0 0 0.05  0 0 0 0 0.02  0 0 0 0.55 0" />
      </filter>
      <filter id="bgt-feltNoise" x="0" y="0" width="100%" height="100%">
        <feTurbulence type="fractalNoise" baseFrequency="2.3" numOctaves={1} seed={7} />
        <feColorMatrix values="0 0 0 0 0.02  0 0 0 0 0.05  0 0 0 0 0.02  0 0 0 0.45 0" />
      </filter>
      <radialGradient id="bgt-brassShine" cx="35%" cy="25%" r="80%">
        <stop offset="0%" stopColor="#f4dc94" />
        <stop offset="35%" stopColor="#caa052" />
        <stop offset="75%" stopColor="#8a6a2e" />
        <stop offset="100%" stopColor="#5a4318" />
      </radialGradient>
      <linearGradient id="bgt-brassEdge" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#f0d57f" />
        <stop offset="50%" stopColor="#a07e36" />
        <stop offset="100%" stopColor="#6b4f1c" />
      </linearGradient>
    </defs>
  </svg>
);

const WoodTexture: React.FC<{ intensity?: number }> = ({ intensity = 1 }) => (
  <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', mixBlendMode: 'multiply', opacity: intensity }} aria-hidden>
    <svg width="100%" height="100%" preserveAspectRatio="none">
      <rect width="100%" height="100%" filter="url(#bgt-woodGrain)" fill="white" />
    </svg>
  </div>
);
const PaperTexture: React.FC<{ intensity?: number }> = ({ intensity = 1 }) => (
  <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', mixBlendMode: 'multiply', opacity: intensity }} aria-hidden>
    <svg width="100%" height="100%" preserveAspectRatio="none" style={{ position: 'absolute', inset: 0 }}>
      <rect width="100%" height="100%" filter="url(#bgt-paperGrain)" fill="white" />
    </svg>
  </div>
);
const FeltTexture: React.FC<{ intensity?: number }> = ({ intensity = 1 }) => (
  <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', mixBlendMode: 'overlay', opacity: intensity }} aria-hidden>
    <svg width="100%" height="100%" preserveAspectRatio="none">
      <rect width="100%" height="100%" filter="url(#bgt-feltNoise)" fill="white" />
    </svg>
  </div>
);

const BrassScrew: React.FC<{ size?: number; style?: React.CSSProperties }> = ({ size = 11, style }) => (
  <svg width={size} height={size} viewBox="0 0 14 14" style={style}>
    <circle cx="7" cy="7" r="6.5" fill="url(#bgt-brassShine)" />
    <circle cx="7" cy="7" r="6.5" fill="none" stroke="rgba(0,0,0,0.4)" strokeWidth="0.5" />
    <line x1="2.5" y1="3.5" x2="11.5" y2="10.5" stroke="rgba(20,10,0,0.55)" strokeWidth="1.4" strokeLinecap="round" />
  </svg>
);

// ──────────────────────────────────────────────────────────────
// Meter prop shape — fed from NoteData by the parent gauge.
//   cents  = noteData.centsOff
//   locked = |centsOff| < 5  (matches the app's "PERFECT" threshold)
//   note   = noteData.note      (target string note)
//   octave = noteData.octave    (target string octave)
//   freq   = noteData.frequency (detected)
//   target = noteData.perfectFrequency
// ──────────────────────────────────────────────────────────────
interface MeterProps { cents: number; locked: boolean; note: string; octave: number; freq: number; target: number; }

// CENTS chip — shared readout
const CentsChip: React.FC<{ cents: number; locked: boolean; tone?: 'paper' | 'dark' | 'pearl' }> = ({ cents, locked, tone = 'paper' }) => {
  const ink = tone === 'pearl' ? '#4a1d52' : tone === 'paper' ? '#1a1108' : '#efe2c0';
  const muted = tone === 'pearl' ? 'rgba(74,29,82,0.55)' : tone === 'paper' ? 'rgba(26,17,8,0.55)' : 'rgba(239,226,192,0.55)';
  const c = Math.round(cents);
  const sign = c > 0 ? '+' : c < 0 ? '−' : '±';
  const abs = Math.abs(c).toString().padStart(2, '0');
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 999,
      border: `0.5px solid ${muted}`, fontFamily: '"JetBrains Mono", monospace', fontSize: 10,
      color: locked ? '#6b8a3a' : ink, letterSpacing: 1.2,
    }}>
      <span>{sign}{abs}</span><span style={{ color: muted }}>¢</span>
    </div>
  );
};

// ── NEEDLE METER — classic VU on cream face ──
// Needle face palettes. Only one cabinet renders at a time, so the shared
// gradient ids never collide.
const NEEDLE_PALETTE = {
  cream: { face: ['#fbf2d2', '#efe2c0', '#d9c490'], needle: ['#c4422a', '#7a1d10'], arrow: '#c4422a', ink: '#2a1808', ink2: '#3a2415', accent: '#9b3221', frame: '#caa052', shine: 'rgba(255,230,160,0.7)' },
  pearl: { face: ['#fdf3fb', '#f1d9f0', '#dcafe0'], needle: ['#e0609f', '#a83478'], arrow: '#e0609f', ink: '#4a1d52', ink2: '#5a2d62', accent: '#b03a86', frame: '#d6a6cf', shine: 'rgba(255,235,250,0.8)' },
};

const NeedleMeter: React.FC<MeterProps & { variant?: 'cream' | 'pearl' }> = ({ cents, locked, variant = 'cream' }) => {
  const c0 = NEEDLE_PALETTE[variant];
  const ANGLE = 55;
  const angle = Math.max(-ANGLE, Math.min(ANGLE, cents * ANGLE / 50));
  const ticks: { x1: number; y1: number; x2: number; y2: number; c: number; major: boolean }[] = [];
  for (let c = -50; c <= 50; c += 5) {
    const a = (c * ANGLE / 50) * Math.PI / 180;
    const major = c % 10 === 0;
    const inR = major ? 92 : 96, outR = 105, cx = 130, cy = 122;
    ticks.push({ x1: cx + Math.sin(a) * inR, y1: cy - Math.cos(a) * inR, x2: cx + Math.sin(a) * outR, y2: cy - Math.cos(a) * outR, c, major });
  }
  return (
    <div style={{ position: 'relative', width: 260, height: 158, margin: '0 auto' }}>
      <svg viewBox="0 0 260 158" width="260" height="158" style={{ display: 'block' }}>
        <defs>
          <radialGradient id="bgt-faceCream" cx="50%" cy="40%" r="80%">
            <stop offset="0%" stopColor={c0.face[0]} /><stop offset="60%" stopColor={c0.face[1]} /><stop offset="100%" stopColor={c0.face[2]} />
          </radialGradient>
          <linearGradient id="bgt-needleGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={c0.needle[0]} /><stop offset="100%" stopColor={c0.needle[1]} />
          </linearGradient>
        </defs>
        <rect x="0" y="0" width="260" height="158" rx="6" fill="url(#bgt-faceCream)" />
        <rect x="2" y="2" width="256" height="154" rx="5" fill="none" stroke={c0.frame} strokeWidth="0.8" />
        <rect x="6" y="6" width="248" height="146" rx="3" fill="none" stroke="rgba(42,24,8,0.18)" strokeWidth="0.5" />
        <path d="M 41 122 A 89 89 0 0 1 219 122" fill="none" stroke="rgba(58,42,21,0.18)" strokeWidth="1" />
        <path d="M 121 33 A 89 89 0 0 1 139 33" fill="none" stroke="#6b8a3a" strokeWidth="3.5" strokeLinecap="round" opacity="0.55" />
        {ticks.map((t, i) => (
          <line key={i} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2} stroke={c0.ink} strokeWidth={t.major ? 1.2 : 0.6} opacity={t.major ? 0.85 : 0.55} />
        ))}
        {[-50, -25, 0, 25, 50].map((c, i) => {
          const a = (c * ANGLE / 50) * Math.PI / 180;
          return <text key={i} x={130 + Math.sin(a) * 82} y={122 - Math.cos(a) * 82 + 3} textAnchor="middle" fontFamily="JetBrains Mono, monospace" fontSize="7.5" fill={c0.ink2} opacity="0.85">{c > 0 ? '+' + c : c}</text>;
        })}
        <text x="130" y="60" textAnchor="middle" fontFamily="DM Serif Display, serif" fontSize="9" fill={c0.ink2} opacity="0.6" letterSpacing="2">CENTS</text>
        <text x="34" y="118" textAnchor="middle" fontFamily="DM Serif Display, serif" fontSize="14" fill={c0.accent}>♭</text>
        <text x="226" y="118" textAnchor="middle" fontFamily="DM Serif Display, serif" fontSize="14" fill={c0.accent}>♯</text>
        <circle cx="130" cy="122" r="9" fill={c0.frame} />
        <circle cx="130" cy="122" r="9" fill="none" stroke="rgba(0,0,0,0.4)" strokeWidth="0.6" />
        <circle cx="128.5" cy="120" r="3.5" fill={c0.shine} />
        <g style={{ transform: `rotate(${angle}deg)`, transformOrigin: '130px 122px', transition: 'transform .12s cubic-bezier(.2,.7,.3,1)' }}>
          <line x1="130" y1="122" x2="130" y2="28" stroke="url(#bgt-needleGrad)" strokeWidth="1.8" strokeLinecap="round" />
          <polygon points="130,28 127,38 133,38" fill={c0.arrow} />
          <line x1="130" y1="122" x2="130" y2="138" stroke={c0.ink} strokeWidth="2" strokeLinecap="round" />
          <circle cx="130" cy="122" r="2.5" fill={c0.ink} />
        </g>
        <text x="130" y="142" textAnchor="middle" fontFamily="DM Serif Display, serif" fontStyle="italic" fontSize="6.5" fill={c0.ink2} opacity="0.5" letterSpacing="0.6">Bluegrass Tuner Co.</text>
        <circle cx="130" cy="14" r="3.5" fill={locked ? '#7aa44a' : 'rgba(42,24,8,0.18)'} style={{ transition: 'fill .15s' }} />
        {locked && <circle cx="130" cy="14" r="6" fill="none" stroke="#7aa44a" strokeOpacity="0.4" strokeWidth="1.2" />}
      </svg>
      <div style={{ position: 'absolute', inset: 0, borderRadius: 6, overflow: 'hidden', pointerEvents: 'none' }}>
        <PaperTexture intensity={0.6} />
      </div>
    </div>
  );
};

// ── STROBE METER — Peterson-style scrolling tape ──
const StrobeMeter: React.FC<{ cents: number; locked: boolean }> = ({ cents, locked }) => {
  const speed = cents * 1.8;
  const [offset, setOffset] = React.useState(0);
  React.useEffect(() => {
    let raf = 0, last = performance.now();
    const loop = (t: number) => {
      const dt = (t - last) / 1000; last = t;
      setOffset(o => (o + speed * dt) % 32);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [speed]);
  const bands = [
    { y: 12, scale: 1.0, h: 18 }, { y: 36, scale: 1.6, h: 18 }, { y: 60, scale: 2.4, h: 18 },
    { y: 84, scale: 3.4, h: 18 }, { y: 108, scale: 4.6, h: 18 },
  ];
  return (
    <div style={{ position: 'relative', width: 290, margin: '0 auto' }}>
      <div style={{
        position: 'relative', background: 'linear-gradient(180deg, #0d0805 0%, #1a0f06 100%)', borderRadius: 6, padding: '10px 12px',
        boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.85), 0 0 0 1px rgba(202,160,82,0.55), 0 0 0 3px #2a1808, 0 0 0 4px rgba(202,160,82,0.4)',
      }}>
        <svg viewBox="0 0 266 136" width="266" height="136" style={{ display: 'block' }}>
          <defs>
            <clipPath id="bgt-strobeClip"><rect x="0" y="0" width="266" height="136" rx="2" /></clipPath>
            <linearGradient id="bgt-stripeShine" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgba(255,232,160,0.55)" /><stop offset="50%" stopColor="rgba(202,160,82,0)" /><stop offset="100%" stopColor="rgba(60,30,0,0.55)" />
            </linearGradient>
            <pattern id="bgt-stripePattern" x="0" y="0" width="32" height="18" patternUnits="userSpaceOnUse">
              <rect width="32" height="18" fill="#0d0805" />
              <rect x="0" y="0" width="16" height="18" fill="#caa052" />
              <rect x="0" y="0" width="16" height="18" fill="url(#bgt-stripeShine)" />
            </pattern>
            <linearGradient id="bgt-windowVignette" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgba(0,0,0,0.5)" /><stop offset="50%" stopColor="rgba(0,0,0,0)" /><stop offset="100%" stopColor="rgba(0,0,0,0.5)" />
            </linearGradient>
          </defs>
          <g clipPath="url(#bgt-strobeClip)">
            {bands.map((b, i) => (
              <g key={i} transform={`translate(${-(offset * b.scale)} ${b.y})`}>
                <rect x="-32" y="0" width={266 + 64} height={b.h} fill="url(#bgt-stripePattern)" />
              </g>
            ))}
            {bands.map((b, i) => <line key={i} x1="0" y1={b.y + b.h} x2="266" y2={b.y + b.h} stroke="#2a1808" strokeWidth="0.5" />)}
            <line x1="0" y1="12" x2="266" y2="12" stroke="#2a1808" strokeWidth="0.5" />
            <rect width="266" height="136" fill="url(#bgt-windowVignette)" />
            <line x1="133" y1="0" x2="133" y2="136" stroke="rgba(255,255,255,0.18)" strokeWidth="0.8" strokeDasharray="2 3" />
            {locked && <rect x="0" y="0" width="266" height="136" fill="#7aa44a" opacity="0.10" />}
          </g>
          {bands.map((b, i) => (
            <text key={i} x="6" y={b.y + b.h - 4} fontFamily="JetBrains Mono, monospace" fontSize="7" fill="#caa052" opacity="0.55">×{b.scale.toFixed(1)}</text>
          ))}
        </svg>
      </div>
      <div style={{ position: 'absolute', top: '50%', left: -2, transform: 'translateY(-50%)', fontFamily: '"DM Serif Display", serif', fontSize: 18, color: cents < -3 ? '#f0d57f' : 'rgba(202,160,82,0.3)', transition: 'all .15s' }}>◀</div>
      <div style={{ position: 'absolute', top: '50%', right: -2, transform: 'translateY(-50%)', fontFamily: '"DM Serif Display", serif', fontSize: 18, color: cents > 3 ? '#f0d57f' : 'rgba(202,160,82,0.3)', transition: 'all .15s' }}>▶</div>
    </div>
  );
};

// ── DIAL METER — circular concentric arcs on felt ──
const DialMeter: React.FC<MeterProps> = ({ cents, locked, note, octave, freq }) => {
  const SWEEP = 130;
  const pct = Math.max(-1, Math.min(1, cents / 50));
  const angle = pct * SWEEP;
  const radius = 110, cx = 130, cy = 130;
  const polar = (ang: number, r: number) => { const a = (ang - 90) * Math.PI / 180; return { x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r }; };
  const arcStart = polar(-SWEEP, radius), arcEnd = polar(SWEEP, radius), indEnd = polar(angle, radius);
  const tickAngles: number[] = [];
  for (let c = -50; c <= 50; c += 10) tickAngles.push(c);
  return (
    <div style={{ position: 'relative', width: 260, height: 220, margin: '0 auto' }}>
      <svg viewBox="0 0 260 220" width="260" height="220" style={{ display: 'block' }}>
        <defs>
          <radialGradient id="bgt-dialFelt" cx="50%" cy="45%" r="65%">
            <stop offset="0%" stopColor="#4a6a3a" /><stop offset="80%" stopColor="#2e4a26" /><stop offset="100%" stopColor="#1e3018" />
          </radialGradient>
          <linearGradient id="bgt-ringBrass" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f0d57f" /><stop offset="50%" stopColor="#a07e36" /><stop offset="100%" stopColor="#6b4f1c" />
          </linearGradient>
          <filter id="bgt-dialGlow"><feGaussianBlur stdDeviation="3" /></filter>
        </defs>
        <circle cx={cx} cy={cy} r="118" fill="url(#bgt-dialFelt)" />
        <circle cx={cx} cy={cy} r="118" fill="none" stroke="url(#bgt-ringBrass)" strokeWidth="3" />
        <circle cx={cx} cy={cy} r="115" fill="none" stroke="rgba(0,0,0,0.5)" strokeWidth="0.8" />
        <path d={`M ${arcStart.x} ${arcStart.y} A ${radius} ${radius} 0 1 1 ${arcEnd.x} ${arcEnd.y}`} fill="none" stroke="rgba(202,160,82,0.18)" strokeWidth="6" strokeLinecap="round" />
        {[8, 16, 24].map((w, i) => {
          const s = polar(-w, radius), e = polar(w, radius);
          return <path key={i} d={`M ${s.x} ${s.y} A ${radius} ${radius} 0 0 1 ${e.x} ${e.y}`} fill="none" stroke="#7aa44a" strokeWidth="6" strokeLinecap="round" opacity={0.18 + i * 0.05} />;
        })}
        {cents < -1 && (() => { const s = polar(angle, radius), e = polar(0, radius); const sweep = angle < 0 ? 0 : 1; return <path d={`M ${s.x} ${s.y} A ${radius} ${radius} 0 0 ${sweep} ${e.x} ${e.y}`} fill="none" stroke="#caa052" strokeWidth="7" strokeLinecap="round" filter="url(#bgt-dialGlow)" opacity="0.85" />; })()}
        {cents > 1 && (() => { const s = polar(0, radius), e = polar(angle, radius); return <path d={`M ${s.x} ${s.y} A ${radius} ${radius} 0 0 1 ${e.x} ${e.y}`} fill="none" stroke="#caa052" strokeWidth="7" strokeLinecap="round" filter="url(#bgt-dialGlow)" opacity="0.85" />; })()}
        {tickAngles.map((c, i) => {
          const ang = c * SWEEP / 50, major = c % 25 === 0;
          const inner = polar(ang, radius - (major ? 12 : 7)), outer = polar(ang, radius);
          return <line key={i} x1={inner.x} y1={inner.y} x2={outer.x} y2={outer.y} stroke="#f0d57f" strokeWidth={major ? 1.5 : 0.7} opacity={major ? 0.95 : 0.55} />;
        })}
        {[-50, -25, 0, 25, 50].map((c, i) => {
          const p = polar(c * SWEEP / 50, radius - 22);
          return <text key={i} x={p.x} y={p.y + 3} textAnchor="middle" fontFamily="JetBrains Mono, monospace" fontSize="9" fill="#efe2c0" opacity="0.85">{c > 0 ? '+' + c : c}</text>;
        })}
        <circle cx={indEnd.x} cy={indEnd.y} r="5" fill="#f4dc94" filter="url(#bgt-dialGlow)" style={{ transition: 'all .12s' }} />
        <circle cx={indEnd.x} cy={indEnd.y} r="3" fill="#fff" style={{ transition: 'all .12s' }} />
        <circle cx={cx} cy={cy} r="68" fill="url(#bgt-brassShine)" />
        <circle cx={cx} cy={cy} r="62" fill="#1a0f06" opacity="0.92" />
        <text x={cx} y={cy + 14} textAnchor="middle" fontFamily="DM Serif Display, serif" fontSize="68" fill={locked ? '#7aa44a' : '#f0d57f'} style={{ transition: 'fill .2s' }}>{note}</text>
        <text x={cx + 32} y={cy - 10} textAnchor="start" fontFamily="JetBrains Mono, monospace" fontSize="14" fill="#caa052" opacity="0.85">{octave}</text>
        <text x={cx} y={cy + 36} textAnchor="middle" fontFamily="JetBrains Mono, monospace" fontSize="9" fill="#caa052" opacity="0.7" letterSpacing="1.4">{freq > 0 ? freq.toFixed(2) : '--'} Hz</text>
        <text x={cx} y="218" textAnchor="middle" fontFamily="DM Serif Display, serif" fontSize="9" fill="#caa052" opacity="0.6" letterSpacing="3">♭ &nbsp; T U N I N G &nbsp; ♯</text>
      </svg>
    </div>
  );
};

// ── Ported vintage cabinets (Festival … Lantern) ──
const FestivalMeter: React.FC<MeterProps> = ({ cents, locked }) => {
  // Typographic ruler: −50 ……… 0 ……… +50, with a printer's fist ☞
  const pct = Math.max(-1, Math.min(1, cents / 50));
  const left = 50 + pct * 44; // %
  return (
    <div style={{ width: '100%', padding: '0 20px', position: 'relative' }}>
      {/* Ruler row */}
      <div style={{
        position: 'relative',
        height: 60,
        borderTop: '2px solid #1a0d04',
        borderBottom: '2px solid #1a0d04',
        background: 'repeating-linear-gradient(90deg, #1a0d04 0px, #1a0d04 1px, transparent 1px, transparent 12px)',
        backgroundSize: '100% 12px',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}>
        {/* Tick marks every 10 cents */}
        <svg viewBox="0 0 100 60" preserveAspectRatio="none"
          width="100%" height="60" style={{ position: 'absolute', inset: 0 }}>
          {Array.from({ length: 21 }).map((_, i) => {
            const c = -50 + i * 5;
            const x = 3 + (i / 20) * 94;
            const major = c % 25 === 0;
            const mid = c % 10 === 0;
            const h = major ? 22 : mid ? 14 : 8;
            return (
              <line key={i} x1={x} y1={30 - h / 2} x2={x} y2={30 + h / 2}
                stroke="#1a0d04" strokeWidth={major ? 0.8 : 0.4}
                vectorEffect="non-scaling-stroke"/>
            );
          })}
        </svg>
        {/* "in-tune" red ribbon under center */}
        <div style={{
          position: 'absolute',
          left: '47%', right: '47%', top: -3, bottom: -3,
          background: '#9b3221',
          opacity: locked ? 1 : 0.18,
          transition: 'opacity .2s',
        }}/>
        {/* Printer's fist indicator */}
        <div style={{
          position: 'absolute',
          left: `${left}%`, top: '50%',
          transform: 'translate(-50%, -50%)',
          transition: 'left .12s cubic-bezier(.2,.7,.3,1)',
          fontFamily: '"DM Serif Display", serif',
          fontSize: 36, lineHeight: 1, color: '#1a0d04',
        }}>☞</div>
      </div>

      {/* Cents legend below */}
      <div style={{
        display: 'flex', justifyContent: 'space-between',
        padding: '6px 4px 0',
        fontFamily: '"DM Serif Display", serif', fontStyle: 'italic',
        fontSize: 13, color: 'rgba(26,13,4,0.8)',
      }}>
        <span>♭ 50</span>
        <span>25</span>
        <span style={{ color: locked ? '#9b3221' : 'inherit', fontWeight: 'bold' }}>0</span>
        <span>25</span>
        <span>50 ♯</span>
      </div>
    </div>
  );
};

const PocketWatchMeter: React.FC<MeterProps> = ({ cents, locked, note, octave, freq }) => {
  // Mini cents hand sweeping ±60° above the center
  const angle = Math.max(-60, Math.min(60, cents * 60 / 50));
  return (
    <div style={{ position: 'relative', width: 280, height: 280, margin: '0 auto' }}>
      <svg viewBox="0 0 280 280" width="280" height="280">
        <defs>
          <radialGradient id="bgt-watchCase" cx="35%" cy="30%" r="80%">
            <stop offset="0%" stopColor="#f7e3a3"/>
            <stop offset="55%" stopColor="#caa052"/>
            <stop offset="100%" stopColor="#5a4318"/>
          </radialGradient>
          <radialGradient id="bgt-watchEnamel" cx="50%" cy="40%" r="70%">
            <stop offset="0%" stopColor="#fbf6e6"/>
            <stop offset="100%" stopColor="#e6d7a8"/>
          </radialGradient>
        </defs>

        {/* Outer brass case */}
        <circle cx="140" cy="140" r="135" fill="url(#bgt-watchCase)"/>
        <circle cx="140" cy="140" r="135" fill="none" stroke="rgba(0,0,0,0.45)" strokeWidth="1.2"/>
        {/* Knurled ring */}
        <g>
          {Array.from({ length: 96 }).map((_, i) => {
            const a = (i / 96) * Math.PI * 2;
            const x1 = 140 + Math.cos(a) * 128;
            const y1 = 140 + Math.sin(a) * 128;
            const x2 = 140 + Math.cos(a) * 132;
            const y2 = 140 + Math.sin(a) * 132;
            return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="rgba(20,10,0,0.4)" strokeWidth="0.6"/>;
          })}
        </g>
        {/* Crown */}
        <rect x="132" y="2" width="16" height="10" rx="2" fill="url(#bgt-watchCase)" stroke="rgba(0,0,0,0.5)" strokeWidth="0.5"/>
        <rect x="135" y="0" width="10" height="4" rx="1" fill="url(#bgt-watchCase)"/>

        {/* Enamel face */}
        <circle cx="140" cy="140" r="118" fill="url(#bgt-watchEnamel)"/>
        <circle cx="140" cy="140" r="118" fill="none" stroke="rgba(58,36,21,0.35)" strokeWidth="0.6"/>
        <circle cx="140" cy="140" r="112" fill="none" stroke="rgba(58,36,21,0.25)" strokeWidth="0.4"/>

        {/* Outer cents ring */}
        {Array.from({ length: 41 }).map((_, i) => {
          const c = -50 + i * 2.5;
          const a = (c * 60 / 50 - 90) * Math.PI / 180;
          const major = c % 25 === 0;
          const mid = c % 10 === 0;
          const r1 = major ? 96 : mid ? 100 : 103;
          const r2 = 108;
          const x1 = 140 + Math.cos(a) * r1;
          const y1 = 140 + Math.sin(a) * r1;
          const x2 = 140 + Math.cos(a) * r2;
          const y2 = 140 + Math.sin(a) * r2;
          return (
            <line key={i} x1={x1} y1={y1} x2={x2} y2={y2}
              stroke="#3a2415" strokeWidth={major ? 1.4 : mid ? 0.8 : 0.4}
              opacity={major ? 0.9 : 0.65}/>
          );
        })}
        {/* Roman numeral cents labels: 50 25 0 25 50 */}
        {[
          { c: -50, t: 'L' }, { c: -25, t: 'XXV' }, { c: 0, t: '○' },
          { c: 25, t: 'XXV' }, { c: 50, t: 'L' },
        ].map(({ c, t }, i) => {
          const a = (c * 60 / 50 - 90) * Math.PI / 180;
          const x = 140 + Math.cos(a) * 88;
          const y = 140 + Math.sin(a) * 88;
          return (
            <text key={i} x={x} y={y + 3} textAnchor="middle"
              fontFamily="DM Serif Display, serif" fontSize="11"
              fill={c === 0 ? '#9b3221' : '#3a2415'}>{t}</text>
          );
        })}

        {/* in-tune sweet wedge */}
        <path d="M 140 140 L 138.6 32 A 108 108 0 0 1 141.4 32 Z"
          fill="#7aa44a" opacity={locked ? 0.55 : 0.22}
          style={{ transition: 'opacity .2s' }}/>

        {/* Big Note + Octave subdial */}
        <text x="140" y="160" textAnchor="middle"
          fontFamily="DM Serif Display, serif" fontSize="78"
          fill={locked ? '#7aa44a' : '#3a2415'} style={{ transition: 'fill .2s' }}>
          {note}
        </text>
        <text x="140" y="184" textAnchor="middle"
          fontFamily="JetBrains Mono, monospace" fontSize="10"
          fill="#3a2415" opacity="0.65" letterSpacing="2">OCT {octave}</text>

        {/* Tiny "Frequency" sub-dial bottom */}
        <circle cx="140" cy="220" r="22" fill="#f3e9c9" stroke="#caa052" strokeWidth="0.8"/>
        <text x="140" y="218" textAnchor="middle"
          fontFamily="JetBrains Mono, monospace" fontSize="8"
          fill="#3a2415" opacity="0.7" letterSpacing="1">Hz</text>
        <text x="140" y="230" textAnchor="middle"
          fontFamily="DM Serif Display, serif" fontSize="11"
          fill="#3a2415">{freq.toFixed(1)}</text>

        {/* Pivot + hand */}
        <g style={{
          transform: `rotate(${angle}deg)`,
          transformOrigin: '140px 140px',
          transition: 'transform .12s cubic-bezier(.2,.7,.3,1)',
        }}>
          {/* hand body — long thin pointer */}
          <path d="M 140 140 L 138 30 L 140 24 L 142 30 Z" fill="#3a2415"/>
          {/* counterweight */}
          <circle cx="140" cy="152" r="6" fill="#3a2415"/>
        </g>
        <circle cx="140" cy="140" r="4" fill="#caa052" stroke="#3a2415" strokeWidth="0.6"/>
        <circle cx="139" cy="139" r="1.5" fill="rgba(255,232,160,0.85)"/>

        {/* Maker mark */}
        <text x="140" y="78" textAnchor="middle"
          fontFamily="DM Serif Display, serif" fontStyle="italic"
          fontSize="7.5" fill="#3a2415" opacity="0.55" letterSpacing="0.8">
          Bluegrass Tuner Co.
        </text>
      </svg>
    </div>
  );
};

const HymnalMeter: React.FC<MeterProps> = ({ cents, locked, note }) => {
  // Staff: 5 lines. Center line = in tune. Note glyph drifts vertically with cents.
  const W = 280, H = 130;
  const lineY = (i: number) => 30 + i * 17;            // 5 lines at y=30,47,64,81,98
  const center = lineY(2);                     // middle line
  const range = 34;                            // ±range px
  const pct = Math.max(-1, Math.min(1, cents / 50));
  const noteY = center + pct * range;
  const noteX = W * 0.5;
  // Quaver glyph: round head + stem + flag
  return (
    <div style={{ width: W, margin: '0 auto', position: 'relative' }}>
      <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H}>
        {/* Bracket / time signature: "TUNE" */}
        <text x="6" y="68" fontFamily="DM Serif Display, serif" fontStyle="italic"
          fontSize="14" fill="#3a2415" opacity="0.6">𝄋</text>

        {/* 5 lines */}
        {[0, 1, 2, 3, 4].map((i) => (
          <line key={i}
            x1="22" y1={lineY(i)} x2={W - 8} y2={lineY(i)}
            stroke="#3a2415" strokeWidth={i === 2 ? 0.9 : 0.6}
            opacity={i === 2 ? 0.85 : 0.55}/>
        ))}
        {/* Cents labels at left edge */}
        {[-50, -25, 0, 25, 50].map((c, i) => (
          <text key={i} x="16" y={center + (c / 50) * range + 3} textAnchor="end"
            fontFamily="JetBrains Mono, monospace" fontSize="6"
            fill="#3a2415" opacity="0.6">{c > 0 ? '+' + c : c}</text>
        ))}

        {/* Bar lines */}
        <line x1="22" y1={lineY(0) - 2} x2="22" y2={lineY(4) + 2} stroke="#3a2415" strokeWidth="1.2"/>
        <line x1={W - 8} y1={lineY(0) - 2} x2={W - 8} y2={lineY(4) + 2} stroke="#3a2415" strokeWidth="1.2"/>
        <line x1={W - 14} y1={lineY(0) - 2} x2={W - 14} y2={lineY(4) + 2} stroke="#3a2415" strokeWidth="0.6"/>

        {/* "In-tune" sweet zone — soft ink wash on middle line */}
        <rect x="22" y={center - 4} width={W - 30} height="8"
          fill="#7aa44a" opacity={locked ? 0.32 : 0.10}
          style={{ transition: 'opacity .2s' }}/>

        {/* Ledger lines if note is outside the staff */}
        {Math.abs(pct) > 0.6 && (() => {
          const ext = Math.abs(pct) > 0.85 ? 2 : 1;
          const lines = [];
          for (let i = 1; i <= ext; i++) {
            const y = pct < 0 ? lineY(0) - 9 * i : lineY(4) + 9 * i;
            lines.push(<line key={i} x1={noteX - 9} y1={y} x2={noteX + 9} y2={y} stroke="#3a2415" strokeWidth="0.8"/>);
          }
          return lines;
        })()}

        {/* Note glyph */}
        <g style={{
          transform: `translateY(${noteY - center}px)`,
          transformBox: 'fill-box', transformOrigin: 'center',
          transition: 'transform .12s cubic-bezier(.2,.7,.3,1)',
        }}>
          <g transform={`translate(${noteX} ${center})`}>
            {/* head (ellipse, tilted) */}
            <ellipse cx="0" cy="0" rx="7" ry="5"
              fill={locked ? '#7aa44a' : '#3a2415'}
              transform="rotate(-22)"
              style={{ transition: 'fill .2s' }}/>
            {/* stem */}
            <line x1="6.5" y1="-1" x2="6.5" y2="-32"
              stroke={locked ? '#7aa44a' : '#3a2415'} strokeWidth="1.4"
              style={{ transition: 'stroke .2s' }}/>
            {/* flag */}
            <path d="M 6.5 -32 C 16 -28, 18 -18, 12 -12 C 14 -20, 12 -26, 6.5 -28 Z"
              fill={locked ? '#7aa44a' : '#3a2415'}
              style={{ transition: 'fill .2s' }}/>
            {/* note letter */}
            <text x="0" y="2.5" textAnchor="middle"
              fontFamily="DM Serif Display, serif" fontSize="7"
              fill="#fbf6e6" fontStyle="italic">{note.toLowerCase()}</text>
          </g>
        </g>
      </svg>
    </div>
  );
};

const RadioMeter: React.FC<MeterProps> = ({ cents, locked, note, octave, freq }) => {
  const W = 300, H = 150;
  const pct = Math.max(-1, Math.min(1, cents / 50));
  const x = W * (0.5 + pct * 0.42);
  return (
    <div style={{ position: 'relative', width: W, margin: '0 auto' }}>
      {/* Backlit dial window */}
      <div style={{
        position: 'relative', borderRadius: 8, overflow: 'hidden',
        background: 'linear-gradient(180deg, #f7d98a 0%, #e8b863 55%, #cf983f 100%)',
        boxShadow: 'inset 0 0 28px rgba(120,70,10,0.45), inset 0 0 0 1px #8a5a1e, 0 0 18px rgba(247,200,110,0.4)',
        padding: '14px 0 10px',
      }}>
        <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} style={{ display: 'block' }}>
          {/* Glow behind pointer */}
          <defs>
            <radialGradient id="bgt-radioGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="rgba(255,240,200,0.9)"/>
              <stop offset="100%" stopColor="rgba(255,240,200,0)"/>
            </radialGradient>
          </defs>
          <ellipse cx={x} cy="74" rx="60" ry="70" fill="url(#bgt-radioGlow)" opacity="0.6"/>

          {/* Two arc scales like an old radio (just decorative band names) */}
          <text x="14" y="22" fontFamily="JetBrains Mono, monospace" fontSize="8" fill="#5a3a10" opacity="0.8" letterSpacing="1">FLAT ♭</text>
          <text x={W - 14} y="22" textAnchor="end" fontFamily="JetBrains Mono, monospace" fontSize="8" fill="#5a3a10" opacity="0.8" letterSpacing="1">♯ SHARP</text>

          {/* Frequency-style tick scale */}
          {Array.from({ length: 41 }).map((_, i) => {
            const c = -50 + i * 2.5;
            const major = c % 25 === 0;
            const mid = c % 10 === 0;
            const tx = W * (0.08 + (i / 40) * 0.84);
            const h = major ? 20 : mid ? 13 : 7;
            return (
              <line key={i} x1={tx} y1={40} x2={tx} y2={40 + h}
                stroke="#4a2c08" strokeWidth={major ? 1.2 : 0.6}
                opacity={major ? 0.9 : 0.6}/>
            );
          })}
          {[-50, -25, 0, 25, 50].map((c, i) => {
            const tx = W * (0.08 + ((c + 50) / 100) * 0.84);
            return (
              <text key={i} x={tx} y={36} textAnchor="middle"
                fontFamily="JetBrains Mono, monospace" fontSize="9"
                fill="#4a2c08">{c > 0 ? '+' + c : c}</text>
            );
          })}

          {/* in-tune marker at center */}
          <rect x={W * 0.5 - 2} y="38" width="4" height="26" rx="1"
            fill="#9b3221" opacity={locked ? 1 : 0.5}/>

          {/* Big station name = note */}
          <text x={W / 2} y="118" textAnchor="middle"
            fontFamily="DM Serif Display, serif" fontSize="52"
            fill={locked ? '#3a6a1a' : '#3a1f08'}
            style={{ transition: 'fill .2s' }}>{note}<tspan fontSize="18" dy="-18" fill="#5a3a10">{octave}</tspan></text>
          <text x={W / 2} y="138" textAnchor="middle"
            fontFamily="JetBrains Mono, monospace" fontSize="9"
            fill="#5a3a10" letterSpacing="1.5">{freq.toFixed(2)} kHz·Hz</text>

          {/* Red tuning pointer */}
          <line x1={x} y1="38" x2={x} y2="138" stroke="#b81e0e" strokeWidth="1.6"
            style={{ transition: 'all .12s cubic-bezier(.2,.7,.3,1)' }}/>
          <polygon points={`${x},36 ${x - 5},28 ${x + 5},28`} fill="#b81e0e"
            style={{ transition: 'all .12s' }}/>
        </svg>
      </div>
      {/* horizontal slider rail underneath */}
      <div style={{
        marginTop: 8, height: 4, borderRadius: 2,
        background: 'rgba(0,0,0,0.25)',
        position: 'relative',
      }}>
        <div style={{
          position: 'absolute', top: '50%', left: `${(0.08 + ((pct + 1) / 2) * 0.84) * 100}%`,
          transform: 'translate(-50%,-50%)',
          width: 22, height: 12, borderRadius: 3,
          background: 'linear-gradient(180deg, #f0d57f, #8a6a2e)',
          boxShadow: '0 1px 2px rgba(0,0,0,0.5)',
          transition: 'left .12s',
        }}/>
      </div>
    </div>
  );
};

const SplitFlapMeter: React.FC<MeterProps> = ({ cents, locked, note, octave, freq, target }) => {
  const c = Math.round(cents);
  const sign = c > 0 ? '+' : c < 0 ? '-' : ' ';
  const digits = Math.abs(c).toString().padStart(2, '0');
  const dir = c < -3 ? 'TUNE  UP ▲' : c > 3 ? 'TUNE DOWN ▼' : 'IN  TUNE  ✓';
  const SplitFlap = ({ char, big = false, locked }: { char: React.ReactNode; big?: boolean; locked: boolean }) => {
    const w = big ? 96 : 40, h = big ? 130 : 56, fs = big ? 96 : 34;
    return (
      <div style={{
        position: 'relative', width: w, height: h,
        borderRadius: 5, background: '#15110c',
        boxShadow: '0 2px 4px rgba(0,0,0,0.5), inset 0 0 0 1px rgba(202,160,82,0.3)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        overflow: 'hidden',
      }}>
        {/* top/bottom halves */}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, #2a241c 0%, #1a160f 49.5%, #0d0a06 50%, #1a160f 100%)' }}/>
        {/* center seam */}
        <div style={{ position: 'absolute', left: 0, right: 0, top: '50%', height: 1, background: '#000', transform: 'translateY(-0.5px)', zIndex: 2 }}/>
        <span style={{
          position: 'relative', zIndex: 1,
          fontFamily: '"DM Serif Display", serif', fontSize: fs, lineHeight: 1,
          color: locked ? '#7aa44a' : '#f4ecd6',
          transition: 'color .2s',
          textShadow: '0 1px 0 rgba(0,0,0,0.6)',
        }}>{char}</span>
        {/* hinge pins */}
        <div style={{ position: 'absolute', left: -2, top: '50%', width: 4, height: 8, background: '#caa052', borderRadius: 2, transform: 'translateY(-50%)' }}/>
        <div style={{ position: 'absolute', right: -2, top: '50%', width: 4, height: 8, background: '#caa052', borderRadius: 2, transform: 'translateY(-50%)' }}/>
      </div>
    );
  };
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 18, padding: '8px 0' }}>
      {/* big note flaps: letter + octave */}
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        <SplitFlap char={note} big locked={locked}/>
        <SplitFlap char={octave} locked={locked}/>
      </div>
      {/* status row */}
      <div style={{
        fontFamily: '"JetBrains Mono", monospace', fontSize: 13, letterSpacing: 3,
        color: locked ? '#7aa44a' : '#f0c14a',
        transition: 'color .2s',
      }}>{dir}</div>
      {/* cents flaps */}
      <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
        <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 11, color: 'rgba(239,226,192,0.55)', letterSpacing: 1.5, marginRight: 4 }}>CENTS</span>
        <SplitFlap char={sign} locked={false}/>
        <SplitFlap char={digits[0]} locked={false}/>
        <SplitFlap char={digits[1]} locked={false}/>
      </div>
      <div style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 10, color: 'rgba(239,226,192,0.5)', letterSpacing: 1 }}>{freq.toFixed(2)} Hz · TGT {target.toFixed(2)}</div>
    </div>
  );
};

const BanjoHeadMeter: React.FC<MeterProps> = ({ cents, locked, note, octave, freq }) => {
  const cx = 140, cy = 140, R = 120;
  const HOOKS = 24;
  const pct = Math.max(-1, Math.min(1, cents / 50));
  // pointer sweeps top ±70°
  const ang = pct * 70;
  const p = (deg: number, r: number) => {
    const a = (deg - 90) * Math.PI / 180;
    return { x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r };
  };
  const ptr = p(ang, R - 30);
  return (
    <div style={{ width: 280, height: 280, margin: '0 auto', position: 'relative' }}>
      <svg viewBox="0 0 280 280" width="280" height="280">
        <defs>
          <radialGradient id="bgt-mylar" cx="42%" cy="35%" r="70%">
            <stop offset="0%" stopColor="#fefdfb"/>
            <stop offset="70%" stopColor="#f1ece0"/>
            <stop offset="100%" stopColor="#dcd2bf"/>
          </radialGradient>
          <radialGradient id="bgt-nickel" cx="40%" cy="30%" r="75%">
            <stop offset="0%" stopColor="#fbfbfc"/>
            <stop offset="45%" stopColor="#c4c8cd"/>
            <stop offset="100%" stopColor="#6e7479"/>
          </radialGradient>
        </defs>
        {/* wood rim */}
        <circle cx={cx} cy={cy} r={R + 14} fill="#5a3418"/>
        <circle cx={cx} cy={cy} r={R + 14} fill="none" stroke="#2a1808" strokeWidth="1"/>
        {/* nickel tension ring */}
        <circle cx={cx} cy={cy} r={R + 6} fill="none" stroke="url(#bgt-nickel)" strokeWidth="9"/>
        {/* tension hooks (brackets) around rim */}
        {Array.from({ length: HOOKS }).map((_, i) => {
          const a = (i / HOOKS) * Math.PI * 2;
          const x1 = cx + Math.cos(a) * (R + 2);
          const y1 = cy + Math.sin(a) * (R + 2);
          const x2 = cx + Math.cos(a) * (R + 13);
          const y2 = cy + Math.sin(a) * (R + 13);
          return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="url(#bgt-nickel)" strokeWidth="3.5" strokeLinecap="round"/>;
        })}
        {/* mylar head */}
        <circle cx={cx} cy={cy} r={R} fill="url(#bgt-mylar)"/>
        <circle cx={cx} cy={cy} r={R} fill="none" stroke="rgba(58,36,21,0.18)" strokeWidth="0.6"/>

        {/* cents arc ticks across the top */}
        {Array.from({ length: 15 }).map((_, i) => {
          const c = -70 + i * 10;
          const major = c % 35 === 0;
          const o1 = p(c, R - 6); const o2 = p(c, R - (major ? 20 : 13));
          return <line key={i} x1={o1.x} y1={o1.y} x2={o2.x} y2={o2.y} stroke="#3a2415" strokeWidth={major ? 1.2 : 0.6} opacity={major ? 0.85 : 0.5}/>;
        })}
        {/* in-tune wedge top center */}
        {[6, 12].map((w, i) => {
          const s = p(-w, R - 6), e = p(w, R - 6);
          return <path key={i} d={`M ${s.x} ${s.y} A ${R - 6} ${R - 6} 0 0 1 ${e.x} ${e.y}`} fill="none" stroke="#6b8a3a" strokeWidth="4" strokeLinecap="round" opacity={0.2 + i * 0.12}/>;
        })}
        {/* flat/sharp labels */}
        <text {...p(-70, R - 30)} textAnchor="middle" dy="4" fontFamily="DM Serif Display, serif" fontSize="15" fill="#9b3221">♭</text>
        <text {...p(70, R - 30)} textAnchor="middle" dy="4" fontFamily="DM Serif Display, serif" fontSize="15" fill="#9b3221">♯</text>

        {/* bridge silhouette near bottom */}
        <g opacity="0.5">
          <rect x={cx - 30} y={cy + 58} width="60" height="9" rx="2" fill="#7a4a26"/>
          <rect x={cx - 28} y={cy + 67} width="5" height="10" fill="#7a4a26"/>
          <rect x={cx + 23} y={cy + 67} width="5" height="10" fill="#7a4a26"/>
        </g>

        {/* note in center */}
        <text x={cx} y={cy + 18} textAnchor="middle" fontFamily="DM Serif Display, serif" fontSize="84"
          fill={locked ? '#5a7a2a' : '#2a1808'} style={{ transition: 'fill .2s' }}>{note}</text>
        <text x={cx + 38} y={cy - 24} fontFamily="JetBrains Mono, monospace" fontSize="13" fill="#7a4a26">{octave}</text>
        <text x={cx} y={cy + 40} textAnchor="middle" fontFamily="JetBrains Mono, monospace" fontSize="9" fill="rgba(42,24,8,0.6)" letterSpacing="1.4">{freq.toFixed(2)} Hz</text>

        {/* pointer */}
        <line x1={cx} y1={cy} x2={ptr.x} y2={ptr.y} stroke="#b81e0e" strokeWidth="2" strokeLinecap="round" style={{ transition: 'all .12s cubic-bezier(.2,.7,.3,1)' }}/>
        <circle cx={cx} cy={cy} r="5" fill="#3a2415"/>
        <circle {...ptr} r="3.5" fill="#b81e0e" style={{ transition: 'all .12s' }}/>

        {/* maker stamp */}
        <text x={cx} y={cy + 86} textAnchor="middle" fontFamily="DM Serif Display, serif" fontStyle="italic" fontSize="7" fill="rgba(42,24,8,0.45)" letterSpacing="0.6">Bluegrass Tuner Co.</text>
      </svg>
    </div>
  );
};

const WeathervaneMeter: React.FC<MeterProps> = ({ cents, locked, note, octave }) => {
  const cx = 140, cy = 150, R = 118;
  const pct = Math.max(-1, Math.min(1, cents / 50));
  const ang = pct * 90; // -90 (W=flat) .. +90 (E=sharp), N=up=0
  return (
    <div style={{ width: 280, height: 290, margin: '0 auto' }}>
      <svg viewBox="0 0 280 290" width="280" height="290">
        <defs>
          <radialGradient id="bgt-copper" cx="40%" cy="30%" r="75%">
            <stop offset="0%" stopColor="#e8a87c"/>
            <stop offset="45%" stopColor="#b5764a"/>
            <stop offset="100%" stopColor="#6e4226"/>
          </radialGradient>
          <linearGradient id="bgt-patina" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#7fb6a0"/>
            <stop offset="100%" stopColor="#4a7d68"/>
          </linearGradient>
        </defs>
        {/* compass plate */}
        <circle cx={cx} cy={cy} r={R} fill="#1e3326" opacity="0.25"/>
        <circle cx={cx} cy={cy} r={R} fill="none" stroke="url(#bgt-copper)" strokeWidth="4"/>
        <circle cx={cx} cy={cy} r={R - 8} fill="none" stroke="rgba(110,66,38,0.4)" strokeWidth="0.8"/>

        {/* compass rose ticks */}
        {Array.from({ length: 72 }).map((_, i) => {
          const a = (i * 5 - 90) * Math.PI / 180;
          const major = i % 9 === 0;
          const r1 = R - (major ? 16 : 8), r2 = R - 4;
          return <line key={i} x1={cx + Math.cos(a) * r1} y1={cy + Math.sin(a) * r1} x2={cx + Math.cos(a) * r2} y2={cy + Math.sin(a) * r2} stroke="#6e4226" strokeWidth={major ? 1.2 : 0.5} opacity={major ? 0.85 : 0.5}/>;
        })}
        {/* cardinal letters: N top (in tune), W flat, E sharp, S far */}
        <text x={cx} y={cy - R + 30} textAnchor="middle" fontFamily="DM Serif Display, serif" fontSize="16" fill={locked ? '#3a6a1a' : '#6e4226'} style={{ transition: 'fill .2s' }}>N</text>
        <text x={cx - R + 24} y={cy + 5} textAnchor="middle" fontFamily="DM Serif Display, serif" fontSize="14" fill="#9b3221">♭</text>
        <text x={cx + R - 24} y={cy + 5} textAnchor="middle" fontFamily="DM Serif Display, serif" fontSize="14" fill="#9b3221">♯</text>
        <text x={cx} y={cy + R - 18} textAnchor="middle" fontFamily="JetBrains Mono, monospace" fontSize="9" fill="#6e4226" opacity="0.7">50¢</text>

        {/* in-tune cone at N */}
        <path d={`M ${cx} ${cy} L ${cx - 14} ${cy - R + 14} A ${R - 8} ${R - 8} 0 0 1 ${cx + 14} ${cy - R + 14} Z`} fill="#6b8a3a" opacity={locked ? 0.45 : 0.18} style={{ transition: 'opacity .2s' }}/>

        {/* center note medallion */}
        <circle cx={cx} cy={cy} r="46" fill="url(#bgt-copper)"/>
        <circle cx={cx} cy={cy} r="46" fill="none" stroke="rgba(20,10,0,0.4)" strokeWidth="0.8"/>
        <circle cx={cx} cy={cy} r="40" fill="#2a1808" opacity="0.9"/>
        <text x={cx} y={cy + 16} textAnchor="middle" fontFamily="DM Serif Display, serif" fontSize="46" fill={locked ? '#8fbf5a' : '#e8a87c'} style={{ transition: 'fill .2s' }}>{note}</text>
        <text x={cx + 22} y={cy - 14} fontFamily="JetBrains Mono, monospace" fontSize="10" fill="#b5764a">{octave}</text>

        {/* rooster weathervane arrow */}
        <g style={{ transform: `rotate(${ang}deg)`, transformOrigin: `${cx}px ${cy}px`, transition: 'transform .14s cubic-bezier(.2,.7,.3,1)' }}>
          {/* tail (flat side) */}
          <path d={`M ${cx} ${cy} L ${cx - 9} ${cy + 64} L ${cx} ${cy + 54} L ${cx + 9} ${cy + 64} Z`} fill="url(#bgt-patina)" stroke="#3a5d4e" strokeWidth="0.5"/>
          {/* pointer (sharp side) toward N */}
          <path d={`M ${cx} ${cy - 96} L ${cx - 8} ${cy - 50} L ${cx + 8} ${cy - 50} Z`} fill="url(#bgt-copper)" stroke="#6e4226" strokeWidth="0.5"/>
          <line x1={cx} y1={cy - 50} x2={cx} y2={cy + 54} stroke="#6e4226" strokeWidth="2.5"/>
          {/* rooster body silhouette at the tip */}
          <g transform={`translate(${cx} ${cy - 104})`}>
            <path d="M 0 8 C -6 4 -6 -4 0 -6 C 4 -7 7 -4 7 -1 C 10 -2 12 0 10 2 C 12 3 10 6 7 5 C 6 9 2 10 0 8 Z" fill="url(#bgt-copper)" stroke="#6e4226" strokeWidth="0.4"/>
            <path d="M 7 -4 L 11 -7 L 9 -3 L 13 -5 L 10 -1 Z" fill="#9b3221"/>
          </g>
        </g>
        <circle cx={cx} cy={cy} r="4" fill="#2a1808"/>
      </svg>
    </div>
  );
};

const ApothecaryMeter: React.FC<MeterProps> = ({ cents, locked, note, octave, freq }) => {
  const H = 250, top = 14, bot = H - 40;
  const pct = Math.max(-1, Math.min(1, cents / 50));
  // center = in tune; mercury height maps -50..+50 -> bot..top
  const mid = (top + bot) / 2;
  const y = mid - pct * (bot - top) / 2;
  return (
    <div style={{ display: 'flex', gap: 22, alignItems: 'center', justifyContent: 'center' }}>
      <svg viewBox="0 0 80 270" width="80" height="270">
        <defs>
          <linearGradient id="bgt-glass" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="rgba(255,255,255,0.5)"/>
            <stop offset="35%" stopColor="rgba(255,255,255,0.08)"/>
            <stop offset="100%" stopColor="rgba(120,90,40,0.12)"/>
          </linearGradient>
          <linearGradient id="bgt-merc" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#d8442a"/>
            <stop offset="50%" stopColor="#b81e0e"/>
            <stop offset="100%" stopColor="#7a1206"/>
          </linearGradient>
        </defs>
        {/* tube */}
        <rect x="30" y={top - 6} width="20" height={bot - top + 12} rx="10" fill="#f3ead0" stroke="#caa052" strokeWidth="1"/>
        {/* bulb */}
        <circle cx="40" cy={bot + 16} r="18" fill="url(#bgt-merc)" stroke="#7a1206" strokeWidth="0.8"/>
        {/* mercury column up to y */}
        <rect x="34" y={y} width="12" height={bot + 16 - y} rx="6" fill="url(#bgt-merc)" style={{ transition: 'all .12s cubic-bezier(.2,.7,.3,1)' }}/>
        {/* glass highlight */}
        <rect x="32" y={top - 4} width="6" height={bot - top + 8} rx="3" fill="url(#bgt-glass)"/>
        {/* scale ticks */}
        {Array.from({ length: 21 }).map((_, i) => {
          const c = 50 - i * 5;
          const ty = top + (i / 20) * (bot - top);
          const major = c % 25 === 0;
          return (
            <g key={i}>
              <line x1={52} y1={ty} x2={major ? 64 : 58} y2={ty} stroke="#3a2415" strokeWidth={major ? 1 : 0.5} opacity={major ? 0.85 : 0.5}/>
              {major && <text x={66} y={ty + 3} fontFamily="JetBrains Mono, monospace" fontSize="7" fill="#3a2415">{c > 0 ? '+' + c : c}</text>}
              <line x1={28} y1={ty} x2={major ? 16 : 22} y2={ty} stroke="#3a2415" strokeWidth={major ? 1 : 0.5} opacity={major ? 0.85 : 0.5}/>
            </g>
          );
        })}
        {/* in-tune band at center */}
        <rect x="14" y={mid - 5} width="52" height="10" fill="#6b8a3a" opacity={locked ? 0.4 : 0.14} style={{ transition: 'opacity .2s' }}/>
        <text x="8" y={mid + 3} fontFamily="DM Serif Display, serif" fontSize="9" fill="#6b8a3a">●</text>
      </svg>
      {/* apothecary label */}
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 8, letterSpacing: 2.5, color: 'rgba(58,36,21,0.6)', textTransform: 'uppercase' }}>Pitch Tincture No.</div>
        <div style={{ fontFamily: '"DM Serif Display", serif', fontStyle: 'italic', fontSize: 70, lineHeight: 0.9, color: locked ? '#5a7a2a' : '#3a2415', transition: 'color .2s' }}>{note}<sub style={{ fontSize: 22, color: '#7a4a26' }}>{octave}</sub></div>
        <div style={{ fontFamily: '"DM Serif Display", serif', fontStyle: 'italic', fontSize: 12, color: 'rgba(58,36,21,0.7)', marginTop: 4 }}>{freq.toFixed(2)} Hz</div>
        <div style={{ width: 90, height: 1, background: 'rgba(58,36,21,0.4)', margin: '8px auto' }}/>
        <div style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 8, letterSpacing: 1.5, color: 'rgba(58,36,21,0.55)' }}>APPLY UNTIL CENTERED</div>
      </div>
    </div>
  );
};

const OscilloscopeMeter: React.FC<MeterProps> = ({ cents, locked }) => {
  const W = 280, H = 180;
  const [phase, setPhase] = React.useState(0);
  React.useEffect(() => {
    let raf: number, last = performance.now();
    const loop = (t: number) => {
      const dt = (t - last) / 1000; last = t;
      // drift speed proportional to cents (beat frequency)
      setPhase(p => p + dt * cents * 0.12);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [cents]);

  // build a sine path
  const pts = [];
  const cycles = 3;
  for (let i = 0; i <= 120; i++) {
    const x = (i / 120) * W;
    const yy = H / 2 + Math.sin((i / 120) * Math.PI * 2 * cycles + phase) * (H * 0.3);
    pts.push(`${x.toFixed(1)},${yy.toFixed(1)}`);
  }
  const d = 'M ' + pts.join(' L ');

  return (
    <div style={{
      position: 'relative', width: W + 24, margin: '0 auto',
      padding: 12, borderRadius: 14,
      background: 'linear-gradient(180deg, #2a2620 0%, #1a1712 100%)',
      boxShadow: 'inset 0 1px 0 rgba(202,160,82,0.2), 0 6px 16px rgba(0,0,0,0.5)',
    }}>
      <div style={{
        position: 'relative', borderRadius: 80 + 'px / 40px', overflow: 'hidden',
        background: 'radial-gradient(120% 100% at 50% 50%, #0d2410 0%, #061205 80%)',
        boxShadow: 'inset 0 0 30px rgba(0,0,0,0.8), inset 0 0 0 2px #0a1c0a',
      }}>
        <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} style={{ display: 'block' }}>
          {/* graticule */}
          {Array.from({ length: 9 }).map((_, i) => (
            <line key={'v' + i} x1={(i + 1) * W / 10} y1="0" x2={(i + 1) * W / 10} y2={H} stroke="#2a6a30" strokeWidth="0.4" opacity="0.4"/>
          ))}
          {Array.from({ length: 5 }).map((_, i) => (
            <line key={'h' + i} x1="0" y1={(i + 1) * H / 6} x2={W} y2={(i + 1) * H / 6} stroke="#2a6a30" strokeWidth="0.4" opacity="0.4"/>
          ))}
          <line x1={W / 2} y1="0" x2={W / 2} y2={H} stroke="#3a8a40" strokeWidth="0.8" opacity="0.6"/>
          <line x1="0" y1={H / 2} x2={W} y2={H / 2} stroke="#3a8a40" strokeWidth="0.8" opacity="0.6"/>

          {/* the trace — glow + core */}
          <path d={d} fill="none" stroke={locked ? '#9fffa0' : '#4fe65a'} strokeWidth="5" opacity="0.25" style={{ filter: 'blur(2px)' }}/>
          <path d={d} fill="none" stroke={locked ? '#d6ffd0' : '#7dff86'} strokeWidth="1.8"
            style={{ transition: 'stroke .2s' }}/>

          {/* readout text */}
          <text x="8" y="16" fontFamily="JetBrains Mono, monospace" fontSize="9" fill="#7dff86" opacity="0.85">BEAT {Math.abs(cents).toFixed(1)} Hz</text>
          <text x={W - 8} y="16" textAnchor="end" fontFamily="JetBrains Mono, monospace" fontSize="9" fill={locked ? '#d6ffd0' : '#7dff86'} opacity="0.85">{locked ? 'LOCK' : cents < 0 ? 'FLAT' : 'SHARP'}</text>
        </svg>
        {/* scanline + vignette */}
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'repeating-linear-gradient(0deg, rgba(0,0,0,0.12) 0px, rgba(0,0,0,0.12) 1px, transparent 1px, transparent 3px)' }}/>
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', boxShadow: 'inset 0 0 40px rgba(0,0,0,0.6)', borderRadius: '80px / 40px' }}/>
      </div>
    </div>
  );
};

const SpiritLevelMeter: React.FC<MeterProps> = ({ cents, locked }) => {
  const W = 300, H = 70;
  const pct = Math.max(-1, Math.min(1, cents / 50));
  const bx = W * (0.5 + pct * 0.40);
  return (
    <div style={{ width: W, margin: '0 auto' }}>
      {/* brass + wood body */}
      <div style={{
        position: 'relative', borderRadius: 10, padding: '16px 14px',
        background: 'linear-gradient(180deg, #7a4a26 0%, #5a3418 100%)',
        boxShadow: 'inset 0 1px 0 rgba(255,220,150,0.3), 0 4px 10px rgba(0,0,0,0.4)',
      }}>
        <WoodTexture intensity={0.4}/>
        {/* brass end plates */}
        <div style={{ position: 'absolute', left: 6, top: 6, bottom: 6, width: 16, borderRadius: 6, background: 'linear-gradient(180deg,#f0d57f,#8a6a2e)', boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.3)' }}/>
        <div style={{ position: 'absolute', right: 6, top: 6, bottom: 6, width: 16, borderRadius: 6, background: 'linear-gradient(180deg,#f0d57f,#8a6a2e)', boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.3)' }}/>
        {/* glass vial */}
        <div style={{
          position: 'relative', height: H, margin: '0 18px', borderRadius: H / 2,
          background: 'linear-gradient(180deg, rgba(180,210,170,0.5), rgba(120,160,120,0.65))',
          boxShadow: 'inset 0 2px 6px rgba(0,0,0,0.3), inset 0 0 0 2px rgba(202,160,82,0.6)',
          overflow: 'hidden',
        }}>
          {/* center in-tune lines */}
          <div style={{ position: 'absolute', left: '50%', top: 6, bottom: 6, width: 2, background: '#1a0d04', transform: 'translateX(-14px)', opacity: 0.7 }}/>
          <div style={{ position: 'absolute', left: '50%', top: 6, bottom: 6, width: 2, background: '#1a0d04', transform: 'translateX(12px)', opacity: 0.7 }}/>
          {/* in-tune wash */}
          <div style={{ position: 'absolute', left: 'calc(50% - 14px)', top: 0, width: 26, bottom: 0, background: '#6b8a3a', opacity: locked ? 0.4 : 0.12, transition: 'opacity .2s' }}/>
          {/* the bubble */}
          <div style={{
            position: 'absolute', top: '50%', left: bx - 18,
            transform: 'translateY(-50%)',
            width: 40, height: H - 14, borderRadius: 100,
            background: 'radial-gradient(circle at 38% 32%, rgba(255,255,255,0.9), rgba(210,235,205,0.55) 55%, rgba(150,190,150,0.35))',
            boxShadow: 'inset 0 0 0 1.5px rgba(255,255,255,0.6)',
            transition: 'left .14s cubic-bezier(.2,.7,.3,1)',
          }}/>
          {/* tick marks */}
          {[-40, -20, 20, 40].map((c, i) => (
            <div key={i} style={{ position: 'absolute', top: 4, bottom: 4, width: 1, background: 'rgba(26,13,4,0.35)', left: `${50 + (c / 50) * 40}%` }}/>
          ))}
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 20px 0', fontFamily: '"JetBrains Mono", monospace', fontSize: 9, color: 'rgba(239,226,192,0.6)', letterSpacing: 1 }}>
        <span>♭ FLAT</span><span style={{ color: locked ? '#8fbf5a' : 'inherit' }}>LEVEL · IN TUNE</span><span>SHARP ♯</span>
      </div>
    </div>
  );
};

const TurntableMeter: React.FC<MeterProps> = ({ cents, locked, note, octave, freq }) => {
  const cx = 140, cy = 150, R = 118;
  const pct = Math.max(-1, Math.min(1, cents / 50));
  const armAng = 18 + pct * 22; // tonearm rotation
  const [spin, setSpin] = React.useState(0);
  React.useEffect(() => {
    let raf, last = performance.now();
    const loop = (t) => { const dt = (t - last) / 1000; last = t; setSpin(s => (s + dt * 60) % 360); raf = requestAnimationFrame(loop); };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);
  return (
    <div style={{ width: 280, height: 300, margin: '0 auto', position: 'relative' }}>
      <svg viewBox="0 0 280 300" width="280" height="300">
        <defs>
          <radialGradient id="bgt-vinyl" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#1a1410"/>
            <stop offset="100%" stopColor="#0a0806"/>
          </radialGradient>
          <radialGradient id="bgt-label" cx="42%" cy="35%" r="70%">
            <stop offset="0%" stopColor="#e8b531"/>
            <stop offset="100%" stopColor="#b5791a"/>
          </radialGradient>
        </defs>
        {/* platter shadow */}
        <circle cx={cx} cy={cy} r={R + 6} fill="#000" opacity="0.4"/>
        {/* vinyl */}
        <circle cx={cx} cy={cy} r={R} fill="url(#bgt-vinyl)"/>
        {/* grooves */}
        {Array.from({ length: 14 }).map((_, i) => (
          <circle key={i} cx={cx} cy={cy} r={52 + i * 4.8} fill="none" stroke="#2a2018" strokeWidth="0.5" opacity="0.6"/>
        ))}
        {/* strobe dots around rim (spin) */}
        <g style={{ transform: `rotate(${spin}deg)`, transformOrigin: `${cx}px ${cy}px` }}>
          {Array.from({ length: 36 }).map((_, i) => {
            const a = (i / 36) * Math.PI * 2;
            return <rect key={i} x={cx + Math.cos(a) * (R - 5) - 1.5} y={cy + Math.sin(a) * (R - 5) - 3} width="3" height="6" rx="1" fill="#caa052" opacity={i % 2 ? 0.8 : 0.35} transform={`rotate(${(i / 36) * 360 + 90} ${cx + Math.cos(a) * (R - 5)} ${cy + Math.sin(a) * (R - 5)})`}/>;
          })}
        </g>
        {/* center label */}
        <circle cx={cx} cy={cy} r="50" fill="url(#bgt-label)" style={{ transform: `rotate(${spin * 0.5}deg)`, transformOrigin: `${cx}px ${cy}px` }}/>
        <circle cx={cx} cy={cy} r="50" fill="none" stroke="rgba(60,30,0,0.4)" strokeWidth="0.8"/>
        <text x={cx} y={cy - 22} textAnchor="middle" fontFamily="JetBrains Mono, monospace" fontSize="6.5" fill="#5a3a10" letterSpacing="1.5" style={{ transform: `rotate(${spin * 0.5}deg)`, transformOrigin: `${cx}px ${cy}px` }}>BLUEGRASS REC.</text>
        <text x={cx} y={cy + 16} textAnchor="middle" fontFamily="DM Serif Display, serif" fontSize="44" fill={locked ? '#2e5a12' : '#2a1808'} style={{ transition: 'fill .2s' }}>{note}</text>
        <text x={cx + 22} y={cy - 6} fontFamily="JetBrains Mono, monospace" fontSize="9" fill="#5a3a10">{octave}</text>
        <text x={cx} y={cy + 30} textAnchor="middle" fontFamily="JetBrains Mono, monospace" fontSize="6.5" fill="#5a3a10" letterSpacing="1">{freq.toFixed(1)} RPM·Hz</text>
        <circle cx={cx} cy={cy} r="3" fill="#1a0d04"/>

        {/* tonearm from top-right */}
        <g style={{ transform: `rotate(${armAng}deg)`, transformOrigin: '244px 56px', transition: 'transform .14s cubic-bezier(.2,.7,.3,1)' }}>
          <circle cx="244" cy="56" r="14" fill="url(#bgt-brassShine)" stroke="rgba(0,0,0,0.4)" strokeWidth="0.6"/>
          <circle cx="244" cy="56" r="6" fill="#2a1808"/>
          <line x1="244" y1="56" x2="178" y2="212" stroke="#c4c8cd" strokeWidth="4" strokeLinecap="round"/>
          <line x1="244" y1="56" x2="178" y2="212" stroke="rgba(255,255,255,0.4)" strokeWidth="1" strokeLinecap="round"/>
          {/* headshell */}
          <rect x="170" y="206" width="18" height="12" rx="2" fill="#2a1808" transform="rotate(67 178 212)"/>
        </g>
        {/* in-tune lamp */}
        <circle cx="40" cy="44" r="6" fill={locked ? '#7aa44a' : 'rgba(202,160,82,0.3)'} style={{ transition: 'fill .2s' }}/>
        <text x="52" y="48" fontFamily="JetBrains Mono, monospace" fontSize="8" fill="rgba(239,226,192,0.7)" letterSpacing="1">33⅓</text>
      </svg>
    </div>
  );
};

const PressureGauge: React.FC<MeterProps> = ({ cents, locked, note, octave, freq }) => {
  const cx = 140, cy = 140, R = 116;
  const SWEEP = 135;
  const pct = Math.max(-1, Math.min(1, cents / 50));
  const ang = pct * SWEEP;
  const p = (deg: number, r: number) => { const a = (deg - 90) * Math.PI / 180; return { x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r }; };
  const tip = p(ang, R - 26);
  return (
    <div style={{ width: 280, height: 280, margin: '0 auto' }}>
      <svg viewBox="0 0 280 280" width="280" height="280">
        {/* brass bezel */}
        <circle cx={cx} cy={cy} r={R + 12} fill="url(#bgt-brassShine)"/>
        <circle cx={cx} cy={cy} r={R + 12} fill="none" stroke="rgba(20,10,0,0.45)" strokeWidth="1.2"/>
        {Array.from({ length: 60 }).map((_, i) => { const a = (i / 60) * Math.PI * 2; return <line key={i} x1={cx + Math.cos(a) * (R + 6)} y1={cy + Math.sin(a) * (R + 6)} x2={cx + Math.cos(a) * (R + 11)} y2={cy + Math.sin(a) * (R + 11)} stroke="rgba(20,10,0,0.35)" strokeWidth="0.6"/>; })}
        {/* cream dial face */}
        <circle cx={cx} cy={cy} r={R} fill="#f3ead0"/>
        <circle cx={cx} cy={cy} r={R} fill="none" stroke="rgba(58,36,21,0.3)" strokeWidth="0.8"/>

        {/* colored zones: red(flat) - green(center) - red(sharp) */}
        {(() => {
          const seg = (a1: number, a2: number, color: string, w: number) => { const s = p(a1, R - 14), e = p(a2, R - 14); const large = (a2 - a1) > 180 ? 1 : 0; return <path d={`M ${s.x} ${s.y} A ${R - 14} ${R - 14} 0 ${large} 1 ${e.x} ${e.y}`} fill="none" stroke={color} strokeWidth={w} opacity="0.8"/>; };
          return <g>
            {seg(-SWEEP, -20, '#b81e0e', 7)}
            {seg(-20, 20, '#3a7a1e', 7)}
            {seg(20, SWEEP, '#b81e0e', 7)}
          </g>;
        })()}

        {/* ticks */}
        {Array.from({ length: 21 }).map((_, i) => {
          const c = -50 + i * 5;
          const a = c * SWEEP / 50;
          const major = c % 25 === 0; const mid = c % 10 === 0;
          const o1 = p(a, R - 4), o2 = p(a, R - (major ? 22 : mid ? 15 : 9));
          return <line key={i} x1={o1.x} y1={o1.y} x2={o2.x} y2={o2.y} stroke="#2a1808" strokeWidth={major ? 1.4 : 0.7} opacity={major ? 0.9 : 0.6}/>;
        })}
        {[-50, -25, 0, 25, 50].map((c, i) => { const a = c * SWEEP / 50; const q = p(a, R - 38); return <text key={i} x={q.x} y={q.y + 3} textAnchor="middle" fontFamily="JetBrains Mono, monospace" fontSize="10" fill="#2a1808">{c > 0 ? '+' + c : c}</text>; })}

        <text x={cx} y={cy - 48} textAnchor="middle" fontFamily="DM Serif Display, serif" fontSize="9" fill="#3a2415" opacity="0.65" letterSpacing="2">CENTS</text>
        <text x={cx} y={cy + 44} textAnchor="middle" fontFamily="JetBrains Mono, monospace" fontSize="8" fill="#3a2415" opacity="0.6" letterSpacing="1.5">{freq.toFixed(1)} Hz</text>

        {/* big note */}
        <text x={cx} y={cy + 18} textAnchor="middle" fontFamily="DM Serif Display, serif" fontSize="58" fill={locked ? '#3a7a1e' : '#2a1808'} style={{ transition: 'fill .2s' }}>{note}<tspan fontSize="18" dy="-22" fill="#7a4a26">{octave}</tspan></text>

        {/* needle */}
        <line x1={cx} y1={cy} x2={tip.x} y2={tip.y} stroke="#b81e0e" strokeWidth="2.5" strokeLinecap="round" style={{ transition: 'all .12s cubic-bezier(.2,.7,.3,1)' }}/>
        <line x1={cx} y1={cy} x2={p(ang + 180, 22).x} y2={p(ang + 180, 22).y} stroke="#b81e0e" strokeWidth="3" strokeLinecap="round" style={{ transition: 'all .12s' }}/>
        <circle cx={cx} cy={cy} r="9" fill="url(#bgt-brassShine)" stroke="rgba(0,0,0,0.4)" strokeWidth="0.6"/>
        <circle cx={cx - 2} cy={cy - 2} r="2.5" fill="rgba(255,232,160,0.8)"/>

        {/* glass reflection */}
        <path d={`M ${cx - 70} ${cy - 70} Q ${cx} ${cy - 40} ${cx + 60} ${cy - 80}`} fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="10" opacity="0.25" strokeLinecap="round"/>
      </svg>
    </div>
  );
};

const SemaphoreMeter: React.FC<MeterProps> = ({ cents, locked }) => {
  const pct = Math.max(-1, Math.min(1, cents / 50));
  // arm angle: 0 = horizontal (in tune), negative tilts up (sharp), positive down (flat)
  const armAng = pct * 55;
  const lamp = locked ? '#7aff86' : cents < 0 ? '#f0c14a' : '#f06a4a';
  return (
    <div style={{ width: 220, height: 230, margin: '0 auto', position: 'relative' }}>
      <svg viewBox="0 0 220 230" width="220" height="230">
        {/* post */}
        <rect x="100" y="20" width="14" height="200" rx="3" fill="url(#bgt-brassShine)" stroke="rgba(20,10,0,0.4)" strokeWidth="0.6"/>
        <rect x="96" y="208" width="22" height="14" rx="2" fill="#3a2415"/>
        {/* finial */}
        <circle cx="107" cy="18" r="7" fill="url(#bgt-brassShine)" stroke="rgba(20,10,0,0.4)" strokeWidth="0.5"/>
        {/* pivot */}
        <circle cx="107" cy="70" r="6" fill="#2a1808"/>
        {/* the signal arm */}
        <g style={{ transform: `rotate(${armAng}deg)`, transformOrigin: '107px 70px', transition: 'transform .16s cubic-bezier(.2,.7,.3,1)' }}>
          <rect x="107" y="62" width="96" height="16" rx="2" fill="#b81e0e" stroke="#5a0c04" strokeWidth="0.8"/>
          {/* white stripe + notch */}
          <rect x="180" y="64" width="3" height="12" fill="#f4ecd6"/>
          <path d="M 203 62 L 196 70 L 203 78 Z" fill="#2a1808"/>
        </g>
        {/* lamp housing */}
        <circle cx="107" cy="120" r="16" fill="#1a1208" stroke="url(#bgt-brassShine)" strokeWidth="3"/>
        <circle cx="107" cy="120" r="10" fill={lamp} style={{ transition: 'fill .2s' }} opacity="0.95"/>
        <circle cx="107" cy="120" r="16" fill="none" stroke={lamp} strokeWidth="2" opacity={locked ? 0.5 : 0.2} style={{ filter: 'blur(3px)' }}/>
        {/* labels */}
        <text x="150" y="36" textAnchor="middle" fontFamily="JetBrains Mono, monospace" fontSize="8" fill="rgba(239,226,192,0.55)" letterSpacing="1">▲ SHARP</text>
        <text x="150" y="200" textAnchor="middle" fontFamily="JetBrains Mono, monospace" fontSize="8" fill="rgba(239,226,192,0.55)" letterSpacing="1">▼ FLAT</text>
        <text x="40" y="74" textAnchor="middle" fontFamily="JetBrains Mono, monospace" fontSize="8" fill={locked ? '#7aff86' : 'rgba(239,226,192,0.45)'} letterSpacing="1" style={{ transition: 'fill .2s' }}>CLEAR</text>
      </svg>
    </div>
  );
};

const MasonJarMeter: React.FC<MeterProps> = ({ cents, locked, note, octave, freq }) => {
  const W = 200, H = 250;
  const pct = Math.max(-1, Math.min(1, cents / 50));
  // liquid level: center band = in tune. higher = sharp.
  const midY = 150;
  const level = midY - pct * 70;
  return (
    <div style={{ width: W, height: H, margin: '0 auto', position: 'relative' }}>
      <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H}>
        <defs>
          <linearGradient id="bgt-shine" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="rgba(255,255,255,0.45)"/>
            <stop offset="30%" stopColor="rgba(255,255,255,0.05)"/>
            <stop offset="100%" stopColor="rgba(120,90,40,0.1)"/>
          </linearGradient>
          <linearGradient id="bgt-shineLiquid" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#e8b531"/>
            <stop offset="100%" stopColor="#c0850f"/>
          </linearGradient>
          <clipPath id="bgt-jarClip"><path d="M44 60 Q44 52 52 52 L148 52 Q156 52 156 60 L156 222 Q156 236 142 236 L58 236 Q44 236 44 222 Z"/></clipPath>
        </defs>
        {/* lid band */}
        <rect x="46" y="34" width="108" height="22" rx="4" fill="url(#bgt-brassShine)" stroke="rgba(20,10,0,0.4)" strokeWidth="0.8"/>
        <rect x="50" y="38" width="100" height="3" fill="rgba(20,10,0,0.2)"/>
        {/* jar glass */}
        <path d="M44 60 Q44 52 52 52 L148 52 Q156 52 156 60 L156 222 Q156 236 142 236 L58 236 Q44 236 44 222 Z" fill="rgba(180,200,180,0.18)" stroke="rgba(202,160,82,0.6)" strokeWidth="2"/>
        {/* liquid */}
        <g clipPath="url(#bgt-jarClip)">
          <rect x="40" y={level} width="120" height={240 - level} fill="url(#bgt-shineLiquid)" style={{ transition: 'all .14s cubic-bezier(.2,.7,.3,1)' }}/>
          {/* meniscus */}
          <ellipse cx="100" cy={level} rx="58" ry="5" fill="#f0c24a" style={{ transition: 'all .14s' }}/>
          {/* bubbles */}
          <circle cx="80" cy={level + 30} r="2.5" fill="rgba(255,255,255,0.5)"/>
          <circle cx="115" cy={level + 55} r="2" fill="rgba(255,255,255,0.4)"/>
          <circle cx="95" cy={level + 80} r="1.6" fill="rgba(255,255,255,0.4)"/>
        </g>
        {/* in-tune band */}
        <rect x="44" y={midY - 6} width="112" height="12" fill="#6b8a3a" opacity={locked ? 0.4 : 0.15} style={{ transition: 'opacity .2s' }}/>
        <line x1="44" y1={midY} x2="156" y2={midY} stroke="#3a5d1e" strokeWidth="1" strokeDasharray="3 2" opacity="0.7"/>
        {/* measure ticks */}
        {[-40, -20, 0, 20, 40].map((c, i) => { const ty = midY - (c / 50) * 70; return <g key={i}><line x1="150" y1={ty} x2="156" y2={ty} stroke="#3a2415" strokeWidth="0.8" opacity="0.6"/><text x="148" y={ty + 3} textAnchor="end" fontFamily="JetBrains Mono, monospace" fontSize="7" fill="#3a2415" opacity="0.7">{c > 0 ? '+' + c : c}</text></g>; })}
        {/* glass highlight */}
        <rect x="52" y="60" width="10" height="170" rx="5" fill="url(#bgt-shine)"/>
        {/* embossed note on glass */}
        <text x="100" y="150" textAnchor="middle" fontFamily="DM Serif Display, serif" fontSize="62" fill={locked ? '#3a5d1e' : '#5a4318'} opacity="0.92" style={{ transition: 'fill .2s' }}>{note}</text>
        <text x="128" y="120" fontFamily="JetBrains Mono, monospace" fontSize="11" fill="#5a4318" opacity="0.8">{octave}</text>
        <text x="100" y="172" textAnchor="middle" fontFamily="JetBrains Mono, monospace" fontSize="7.5" fill="#5a4318" opacity="0.7" letterSpacing="1">{freq.toFixed(1)} Hz</text>
        {/* label */}
        <text x="100" y="206" textAnchor="middle" fontFamily="DM Serif Display, serif" fontStyle="italic" fontSize="8" fill="#5a4318" opacity="0.6">fill to the line</text>
      </svg>
    </div>
  );
};

const SundialMeter: React.FC<MeterProps> = ({ cents, locked, note, octave, freq }) => {
  const cx = 140, cy = 168, R = 124;
  const pct = Math.max(-1, Math.min(1, cents / 50));
  const shadowAng = pct * 75; // 0 = noon (straight up) = in tune
  const p = (deg: number, r: number) => { const a = (deg - 90) * Math.PI / 180; return { x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r }; };
  const sh = p(shadowAng, R - 14);
  return (
    <div style={{ width: 280, height: 230, margin: '0 auto' }}>
      <svg viewBox="0 0 280 230" width="280" height="230">
        <defs>
          <radialGradient id="bgt-stone" cx="45%" cy="30%" r="75%">
            <stop offset="0%" stopColor="#e7dcc2"/>
            <stop offset="70%" stopColor="#c8b58c"/>
            <stop offset="100%" stopColor="#a08c62"/>
          </radialGradient>
        </defs>
        {/* semicircular stone dial */}
        <path d={`M ${cx - R} ${cy} A ${R} ${R} 0 0 1 ${cx + R} ${cy} Z`} fill="url(#bgt-stone)" stroke="#7a6840" strokeWidth="2"/>
        <path d={`M ${cx - R + 8} ${cy} A ${R - 8} ${R - 8} 0 0 1 ${cx + R - 8} ${cy}`} fill="none" stroke="rgba(90,72,40,0.4)" strokeWidth="0.8"/>

        {/* hour lines (cents) */}
        {Array.from({ length: 11 }).map((_, i) => {
          const c = -50 + i * 10;
          const a = c * 75 / 50;
          const major = c % 25 === 0;
          const o1 = p(a, R - 6), o2 = p(a, R - (major ? 26 : 16));
          return <line key={i} x1={o1.x} y1={o1.y} x2={o2.x} y2={o2.y} stroke="#5a4318" strokeWidth={major ? 1.4 : 0.7} opacity={major ? 0.85 : 0.55}/>;
        })}
        {[-50, -25, 0, 25, 50].map((c, i) => { const a = c * 75 / 50; const q = p(a, R - 40); return <text key={i} x={q.x} y={q.y + 3} textAnchor="middle" fontFamily="DM Serif Display, serif" fontSize="11" fill="#5a4318">{c === 0 ? 'XII' : (c > 0 ? '+' + c : c)}</text>; })}

        {/* in-tune wedge at noon */}
        <path d={`M ${cx} ${cy} L ${p(-9, R - 6).x} ${p(-9, R - 6).y} A ${R - 6} ${R - 6} 0 0 1 ${p(9, R - 6).x} ${p(9, R - 6).y} Z`} fill="#9b7a1e" opacity={locked ? 0.3 : 0.12} style={{ transition: 'opacity .2s' }}/>

        {/* engraved note in face */}
        <text x={cx} y={cy - 30} textAnchor="middle" fontFamily="DM Serif Display, serif" fontSize="58" fill={locked ? '#6a7a2a' : '#5a4318'} style={{ transition: 'fill .2s' }}>{note}<tspan fontSize="18" dy="-20" fill="#7a6840">{octave}</tspan></text>
        <text x={cx} y={cy - 12} textAnchor="middle" fontFamily="JetBrains Mono, monospace" fontSize="8" fill="#5a4318" opacity="0.7" letterSpacing="1.5">{freq.toFixed(2)} Hz</text>

        {/* gnomon shadow */}
        <line x1={cx} y1={cy} x2={sh.x} y2={sh.y} stroke="#2a1808" strokeWidth="7" strokeLinecap="round" opacity="0.32" style={{ transition: 'all .14s cubic-bezier(.2,.7,.3,1)' }}/>
        {/* gnomon (brass triangle) */}
        <path d={`M ${cx} ${cy} L ${cx} ${cy - 70} L ${cx + 8} ${cy} Z`} fill="url(#bgt-brassShine)" stroke="rgba(20,10,0,0.4)" strokeWidth="0.5"/>
        <circle cx={cx} cy={cy} r="5" fill="#5a4318"/>

        {/* motto */}
        <text x={cx} y={cy + 24} textAnchor="middle" fontFamily="DM Serif Display, serif" fontStyle="italic" fontSize="9" fill="#5a4318" opacity="0.6">tune while the sun shines</text>
      </svg>
    </div>
  );
};

const MetronomeMeter: React.FC<MeterProps> = ({ cents, locked }) => {
  const pct = Math.max(-1, Math.min(1, cents / 50));
  const ang = pct * 28;
  return (
    <div style={{ width: 240, height: 250, margin: '0 auto' }}>
      <svg viewBox="0 0 240 250" width="240" height="250">
        <defs>
          <linearGradient id="bgt-mahog" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#6b2f1a"/>
            <stop offset="50%" stopColor="#4a1d0e"/>
            <stop offset="100%" stopColor="#35130a"/>
          </linearGradient>
        </defs>
        {/* pyramid body */}
        <path d="M 78 26 L 162 26 L 196 234 L 44 234 Z" fill="url(#bgt-mahog)" stroke="#2a0e06" strokeWidth="1.5"/>
        {/* face inset */}
        <path d="M 88 38 L 152 38 L 180 222 L 60 222 Z" fill="#f3e9c9" stroke="#caa052" strokeWidth="1.5"/>
        {/* cents scale ticks (fan) */}
        {[-50, -37.5, -25, -12.5, 0, 12.5, 25, 37.5, 50].map((c, i) => {
          const a = (c / 50) * 28 * Math.PI / 180;
          const x1 = 120 + Math.sin(a) * 120, y1 = 210 - Math.cos(a) * 120;
          const x2 = 120 + Math.sin(a) * 132, y2 = 210 - Math.cos(a) * 132;
          const major = c % 25 === 0;
          return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#3a2415" strokeWidth={major ? 1.4 : 0.7} opacity={major ? 0.85 : 0.55}/>;
        })}
        {[-50, 0, 50].map((c, i) => {
          const a = (c / 50) * 28 * Math.PI / 180;
          const x = 120 + Math.sin(a) * 108, y = 210 - Math.cos(a) * 108;
          return <text key={i} x={x} y={y + 3} textAnchor="middle" fontFamily="JetBrains Mono, monospace" fontSize="9" fill={c === 0 ? '#9b3221' : '#3a2415'}>{c > 0 ? '+50' : c < 0 ? '-50' : '0'}</text>;
        })}
        {/* in-tune slot */}
        <rect x="117" y="78" width="6" height="56" rx="3" fill="#6b8a3a" opacity={locked ? 0.45 : 0.15} style={{ transition: 'opacity .2s' }}/>

        {/* wand */}
        <g style={{ transform: `rotate(${ang}deg)`, transformOrigin: '120px 210px', transition: 'transform .14s cubic-bezier(.2,.7,.3,1)' }}>
          <line x1="120" y1="210" x2="120" y2="56" stroke="#8a6a2e" strokeWidth="3.5" strokeLinecap="round"/>
          {/* sliding weight */}
          <path d="M 110 96 L 130 96 L 126 116 L 114 116 Z" fill="url(#bgt-brassShine)" stroke="rgba(20,10,0,0.45)" strokeWidth="0.8"/>
        </g>
        {/* pivot escutcheon */}
        <circle cx="120" cy="210" r="8" fill="url(#bgt-brassShine)" stroke="rgba(20,10,0,0.4)" strokeWidth="0.8"/>
        {/* base trim */}
        <rect x="40" y="232" width="160" height="10" rx="3" fill="url(#bgt-brassEdge)"/>
        {/* maker */}
        <text x="120" y="58" textAnchor="middle" fontFamily="DM Serif Display, serif" fontStyle="italic" fontSize="7" fill="#3a2415" opacity="0.55">Tempo di Bluegrass</text>
      </svg>
    </div>
  );
};

const BalanceMeter: React.FC<MeterProps> = ({ cents, locked }) => {
  const pct = Math.max(-1, Math.min(1, cents / 50));
  const tilt = pct * 14; // beam angle: sharp side (right) drops when sharp
  const rad = tilt * Math.PI / 180;
  const cx = 130, cy = 80, arm = 92;
  const lx = cx - Math.cos(rad) * arm, ly = cy - Math.sin(rad) * arm;
  const rx = cx + Math.cos(rad) * arm, ry = cy + Math.sin(rad) * arm;
  const panY = 64;
  const Pan = ({ x, y, label }: { x: number; y: number; label: string }) => (
    <g style={{ transition: 'all .14s' }}>
      <line x1={x} y1={y} x2={x - 22} y2={y + panY} stroke="#8a6a2e" strokeWidth="1.2"/>
      <line x1={x} y1={y} x2={x + 22} y2={y + panY} stroke="#8a6a2e" strokeWidth="1.2"/>
      <path d={`M ${x - 28} ${y + panY} A 28 12 0 0 0 ${x + 28} ${y + panY} Z`} fill="url(#bgt-brassShine)" stroke="rgba(20,10,0,0.4)" strokeWidth="0.8"/>
      <text x={x} y={y + panY + 24} textAnchor="middle" fontFamily="DM Serif Display, serif" fontSize="14" fill="#9b3221">{label}</text>
    </g>
  );
  return (
    <div style={{ width: 260, height: 240, margin: '0 auto' }}>
      <svg viewBox="0 0 260 240" width="260" height="240">
        {/* column + base */}
        <rect x={cx - 5} y={cy} width="10" height="120" rx="3" fill="url(#bgt-brassEdge)"/>
        <path d={`M ${cx - 48} 226 Q ${cx} 206 ${cx + 48} 226 L ${cx + 48} 232 L ${cx - 48} 232 Z`} fill="url(#bgt-brassShine)" stroke="rgba(20,10,0,0.4)" strokeWidth="0.8"/>
        {/* finial pointer + in-tune mark */}
        <line x1={cx} y1={cy - 18} x2={cx} y2={cy - 34} stroke="#3a2415" strokeWidth="1" strokeDasharray="2 2" opacity="0.5"/>
        {/* beam */}
        <g style={{ transform: `rotate(${tilt}deg)`, transformOrigin: `${cx}px ${cy}px`, transition: 'transform .14s cubic-bezier(.2,.7,.3,1)' }}>
          <rect x={cx - arm} y={cy - 3.5} width={arm * 2} height="7" rx="3.5" fill="url(#bgt-brassShine)" stroke="rgba(20,10,0,0.4)" strokeWidth="0.7"/>
          {/* pointer needle above pivot */}
          <polygon points={`${cx},${cy - 30} ${cx - 4},${cy - 6} ${cx + 4},${cy - 6}`} fill={locked ? '#6b8a3a' : '#9b3221'} style={{ transition: 'fill .2s' }}/>
        </g>
        <Pan x={lx} y={ly} label="♭"/>
        <Pan x={rx} y={ry} label="♯"/>
        {/* pivot */}
        <circle cx={cx} cy={cy} r="7" fill="#3a2415"/>
        <circle cx={cx - 1.5} cy={cy - 1.5} r="2" fill="rgba(255,232,160,0.6)"/>
        {/* legend */}
        <text x={cx} y="222" textAnchor="middle" fontFamily="JetBrains Mono, monospace" fontSize="8" fill="#3a2415" opacity="0.6" letterSpacing="1.5">LEVEL BEAM = TRUE PITCH</text>
      </svg>
    </div>
  );
};

const PlumbBobMeter: React.FC<MeterProps> = ({ cents, locked }) => {
  const pct = Math.max(-1, Math.min(1, cents / 50));
  const ang = pct * 24;
  return (
    <div style={{ width: 240, height: 250, margin: '0 auto' }}>
      <svg viewBox="0 0 240 250" width="240" height="250">
        {/* mounting bracket */}
        <rect x="92" y="8" width="56" height="14" rx="3" fill="url(#bgt-brassShine)" stroke="rgba(20,10,0,0.4)" strokeWidth="0.8"/>
        <circle cx="120" cy="15" r="3" fill="#2a1808"/>
        {/* true-vertical reference */}
        <line x1="120" y1="22" x2="120" y2="218" stroke="#6b8a3a" strokeWidth="1" strokeDasharray="3 4" opacity={locked ? 0.8 : 0.35} style={{ transition: 'opacity .2s' }}/>
        {/* ground scale */}
        <line x1="30" y1="218" x2="210" y2="218" stroke="#3a2415" strokeWidth="1.5"/>
        {Array.from({ length: 11 }).map((_, i) => {
          const c = -50 + i * 10;
          const x = 120 + (c / 50) * 78;
          const major = c % 25 === 0;
          return <g key={i}>
            <line x1={x} y1="218" x2={x} y2={218 - (major ? 12 : 7)} stroke="#3a2415" strokeWidth={major ? 1.2 : 0.6} opacity="0.75"/>
            {major && <text x={x} y="234" textAnchor="middle" fontFamily="JetBrains Mono, monospace" fontSize="8" fill="#3a2415" opacity="0.7">{c > 0 ? '+' + c : c}</text>}
          </g>;
        })}
        {/* string + bob */}
        <g style={{ transform: `rotate(${ang}deg)`, transformOrigin: '120px 15px', transition: 'transform .16s cubic-bezier(.2,.7,.3,1)' }}>
          <line x1="120" y1="22" x2="120" y2="158" stroke="#5a4318" strokeWidth="1.4"/>
          {/* brass teardrop bob */}
          <path d="M 120 158 C 104 168 102 184 110 196 C 114 203 126 203 130 196 C 138 184 136 168 120 158 Z" fill="url(#bgt-brassShine)" stroke="rgba(20,10,0,0.45)" strokeWidth="0.8"/>
          <path d="M 116 200 L 124 200 L 120 212 Z" fill="#3a2415"/>
          {/* knurl band */}
          <rect x="108" y="178" width="24" height="4" fill="rgba(60,30,0,0.35)"/>
        </g>
        <text x="120" y="246" textAnchor="middle" fontFamily="DM Serif Display, serif" fontStyle="italic" fontSize="9" fill="#3a2415" opacity="0.6">hangs true when in tune</text>
      </svg>
    </div>
  );
};

const MoonDialMeter: React.FC<MeterProps> = ({ cents, locked }) => {
  const pct = Math.max(-1, Math.min(1, cents / 50));
  const R = 74, cx = 130, cy = 110;
  // shadow disc slides off as you approach tune; side = flat/sharp
  const off = pct * R * 2.1;
  return (
    <div style={{ width: 260, height: 230, margin: '0 auto' }}>
      <svg viewBox="0 0 260 230" width="260" height="230">
        <defs>
          <radialGradient id="bgt-moonG" cx="42%" cy="36%" r="72%">
            <stop offset="0%" stopColor="#f7eecb"/>
            <stop offset="70%" stopColor="#e3cf96"/>
            <stop offset="100%" stopColor="#c2a35e"/>
          </radialGradient>
          <clipPath id="bgt-moonClip"><circle cx={cx} cy={cy} r={R}/></clipPath>
        </defs>
        {/* stars */}
        {[[26, 32], [54, 90], [38, 160], [222, 40], [204, 120], [232, 170], [120, 16], [176, 22]].map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r={i % 3 ? 1.2 : 1.8} fill="#f0e2bf" opacity={0.5 + (i % 3) * 0.18}/>
        ))}
        {/* moon */}
        <circle cx={cx} cy={cy} r={R} fill="url(#bgt-moonG)"/>
        {/* craters */}
        <circle cx={cx - 24} cy={cy - 16} r="9" fill="rgba(120,90,40,0.18)"/>
        <circle cx={cx + 18} cy={cy + 22} r="13" fill="rgba(120,90,40,0.14)"/>
        <circle cx={cx + 30} cy={cy - 28} r="6" fill="rgba(120,90,40,0.16)"/>
        {/* shadow disc */}
        <g clipPath="url(#bgt-moonClip)">
          <circle cx={cx + off} cy={cy} r={R + 4} fill="#141022" opacity="0.94" style={{ transition: 'all .16s cubic-bezier(.2,.7,.3,1)' }}/>
        </g>
        <circle cx={cx} cy={cy} r={R} fill="none" stroke="#caa052" strokeWidth="1.2" opacity="0.7"/>
        {/* halo when locked */}
        {locked && <circle cx={cx} cy={cy} r={R + 9} fill="none" stroke="#f0e2bf" strokeWidth="1.5" opacity="0.5"/>}
        {/* phase labels */}
        <text x="30" y={cy + 4} textAnchor="middle" fontFamily="DM Serif Display, serif" fontSize="13" fill="#caa052">♭</text>
        <text x="230" y={cy + 4} textAnchor="middle" fontFamily="DM Serif Display, serif" fontSize="13" fill="#caa052">♯</text>
        <text x={cx} y="216" textAnchor="middle" fontFamily="JetBrains Mono, monospace" fontSize="8.5" fill="#caa052" opacity="0.75" letterSpacing="2">FULL MOON = IN TUNE</text>
      </svg>
    </div>
  );
};

const HighStrikerMeter: React.FC<MeterProps> = ({ cents, locked }) => {
  const closeness = 1 - Math.min(1, Math.abs(cents) / 50); // 0..1
  const H = 180, baseY = 222, topY = baseY - H;
  const puckY = baseY - 12 - closeness * (H - 34);
  const side = cents < -3 ? 'flat' : cents > 3 ? 'sharp' : 'in';
  return (
    <div style={{ width: 240, height: 260, margin: '0 auto' }}>
      <svg viewBox="0 0 240 260" width="240" height="260">
        {/* bell */}
        <path d={`M 120 ${topY - 18} C 104 ${topY - 18} 100 ${topY - 2} 98 ${topY + 2} L 142 ${topY + 2} C 140 ${topY - 2} 136 ${topY - 18} 120 ${topY - 18} Z`} fill="url(#bgt-brassShine)" stroke="rgba(20,10,0,0.45)" strokeWidth="0.8"/>
        <circle cx="120" cy={topY + 5} r="2.5" fill="#3a2415"/>
        {locked && <>
          <circle cx="120" cy={topY - 8} r="22" fill="none" stroke="#f0d57f" strokeWidth="1.5" opacity="0.6"/>
          <text x="158" y={topY - 10} fontFamily="DM Serif Display, serif" fontStyle="italic" fontSize="13" fill="#f0d57f">ding!</text>
        </>}
        {/* tower */}
        <rect x="112" y={topY + 4} width="16" height={H + 6} fill="#9b3221" stroke="#5a0c04" strokeWidth="1"/>
        {/* candy stripes */}
        {Array.from({ length: 9 }).map((_, i) => (
          <rect key={i} x="112" y={topY + 8 + i * 20} width="16" height="9" fill="#f4ecd6" opacity="0.9"/>
        ))}
        {/* side scale */}
        {[0, 25, 50, 75, 100].map((v, i) => {
          const y = baseY - 12 - (v / 100) * (H - 34);
          return <g key={i}>
            <line x1="134" y1={y} x2="142" y2={y} stroke="#3a2415" strokeWidth="1" opacity="0.6"/>
            <text x="146" y={y + 3} fontFamily="JetBrains Mono, monospace" fontSize="7" fill="#3a2415" opacity="0.65">{v}</text>
          </g>;
        })}
        {/* puck */}
        <rect x="106" y={puckY} width="28" height="12" rx="3" fill="url(#bgt-brassShine)" stroke="rgba(20,10,0,0.5)" strokeWidth="0.8" style={{ transition: 'y .14s cubic-bezier(.2,.7,.3,1)' }}/>
        {/* base + mallet pad */}
        <rect x="84" y={baseY} width="72" height="14" rx="4" fill="#5a3418" stroke="#2a1208" strokeWidth="1"/>
        <ellipse cx="120" cy={baseY + 2} rx="22" ry="5" fill="#7a4a26"/>
        {/* direction hints */}
        <text x="58" y="130" textAnchor="middle" fontFamily="DM Serif Display, serif" fontSize="13" fill={side === 'flat' ? '#9b3221' : 'rgba(58,36,21,0.35)'} style={{ transition: 'fill .2s' }}>♭ low</text>
        <text x="190" y="130" textAnchor="middle" fontFamily="DM Serif Display, serif" fontSize="13" fill={side === 'sharp' ? '#9b3221' : 'rgba(58,36,21,0.35)'} style={{ transition: 'fill .2s' }}>high ♯</text>
        <text x="120" y="254" textAnchor="middle" fontFamily="JetBrains Mono, monospace" fontSize="8" fill="#3a2415" opacity="0.6" letterSpacing="1.5">RING THE BELL — DEAD IN TUNE</text>
      </svg>
    </div>
  );
};

const LanternMeter: React.FC<MeterProps> = ({ cents, locked }) => {
  const pct = Math.max(-1, Math.min(1, cents / 50));
  const lean = pct * 32;
  return (
    <div style={{ width: 240, height: 250, margin: '0 auto' }}>
      <svg viewBox="0 0 240 250" width="240" height="250">
        <defs>
          <radialGradient id="bgt-flameG" cx="50%" cy="75%" r="65%">
            <stop offset="0%" stopColor="#fff3c0"/>
            <stop offset="45%" stopColor="#f5b53a"/>
            <stop offset="100%" stopColor="#c2570f"/>
          </radialGradient>
          <radialGradient id="bgt-lampGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(245,181,58,0.5)"/>
            <stop offset="100%" stopColor="rgba(245,181,58,0)"/>
          </radialGradient>
        </defs>
        {/* ambient glow */}
        <ellipse cx="120" cy="120" rx="105" ry="95" fill="url(#bgt-lampGlow)" opacity={locked ? 1 : 0.6} style={{ transition: 'opacity .3s' }}/>
        {/* top cap + hanger */}
        <path d="M 120 8 L 128 18 L 112 18 Z" fill="url(#bgt-brassShine)"/>
        <path d="M 96 26 Q 120 12 144 26 L 138 38 L 102 38 Z" fill="url(#bgt-brassShine)" stroke="rgba(20,10,0,0.4)" strokeWidth="0.7"/>
        {/* glass chimney */}
        <path d="M 100 40 C 96 70 92 96 92 122 C 92 158 100 172 120 172 C 140 172 148 158 148 122 C 148 96 144 70 140 40 Z"
          fill="rgba(255,235,180,0.14)" stroke="rgba(202,160,82,0.7)" strokeWidth="1.5"/>
        {/* glass highlight */}
        <path d="M 104 48 C 101 76 98 100 98 122 C 98 148 102 160 110 166" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="4" strokeLinecap="round"/>
        {/* flame — leans with cents */}
        <g style={{ transform: `rotate(${lean}deg)`, transformOrigin: '120px 150px', transition: 'transform .18s cubic-bezier(.2,.7,.3,1)' }}>
          <path d="M 120 92 C 130 112 136 128 134 140 C 132 152 126 156 120 156 C 114 156 108 152 106 140 C 104 128 110 112 120 92 Z" fill="url(#bgt-flameG)"/>
          <path d="M 120 116 C 125 126 127 134 126 140 C 125 147 122 149 120 149 C 118 149 115 147 114 140 C 113 134 115 126 120 116 Z" fill="#fff3c0" opacity="0.85"/>
        </g>
        {/* burner + wick */}
        <rect x="112" y="154" width="16" height="10" rx="2" fill="#3a2415"/>
        <rect x="104" y="162" width="32" height="8" rx="3" fill="url(#bgt-brassShine)" stroke="rgba(20,10,0,0.4)" strokeWidth="0.6"/>
        {/* oil font */}
        <path d="M 96 170 C 88 178 84 188 84 196 C 84 212 100 220 120 220 C 140 220 156 212 156 196 C 156 188 152 178 144 170 Z" fill="url(#bgt-brassShine)" stroke="rgba(20,10,0,0.45)" strokeWidth="0.8"/>
        {/* knob */}
        <circle cx="158" cy="186" r="7" fill="url(#bgt-brassShine)" stroke="rgba(20,10,0,0.4)" strokeWidth="0.6"/>
        <line x1="153" y1="186" x2="163" y2="186" stroke="rgba(20,10,0,0.5)" strokeWidth="1.4"/>
        {/* lean scale */}
        <text x="56" y="120" textAnchor="middle" fontFamily="DM Serif Display, serif" fontSize="13" fill={pct < -0.06 ? '#f0d57f' : 'rgba(240,213,127,0.35)'} style={{ transition: 'fill .2s' }}>♭</text>
        <text x="184" y="120" textAnchor="middle" fontFamily="DM Serif Display, serif" fontSize="13" fill={pct > 0.06 ? '#f0d57f' : 'rgba(240,213,127,0.35)'} style={{ transition: 'fill .2s' }}>♯</text>
        <text x="120" y="242" textAnchor="middle" fontFamily="JetBrains Mono, monospace" fontSize="8" fill="rgba(240,226,191,0.6)" letterSpacing="1.5">A STEADY FLAME BURNS TRUE</text>
      </svg>
    </div>
  );
};

// ── Big serif note readout (Heirloom / Studio) ──
const NoteReadout: React.FC<{ note: string; octave: number; locked: boolean; tone: 'paper' | 'dark' | 'pearl' }> = ({ note, octave, locked, tone }) => {
  const ink = tone === 'pearl' ? '#4a1d52' : tone === 'paper' ? '#1a1108' : '#efe2c0';
  const muted = tone === 'pearl' ? 'rgba(74,29,82,0.55)' : tone === 'paper' ? 'rgba(26,17,8,0.55)' : 'rgba(239,226,192,0.55)';
  const big = tone === 'pearl' ? '#a83478' : tone === 'dark' ? '#f0d57f' : ink;
  const accent = locked ? '#6b8a3a' : (tone === 'pearl' ? '#b03a86' : tone === 'paper' ? '#9b3221' : '#f0d57f');
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 4 }}>
      <span style={{ fontFamily: '"DM Serif Display", Georgia, serif', fontSize: tone === 'dark' ? 96 : 78, lineHeight: 0.88, color: locked ? accent : big, letterSpacing: -2, transition: 'color .2s' }}>{note}</span>
      <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 16, color: muted }}>{octave}</span>
    </div>
  );
};

const STATUS: Record<Cabinet, { name: string; sub: string }> = {
  heirloom: { name: 'Heirloom', sub: 'Walnut · Cream Paper · VU Needle' },
  studio: { name: 'Studio', sub: 'Rosewood · Brass · Strobe Tape' },
  workshop: { name: 'Workshop', sub: 'Oak · Green Felt · Concentric Dial' },
  happygirl: { name: 'Happy Girl', sub: 'Lavender · Pearl · Magenta Needle' },
  "festival": { name: "Festival", sub: "Mustard · Letterpress · Printer's Fist" },
  "pocket-watch": { name: "Pocket Watch", sub: "Brass Case · Enamel · Sweep Hand" },
  "hymnal": { name: "Hymnal", sub: "Aged Page · Staff · Drifting Note" },
  "radio": { name: "Radio", sub: "Bakelite · Amber Dial · Slide-Rule" },
  "split-flap": { name: "Split-Flap", sub: "Departure Board · Mechanical Flaps" },
  "banjo-head": { name: "Banjo Head", sub: "Mylar Drum · Tension Hooks" },
  "weathervane": { name: "Weathervane", sub: "Copper Compass · Rooster Vane" },
  "apothecary": { name: "Apothecary", sub: "Glass · Mercury Thermometer" },
  "oscilloscope": { name: "Oscilloscope", sub: "Phosphor CRT · Bakelite" },
  "spirit-level": { name: "Spirit Level", sub: "Carpenter's Vial · Bubble" },
  "turntable": { name: "Turntable", sub: "Vinyl · Tonearm · Strobe Dots" },
  "pressure-gauge": { name: "Pressure Gauge", sub: "Brass · Steam Dial" },
  "semaphore": { name: "Semaphore", sub: "Railroad Signal · Arm" },
  "mason-jar": { name: "Mason Jar", sub: "Glass · Liquid Level" },
  "sundial": { name: "Sundial", sub: "Gnomon · Shadow Angle" },
  "metronome": { name: "Metronome", sub: "Mahogany Pyramid · Brass Wand" },
  "balance": { name: "Balance Scale", sub: "Brass Pans · Tipping Beam" },
  "plumb-bob": { name: "Plumb Bob", sub: "Brass Bob · True Vertical" },
  "moon-dial": { name: "Moon Dial", sub: "Night Sky · Moon Phase" },
  "high-striker": { name: "High Striker", sub: "Carnival · Ring the Bell" },
  "lantern": { name: "Lantern", sub: "Oil Lamp · Steady Flame" },
};

// ──────────────────────────────────────────────────────────────
const EXTRA_METERS: Record<string, { Meter: React.FC<MeterProps>; tone: 'paper' | 'dark'; selfNote: boolean }> = {
  "festival": { Meter: FestivalMeter, tone: 'paper', selfNote: false },
  "pocket-watch": { Meter: PocketWatchMeter, tone: 'dark', selfNote: true },
  "hymnal": { Meter: HymnalMeter, tone: 'paper', selfNote: false },
  "radio": { Meter: RadioMeter, tone: 'dark', selfNote: true },
  "split-flap": { Meter: SplitFlapMeter, tone: 'dark', selfNote: true },
  "banjo-head": { Meter: BanjoHeadMeter, tone: 'dark', selfNote: true },
  "weathervane": { Meter: WeathervaneMeter, tone: 'paper', selfNote: true },
  "apothecary": { Meter: ApothecaryMeter, tone: 'paper', selfNote: false },
  "oscilloscope": { Meter: OscilloscopeMeter, tone: 'dark', selfNote: false },
  "spirit-level": { Meter: SpiritLevelMeter, tone: 'dark', selfNote: false },
  "turntable": { Meter: TurntableMeter, tone: 'dark', selfNote: true },
  "pressure-gauge": { Meter: PressureGauge, tone: 'dark', selfNote: true },
  "semaphore": { Meter: SemaphoreMeter, tone: 'dark', selfNote: false },
  "mason-jar": { Meter: MasonJarMeter, tone: 'paper', selfNote: true },
  "sundial": { Meter: SundialMeter, tone: 'paper', selfNote: true },
  "metronome": { Meter: MetronomeMeter, tone: 'paper', selfNote: false },
  "balance": { Meter: BalanceMeter, tone: 'paper', selfNote: false },
  "plumb-bob": { Meter: PlumbBobMeter, tone: 'paper', selfNote: false },
  "moon-dial": { Meter: MoonDialMeter, tone: 'dark', selfNote: false },
  "high-striker": { Meter: HighStrikerMeter, tone: 'paper', selfNote: false },
  "lantern": { Meter: LanternMeter, tone: 'dark', selfNote: false },
};

const TunerGauge: React.FC<TunerGaugeProps> = ({ noteData, cabinet = 'heirloom' }) => {
  const listening = !noteData || noteData.frequency === -1;
  const cents = listening ? 0 : noteData!.centsOff;
  const locked = !listening && Math.abs(cents) < 5;
  const note = listening ? '--' : noteData!.note;
  const octave = listening ? 0 : noteData!.octave;
  const freq = listening ? -1 : noteData!.frequency;
  const target = listening ? 0 : noteData!.perfectFrequency;
  const meter: MeterProps = { cents, locked, note, octave, freq: freq < 0 ? 0 : freq, target };

  const ListeningTag = (
    <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 10, letterSpacing: 2, opacity: 0.6 }}>LISTENING…</span>
  );

  if (cabinet === 'heirloom') {
    return (
      <div style={{ position: 'relative', width: 300, borderRadius: 22, background: '#2a1608', padding: 12, boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>
        <TextureDefs />
        <div style={{ position: 'absolute', inset: 0, borderRadius: 22, overflow: 'hidden' }}><WoodTexture intensity={0.55} /></div>
        <div style={{
          position: 'relative', borderRadius: 14, padding: '18px 14px 16px',
          background: 'linear-gradient(180deg, #f6ecca 0%, #efe2c0 60%, #e0cc94 100%)',
          boxShadow: 'inset 0 0 0 1px #caa052, inset 0 0 0 4px #2a1608, inset 0 0 30px rgba(120,80,30,0.15)',
          overflow: 'hidden', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
        }}>
          <PaperTexture intensity={0.5} />
          <div style={{ transform: 'scale(0.95)', transformOrigin: 'center top' }}><NeedleMeter {...meter} /></div>
          {listening ? <div style={{ color: '#3a2415' }}>{ListeningTag}</div> : <NoteReadout note={note} octave={octave} locked={locked} tone="paper" />}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <CentsChip cents={cents} locked={locked} tone="paper" />
            <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 10, color: 'rgba(26,17,8,0.55)', letterSpacing: 1 }}>
              {freq > 0 ? freq.toFixed(2) : '--'} Hz · TGT {target > 0 ? target.toFixed(2) : '--'}
            </span>
          </div>
          <BrassScrew size={10} style={{ position: 'absolute', top: 8, left: 8 }} />
          <BrassScrew size={10} style={{ position: 'absolute', top: 8, right: 8 }} />
          <BrassScrew size={10} style={{ position: 'absolute', bottom: 8, left: 8 }} />
          <BrassScrew size={10} style={{ position: 'absolute', bottom: 8, right: 8 }} />
        </div>
      </div>
    );
  }

  if (cabinet === 'happygirl') {
    return (
      <div style={{ position: 'relative', width: 300, borderRadius: 22, background: 'linear-gradient(160deg, #5a2d72 0%, #3a1a52 100%)', padding: 12, boxShadow: '0 10px 30px rgba(60,20,80,0.45)' }}>
        <TextureDefs />
        <div style={{
          position: 'relative', borderRadius: 14, padding: '18px 14px 16px',
          background: 'linear-gradient(180deg, #fdf3fb 0%, #f1ddf3 60%, #e3c4ea 100%)',
          boxShadow: 'inset 0 0 0 1px #d6a6cf, inset 0 0 0 4px #5a2d72, inset 0 0 30px rgba(140,70,150,0.15)',
          overflow: 'hidden', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
        }}>
          <PaperTexture intensity={0.35} />
          <div style={{ transform: 'scale(0.95)', transformOrigin: 'center top' }}><NeedleMeter {...meter} variant="pearl" /></div>
          {listening ? <div style={{ color: '#5a2d62' }}>{ListeningTag}</div> : <NoteReadout note={note} octave={octave} locked={locked} tone="pearl" />}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <CentsChip cents={cents} locked={locked} tone="pearl" />
            <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 10, color: 'rgba(74,29,82,0.55)', letterSpacing: 1 }}>
              {freq > 0 ? freq.toFixed(2) : '--'} Hz · TGT {target > 0 ? target.toFixed(2) : '--'}
            </span>
          </div>
          {/* pearl corner studs */}
          {[[8,8],[8,null],[null,8],[null,null]].map((_, i) => (
            <div key={i} style={{ position: 'absolute', top: i < 2 ? 8 : undefined, bottom: i >= 2 ? 8 : undefined, left: i % 2 === 0 ? 8 : undefined, right: i % 2 === 1 ? 8 : undefined, width: 9, height: 9, borderRadius: 9, background: 'radial-gradient(circle at 35% 30%, #ffffff, #e9b8e0 60%, #b06aa6)' }} />
          ))}
        </div>
      </div>
    );
  }

  if (cabinet === 'studio') {
    return (
      <div style={{
        position: 'relative', width: 320, borderRadius: 22, padding: '18px 14px 16px',
        background: 'radial-gradient(120% 80% at 50% 0%, #4a1f12 0%, #2a0e08 60%, #1a0805 100%)',
        boxShadow: '0 10px 30px rgba(0,0,0,0.55)', overflow: 'hidden',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, color: '#efe2c0',
      }}>
        <TextureDefs />
        <WoodTexture intensity={0.5} />
        <div style={{
          position: 'relative', alignSelf: 'stretch', margin: '0 28px', padding: '6px 10px', borderRadius: 4,
          background: 'linear-gradient(180deg, #caa052 0%, #8a6a2e 100%)', textAlign: 'center',
          boxShadow: 'inset 0 1px 0 rgba(255,232,160,0.5), inset 0 -1px 0 rgba(0,0,0,0.4), 0 1px 3px rgba(0,0,0,0.5)',
          fontFamily: '"DM Serif Display", serif', fontSize: 11, letterSpacing: 2, color: '#2a1608', textTransform: 'uppercase',
        }}>Bluegrass Tuner Co.</div>
        {listening ? ListeningTag : (
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 14 }}>
            <NoteReadout note={note} octave={0} locked={locked} tone="dark" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-start' }}>
              <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 18, color: '#caa052' }}>{octave}</span>
              <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 10, color: 'rgba(239,226,192,0.55)', letterSpacing: 1 }}>{freq > 0 ? freq.toFixed(2) : '--'} Hz</span>
              <CentsChip cents={cents} locked={locked} tone="dark" />
            </div>
          </div>
        )}
        <StrobeMeter cents={cents} locked={locked} />
      </div>
    );
  }

  const extra = EXTRA_METERS[cabinet];
  if (extra) {
    const { Meter, tone, selfNote } = extra;
    const txt = tone === 'paper' ? '#2a1808' : '#efe2c0';
    const subColor = tone === 'paper' ? 'rgba(26,17,8,0.55)' : 'rgba(239,226,192,0.55)';
    return (
      <div style={{ position: 'relative', width: '100%', maxWidth: 340, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, color: txt }}>
        <TextureDefs />
        {listening ? (
          <div style={{ minHeight: 180, display: 'flex', alignItems: 'center' }}>{ListeningTag}</div>
        ) : (
          <>
            {!selfNote && <NoteReadout note={note} octave={octave} locked={locked} tone={tone} />}
            <Meter {...meter} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <CentsChip cents={cents} locked={locked} tone={tone} />
              <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 10, color: subColor, letterSpacing: 1 }}>
                {freq > 0 ? freq.toFixed(2) : '--'} Hz · TGT {target > 0 ? target.toFixed(2) : '--'}
              </span>
            </div>
          </>
        )}
      </div>
    );
  }

  // workshop
  return (
    <div style={{
      position: 'relative', width: 300, borderRadius: 22, padding: 14,
      background: 'linear-gradient(180deg, #8a5a2e 0%, #6b3d1c 60%, #4a2810 100%)',
      boxShadow: '0 10px 30px rgba(0,0,0,0.5)', overflow: 'hidden',
    }}>
      <TextureDefs />
      <WoodTexture intensity={0.45} />
      <div style={{
        position: 'relative', borderRadius: 18, padding: '16px 10px 14px', overflow: 'hidden',
        background: 'radial-gradient(120% 70% at 50% 40%, #3a5230 0%, #243a1c 70%, #14220e 100%)',
        boxShadow: 'inset 0 0 0 1px #caa052, inset 0 0 0 5px #4a2810, inset 0 0 0 6px #caa052, inset 0 0 60px rgba(0,0,0,0.45)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, color: '#efe2c0',
      }}>
        <FeltTexture intensity={0.7} />
        {listening
          ? <div style={{ height: 220, display: 'flex', alignItems: 'center' }}>{ListeningTag}</div>
          : <DialMeter {...meter} />}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: -6 }}>
          <CentsChip cents={cents} locked={locked} tone="dark" />
          <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 10, color: 'rgba(239,226,192,0.55)', letterSpacing: 1 }}>TGT {target > 0 ? target.toFixed(2) : '--'} Hz</span>
        </div>
      </div>
    </div>
  );
};

export { STATUS as CABINETS };
export default TunerGauge;
