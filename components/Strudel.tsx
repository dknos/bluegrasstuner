import React, { useEffect, useRef, useState } from 'react';
import { createStrudelBridge, StrudelBridge } from '../services/strudel-bridge';
import AudioViz from './AudioViz';
import StrudelExplore from './StrudelExplore';

// ──────────────────────────────────────────────────────────────────────────
// STRUDEL — live-coding pattern engine, wired to play OUR synths.
//   slice 1: native REPL (full @strudel/web engine, its own sounds)
//   slice 3: Strudel drives KNURL's physical-model drums (kk ks kh ko kc kt kr kp)
//            via a shared AudioContext + sample-accurate worklet scheduling
//   + a friendly layer: instrument palette, building-block snippets, tempo slider
//
// Strudel is AGPL-3.0-or-later; bundling it makes this site AGPL (source link below).
// ──────────────────────────────────────────────────────────────────────────

interface Props { onClose: () => void; }

type StrudelMod = {
  initStrudel: (opts?: any) => void;
  evaluate: (code: string) => Promise<unknown>;
  hush: () => void;
  getAudioContext: () => AudioContext;
  getAnalyzerData: (type?: 'time' | 'frequency', id?: number | string) => Float32Array;
  registerSound: (key: string, onTrigger: any, data?: any) => void;
  samples: (url: any, base?: any, opts?: any) => Promise<void>;
};
// module-scoped singletons (survive remounts; engine + sounds registered once)
let mod: StrudelMod | null = null;
let inited = false;
let bridge: StrudelBridge | null = null;

const ANALYZE = 'all(x => x.analyze(1))\n';

const PRESETS: { name: string; code: string }[] = [
  {
    name: 'knurl beat',
    code: `setcps(0.9)
stack(
  s("kk*2, ~ ks, kh*8"),
  s("~ ~ ~ kc").gain(.8)
)`,
  },
  {
    name: 'knurl + bass',
    code: `setcps(1)
stack(
  s("kk ks kk ks, kh*8?"),
  note("c2 c2 g1 a1").s("sawtooth").lpf(700).room(.2)
)`,
  },
  {
    name: 'broken',
    code: `setcps(0.95)
stack(
  s("kk ~ [~ kk] ks, kh*8, ~ ~ kt ~"),
  s("kp*16?").gain(.4)
).sometimesBy(.25, x => x.fast(2))`,
  },
  {
    name: 'glassy (native)',
    code: `setcps(0.7)
stack(
  note("<0 2 4 7>".add("<0 12>")).scale("C:minor:pentatonic")
    .s("triangle").gain(.6).delay(.4).room(.6),
  s("kh*16?").gain(.4)
)`,
  },
];

// instrument palette — our KNURL drums (inserted as tokens into a pattern)
const SNIPPETS: { label: string; code: string }[] = [
  { label: '+ drums', code: 's("kk*2, ~ ks, kh*8")' },
  { label: '+ bass', code: 'note("c2 c2 g1 a1").s("sawtooth").lpf(700)' },
  { label: '+ melody', code: 'note("0 2 4 7".scale("C:minor")).s("triangle").delay(.3)' },
];

const Strudel: React.FC<Props> = ({ onClose }) => {
  const taRef = useRef<HTMLTextAreaElement | null>(null);
  const mountedRef = useRef(true);
  const codeRef = useRef<string>(PRESETS[0].code);
  const bridgeRef = useRef<StrudelBridge | null>(null);

  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [code, setCode] = useState(PRESETS[0].code);
  const [err, setErr] = useState<string | null>(null);
  const [preset, setPreset] = useState(PRESETS[0].name);
  const [tempo, setTempo] = useState(0.9);
  const [drums, setDrums] = useState<{ name: string; label: string }[]>([]);
  const [showExplore, setShowExplore] = useState(false);

  useEffect(() => {
    mountedRef.current = true;
    (async () => {
      try {
        if (!mod) mod = (await import('@strudel/web')) as unknown as StrudelMod;
        if (!inited) {
          // mirror strudel.cc's prebake so .bank("RolandTR909"), piano, vcsl, gm_*
          // all resolve (the community tracks rely on these). Manifests are light;
          // individual samples still stream on first use. Each load fails soft.
          const CDN = 'https://strudel.b-cdn.net';
          mod.initStrudel({
            prebake: async () => {
              const ld = (a: string, b?: string, o?: any) => mod!.samples(a, b, o).catch((e) => console.warn('prebake', a, e));
              await Promise.all([
                ld(`${CDN}/tidal-drum-machines.json`, `${CDN}/tidal-drum-machines/machines/`, { prebake: true, tag: 'drum-machines' }),
                ld(`${CDN}/piano.json`, `${CDN}/piano/`, { prebake: true }),
                ld(`${CDN}/vcsl.json`, `${CDN}/VCSL/`, { prebake: true }),
                ld(`${CDN}/uzu-drumkit.json`, `${CDN}/uzu-drumkit/`, { prebake: true, tag: 'drum-machines' }),
                ld('github:tidalcycles/dirt-samples'),
                (async () => { try { const sf: any = await import('@strudel/soundfonts'); await sf.registerSoundfonts?.(); } catch (e) { console.warn('soundfonts unavailable', e); } })(),
              ]);
            },
          });
          inited = true;
        }
        // build the bridge on Strudel's OWN context (shared clock = tight timing)
        if (!bridge) bridge = await createStrudelBridge(mod);
        bridgeRef.current = bridge;
        if (mountedRef.current) { setDrums(bridge.sounds); setReady(true); }
      } catch (e: any) {
        console.error('Strudel failed to load', e);
        if (mountedRef.current) setLoadError(String(e?.message || e));
      }
    })();

    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === 'Escape') { onClose(); return; }
      if ((ev.ctrlKey || ev.metaKey) && ev.key === 'Enter') { ev.preventDefault(); run(); }
      if ((ev.ctrlKey || ev.metaKey) && ev.key === '.') { ev.preventDefault(); stop(); }
    };
    window.addEventListener('keydown', onKey);

    return () => {
      mountedRef.current = false;
      window.removeEventListener('keydown', onKey);
      try { mod?.hush(); } catch {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const run = async () => {
    if (!mod || !ready) return;
    try {
      setErr(null);
      await mod.getAudioContext().resume();
      await mod.evaluate(ANALYZE + codeRef.current);
      setPlaying(true);
    } catch (e: any) { setErr(String(e?.message || e)); }
  };
  const stop = () => { try { mod?.hush(); } catch {} setPlaying(false); };

  const onCode = (v: string) => { setCode(v); codeRef.current = v; setPreset(''); };

  // load a track's code from the Explore panel into the editor (user hits Run)
  const loadTrack = (c: string, _title: string) => {
    setCode(c); codeRef.current = c; setPreset(''); setErr(null); setShowExplore(false);
  };
  // load a sample bank (samples('github:…')) — the click is the audio gesture
  const loadSampleBank = async (repo: string) => {
    if (!mod) throw new Error('engine not ready');
    await mod.getAudioContext().resume();
    await mod.samples(repo);
  };
  const loadPreset = (p: { name: string; code: string }) => {
    setCode(p.code); codeRef.current = p.code; setPreset(p.name); setErr(null);
    const m = p.code.match(/setcps\(([\d.]+)\)/); if (m) setTempo(parseFloat(m[1]));
  };

  // insert text at the textarea cursor (palette tokens / snippets)
  const insertAtCursor = (text: string) => {
    const ta = taRef.current;
    if (!ta) { const next = codeRef.current + text; setCode(next); codeRef.current = next; return; }
    const start = ta.selectionStart ?? code.length, end = ta.selectionEnd ?? code.length;
    const next = code.slice(0, start) + text + code.slice(end);
    setCode(next); codeRef.current = next; setPreset('');
    requestAnimationFrame(() => { ta.focus(); const p = start + text.length; ta.setSelectionRange(p, p); });
  };
  const insertLine = (text: string) => {
    const base = codeRef.current.replace(/\s*$/, '');
    const next = base + '\n' + text;
    setCode(next); codeRef.current = next; setPreset('');
  };

  // tempo slider edits the leading setcps() line, re-runs if playing
  const changeTempo = (v: number) => {
    setTempo(v);
    const lines = codeRef.current.split('\n');
    if (/^\s*setcps\(/.test(lines[0])) lines[0] = `setcps(${v})`;
    else lines.unshift(`setcps(${v})`);
    const next = lines.join('\n');
    setCode(next); codeRef.current = next;
    if (playing) run();
  };

  const sub = (s: string) => <span style={{ color: 'rgba(143,209,122,0.5)' }}>{s}</span>;

  return (
    <div role="dialog" aria-modal="true" aria-label="Strudel live coding"
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4" style={{ background: 'rgba(4,6,4,0.85)' }}>
      <div className="relative w-full max-w-4xl h-[92vh] rounded-2xl overflow-hidden flex flex-col"
        style={{ background: 'linear-gradient(180deg,#0b0f0b,#060806)', boxShadow: '0 24px 70px rgba(0,0,0,0.6)', border: '1px solid rgba(143,209,122,0.25)' }}>

        {/* header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b" style={{ borderColor: 'rgba(143,209,122,0.18)' }}>
          <span className="text-xl font-bold tracking-[0.3em]" style={{ color: '#8fd17a', fontFamily: '"JetBrains Mono",monospace' }}>STRUDEL</span>
          <span className="text-[10px] font-mono hidden md:inline" style={{ color: 'rgba(143,209,122,0.5)' }}>live patterns · plays KNURL drums</span>
          <div className="ml-auto flex items-center gap-2">
            <button onClick={run} disabled={!ready} className="px-3 py-1.5 rounded text-[12px] font-bold font-mono"
              style={{ background: ready ? '#8fd17a' : '#2a352a', color: ready ? '#08120a' : '#5a6a5a', cursor: ready ? 'pointer' : 'default' }}>▶ run {sub('⌘↵')}</button>
            <button onClick={stop} className="px-3 py-1.5 rounded text-[12px] font-bold font-mono"
              style={{ background: '#241a1a', color: '#e6b0a0', border: '1px solid rgba(168,71,42,0.4)' }}>■ hush</button>
            <button onClick={onClose} aria-label="Close" className="text-2xl leading-none ml-1" style={{ color: 'rgba(143,209,122,0.6)' }}>×</button>
          </div>
        </div>

        {/* toolbar: tempo + presets */}
        <div className="flex items-center gap-3 px-4 py-2 border-b overflow-x-auto" style={{ borderColor: 'rgba(143,209,122,0.1)' }}>
          <span className="text-[9px] font-mono shrink-0" style={{ color: 'rgba(143,209,122,0.45)' }}>{playing ? '● playing' : '○ idle'}</span>
          <label className="flex items-center gap-1.5 shrink-0">
            <span className="text-[9px] font-mono" style={{ color: 'rgba(143,209,122,0.5)' }}>tempo</span>
            <input type="range" min={0.3} max={2} step={0.05} value={tempo} onChange={(e) => changeTempo(parseFloat(e.target.value))}
              className="w-20" style={{ accentColor: '#8fd17a' }} aria-label="tempo (cps)" />
            <span className="text-[9px] font-mono tabular-nums" style={{ color: '#cdeac0' }}>{tempo.toFixed(2)}</span>
          </label>
          <button onClick={() => setShowExplore(true)} className="shrink-0 px-2.5 py-1 rounded text-[10px] font-mono font-bold"
            style={{ background: 'rgba(202,160,82,0.2)', color: '#e6cf95', border: '1px solid rgba(202,160,82,0.4)' }}>⊕ explore</button>
          <div className="flex gap-1.5">
            {PRESETS.map((p) => (
              <button key={p.name} onClick={() => loadPreset(p)} aria-pressed={preset === p.name}
                className="shrink-0 px-2.5 py-1 rounded-full text-[10px] font-mono whitespace-nowrap"
                style={{ background: preset === p.name ? 'rgba(143,209,122,0.22)' : 'rgba(255,255,255,0.05)', color: preset === p.name ? '#cdeac0' : 'rgba(255,255,255,0.55)' }}>{p.name}</button>
            ))}
          </div>
          {!ready && !loadError && <span className="ml-auto text-[10px] font-mono shrink-0" style={{ color: '#caa052' }}>loading engine…</span>}
          {loadError && <span className="ml-auto text-[10px] font-mono shrink-0 text-red-400">load failed: {loadError}</span>}
        </div>

        {/* palette: KNURL drums (tap to insert) + snippet blocks */}
        <div className="flex items-center gap-2 px-4 py-2 border-b overflow-x-auto" style={{ borderColor: 'rgba(143,209,122,0.1)' }}>
          <span className="text-[9px] font-mono shrink-0" style={{ color: '#caa052' }}>KNURL ▸</span>
          {drums.map((d) => (
            <button key={d.name} onClick={() => insertAtCursor(d.name + ' ')} title={d.label}
              className="shrink-0 px-2 py-1 rounded text-[10px] font-mono"
              style={{ background: 'rgba(202,160,82,0.15)', color: '#e6cf95', border: '1px solid rgba(202,160,82,0.3)' }}>{d.name}<span className="opacity-50 ml-1 hidden sm:inline">{d.label}</span></button>
          ))}
          <span className="w-px h-4 shrink-0" style={{ background: 'rgba(143,209,122,0.2)' }} />
          {SNIPPETS.map((s) => (
            <button key={s.label} onClick={() => insertLine(s.code)}
              className="shrink-0 px-2 py-1 rounded text-[10px] font-mono"
              style={{ background: 'rgba(143,209,122,0.12)', color: '#cdeac0' }}>{s.label}</button>
          ))}
        </div>

        {/* editor + scope */}
        <div className="flex-1 flex flex-col min-h-0">
          <textarea ref={taRef} value={code} onChange={(e) => onCode(e.target.value)} spellCheck={false}
            className="flex-1 w-full resize-none p-4 outline-none"
            style={{ background: 'transparent', color: '#cdeac0', fontFamily: '"JetBrains Mono",monospace', fontSize: 14, lineHeight: 1.6, caretColor: '#8fd17a' }}
            aria-label="Strudel code editor" />
          {err && <div className="px-4 py-1.5 text-[11px] font-mono text-red-300 border-t" style={{ borderColor: 'rgba(168,71,42,0.3)', background: 'rgba(40,16,16,0.5)' }}>⚠ {err}</div>}
          <div className="shrink-0 px-4 pt-2" style={{ borderTop: '1px solid rgba(143,209,122,0.12)' }}>
            <AudioViz getAnalyser={() => bridgeRef.current?.analyser ?? null}
              getNativeFreq={() => { try { return mod?.getAnalyzerData('frequency', 1) ?? null; } catch { return null; } }}
              height={140} />
          </div>
        </div>

        {/* AGPL §13 source notice */}
        <div className="shrink-0 flex items-center justify-between px-4 py-1.5 text-[9px] font-mono border-t"
          style={{ borderColor: 'rgba(143,209,122,0.12)', color: 'rgba(143,209,122,0.4)' }}>
          <span>powered by Strudel (AGPL-3.0) · ⌘↵ run · ⌘. hush</span>
          <a href="https://github.com/dknos/bluegrasstuner" target="_blank" rel="noreferrer" style={{ color: 'rgba(143,209,122,0.7)', textDecoration: 'underline' }}>source</a>
        </div>

        {showExplore && <StrudelExplore onClose={() => setShowExplore(false)} onLoad={loadTrack} loadSample={loadSampleBank} />}
      </div>
    </div>
  );
};

export default Strudel;
