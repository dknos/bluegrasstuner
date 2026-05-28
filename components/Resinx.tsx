import React, { useEffect, useRef, useState } from 'react';
import { ResinxEngine, SCALES, ResinxMode } from '../services/resinx';

interface Props {
  onClose: () => void;
}

// QWERTY -> semitone offset (piano-style), matched on e.code (layout-stable).
const KEYMAP: Record<string, number> = {
  KeyA: 0, KeyW: 1, KeyS: 2, KeyE: 3, KeyD: 4, KeyF: 5, KeyT: 6, KeyG: 7,
  KeyY: 8, KeyH: 9, KeyU: 10, KeyJ: 11, KeyK: 12, KeyO: 13, KeyL: 14, KeyP: 15, Semicolon: 16,
};
const CODE_LABEL: Record<string, string> = {
  KeyA: 'A', KeyW: 'W', KeyS: 'S', KeyE: 'E', KeyD: 'D', KeyF: 'F', KeyT: 'T', KeyG: 'G',
  KeyY: 'Y', KeyH: 'H', KeyU: 'U', KeyJ: 'J', KeyK: 'K', KeyO: 'O', KeyL: 'L', KeyP: 'P', Semicolon: ';',
};
const KEYS = Object.entries(KEYMAP).sort((a, b) => a[1] - b[1]); // [code, semitone][]
const BASE_MIDI = 57; // A3
const isSharp = (semi: number) => [1, 3, 6, 8, 10].includes(((semi % 12) + 12) % 12);

const FMIN = 55, OCTAVES = 6;
const pitchX = (freq: number, w: number) =>
  Math.max(0, Math.min(1, Math.log2(freq / FMIN) / OCTAVES)) * w;
const pitchHue = (freq: number) =>
  20 + Math.max(0, Math.min(1, Math.log2(freq / FMIN) / OCTAVES)) * 260;

const NOTES = ['A', 'A#', 'B', 'C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#'];
const NOTE_BASE: Record<string, number> = {
  A: 110, 'A#': 116.54, B: 123.47, C: 130.81, 'C#': 138.59, D: 146.83,
  'D#': 155.56, E: 164.81, F: 174.61, 'F#': 185.0, G: 196.0, 'G#': 207.65,
};

interface Preset {
  name: string; scaleName: string; mode: ResinxMode;
  decay: number; structure: number; color: number; dryWet: number;
  voiceTune: number[]; voicePan: number[]; voiceGain: number[];
}
const PRESETS: Preset[] = [
  { name: 'Crystal Carillon', scaleName: 'Harmonic Series', mode: 'SYMPATHETIC', decay: 3.4, structure: 0.88, color: 0.97, dryWet: 0.95, voiceTune: [0,0,0,0,0,0], voicePan: [-0.7,-0.4,-0.15,0.15,0.4,0.7], voiceGain: [1,0.85,0.8,0.75,0.7,0.65] },
  { name: 'Koto Garden', scaleName: 'Slendro', mode: 'SYMPATHETIC', decay: 0.65, structure: 0.82, color: 0.52, dryWet: 0.9, voiceTune: [0,0,0,0,0,0], voicePan: [-0.6,-0.2,0.2,0.6,-0.35,0.35], voiceGain: [1.1,0,0.95,0,0.9,0.85] },
  { name: 'Bronze Temple', scaleName: 'Pelog', mode: 'SYMPATHETIC', decay: 7.5, structure: 0.93, color: 0.74, dryWet: 1, voiceTune: [0,0,0,0,0,-12], voicePan: [-0.5,0.5,-0.25,0.25,0,0], voiceGain: [1,0.95,0.95,0.9,0.9,0.8] },
  { name: 'Abyss Bloom', scaleName: 'Subharmonic', mode: 'SYMPATHETIC', decay: 9, structure: 0.22, color: 0.18, dryWet: 0.42, voiceTune: [0,0,0,0,0,0], voicePan: [0,-0.3,0.3,-0.15,0.15,0], voiceGain: [1.3,0.9,0.7,0.5,0.4,0.3] },
  { name: 'Starlight Drone', scaleName: 'Golden φ', mode: 'SYMPATHETIC', decay: 11, structure: 0.9, color: 0.83, dryWet: 0.5, voiceTune: [0,0,0,0,0,0], voicePan: [-0.8,0.55,-0.45,0.7,-0.25,0.35], voiceGain: [1,0.95,0.9,0.85,0.8,0.7] },
  { name: 'Septimal Rhodes', scaleName: '7-Limit Tetrad', mode: 'SYMPATHETIC', decay: 2.1, structure: 0.7, color: 0.6, dryWet: 0.45, voiceTune: [0,0,0,0,0,0], voicePan: [-0.4,0.4,-0.2,0.2,-0.5,0.5], voiceGain: [1.1,0.9,0.95,0.8,0.7,0.65] },
  { name: 'Pierced Glass', scaleName: 'Bohlen-Pierce', mode: 'SYMPATHETIC', decay: 4.8, structure: 0.95, color: 0.92, dryWet: 1, voiceTune: [0,0,0,0,0,0], voicePan: [-0.65,0.65,-0.4,0.4,-0.2,0.2], voiceGain: [1,0.92,0.88,0.84,0.8,0.76] },
  { name: 'Iron Cathedral', scaleName: 'Otonal 8:13', mode: 'SYMPATHETIC', decay: 8.5, structure: 0.97, color: 0.8, dryWet: 1, voiceTune: [-12,0,0,0,0,0], voicePan: [0,-0.55,0.55,-0.3,0.3,0], voiceGain: [1.2,0.95,0.9,0.9,0.85,0.85] },
];

const KEYFRAMES = `
@keyframes resin-spin { to { transform: rotate(360deg); } }
.resin-fader { -webkit-appearance: slider-vertical; appearance: slider-vertical; writing-mode: vertical-lr; direction: rtl; width: 22px; height: 96px; }
`;

const Fader = ({ label, value, min, max, step, fmt, onChange }: {
  label: string; value: number; min: number; max: number; step: number;
  fmt: (v: number) => string; onChange: (v: number) => void;
}) => (
  <div className="flex flex-col items-center gap-1.5">
    <span className="text-[9px] font-mono uppercase tracking-widest text-teal-300/70">{label}</span>
    <input type="range" min={min} max={max} step={step} value={value} aria-label={label}
      onChange={(e) => onChange(parseFloat(e.target.value))}
      className="resin-fader accent-teal-300 cursor-pointer" />
    <span className="text-[10px] font-mono tabular-nums text-violet-200/80">{fmt(value)}</span>
  </div>
);

const Resinx: React.FC<Props> = ({ onClose }) => {
  const ctxRef = useRef<AudioContext | null>(null);
  const engineRef = useRef<ResinxEngine | null>(null);
  const micRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number>(0);
  const readyRef = useRef(false);
  const mountedRef = useRef(true);
  const dprRef = useRef(1);

  // refs mutated at audio/pointer rate (no re-render)
  const heldRef = useRef<Map<string | number, number>>(new Map()); // source-key -> midi
  const octaveRef = useRef(0);
  const keyVelRef = useRef(0.8);
  const morphRef = useRef({ x: 0.6, y: 0.4 });
  const dirtyRef = useRef(false);
  const arcsRef = useRef<{ x: number; t: number }[]>([]);
  const ampRef = useRef<number[]>([0, 0, 0, 0, 0, 0]);
  const modeRef = useRef<ResinxMode>('MODAL');
  const reduceRef = useRef(false);

  // discrete state (repaints chrome)
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [mode, setMode] = useState<ResinxMode>('MODAL');
  const [scaleIdx, setScaleIdx] = useState(0);
  const [note, setNote] = useState('A');
  const [octave, setOctave] = useState(0);
  const [preset, setPreset] = useState('');
  const [micOn, setMicOn] = useState(false);
  const [decay, setDecay] = useState(2.8);
  const [structure, setStructure] = useState(0.4);
  const [color, setColor] = useState(0.6);
  const [dryWet, setDryWet] = useState(0.5);
  const [gain, setGain] = useState(0.9);
  const [keyVel, setKeyVel] = useState(0.8);
  const [spin, setSpin] = useState(0);
  const [, force] = useState(0);

  const fundamental = NOTE_BASE[note] * Math.pow(2, octave);

  // --- init engine + animation loop + global listeners (empty deps) -------
  useEffect(() => {
    mountedRef.current = true;
    const mq = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    reduceRef.current = mq?.matches ?? false;
    const onMQ = () => { reduceRef.current = mq!.matches; };
    mq?.addEventListener?.('change', onMQ);

    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const eng = new ResinxEngine(ctx);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 1024;
    eng.output.connect(analyser);
    analyser.connect(ctx.destination);
    ctxRef.current = ctx;
    engineRef.current = eng;
    analyserRef.current = analyser;
    eng.whenReady().then(
      () => { if (!mountedRef.current) return; readyRef.current = true; setReady(true); },
      (err) => { console.error('RESINX worklet failed to load', err); if (mountedRef.current) setLoadError(true); },
    );

    const wave = new Uint8Array(analyser.fftSize);
    let lastT = 0;
    const draw = (t: number) => {
      rafRef.current = requestAnimationFrame(draw);
      const cv = canvasRef.current, e = engineRef.current;
      if (!cv || !e) return;
      const ctx2 = cv.getContext('2d');
      if (!ctx2) return;
      if (dirtyRef.current) { e.update(); e.pushParams(); dirtyRef.current = false; }

      const reduce = reduceRef.current;
      const amps = ampRef.current;
      // activity gate — under reduced-motion, don't repaint an idle field
      let active = heldRef.current.size > 0 || arcsRef.current.length > 0;
      if (!active) for (let i = 0; i < 6; i++) if (amps[i] > 0.012) { active = true; break; }
      if (reduce && !active) return;

      const dpr = dprRef.current;
      ctx2.setTransform(dpr, 0, 0, dpr, 0, 0);
      const w = cv.width / dpr, h = cv.height / dpr;
      const dt = Math.min(0.05, (t - lastT) / 1000) || 0.016; lastT = t;

      ctx2.globalCompositeOperation = 'source-over';
      if (reduce) { ctx2.fillStyle = '#070512'; ctx2.fillRect(0, 0, w, h); }
      else { ctx2.fillStyle = 'rgba(7,5,18,0.28)'; ctx2.fillRect(0, 0, w, h); }
      ctx2.globalCompositeOperation = 'lighter';

      const freqs = e.voiceFreqs();
      const fund = e.fundamental; // live root (avoid stale closure)

      // faint ratio grid
      ctx2.lineWidth = 1;
      for (let i = 0; i < 6; i++) {
        const gx = pitchX(freqs[i], w);
        ctx2.strokeStyle = 'rgba(120,180,200,0.07)';
        ctx2.beginPath(); ctx2.moveTo(gx, 0); ctx2.lineTo(gx, h); ctx2.stroke();
      }

      // analyser backdrop (motion only)
      if (!reduce) {
        analyser.getByteTimeDomainData(wave);
        ctx2.strokeStyle = 'rgba(120,150,255,0.10)';
        ctx2.lineWidth = 1.5;
        ctx2.beginPath();
        for (let i = 0; i < wave.length; i++) {
          const x = (i / wave.length) * w;
          const y = h * 0.5 + ((wave[i] - 128) / 128) * h * 0.22;
          i ? ctx2.lineTo(x, y) : ctx2.moveTo(x, y);
        }
        ctx2.stroke();
      }

      // six anchor strings as standing waves
      const res = e.levels.res || [];
      const pad = h * 0.10, laneH = (h - pad * 2) / 6;
      const speed = reduce ? 0 : 1;
      for (let i = 0; i < 6; i++) {
        const target = Math.min(1, (res[i] || 0) * 3);
        amps[i] += (target - amps[i]) * Math.min(1, dt * 6);
        const amp = amps[i];
        const laneY = pad + laneH * (i + 0.5);
        const hue = pitchHue(freqs[i]);
        const nodes = Math.max(1, Math.min(16, Math.round(freqs[i] / fund)));
        const a = (0.10 + amp * 0.9) * laneH * 0.42;
        const enabled = e.voiceOn[i];
        ctx2.strokeStyle = `hsla(${hue}, 90%, ${55 + amp * 25}%, ${enabled ? 0.35 + amp * 0.55 : 0.08})`;
        ctx2.lineWidth = 1 + amp * 2.5;
        ctx2.shadowBlur = reduce ? 4 : (8 + amp * 26) * (enabled ? 1 : 0.2);
        ctx2.shadowColor = `hsla(${hue}, 95%, 65%, 0.6)`;
        ctx2.beginPath();
        const ph = t * 0.004 * (1 + i * 0.05) * speed;
        for (let px = 0; px <= w; px += 6) {
          const env = Math.sin(Math.PI * nodes * (px / w));
          const y = laneY + a * env * (speed ? Math.sin(ph + i) : 1);
          px ? ctx2.lineTo(px, y) : ctx2.moveTo(px, y);
        }
        ctx2.stroke();
        if (amp > 0.04) {
          const ax = pitchX(freqs[i], w);
          const g = ctx2.createRadialGradient(ax, laneY, 0, ax, laneY, 40 + amp * 90);
          g.addColorStop(0, `hsla(${hue},95%,70%,${0.10 + amp * 0.35})`);
          g.addColorStop(1, 'hsla(0,0%,0%,0)');
          ctx2.fillStyle = g;
          ctx2.beginPath(); ctx2.arc(ax, laneY, 40 + amp * 90, 0, Math.PI * 2); ctx2.fill();
        }
      }
      ctx2.shadowBlur = 0;

      // sympathetic coupling arcs
      const arcs = arcsRef.current;
      for (let k = arcs.length - 1; k >= 0; k--) {
        const age = (t - arcs[k].t) / 700;
        if (age >= 1) { arcs.splice(k, 1); continue; }
        const alpha = (1 - age) * 0.5;
        for (let i = 0; i < 6; i++) {
          const laneY = pad + laneH * (i + 0.5);
          const ax = pitchX(freqs[i], w);
          const hue = pitchHue(freqs[i]);
          ctx2.strokeStyle = `hsla(${hue},95%,75%,${alpha})`;
          ctx2.lineWidth = 1.5;
          ctx2.beginPath();
          ctx2.moveTo(arcs[k].x, h - 4);
          ctx2.quadraticCurveTo((arcs[k].x + ax) / 2, laneY - laneH, ax, laneY);
          ctx2.stroke();
        }
      }
      ctx2.globalCompositeOperation = 'source-over';
    };
    rafRef.current = requestAnimationFrame(draw);

    const onKeyDown = (ev: KeyboardEvent) => {
      if (ev.key === 'Escape') { onClose(); return; }
      const el = document.activeElement;
      if (el && /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)) return;
      if (ev.code === 'KeyZ') { changeOctave(-1); return; }
      if (ev.code === 'KeyX') { changeOctave(1); return; }
      const semi = KEYMAP[ev.code];
      if (semi === undefined) return;
      if (heldRef.current.has(ev.code)) return; // repeat suppression
      ev.preventDefault();
      triggerOn(ev.code, BASE_MIDI + octaveRef.current * 12 + semi);
    };
    const onKeyUp = (ev: KeyboardEvent) => {
      if (heldRef.current.has(ev.code)) triggerOff(ev.code);
    };
    const panic = () => {
      engineRef.current?.releaseAll();
      heldRef.current.clear();
      force((n) => n + 1);
    };
    const onVis = () => { if (document.hidden) panic(); };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', panic);
    document.addEventListener('visibilitychange', onVis);

    return () => {
      mountedRef.current = false;
      cancelAnimationFrame(rafRef.current);
      mq?.removeEventListener?.('change', onMQ);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', panic);
      document.removeEventListener('visibilitychange', onVis);
      eng.releaseAll();
      eng.dispose();
      micRef.current?.disconnect();
      micStreamRef.current?.getTracks().forEach((tr) => tr.stop());
      try { analyser.disconnect(); } catch {}
      ctx.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // canvas resize (DPR-aware backing store)
  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return;
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

  // --- note triggering (source-keyed) -------------------------------------
  const triggerOn = async (key: string | number, midi: number) => {
    if (modeRef.current === 'MODAL') return; // keyboard is silent in MODAL
    if (heldRef.current.has(key)) return;     // re-entry guard
    heldRef.current.set(key, midi);           // set BEFORE awaiting (repeat suppression + release safety)
    force((n) => n + 1);
    try { await ensureRunning(); }
    catch { heldRef.current.delete(key); return; }
    if (!mountedRef.current || !heldRef.current.has(key)) return; // released during init
    const e = engineRef.current!;
    e.noteOn(key, midi, keyVelRef.current);
    const cv = canvasRef.current;
    if (cv) arcsRef.current.push({ x: pitchX(e.midiToFreq(midi), cv.width / dprRef.current), t: performance.now() });
  };
  const triggerOff = (key: string | number) => {
    if (!heldRef.current.has(key)) return;
    engineRef.current!.noteOff(key);
    heldRef.current.delete(key);
    force((n) => n + 1);
  };

  const changeOctave = (d: number) => {
    setOctave((o) => { const v = Math.max(-3, Math.min(3, o + d)); octaveRef.current = v; return v; });
  };

  // --- pointer (multitouch) keyboard --------------------------------------
  const kbRef = useRef<HTMLDivElement | null>(null);
  const midiAtPoint = (x: number, y: number): number | null => {
    const el = document.elementFromPoint(x, y) as HTMLElement | null;
    const reed = el?.closest('[data-midi]') as HTMLElement | null;
    return reed ? parseInt(reed.dataset.midi!) : null;
  };
  const onPadDown = (ev: React.PointerEvent) => {
    ev.preventDefault();
    kbRef.current?.setPointerCapture(ev.pointerId);
    const midi = midiAtPoint(ev.clientX, ev.clientY);
    if (midi !== null) triggerOn(ev.pointerId, midi);
  };
  const onPadMove = (ev: React.PointerEvent) => {
    if (!heldRef.current.has(ev.pointerId)) return;
    const midi = midiAtPoint(ev.clientX, ev.clientY);
    const cur = heldRef.current.get(ev.pointerId);
    if (midi !== null && midi !== cur) { triggerOff(ev.pointerId); triggerOn(ev.pointerId, midi); }
  };
  const onPadUp = (ev: React.PointerEvent) => { triggerOff(ev.pointerId); };

  // --- excitation (MODAL) --------------------------------------------------
  const playKick = async () => {
    await ensureRunning();
    const ctx = ctxRef.current!, e = engineRef.current!, t = ctx.currentTime;
    const osc = ctx.createOscillator(), g = ctx.createGain();
    osc.frequency.setValueAtTime(150, t);
    osc.frequency.exponentialRampToValueAtTime(50, t + 0.12);
    g.gain.setValueAtTime(1, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
    osc.connect(g); g.connect(e.input); osc.start(t); osc.stop(t + 0.32);
  };
  const playPluck = async () => {
    await ensureRunning();
    const ctx = ctxRef.current!, e = engineRef.current!, t = ctx.currentTime;
    const len = Math.floor(ctx.sampleRate * 0.02);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource(); src.buffer = buf; src.connect(e.input); src.start(t);
  };
  const toggleMic = async () => {
    const ctx = ctxRef.current!, e = engineRef.current!;
    if (micOn) {
      micRef.current?.disconnect(); micRef.current = null;
      micStreamRef.current?.getTracks().forEach((tr) => tr.stop()); micStreamRef.current = null;
      setMicOn(false); return;
    }
    await ensureRunning();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = stream;
      const src = ctx.createMediaStreamSource(stream); src.connect(e.input);
      micRef.current = src; setMicOn(true);
    } catch { alert('Mic access denied.'); }
  };

  // --- param setters -------------------------------------------------------
  const apply = (fn: (e: ResinxEngine) => void, markDirty = true) => {
    const e = engineRef.current; if (!e) return;
    fn(e);
    if (markDirty) dirtyRef.current = true; else { e.update(); e.pushParams(); }
  };
  const onDecay = (v: number) => { setDecay(v); setPreset(''); apply((e) => (e.decay = v)); };
  const onMix = (v: number) => { setDryWet(v); setPreset(''); apply((e) => { e.dryWet = v; e.resMix = v; }); };
  const onGain = (v: number) => { setGain(v); apply((e) => (e.gain = v)); };
  const onKeyVel = (v: number) => { setKeyVel(v); keyVelRef.current = v; };

  const changeMode = (m: ResinxMode) => {
    setMode(m); modeRef.current = m;
    apply((e) => e.setMode(m), false);
    heldRef.current.clear(); // mode switch silences everything; drop stale highlights
    force((n) => n + 1);
  };
  const changeScale = (i: number) => {
    setScaleIdx(i); setPreset('');
    apply((e) => (e.scale = SCALES[i]), false);
  };
  const changeNote = (n: string) => {
    setNote(n);
    apply((e) => (e.fundamental = NOTE_BASE[n] * Math.pow(2, octaveRef.current)), false);
  };
  useEffect(() => {
    apply((e) => (e.fundamental = NOTE_BASE[note] * Math.pow(2, octave)), false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [octave]);

  // --- XY morph pad --------------------------------------------------------
  const xyRef = useRef<HTMLDivElement | null>(null);
  const onXY = (ev: React.PointerEvent) => {
    const el = xyRef.current!; const r = el.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (ev.clientX - r.left) / r.width));
    const y = Math.max(0, Math.min(1, 1 - (ev.clientY - r.top) / r.height));
    morphRef.current = { x, y };
    setColor(x); setStructure(y); setPreset('');
    const e = engineRef.current; if (e) { e.color = x; e.structure = y; dirtyRef.current = true; }
  };
  const onXYDown = (ev: React.PointerEvent) => { ev.preventDefault(); xyRef.current?.setPointerCapture(ev.pointerId); onXY(ev); };
  const onXYMove = (ev: React.PointerEvent) => { if (xyRef.current?.hasPointerCapture(ev.pointerId)) onXY(ev); };

  // --- presets + dice ------------------------------------------------------
  const applyPreset = (p: Preset) => {
    const idx = Math.max(0, SCALES.findIndex((s) => s.name === p.scaleName));
    setScaleIdx(idx); setMode(p.mode); modeRef.current = p.mode;
    setDecay(p.decay); setStructure(p.structure); setColor(p.color); setDryWet(p.dryWet);
    morphRef.current = { x: p.color, y: p.structure };
    setPreset(p.name);
    const e = engineRef.current; if (!e) return;
    e.scale = SCALES[idx]; e.mode = p.mode;
    e.decay = p.decay; e.structure = p.structure; e.color = p.color; e.dryWet = p.dryWet; e.resMix = p.dryWet;
    e.voiceTune = [...p.voiceTune]; e.voicePan = [...p.voicePan]; e.voiceGain = [...p.voiceGain];
    e.voiceOn = p.voiceGain.map((g) => g > 0);
    e.releaseAll(); heldRef.current.clear(); e.update(); e.pushParams();
    force((n) => n + 1);
  };
  const reseed = () => {
    const e = engineRef.current; if (!e) return;
    const pick = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];
    const idx = Math.floor(Math.random() * SCALES.length);
    const dec = 3 + Math.random() * 6;
    const col = 0.45 + Math.random() * 0.5;
    const str = 0.5 + Math.random() * 0.45;
    const steps = [0, 7, 12, -12, 19];
    const tune = Array.from({ length: 6 }, (_, i) => (i === 0 ? 0 : pick(steps)));
    const pan = Array.from({ length: 6 }, () => (Math.random() * 2 - 1) * 0.8);
    const gn = Array.from({ length: 6 }, (_, i) => (i > 0 && Math.random() < 0.18 ? 0 : 0.6 + Math.random() * 0.6));
    const nt = pick(NOTES);
    setScaleIdx(idx); setDecay(dec); setColor(col); setStructure(str); setNote(nt); setPreset('');
    morphRef.current = { x: col, y: str };
    e.scale = SCALES[idx]; e.decay = dec; e.color = col; e.structure = str;
    e.fundamental = NOTE_BASE[nt] * Math.pow(2, octaveRef.current);
    e.voiceTune = tune; e.voicePan = pan; e.voiceGain = gn; e.voiceOn = gn.map((g) => g > 0);
    e.update(); e.pushParams();
    setSpin((s) => s + 1);
    force((n) => n + 1);
  };

  const toggleVoice = (i: number) => {
    const e = engineRef.current; if (!e) return;
    e.voiceOn[i] = !e.voiceOn[i]; setPreset(''); dirtyRef.current = true; force((n) => n + 1);
  };

  const freqs = engineRef.current?.voiceFreqs() ?? [];
  const held = heldRef.current;
  const curRatios = SCALES[scaleIdx].ratios;

  return (
    <div role="dialog" aria-modal="true" aria-label="RESINX synthesizer"
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/70">
      <style>{KEYFRAMES}</style>
      <div className="relative w-full max-w-6xl h-[92vh] rounded-2xl overflow-hidden ring-1 ring-white/10 text-[#e9e4ff] flex flex-col"
        style={{ background: 'radial-gradient(120% 90% at 50% 25%, #14112e 0%, #090618 55%, #050410 100%)' }}>

        <span className="pointer-events-none absolute left-2 top-2 w-3 h-3 border-l border-t border-white/20" />
        <span className="pointer-events-none absolute right-2 top-2 w-3 h-3 border-r border-t border-white/20" />
        <span className="pointer-events-none absolute left-2 bottom-2 w-3 h-3 border-l border-b border-white/20" />
        <span className="pointer-events-none absolute right-2 bottom-2 w-3 h-3 border-r border-b border-white/20" />

        {/* HUD bar */}
        <div className="flex items-center gap-2 sm:gap-3 px-3 sm:px-5 py-3 border-b border-white/10">
          <span className="text-xl sm:text-2xl font-bold" style={{ letterSpacing: '0.35em', fontFamily: '"Oswald","Bebas Neue",system-ui' }}>RESINX</span>
          <span className="text-[10px] font-mono text-teal-300/60 hidden md:inline">pure ratios, ringing</span>
          <span className="text-[11px] font-mono tabular-nums text-amber-200/80 ml-1 hidden sm:inline">{fundamental.toFixed(1)} Hz</span>

          <div className="ml-auto flex rounded-md overflow-hidden ring-1 ring-white/15 text-[10px] sm:text-[11px] font-mono">
            {(['MODAL', 'SYMPATHETIC'] as ResinxMode[]).map((m) => (
              <button key={m} onClick={() => changeMode(m)} aria-pressed={mode === m}
                className={`px-2 sm:px-3 py-1.5 transition-all ${mode === m ? 'bg-violet-500/30 text-white shadow-[0_0_18px_rgba(179,136,255,.5)]' : 'text-white/50 hover:text-white/80'}`}>
                {m}
              </button>
            ))}
          </div>
          <button onClick={reseed} title="Reseed" aria-label="Randomize"
            className="w-8 h-8 grid place-items-center rounded-md ring-1 ring-white/15 hover:bg-white/10"
            style={{ animation: spin ? 'resin-spin 500ms cubic-bezier(.2,.9,.25,1.4)' : undefined }} key={spin}>🎲</button>
          {loadError ? <span className="text-[10px] text-red-400">dsp failed to load</span>
            : !ready && <span className="text-[10px] text-amber-400 motion-safe:animate-pulse">loading…</span>}
          <button onClick={onClose} aria-label="Close" className="text-white/50 hover:text-white text-2xl leading-none ml-1">×</button>
        </div>

        {/* preset chips */}
        <div className="flex gap-1.5 px-3 sm:px-5 py-2 overflow-x-auto border-b border-white/5">
          {PRESETS.map((p) => (
            <button key={p.name} onClick={() => applyPreset(p)} aria-pressed={preset === p.name}
              className={`shrink-0 px-2.5 py-1 rounded-full text-[10px] font-mono whitespace-nowrap transition-all ${preset === p.name ? 'bg-teal-400/25 text-teal-100 ring-1 ring-teal-300/50' : 'bg-white/5 text-white/55 hover:bg-white/10'}`}>
              {p.name}
            </button>
          ))}
        </div>

        {/* main: stacks on mobile, 3-column on md+ */}
        <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-y-auto md:overflow-hidden">
          {/* left tone faders + scale/fund */}
          <div className="w-full md:w-[150px] shrink-0 border-b md:border-b-0 md:border-r border-white/10 p-3 flex flex-col gap-3">
            <select value={scaleIdx} onChange={(e) => changeScale(parseInt(e.target.value))} aria-label="Scale"
              className="w-full bg-white/5 border border-white/10 rounded px-2 py-1 text-[11px] font-mono">
              {SCALES.map((s, i) => <option key={s.name} value={i} className="bg-[#0a0a18]">{s.name}</option>)}
            </select>
            <div className="grid grid-cols-6 md:grid-cols-4 gap-1">
              {NOTES.map((n) => (
                <button key={n} onClick={() => changeNote(n)} aria-pressed={note === n}
                  className={`py-1 rounded text-[10px] font-mono ${note === n ? 'bg-white text-black' : 'bg-white/5 hover:bg-white/10'}`}>{n}</button>
              ))}
            </div>
            <div className="flex items-center justify-between gap-1 text-[10px] font-mono">
              <button onClick={() => changeOctave(-1)} aria-label="Octave down" className="flex-1 py-1 rounded bg-white/5 hover:bg-white/10">/2</button>
              <span className="text-amber-200/80 tabular-nums">oct {octave > 0 ? '+' : ''}{octave}</span>
              <button onClick={() => changeOctave(1)} aria-label="Octave up" className="flex-1 py-1 rounded bg-white/5 hover:bg-white/10">*2</button>
            </div>
            <div className="flex justify-around mt-1">
              <Fader label="Decay" value={decay} min={0.1} max={12} step={0.1} fmt={(v) => `${v.toFixed(1)}s`} onChange={onDecay} />
              <Fader label="Gain" value={gain} min={0} max={1.5} step={0.01} fmt={(v) => `${Math.round(v * 100)}`} onChange={onGain} />
              <Fader label={mode === 'MODAL' ? 'Dry/Wet' : 'Bloom'} value={dryWet} min={0} max={1} step={0.01} fmt={(v) => `${Math.round(v * 100)}%`} onChange={onMix} />
              <Fader label="KeyVel" value={keyVel} min={0.05} max={1} step={0.01} fmt={(v) => `${Math.round(v * 100)}`} onChange={onKeyVel} />
            </div>
            <div className="mt-1 grid grid-cols-2 gap-1">
              <button onClick={playKick} className="py-1.5 rounded bg-amber-500/90 text-black text-[10px] font-bold hover:bg-amber-400">KICK</button>
              <button onClick={playPluck} className="py-1.5 rounded bg-white/10 text-[10px] font-bold hover:bg-white/20">PLUCK</button>
              <button onClick={toggleMic} aria-pressed={micOn} className={`col-span-2 py-1.5 rounded text-[10px] font-bold ${micOn ? 'bg-red-500 text-white' : 'bg-white/10 hover:bg-white/20'}`}>{micOn ? 'MIC ON' : 'MIC'}</button>
            </div>
          </div>

          {/* center lattice */}
          <div className="flex-1 relative min-w-0 min-h-[220px]">
            <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
            <div className="absolute left-0 right-0 bottom-0 flex justify-between px-2 py-1 text-[9px] font-mono text-white/40">
              {curRatios.slice(0, 6).map((r, i) => (
                <button key={i} onClick={() => toggleVoice(i)} aria-pressed={engineRef.current?.voiceOn[i] !== false}
                  aria-label={`Voice ${i + 1}`}
                  className={`flex flex-col items-center ${engineRef.current?.voiceOn[i] === false ? 'opacity-30' : ''}`}
                  style={{ color: `hsl(${pitchHue(freqs[i] || fundamental)},85%,70%)` }}>
                  <span>{Number.isInteger(r) ? r : r.toFixed(2)}</span>
                  <span className="text-white/30">{(freqs[i] || 0).toFixed(0)}</span>
                </button>
              ))}
            </div>
          </div>

          {/* right: XY cymatics disc */}
          <div className="w-full md:w-[180px] shrink-0 border-t md:border-t-0 md:border-l border-white/10 p-3 flex flex-col items-center gap-2">
            <span className="text-[9px] font-mono uppercase tracking-widest text-teal-300/70">Resonance Field</span>
            <div ref={xyRef} onPointerDown={onXYDown} onPointerMove={onXYMove}
              className="relative w-[150px] h-[150px] rounded-full ring-1 ring-white/15 overflow-hidden cursor-crosshair"
              style={{ touchAction: 'none', userSelect: 'none', WebkitUserSelect: 'none', WebkitTouchCallout: 'none', background: `radial-gradient(circle at ${morphRef.current.x * 100}% ${(1 - morphRef.current.y) * 100}%, hsla(${20 + morphRef.current.x * 260},90%,60%,0.5), #0a0a18 70%)` } as React.CSSProperties}>
              {Array.from({ length: 2 + Math.round(structure * 5) }).map((_, r) => (
                <span key={r} className="absolute rounded-full border" style={{
                  inset: `${8 + r * (60 / (2 + structure * 5))}px`,
                  borderColor: `hsla(${20 + color * 260},90%,70%,${0.25 - r * 0.02})`,
                }} />
              ))}
              <span className="absolute w-3 h-3 rounded-full bg-white shadow-[0_0_14px_white]"
                style={{ left: `calc(${morphRef.current.x * 100}% - 6px)`, top: `calc(${(1 - morphRef.current.y) * 100}% - 6px)` }} />
            </div>
            <div className="text-[9px] font-mono text-white/50 tabular-nums">COLOR {Math.round(color * 100)}% · STRUCT {Math.round(structure * 100)}%</div>
            <p className="text-[9px] text-white/30 leading-tight mt-1 text-center">X = color · Y = structure</p>
          </div>
        </div>

        {/* resin ribbon keyboard */}
        <div className="relative shrink-0">
          {mode === 'MODAL' && (
            <div className="absolute inset-0 z-10 grid place-items-center text-[10px] font-mono text-white/60 pointer-events-none">
              switch to SYMPATHETIC to play · MODAL = excite with KICK / PLUCK / MIC
            </div>
          )}
          <div ref={kbRef} onPointerDown={onPadDown} onPointerMove={onPadMove} onPointerUp={onPadUp} onPointerCancel={onPadUp}
            className={`h-[80px] flex border-t border-white/10 select-none transition-opacity ${mode === 'MODAL' ? 'opacity-30 pointer-events-none' : ''}`}
            style={{ touchAction: 'none' }}>
            {KEYS.map(([code, semi]) => {
              const midi = BASE_MIDI + octave * 12 + semi;
              const freq = 440 * Math.pow(2, (midi - 69) / 12);
              const isHeld = held.has(code);
              const sharp = isSharp(semi);
              return (
                <div key={code} data-midi={midi}
                  className="relative flex-1 min-w-[26px] flex flex-col items-center justify-end pb-1.5 cursor-pointer border-r border-black/40 transition-[filter]"
                  style={{
                    background: isHeld
                      ? `hsl(${pitchHue(freq)},95%,65%)`
                      : `linear-gradient(to top, hsla(${pitchHue(freq)},80%,${sharp ? 22 : 32}%,0.55), hsla(${pitchHue(freq)},70%,12%,0.15))`,
                    filter: isHeld ? 'brightness(1.6)' : undefined,
                    boxShadow: isHeld ? `0 0 22px hsla(${pitchHue(freq)},95%,65%,0.8)` : undefined,
                  }}>
                  <span className={`text-[10px] font-mono ${isHeld ? 'text-black font-bold' : 'text-white/55'}`}>{CODE_LABEL[code]}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Resinx;
