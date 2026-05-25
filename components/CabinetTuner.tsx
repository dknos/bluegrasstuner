import React from 'react';
import { NoteData, TuningDefinition } from '../types';
import TunerGauge, { Cabinet, CABINETS } from './TunerGauge';

// ──────────────────────────────────────────────────────────────
// Mobile-first vintage "cabinet" tuner screen. Wraps the existing
// (already cabinet-aware) TunerGauge meter with a wordmark, instrument
// tabs, a string row, and a toolbar — the full Claude design, wired to
// the app's real audio state. Audio capture stays in App.tsx; this is
// presentation only.
// ──────────────────────────────────────────────────────────────

type Tone = 'paper' | 'dark';

interface CabinetTunerProps {
  cabinet: Cabinet;
  instruments: string[];
  instrument: string;
  tuningKeys: string[];
  tuningName: string;
  tuning: TuningDefinition;
  noteData: NoteData | null;
  manualStringIndex: number | null;
  isListening: boolean;
  isToggling: boolean;
  isTuneByEar: boolean;
  deferredPrompt: any;
  onInstrument: (name: string) => void;
  onSelectTuning: (name: string) => void;
  onPickString: (index: number, freq: number) => void;
  onToggleListen: () => void;
  onToggleEar: () => void;
  onInstall: () => void;
  onOpenMenu: (type: 'charts' | 'tools', e: React.MouseEvent<HTMLButtonElement>) => void;
  onSelectCabinet: (c: Cabinet) => void;
}

// Palette per cabinet for the full-screen surface + vintage chrome.
const SKIN: Record<Cabinet, {
  tone: Tone; pageBg: string; ink: string; muted: string; accent: string; line: string; panel: string;
}> = {
  heirloom: {
    tone: 'paper',
    pageBg: 'radial-gradient(120% 90% at 50% 0%, #f3e8c8 0%, #e7d6ac 55%, #d8c290 100%)',
    ink: '#2a1808', muted: 'rgba(42,24,8,0.55)', accent: '#9b3221',
    line: 'rgba(42,24,8,0.18)', panel: 'rgba(255,250,235,0.35)',
  },
  studio: {
    tone: 'dark',
    pageBg: 'radial-gradient(120% 90% at 50% 0%, #3a1810 0%, #240d07 55%, #150704 100%)',
    ink: '#efe2c0', muted: 'rgba(239,226,192,0.55)', accent: '#caa052',
    line: 'rgba(239,226,192,0.16)', panel: 'rgba(0,0,0,0.22)',
  },
  workshop: {
    tone: 'dark',
    pageBg: 'radial-gradient(120% 90% at 50% 0%, #6b431f 0%, #4a2810 55%, #2e1808 100%)',
    ink: '#efe2c0', muted: 'rgba(239,226,192,0.55)', accent: '#caa052',
    line: 'rgba(239,226,192,0.16)', panel: 'rgba(0,0,0,0.22)',
  },
  happygirl: {
    tone: 'paper',
    pageBg: 'radial-gradient(120% 90% at 50% 0%, #f7e7f9 0%, #ecd2ee 55%, #dab6e2 100%)',
    ink: '#4a1d52', muted: 'rgba(74,29,82,0.55)', accent: '#b03a86',
    line: 'rgba(74,29,82,0.18)', panel: 'rgba(255,250,255,0.4)',
  },
};

// Swatch colors per cabinet for the picker.
const CABINET_SWATCH: Record<Cabinet, [string, string]> = {
  heirloom: ['#efe2c0', '#7a1d10'],
  studio: ['#2a0e08', '#caa052'],
  workshop: ['#243a1c', '#caa052'],
  happygirl: ['#e3c4ea', '#b03a86'],
};

const SERIF = '"DM Serif Display", Georgia, serif';
const MONO = '"JetBrains Mono", ui-monospace, monospace';

function parseNote(s: string): { name: string; oct: string } {
  const m = s.match(/^([A-G][b#]?)(\d)$/);
  if (!m) return { name: s, oct: '' };
  return { name: m[1].replace('b', '♭').replace('#', '♯'), oct: m[2] };
}

// Small six-point brass star
const Asterism: React.FC<{ color: string; size?: number }> = ({ color, size = 9 }) => (
  <svg width={size} height={size} viewBox="0 0 10 10" aria-hidden>
    <path d="M5 0 L5.7 3.8 L9.5 4.4 L6.5 6.6 L7.3 10 L5 7.8 L2.7 10 L3.5 6.6 L0.5 4.4 L4.3 3.8 Z" fill={color} />
  </svg>
);

const Wordmark: React.FC<{ s: typeof SKIN[Cabinet] }> = ({ s }) => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, lineHeight: 1 }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
      <Asterism color={s.accent} size={10} />
      <div style={{ fontFamily: SERIF, fontSize: 21, color: s.ink, letterSpacing: 1.5, textTransform: 'uppercase' }}>
        Bluegrass Tuner Co.
      </div>
      <Asterism color={s.accent} size={10} />
    </div>
    <div style={{ fontFamily: MONO, fontSize: 8.5, color: s.muted, letterSpacing: 1.5, textTransform: 'uppercase' }}>
      Made in St. Louis, MO ·{' '}
      <a href="https://github.com/dknos" target="_blank" rel="noopener noreferrer"
        style={{ color: s.accent, textDecoration: 'none' }}>@DKNOS</a>
    </div>
  </div>
);

// Display labels (the underlying instrument key stays as-is, e.g. "Violin").
const INSTRUMENT_LABEL: Record<string, string> = { Violin: 'Fiddle' };

const InstrumentTabs: React.FC<{ instruments: string[]; value: string; onChange: (n: string) => void; s: typeof SKIN[Cabinet] }> = ({ instruments, value, onChange, s }) => (
  <div style={{
    display: 'flex', gap: 0, overflowX: 'auto', maxWidth: '100%',
    borderTop: `0.5px solid ${s.line}`, borderBottom: `0.5px solid ${s.line}`,
    scrollbarWidth: 'none',
  }}>
    {instruments.map((k) => {
      const active = value === k;
      return (
        <button key={k} onClick={() => onChange(k)} style={{
          background: 'transparent', border: 'none', cursor: 'pointer',
          padding: '11px 14px 10px', flex: '0 0 auto', position: 'relative',
          fontFamily: SERIF, fontSize: 16, letterSpacing: 0.3,
          color: active ? s.ink : s.muted,
        }}>
          {INSTRUMENT_LABEL[k] || k}
          {active && <span style={{ position: 'absolute', bottom: -1, left: 10, right: 10, height: 2, background: s.accent }} />}
        </button>
      );
    })}
  </div>
);

const StringRow: React.FC<{
  tuning: TuningDefinition; manualStringIndex: number | null; detectedNote: string | null;
  onPick: (i: number, freq: number) => void; s: typeof SKIN[Cabinet];
}> = ({ tuning, manualStringIndex, onPick, s }) => (
  <div style={{ display: 'flex', gap: 6, width: '100%', justifyContent: 'center', flexWrap: 'wrap' }}>
    {tuning.notes.map((n, i) => {
      const active = manualStringIndex === n.stringNum;
      const p = parseNote(n.note);
      return (
        <button key={i} onClick={() => onPick(n.stringNum, n.freq)} style={{
          flex: '1 1 0', minWidth: 44, maxWidth: 70, border: 'none', cursor: 'pointer',
          background: active ? (s.tone === 'paper' ? 'rgba(255,250,235,0.7)' : 'rgba(255,232,160,0.12)') : 'transparent',
          padding: '8px 0 7px', borderRadius: 5,
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1,
          boxShadow: active ? `inset 0 0 0 1px ${s.accent}` : `inset 0 0 0 0.5px ${s.muted}`,
          transition: 'background .15s',
        }}>
          <span style={{ fontFamily: SERIF, fontSize: 21, color: active ? s.accent : s.ink, lineHeight: 1 }}>
            {p.name}<sub style={{ fontSize: 10, color: s.muted, marginLeft: 1 }}>{p.oct}</sub>
          </span>
          <span style={{ fontFamily: MONO, fontSize: 8.5, color: s.muted, letterSpacing: 0.4 }}>{n.freq.toFixed(1)}</span>
        </button>
      );
    })}
  </div>
);

const Toolbar: React.FC<{
  tuningName: string; onOpenTuning: () => void; isListening: boolean; isToggling: boolean;
  isTuneByEar: boolean; onToggleEar: () => void; onToggleListen: () => void; s: typeof SKIN[Cabinet];
}> = ({ tuningName, onOpenTuning, isListening, isToggling, isTuneByEar, onToggleEar, onToggleListen, s }) => (
  <div style={{
    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
    width: '100%', paddingTop: 14, borderTop: `0.5px dashed ${s.line}`,
  }}>
    <button onClick={onOpenTuning} style={{
      background: 'transparent', border: `1px solid ${s.line}`, borderRadius: 8, cursor: 'pointer', padding: '6px 10px',
      display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 2, minWidth: 0, flex: 1,
    }}>
      <span style={{ fontFamily: MONO, fontSize: 8, color: s.muted, letterSpacing: 1.2 }}>TUNING ▾</span>
      <span style={{ fontFamily: SERIF, fontSize: 15, color: s.ink, maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tuningName}</span>
    </button>

    <button onClick={onToggleEar} style={{
      background: isTuneByEar ? s.accent : 'transparent', cursor: 'pointer',
      border: `1px solid ${isTuneByEar ? s.accent : s.muted}`, borderRadius: 999, padding: '7px 12px',
      fontFamily: MONO, fontSize: 9, letterSpacing: 1, textTransform: 'uppercase',
      color: isTuneByEar ? (s.tone === 'paper' ? '#fff' : '#1a0d04') : s.muted,
    }}>{isTuneByEar ? 'Ear' : 'Mic'}</button>

    <button onClick={onToggleListen} disabled={isToggling} style={{
      cursor: isToggling ? 'wait' : 'pointer', border: 'none', borderRadius: 999,
      padding: '9px 18px', fontFamily: SERIF, fontSize: 15, letterSpacing: 0.5,
      background: isListening ? '#7a1d10' : (s.tone === 'paper' ? '#2a1608' : '#caa052'),
      color: isListening ? '#f0d57f' : (s.tone === 'paper' ? '#f0d57f' : '#2a1608'),
      boxShadow: '0 1px 0 rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.15)',
      opacity: isToggling ? 0.6 : 1, whiteSpace: 'nowrap',
    }}>{isToggling ? '…' : isListening ? '■ Stop' : '▶ Tune'}</button>
  </div>
);

const TopBar: React.FC<{
  s: typeof SKIN[Cabinet]; deferredPrompt: any; onInstall: () => void;
  onOpenMenu: (t: 'charts' | 'tools', e: React.MouseEvent<HTMLButtonElement>) => void; onOpenCabinets: () => void;
}> = ({ s, deferredPrompt, onInstall, onOpenMenu, onOpenCabinets }) => {
  const btn: React.CSSProperties = {
    background: 'transparent', border: `1px solid ${s.line}`, borderRadius: 8, cursor: 'pointer',
    padding: '6px 10px', fontFamily: MONO, fontSize: 9.5, letterSpacing: 0.8, textTransform: 'uppercase', color: s.muted,
  };
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: 8 }}>
      <Asterism color={s.accent} size={14} />
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        {deferredPrompt && <button onClick={onInstall} style={{ ...btn, color: s.accent, borderColor: s.accent }}>Install</button>}
        <button onClick={(e) => onOpenMenu('charts', e)} style={btn}>Charts</button>
        <button onClick={(e) => onOpenMenu('tools', e)} style={btn}>Tools</button>
        <button onClick={onOpenCabinets} style={btn}>Cabinet</button>
      </div>
    </div>
  );
};

// Tap-to-pick tuning list — mobile bottom sheet, vintage-styled per cabinet.
const TuningSheet: React.FC<{
  tunings: string[]; current: string; onSelect: (n: string) => void; onClose: () => void; s: typeof SKIN[Cabinet];
}> = ({ tunings, current, onSelect, onClose, s }) => (
  <div onClick={onClose} style={{
    position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.55)',
    backdropFilter: 'blur(2px)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: 14,
  }}>
    <div onClick={(e) => e.stopPropagation()} style={{
      width: '100%', maxWidth: 420, maxHeight: '70vh', overflowY: 'auto', borderRadius: 18, padding: '12px 8px 18px',
      background: s.tone === 'paper' ? 'linear-gradient(180deg,#f6ecca,#e7d6ac)' : 'linear-gradient(180deg,#2e1a0c,#180c05)',
      boxShadow: `0 -10px 44px rgba(0,0,0,0.55), inset 0 0 0 1px ${s.accent}`,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '2px 10px 10px' }}>
        <span style={{ fontFamily: SERIF, fontSize: 18, color: s.ink }}>Tuning</span>
        <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: s.muted, fontSize: 18, cursor: 'pointer', lineHeight: 1 }}>✕</button>
      </div>
      {tunings.map((t) => {
        const active = t === current;
        return (
          <button key={t} onClick={() => { onSelect(t); onClose(); }} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%',
            background: active ? (s.tone === 'paper' ? 'rgba(155,50,33,0.10)' : 'rgba(202,160,82,0.14)') : 'transparent',
            border: 'none', borderRadius: 8, padding: '13px 12px', cursor: 'pointer', marginBottom: 2,
          }}>
            <span style={{ fontFamily: SERIF, fontSize: 16, color: active ? s.accent : s.ink }}>{t}</span>
            {active && <span style={{ color: s.accent, fontSize: 11 }}>●</span>}
          </button>
        );
      })}
    </div>
  </div>
);

// Cabinet picker — same bottom-sheet style as the tuning list, tone-matched.
const CabinetSheet: React.FC<{
  current: Cabinet; onSelect: (c: Cabinet) => void; onClose: () => void; s: typeof SKIN[Cabinet];
}> = ({ current, onSelect, onClose, s }) => (
  <div onClick={onClose} style={{
    position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.55)',
    backdropFilter: 'blur(2px)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: 14,
  }}>
    <div onClick={(e) => e.stopPropagation()} style={{
      width: '100%', maxWidth: 420, maxHeight: '70vh', overflowY: 'auto', borderRadius: 18, padding: '12px 8px 18px',
      background: s.tone === 'paper' ? 'linear-gradient(180deg,#f6ecca,#e7d6ac)' : 'linear-gradient(180deg,#2e1a0c,#180c05)',
      boxShadow: `0 -10px 44px rgba(0,0,0,0.55), inset 0 0 0 1px ${s.accent}`,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '2px 10px 10px' }}>
        <span style={{ fontFamily: SERIF, fontSize: 18, color: s.ink }}>Cabinet</span>
        <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: s.muted, fontSize: 18, cursor: 'pointer', lineHeight: 1 }}>✕</button>
      </div>
      {(Object.keys(CABINETS) as Cabinet[]).map((cab) => {
        const active = cab === current;
        const sw = CABINET_SWATCH[cab];
        return (
          <button key={cab} onClick={() => { onSelect(cab); onClose(); }} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%',
            background: active ? (s.tone === 'paper' ? 'rgba(155,50,33,0.10)' : 'rgba(202,160,82,0.14)') : 'transparent',
            border: 'none', borderRadius: 8, padding: '11px 12px', cursor: 'pointer', marginBottom: 2, gap: 10,
          }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 1 }}>
              <span style={{ fontFamily: SERIF, fontSize: 16, color: active ? s.accent : s.ink }}>{CABINETS[cab].name}</span>
              <span style={{ fontFamily: MONO, fontSize: 8.5, color: s.muted, letterSpacing: 0.6, textTransform: 'uppercase' }}>{CABINETS[cab].sub}</span>
            </div>
            <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
              <span style={{ width: 16, height: 16, borderRadius: 16, background: sw[0], boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.2)' }} />
              <span style={{ width: 16, height: 16, borderRadius: 16, background: sw[1], boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.2)' }} />
              {active && <span style={{ color: s.accent, fontSize: 11, marginLeft: 4 }}>●</span>}
            </div>
          </button>
        );
      })}
    </div>
  </div>
);

const CabinetTuner: React.FC<CabinetTunerProps> = (p) => {
  const s = SKIN[p.cabinet];
  const [tuningOpen, setTuningOpen] = React.useState(false);
  const [cabinetOpen, setCabinetOpen] = React.useState(false);
  return (
    <div style={{
      minHeight: '100dvh', width: '100%', background: s.pageBg,
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      padding: '14px 16px 24px', boxSizing: 'border-box', overflowX: 'hidden',
    }}>
      <div style={{ width: '100%', maxWidth: 440, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
        <TopBar s={s} deferredPrompt={p.deferredPrompt} onInstall={p.onInstall} onOpenMenu={p.onOpenMenu} onOpenCabinets={() => setCabinetOpen(true)} />
        <Wordmark s={s} />
        <InstrumentTabs instruments={p.instruments} value={p.instrument} onChange={p.onInstrument} s={s} />
        <TunerGauge noteData={p.noteData} cabinet={p.cabinet} />
        <StringRow tuning={p.tuning} manualStringIndex={p.manualStringIndex} detectedNote={p.noteData?.note ?? null} onPick={p.onPickString} s={s} />
        <Toolbar
          tuningName={p.tuningName} onOpenTuning={() => setTuningOpen(true)}
          isListening={p.isListening} isToggling={p.isToggling}
          isTuneByEar={p.isTuneByEar} onToggleEar={p.onToggleEar} onToggleListen={p.onToggleListen} s={s}
        />
      </div>
      {tuningOpen && (
        <TuningSheet
          tunings={p.tuningKeys} current={p.tuningName}
          onSelect={p.onSelectTuning} onClose={() => setTuningOpen(false)} s={s}
        />
      )}
      {cabinetOpen && (
        <CabinetSheet
          current={p.cabinet} onSelect={p.onSelectCabinet} onClose={() => setCabinetOpen(false)} s={s}
        />
      )}
    </div>
  );
};

export default CabinetTuner;
