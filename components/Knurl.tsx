import React, { useEffect, useRef, useState } from 'react';
import { SynthShell, Knob, KnobRow, Engrave, PANEL } from './synthkit';
import {
  KnurlEngine, KITS, TRACK_NAMES, NUM_TRACKS, NUM_STEPS,
  TrackParams, TrackPattern, LockMap, starterPattern,
} from '../services/knurl';

interface Props { onClose: () => void; }

// per-track display hue for the grid + strike field
const HUE = (t: number) => Math.round((t / NUM_TRACKS) * 290 + 18);
// params a step can parameter-lock (per-hit, safe to vary). level/pan/noise/send stay track-global.
const LOCKABLE: (keyof LockMap)[] = ['freq', 'decay', 'material', 'snap', 'drive', 'tone'];
const semiToMul = (s: number) => Math.pow(2, s / 12);

const Knurl: React.FC<Props> = ({ onClose }) => {
  const ctxRef = useRef<AudioContext | null>(null);
  const engineRef = useRef<KnurlEngine | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef(0);
  const dprRef = useRef(1);
  const mountedRef = useRef(true);
  const readyRef = useRef(false);
  const reduceRef = useRef(false);
  const ampRef = useRef<number[]>(new Array(NUM_TRACKS).fill(0));

  // discrete UI state
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [bpm, setBpm] = useState(96);
  const [swing, setSwing] = useState(0);
  const [reverb, setReverb] = useState(0.18);
  const [drive, setDrive] = useState(1.0);
  const [volume, setVolume] = useState(0.9);
  const [kitIdx, setKitIdx] = useState(0);
  const [sel, setSel] = useState(0);                 // selected track
  const selRef = useRef(0);                          // live copy for the draw closure
  const [playStep, setPlayStep] = useState(-1);
  const [lockStep, setLockStep] = useState<number | null>(null);
  const [, force] = useState(0);

  // the editable pattern + per-track params (UI is source of truth, pushed to engine)
  const patRef = useRef<TrackPattern[]>(starterPattern());
  const tracksRef = useRef<TrackParams[]>(KITS[0].tracks.map((t) => ({ ...t })));
  const baseRef = useRef<number[]>(KITS[0].tracks.map((t) => t.freq)); // pitch-knob reference
  const tuneRef = useRef<number[]>(new Array(NUM_TRACKS).fill(0));     // semitone offsets

  // long-press detection for step lock-focus
  const pressTimer = useRef<number>(0);
  const longPressed = useRef(false);

  // ── init: engine + analyser-free strike-field rAF + global listeners ───────
  useEffect(() => {
    mountedRef.current = true;
    const mq = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    reduceRef.current = mq?.matches ?? false;
    const onMQ = () => { reduceRef.current = mq!.matches; };
    mq?.addEventListener?.('change', onMQ);

    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const eng = new KnurlEngine(ctx);
    eng.output.connect(ctx.destination);
    ctxRef.current = ctx;
    engineRef.current = eng;
    eng.whenReady().then(
      () => {
        if (!mountedRef.current) return;
        readyRef.current = true;
        eng.pushTracks(tracksRef.current);
        eng.pushPattern(patRef.current);
        eng.setTempo(bpm); eng.setSwing(swing);
        eng.setMaster({ gain: volume, drive, reverb });
        setReady(true);
      },
      (err) => { console.error('KNURL worklet failed', err); if (mountedRef.current) setLoadError(true); },
    );

    let lastStep = -1;
    const draw = (t: number) => {
      rafRef.current = requestAnimationFrame(draw);
      const cv = canvasRef.current, e = engineRef.current;
      if (!cv || !e) return;
      const c = cv.getContext('2d');
      if (!c) return;

      // playhead -> state only when it changes (cheap, ~10 renders/sec)
      const st = e.meter.step;
      if (st !== lastStep) { lastStep = st; setPlayStep(st); }

      const reduce = reduceRef.current;
      const amps = ampRef.current;
      const energy = e.meter.energy;
      let active = false;
      for (let i = 0; i < NUM_TRACKS; i++) {
        amps[i] += ((energy[i] || 0) - amps[i]) * 0.35;
        if (amps[i] > 0.01) active = true;
      }
      if (reduce && !active && st < 0) return;

      const dpr = dprRef.current;
      c.setTransform(dpr, 0, 0, dpr, 0, 0);
      const w = cv.width / dpr, h = cv.height / dpr;
      c.globalCompositeOperation = 'source-over';
      c.fillStyle = reduce ? '#0a0c08' : 'rgba(8,11,7,0.32)';
      c.fillRect(0, 0, w, h);
      c.globalCompositeOperation = 'lighter';

      // 8 struck bodies in a 4x2 grid; ring count = material, pulse = strike energy
      const cols = 4, rows = 2;
      const cw = w / cols, ch = h / rows;
      for (let tk = 0; tk < NUM_TRACKS; tk++) {
        const cx = (tk % cols) * cw + cw / 2;
        const cy = Math.floor(tk / cols) * ch + ch / 2;
        const a = amps[tk];
        const hue = HUE(tk);
        const mat = tracksRef.current[tk].material;
        const ringN = 2 + Math.round(mat * 5);
        const baseR = Math.min(cw, ch) * 0.16;
        const maxR = Math.min(cw, ch) * 0.46;
        for (let r = 0; r < ringN; r++) {
          const rr = baseR + (maxR - baseR) * (r / ringN) + a * maxR * 0.5 * Math.sin((r + 1) * 1.3);
          c.strokeStyle = `hsla(${hue},90%,${50 + a * 30}%,${(0.06 + a * 0.5) * (1 - r / (ringN + 1))})`;
          c.lineWidth = 1 + a * 2;
          c.beginPath(); c.arc(cx, cy, Math.max(1, rr), 0, Math.PI * 2); c.stroke();
        }
        if (a > 0.02) {
          const g = c.createRadialGradient(cx, cy, 0, cx, cy, maxR * (0.7 + a));
          g.addColorStop(0, `hsla(${hue},95%,68%,${0.12 + a * 0.5})`);
          g.addColorStop(1, 'hsla(0,0%,0%,0)');
          c.fillStyle = g; c.beginPath(); c.arc(cx, cy, maxR * (0.7 + a), 0, Math.PI * 2); c.fill();
        }
        // selected body gets a brass core dot
        if (tk === selRef.current) {
          c.fillStyle = `hsla(${hue},90%,${60 + a * 30}%,0.9)`;
          c.beginPath(); c.arc(cx, cy, 2.5 + a * 4, 0, Math.PI * 2); c.fill();
        }
      }
      // playhead sweep bar across the bottom
      if (st >= 0) {
        c.globalCompositeOperation = 'source-over';
        const px = (st + 0.5) / NUM_STEPS * w;
        c.fillStyle = 'rgba(202,160,82,0.9)';
        c.fillRect(px - 1.5, h - 4, 3, 4);
      }
      c.globalCompositeOperation = 'source-over';
    };
    rafRef.current = requestAnimationFrame(draw);

    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === 'Escape') { onClose(); return; }
      const el = document.activeElement;
      if (el && /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)) return;
      if (ev.code === 'Space') { ev.preventDefault(); togglePlay(); }
    };
    const panic = () => { engineRef.current?.setPlaying(false); setPlaying(false); };
    window.addEventListener('keydown', onKey);
    window.addEventListener('blur', panic);

    return () => {
      mountedRef.current = false;
      cancelAnimationFrame(rafRef.current);
      mq?.removeEventListener?.('change', onMQ);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('blur', panic);
      eng.dispose();
      try { eng.output.disconnect(); } catch {}
      ctx.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // DPR-aware canvas backing store
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

  const ensureRunning = async () => {
    const ctx = ctxRef.current!;
    if (ctx.state === 'suspended') await ctx.resume();
    if (!readyRef.current) await engineRef.current!.whenReady();
  };

  // ── transport ──────────────────────────────────────────────────────────────
  const togglePlay = async () => {
    await ensureRunning();
    const next = !playing;
    setPlaying(next);
    engineRef.current!.setPlaying(next);
    if (!next) setPlayStep(-1);
  };
  const onBpm = (v: number) => { setBpm(v); engineRef.current?.setTempo(v); };
  const onSwing = (v: number) => { setSwing(v); engineRef.current?.setSwing(v); };
  const onReverb = (v: number) => { setReverb(v); engineRef.current?.setMaster({ reverb: v }); };
  const onDrive = (v: number) => { setDrive(v); engineRef.current?.setMaster({ drive: v }); };
  const onVolume = (v: number) => { setVolume(v); engineRef.current?.setMaster({ gain: v }); };

  // ── pattern editing ──────────────────────────────────────────────────────────
  const pushPat = () => { engineRef.current?.pushPattern(patRef.current); force((n) => n + 1); };
  const toggleStep = (i: number) => {
    const s = patRef.current[sel].steps[i];
    s.on = !s.on;
    if (s.on) { s.vel = 1; s.prob = 1; }
    pushPat();
  };
  const cycleStepDetail = (i: number) => {
    // tap on a focused/on step cycles accent: full -> ghost(0.55) -> prob 0.5 -> off
    const s = patRef.current[sel].steps[i];
    if (!s.on) { s.on = true; s.vel = 1; s.prob = 1; }
    else if (s.vel > 0.9 && s.prob > 0.9) { s.vel = 0.55; }
    else if (s.vel < 0.9 && s.prob > 0.9) { s.prob = 0.5; s.vel = 1; }
    else { s.on = false; s.vel = 1; s.prob = 1; }
    pushPat();
  };

  // ── per-track param editing (or p-lock when a step is lock-focused) ──────────
  const recomputeFreq = (tk: number) => {
    tracksRef.current[tk].freq = baseRef.current[tk] * semiToMul(tuneRef.current[tk]);
  };
  const editTrack = (param: keyof TrackParams | 'tune', value: number) => {
    const tk = sel;
    if (lockStep !== null && param !== 'tune' && LOCKABLE.includes(param as keyof LockMap)) {
      // write a parameter lock for this step only
      const locks = patRef.current[tk].locks;
      const key = param as keyof LockMap;
      if (!locks[key]) locks[key] = new Array(NUM_STEPS).fill(-1);
      locks[key]![lockStep] = value;
      pushPat();
      return;
    }
    if (param === 'tune') {
      tuneRef.current[tk] = value;
      recomputeFreq(tk);
    } else if (param === 'freq') {
      // pitch lock path stores Hz directly
      tracksRef.current[tk].freq = value;
    } else {
      (tracksRef.current[tk] as any)[param] = value;
    }
    engineRef.current?.pushTrack(tk, tracksRef.current[tk]);
    force((n) => n + 1);
  };

  // current value a knob should display: the locked value if focused, else the track value
  const lockVal = (key: keyof LockMap): number | null => {
    if (lockStep === null) return null;
    const arr = patRef.current[sel].locks[key];
    const v = arr?.[lockStep];
    return v !== undefined && v >= 0 ? v : null;
  };

  // ── kits / dice ──────────────────────────────────────────────────────────────
  const loadKit = (idx: number) => {
    setKitIdx(idx);
    tracksRef.current = KITS[idx].tracks.map((t) => ({ ...t }));
    baseRef.current = KITS[idx].tracks.map((t) => t.freq);
    tuneRef.current = new Array(NUM_TRACKS).fill(0);
    engineRef.current?.pushTracks(tracksRef.current);
    force((n) => n + 1);
  };
  const dice = () => {
    // regenerate a musical pattern: keep kick/snare skeleton, randomize hats/perc
    const p = starterPattern();
    const rnd = (n: number) => Math.floor(Math.random() * n);
    // kick variations
    p[0].steps[rnd(16)].on = true;
    // snare ghost
    if (Math.random() < 0.5) { const i = [3, 7, 11, 15][rnd(4)]; p[1].steps[i] = { on: true, vel: 0.5, prob: 0.7 }; }
    // closed-hat density
    for (let i = 0; i < 16; i++) if (Math.random() < 0.35) p[2].steps[i] = { on: true, vel: 0.4 + Math.random() * 0.5, prob: 0.7 + Math.random() * 0.3 };
    // sprinkle perc + tom + rim
    [5, 6, 7].forEach((tk) => { for (let i = 0; i < 16; i++) if (Math.random() < 0.12) p[tk].steps[i] = { on: true, vel: 0.5 + Math.random() * 0.5, prob: 0.6 + Math.random() * 0.4 }; });
    patRef.current = p;
    pushPat();
  };
  const clearTrack = () => {
    patRef.current[sel] = { steps: Array.from({ length: NUM_STEPS }, () => ({ on: false, vel: 1, prob: 1 })), locks: {} };
    pushPat();
  };

  // ── step cell long-press (lock focus) vs tap (toggle/cycle) ──────────────────
  const onStepDown = (i: number) => {
    longPressed.current = false;
    pressTimer.current = window.setTimeout(() => {
      longPressed.current = true;
      setLockStep((cur) => (cur === i ? null : i));
    }, 330);
  };
  const onStepUp = (i: number) => {
    window.clearTimeout(pressTimer.current);
    if (longPressed.current) return;       // was a long-press -> lock toggled already
    if (patRef.current[sel].steps[i].on) cycleStepDetail(i);
    else toggleStep(i);
  };
  const onStepCancel = () => { window.clearTimeout(pressTimer.current); };

  const tr = tracksRef.current[sel];
  const pat = patRef.current[sel];
  const stepHasLock = (i: number) => Object.values(pat.locks).some((a) => a && a[i] >= 0);
  const accent = PANEL.brass;
  const hue = HUE(sel);

  // strike-field canvas (pinned scope slot)
  const scope = (
    <div style={{ borderRadius: 8, overflow: 'hidden', padding: 4, background: '#070907',
      boxShadow: `inset 0 2px 10px rgba(0,0,0,0.9), 0 0 0 1px ${PANEL.brassDark}, 0 0 0 3px rgba(0,0,0,0.5)` }}>
      <canvas ref={canvasRef} style={{ width: '100%', height: 120, display: 'block', borderRadius: 5 }} />
    </div>
  );

  // transport (pinned keyboard slot — always reachable)
  const keyboard = (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <button onClick={togglePlay} aria-label={playing ? 'Stop' : 'Play'} style={{
        flex: '0 0 auto', width: 56, height: 40, borderRadius: 9, cursor: 'pointer',
        border: `2px solid ${playing ? PANEL.phosphor : 'rgba(0,0,0,0.5)'}`,
        background: playing ? `linear-gradient(180deg, ${PANEL.phosphor}, #4f9a3e)` : 'linear-gradient(180deg,#211c16,#14100c)',
        color: playing ? '#08120a' : PANEL.ink, fontSize: 18,
        boxShadow: playing ? `0 0 18px ${PANEL.phosphor}66` : 'inset 0 1px 0 rgba(255,255,255,0.06)',
      }}>{playing ? '■' : '▶'}</button>
      <div style={{ flex: 1, display: 'flex', justifyContent: 'space-around' }}>
        <Knob label="Tempo" value={bpm} min={50} max={200} step={1} onChange={onBpm} size={46} format={(v) => `${Math.round(v)}`} accent={accent} />
        <Knob label="Swing" value={swing} min={0} max={0.7} onChange={onSwing} size={46} format={(v) => `${Math.round(v * 100)}`} accent={accent} />
        <Knob label="Reverb" value={reverb} min={0} max={0.6} onChange={onReverb} size={46} format={(v) => `${Math.round(v * 100)}`} accent={accent} />
        <Knob label="Drive" value={drive} min={1} max={3} onChange={onDrive} size={46} format={(v) => v.toFixed(1)} accent={accent} />
        <Knob label="Vol" value={volume} min={0} max={1.2} onChange={onVolume} size={46} format={(v) => `${Math.round(v * 100)}`} accent={accent} />
      </div>
    </div>
  );

  return (
    <SynthShell name="KNURL" tag={ready ? 'physical-model groovebox' : loadError ? 'dsp failed to load' : 'loading…'}
      onClose={onClose} accent={accent} scope={scope} keyboard={keyboard}>

      {/* kit + dice */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <Engrave>Kit</Engrave>
        <div style={{ display: 'flex', gap: 4 }}>
          {KITS.map((k, i) => (
            <button key={k.name} onClick={() => loadKit(i)} aria-pressed={kitIdx === i} style={{
              padding: '5px 11px', borderRadius: 6, cursor: 'pointer', fontFamily: '"JetBrains Mono",monospace', fontSize: 10,
              border: 'none', background: kitIdx === i ? accent : '#181410', color: kitIdx === i ? '#1a0d04' : PANEL.inkMute,
            }}>{k.name}</button>
          ))}
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
          <button onClick={dice} title="Randomize groove" style={{ width: 32, height: 28, borderRadius: 6, cursor: 'pointer', background: '#181410', border: `1px solid ${PANEL.line}`, color: PANEL.ink, fontSize: 14 }}>🎲</button>
          <button onClick={clearTrack} title="Clear this track" style={{ padding: '0 10px', height: 28, borderRadius: 6, cursor: 'pointer', background: '#181410', border: `1px solid ${PANEL.line}`, color: PANEL.inkMute, fontSize: 9, fontFamily: 'monospace' }}>CLR</button>
        </div>
      </div>

      {/* track selector — tap selects + auditions */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 5 }}>
        {TRACK_NAMES.map((nm, t) => {
          const on = t === sel;
          const th = HUE(t);
          return (
            <button key={nm} onClick={async () => { setSel(t); selRef.current = t; setLockStep(null); await ensureRunning(); engineRef.current?.trigger(t); }}
              style={{
                padding: '8px 4px', borderRadius: 7, cursor: 'pointer', fontFamily: '"JetBrains Mono",monospace', fontSize: 10, letterSpacing: 0.5,
                border: `1px solid ${on ? `hsl(${th},80%,60%)` : PANEL.line}`,
                background: on ? `hsla(${th},70%,30%,0.6)` : 'rgba(0,0,0,0.25)',
                color: on ? '#fff' : PANEL.inkMute,
                boxShadow: on ? `inset 0 0 0 1px hsla(${th},80%,60%,0.5), 0 0 12px hsla(${th},80%,50%,0.3)` : 'none',
              }}>{nm}</button>
          );
        })}
      </div>

      {/* step row for the selected track */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
          <Engrave>Steps · {TRACK_NAMES[sel]}</Engrave>
          {lockStep !== null ? (
            <button onClick={() => setLockStep(null)} style={{ fontFamily: 'monospace', fontSize: 9, color: '#1a0d04', background: PANEL.brassLite, border: 'none', borderRadius: 5, padding: '3px 8px', cursor: 'pointer' }}>
              🔒 locking step {lockStep + 1} — turn a knob · ✕
            </button>
          ) : (
            <span style={{ fontFamily: 'monospace', fontSize: 8.5, color: PANEL.inkMute }}>tap=on · tap on=accent/prob · hold=lock</span>
          )}
        </div>
        <div style={{ display: 'flex', gap: 3 }}>
          {Array.from({ length: NUM_STEPS }, (_, i) => {
            const s = pat.steps[i];
            const isBeat = i % 4 === 0;
            const isPlay = i === playStep;
            const isLock = i === lockStep;
            const hasLock = stepHasLock(i);
            const fill = s.on
              ? `hsla(${hue},85%,${30 + s.vel * 35}%,${s.prob < 1 ? 0.55 : 1})`
              : 'rgba(255,255,255,0.04)';
            return (
              <div key={i} style={{ flex: 1, marginLeft: isBeat && i > 0 ? 4 : 0 }}>
                <button
                  onPointerDown={(e) => { e.preventDefault(); onStepDown(i); }}
                  onPointerUp={() => onStepUp(i)}
                  onPointerLeave={onStepCancel}
                  onPointerCancel={onStepCancel}
                  aria-label={`Step ${i + 1}`}
                  style={{
                    width: '100%', height: 38, borderRadius: 5, cursor: 'pointer', touchAction: 'none',
                    border: `1px solid ${isLock ? PANEL.brassLite : isPlay ? accent : isBeat ? 'rgba(202,160,82,0.3)' : PANEL.line}`,
                    background: fill,
                    boxShadow: isPlay ? `0 0 12px ${accent}, inset 0 0 0 1px ${accent}` : s.on ? `0 0 8px hsla(${hue},85%,50%,0.4)` : 'none',
                    position: 'relative', transition: 'background .05s',
                  }}>
                  {s.prob < 1 && s.on && <span style={{ position: 'absolute', top: 1, right: 2, fontSize: 7, color: '#fff', opacity: 0.8 }}>%</span>}
                  {hasLock && <span style={{ position: 'absolute', bottom: 1, left: 2, width: 4, height: 4, borderRadius: 2, background: PANEL.brassLite }} />}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* per-track sound design — turning a knob while a step is lock-focused writes a p-lock */}
      <Engrave>Voice {lockStep !== null && <span style={{ color: PANEL.brassLite }}>· locking step {lockStep + 1}</span>}</Engrave>
      <KnobRow>
        <Knob label="Pitch"
          value={(() => { const lv = lockVal('freq'); return lv !== null ? Math.round(12 * Math.log2(lv / baseRef.current[sel])) : tuneRef.current[sel]; })()}
          min={-24} max={24} step={1}
          onChange={(v) => editTrack(lockStep !== null ? 'freq' : 'tune', lockStep !== null ? baseRef.current[sel] * semiToMul(v) : v)}
          format={(v) => `${v > 0 ? '+' : ''}${Math.round(v)}`} accent={accent} size={50} />
        <Knob label="Decay" value={lockVal('decay') ?? tr.decay} min={0.02} max={1.5} log
          onChange={(v) => editTrack('decay', v)} format={(v) => `${v.toFixed(2)}s`} accent={accent} size={50} />
        <Knob label="Material" value={lockVal('material') ?? tr.material} min={0} max={1}
          onChange={(v) => editTrack('material', v)} format={(v) => `${Math.round(v * 100)}`} accent={accent} size={50} />
        <Knob label="Snap" value={lockVal('snap') ?? tr.snap} min={0} max={1}
          onChange={(v) => editTrack('snap', v)} format={(v) => `${Math.round(v * 100)}`} accent={accent} size={50} />
        <Knob label="Noise" value={tr.noise} min={0} max={1}
          onChange={(v) => editTrack('noise', v)} format={(v) => `${Math.round(v * 100)}`} accent={accent} size={50} />
        <Knob label="Tone" value={lockVal('tone') ?? tr.tone} min={0} max={1}
          onChange={(v) => editTrack('tone', v)} format={(v) => `${Math.round(v * 100)}`} accent={accent} size={50} />
        <Knob label="Drive" value={lockVal('drive') ?? tr.drive} min={1} max={3}
          onChange={(v) => editTrack('drive', v)} format={(v) => v.toFixed(1)} accent={accent} size={50} />
        <Knob label="Level" value={tr.level} min={0} max={1.4}
          onChange={(v) => editTrack('level', v)} format={(v) => `${Math.round(v * 100)}`} accent={accent} size={50} />
        <Knob label="Pan" value={tr.pan} min={-1} max={1}
          onChange={(v) => editTrack('pan', v)} format={(v) => v === 0 ? 'C' : `${v < 0 ? 'L' : 'R'}${Math.round(Math.abs(v) * 100)}`} accent={accent} size={50} />
        <Knob label="Send" value={tr.send} min={0} max={1}
          onChange={(v) => editTrack('send', v)} format={(v) => `${Math.round(v * 100)}`} accent={accent} size={50} />
      </KnobRow>
    </SynthShell>
  );
};

export default Knurl;
