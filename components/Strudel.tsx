import React, { useEffect, useRef, useState } from 'react';

// ──────────────────────────────────────────────────────────────────────────
// STRUDEL — live-coding pattern engine embedded in the site.
// Slice 1 of 3: native REPL (the full @strudel/web engine, its own sounds),
// lazy-loaded so it never touches the main bundle until you open it. Proves
// the foundation slices 2 (WebGPU visualizer) and 3 (drive KNURL/RESINX) need:
//   • bundles in Vite        • taps the AudioContext analyser  • runs patterns
//
// Strudel is AGPL-3.0-or-later. Bundling it makes this site AGPL too; the
// source link in the footer satisfies the AGPL §13 network-use obligation.
// ──────────────────────────────────────────────────────────────────────────

interface Props { onClose: () => void; }

// lazily-loaded @strudel/web surface (kept off the main bundle)
type StrudelMod = {
  initStrudel: (opts?: any) => void;
  evaluate: (code: string) => Promise<unknown>;
  hush: () => void;
  getAudioContext: () => AudioContext;
  getAnalyzerData: (type?: 'time' | 'frequency', id?: number | string) => Float32Array;
  samples: (url: string) => Promise<void>;
};
let mod: StrudelMod | null = null;
let inited = false;

// auto-tap every played pattern into analyser id 1 so the visualizer has data
const ANALYZE = 'all(x => x.analyze(1))\n';

const PRESETS: { name: string; code: string }[] = [
  {
    name: 'boom bap',
    code: `setcps(0.92)
stack(
  s("bd*2, ~ sd, hh*8?"),
  note("<c2 c2 g1 a1>").s("sawtooth").lpf(560).room(.25)
)`,
  },
  {
    name: 'acid',
    code: `setcps(1.1)
note("c1 eb1 g1 c2 bb1 g1 eb1 d1".fast(2))
  .s("sawtooth").lpf(sine.range(300,1800).slow(4))
  .resonance(18).distort(1.2).room(.2)`,
  },
  {
    name: 'glassy',
    code: `setcps(0.7)
stack(
  note("<0 2 4 7>".scale("C:minor:pentatonic").add(note("<0 12>")))
    .s("triangle").gain(.6).delay(.4).delaytime(.166).room(.6),
  s("hh*16?").gain(.4)
)`,
  },
  {
    name: 'breakbeat',
    code: `setcps(1.0)
s("bd sd, hh*8, ~ ~ ~ cp")
  .sometimesBy(.3, x => x.fast(2))
  .room(.15)`,
  },
];

const Strudel: React.FC<Props> = ({ onClose }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef(0);
  const dprRef = useRef(1);
  const mountedRef = useRef(true);
  const codeRef = useRef<string>(PRESETS[0].code);

  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [code, setCode] = useState(PRESETS[0].code);
  const [err, setErr] = useState<string | null>(null);
  const [preset, setPreset] = useState(PRESETS[0].name);

  // load + init the engine once (lazy chunk)
  useEffect(() => {
    mountedRef.current = true;
    (async () => {
      try {
        if (!mod) mod = (await import('@strudel/web')) as unknown as StrudelMod;
        if (!inited) {
          // default synths are registered by initStrudel; add the classic dirt
          // drum samples (loaded from a CDN — the one runtime network dependency)
          mod.initStrudel({ prebake: () => mod!.samples('github:tidalcycles/dirt-samples') });
          inited = true;
        }
        if (mountedRef.current) setReady(true);
      } catch (e: any) {
        console.error('Strudel failed to load', e);
        if (mountedRef.current) setLoadError(String(e?.message || e));
      }
    })();

    const draw = () => {
      rafRef.current = requestAnimationFrame(draw);
      const cv = canvasRef.current; if (!cv || !mod) return;
      const c = cv.getContext('2d'); if (!c) return;
      const dpr = dprRef.current;
      c.setTransform(dpr, 0, 0, dpr, 0, 0);
      const w = cv.width / dpr, h = cv.height / dpr;
      c.fillStyle = '#070b07'; c.fillRect(0, 0, w, h);
      // baseline grid
      c.strokeStyle = 'rgba(143,209,122,0.08)'; c.lineWidth = 1;
      c.beginPath(); c.moveTo(0, h / 2); c.lineTo(w, h / 2); c.stroke();
      let data: Float32Array | null = null;
      try { data = mod.getAnalyzerData('time', 1); } catch { data = null; }
      if (data && data.length) {
        c.strokeStyle = '#8fd17a'; c.lineWidth = 2; c.shadowColor = '#8fd17a'; c.shadowBlur = 8;
        c.beginPath();
        for (let i = 0; i < data.length; i++) {
          const x = (i / data.length) * w;
          const y = h / 2 + (data[i] || 0) * h * 0.45;
          i ? c.lineTo(x, y) : c.moveTo(x, y);
        }
        c.stroke(); c.shadowBlur = 0;
      }
    };
    rafRef.current = requestAnimationFrame(draw);

    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === 'Escape') { onClose(); return; }
      if ((ev.ctrlKey || ev.metaKey) && ev.key === 'Enter') { ev.preventDefault(); run(); }
      if ((ev.ctrlKey || ev.metaKey) && ev.key === '.') { ev.preventDefault(); stop(); }
    };
    window.addEventListener('keydown', onKey);

    return () => {
      mountedRef.current = false;
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('keydown', onKey);
      try { mod?.hush(); } catch {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // DPR-aware canvas
  useEffect(() => {
    const cv = canvasRef.current; if (!cv) return;
    const ro = new ResizeObserver(() => {
      const r = cv.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      dprRef.current = dpr;
      cv.width = Math.max(1, Math.floor(r.width * dpr));
      cv.height = Math.max(1, Math.floor(r.height * dpr));
    });
    ro.observe(cv);
    return () => ro.disconnect();
  }, []);

  const run = async () => {
    if (!mod || !ready) return;
    try {
      setErr(null);
      await mod.getAudioContext().resume();
      await mod.evaluate(ANALYZE + codeRef.current);
      setPlaying(true);
    } catch (e: any) {
      setErr(String(e?.message || e));
    }
  };
  const stop = () => { try { mod?.hush(); } catch {} setPlaying(false); };

  const onCode = (v: string) => { setCode(v); codeRef.current = v; setPreset(''); };
  const loadPreset = (p: { name: string; code: string }) => {
    setCode(p.code); codeRef.current = p.code; setPreset(p.name); setErr(null);
  };

  return (
    <div role="dialog" aria-modal="true" aria-label="Strudel live coding"
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4" style={{ background: 'rgba(4,6,4,0.85)' }}>
      <div className="relative w-full max-w-4xl h-[92vh] rounded-2xl overflow-hidden flex flex-col"
        style={{ background: 'linear-gradient(180deg,#0b0f0b,#060806)', boxShadow: '0 24px 70px rgba(0,0,0,0.6)', border: '1px solid rgba(143,209,122,0.25)' }}>

        {/* header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b" style={{ borderColor: 'rgba(143,209,122,0.18)' }}>
          <span className="text-xl font-bold tracking-[0.3em]" style={{ color: '#8fd17a', fontFamily: '"JetBrains Mono",monospace' }}>STRUDEL</span>
          <span className="text-[10px] font-mono hidden sm:inline" style={{ color: 'rgba(143,209,122,0.5)' }}>live-coding patterns · slice 1/3: native REPL</span>
          <div className="ml-auto flex items-center gap-2">
            <button onClick={run} disabled={!ready}
              className="px-3 py-1.5 rounded text-[12px] font-bold font-mono"
              style={{ background: ready ? '#8fd17a' : '#2a352a', color: ready ? '#08120a' : '#5a6a5a', cursor: ready ? 'pointer' : 'default' }}>
              ▶ run <span className="opacity-60">⌘↵</span>
            </button>
            <button onClick={stop} className="px-3 py-1.5 rounded text-[12px] font-bold font-mono"
              style={{ background: '#241a1a', color: '#e6b0a0', border: '1px solid rgba(168,71,42,0.4)' }}>■ hush</button>
            <button onClick={onClose} aria-label="Close" className="text-2xl leading-none ml-1" style={{ color: 'rgba(143,209,122,0.6)' }}>×</button>
          </div>
        </div>

        {/* status / presets */}
        <div className="flex items-center gap-2 px-4 py-2 border-b overflow-x-auto" style={{ borderColor: 'rgba(143,209,122,0.1)' }}>
          <span className="text-[9px] font-mono shrink-0" style={{ color: 'rgba(143,209,122,0.45)' }}>{playing ? '● playing' : '○ idle'}</span>
          <div className="flex gap-1.5">
            {PRESETS.map((p) => (
              <button key={p.name} onClick={() => loadPreset(p)} aria-pressed={preset === p.name}
                className="shrink-0 px-2.5 py-1 rounded-full text-[10px] font-mono whitespace-nowrap"
                style={{ background: preset === p.name ? 'rgba(143,209,122,0.22)' : 'rgba(255,255,255,0.05)', color: preset === p.name ? '#cdeac0' : 'rgba(255,255,255,0.55)' }}>
                {p.name}
              </button>
            ))}
          </div>
          {!ready && !loadError && <span className="ml-auto text-[10px] font-mono shrink-0" style={{ color: '#caa052' }}>loading engine…</span>}
          {loadError && <span className="ml-auto text-[10px] font-mono shrink-0 text-red-400">load failed: {loadError}</span>}
        </div>

        {/* editor + scope */}
        <div className="flex-1 flex flex-col min-h-0">
          <textarea
            value={code} onChange={(e) => onCode(e.target.value)} spellCheck={false}
            className="flex-1 w-full resize-none p-4 outline-none"
            style={{ background: 'transparent', color: '#cdeac0', fontFamily: '"JetBrains Mono",monospace', fontSize: 14, lineHeight: 1.6, caretColor: '#8fd17a' }}
            aria-label="Strudel code editor"
          />
          {err && <div className="px-4 py-1.5 text-[11px] font-mono text-red-300 border-t" style={{ borderColor: 'rgba(168,71,42,0.3)', background: 'rgba(40,16,16,0.5)' }}>⚠ {err}</div>}
          <div className="shrink-0 px-4 pt-2" style={{ borderTop: '1px solid rgba(143,209,122,0.12)' }}>
            <canvas ref={canvasRef} style={{ width: '100%', height: 70, display: 'block' }} />
          </div>
        </div>

        {/* AGPL §13 source notice */}
        <div className="shrink-0 flex items-center justify-between px-4 py-1.5 text-[9px] font-mono border-t"
          style={{ borderColor: 'rgba(143,209,122,0.12)', color: 'rgba(143,209,122,0.4)' }}>
          <span>powered by Strudel (AGPL-3.0)</span>
          <a href="https://github.com/dknos/bluegrasstuner" target="_blank" rel="noreferrer" style={{ color: 'rgba(143,209,122,0.7)', textDecoration: 'underline' }}>source</a>
        </div>
      </div>
    </div>
  );
};

export default Strudel;
