
import React from 'react';
import { NoteData } from '../types';

export type Cabinet = 'heirloom' | 'studio' | 'workshop' | 'happygirl';

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
};

// ──────────────────────────────────────────────────────────────
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
