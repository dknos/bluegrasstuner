import React, { useEffect, useRef, useState } from 'react';
import { SynthShell, Knob, Scope, Engrave, PANEL } from './synthkit';
import { getStrudelRuntime, StrudelMod } from '../services/strudel-runtime';
import { StrudelBridge } from '../services/strudel-bridge';
import {
  Project, SoundId, SOUND_IDS, SOUND_LABELS, createProject, compile, runCode,
} from '../services/phaseloom';

// ──────────────────────────────────────────────────────────────────────────
// PHASELOOM — grid-first groovebox that compiles to Strudel.
//   Phase 1: 8 on/off lanes + mute + solo + tempo + global swing + undo/redo,
//   a read-only mirror of the Strudel it emits, played through the KNURL bridge.
//   (per-lane polymeter, knob-as-signal, scenes, an EDITABLE code drawer = next.)
//
// Strudel is AGPL-3.0-or-later; bundling it makes this site AGPL (source link below).
// ──────────────────────────────────────────────────────────────────────────

interface Props { onClose: () => void; }

const NUM_STEPS = 16;
const HUE = (i: number) => Math.round((i / SOUND_IDS.length) * 290 + 18);
const HIST_CAP = 120;

const Phaseloom: React.FC<Props> = ({ onClose }) => {
  const modRef = useRef<StrudelMod | null>(null);
  const bridgeRef = useRef<StrudelBridge | null>(null);
  const mountedRef = useRef(true);
  const readyRef = useRef(false);
  const playingRef = useRef(false);
  const liveTimer = useRef<number>(0);
  const projectRef = useRef<Project>(createProject());

  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [project, setProjectState] = useState<Project>(projectRef.current);
  // undo/redo live in refs (read by the once-registered keydown handler; the
  // setProjectState that always follows a mutation re-renders the buttons)
  const historyRef = useRef<Project[]>([]);
  const futureRef = useRef<Project[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [showCode, setShowCode] = useState(false);

  // ── engine: share the one Strudel runtime + KNURL bridge ───────────────────
  useEffect(() => {
    mountedRef.current = true;
    (async () => {
      try {
        const rt = await getStrudelRuntime();
        modRef.current = rt.mod; bridgeRef.current = rt.bridge;
        if (mountedRef.current) { setReady(true); readyRef.current = true; }
      } catch (e: any) {
        console.error('PHASELOOM: Strudel failed to load', e);
        if (mountedRef.current) setLoadError(String(e?.message || e));
      }
    })();

    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === 'Escape') { onClose(); return; }
      const el = document.activeElement;
      if (el && /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)) return;
      if (ev.code === 'Space') { ev.preventDefault(); playingRef.current ? stop() : run(); }
      if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === 'z' && !ev.shiftKey) { ev.preventDefault(); undo(); }
      if ((ev.ctrlKey || ev.metaKey) && (ev.key.toLowerCase() === 'y' || (ev.key.toLowerCase() === 'z' && ev.shiftKey))) { ev.preventDefault(); redo(); }
    };
    window.addEventListener('keydown', onKey);
    const panic = () => { try { modRef.current?.hush(); } catch {} setPlaying(false); playingRef.current = false; };
    window.addEventListener('blur', panic);

    return () => {
      mountedRef.current = false;
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('blur', panic);
      window.clearTimeout(liveTimer.current);
      try { modRef.current?.hush(); } catch {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── transport ──────────────────────────────────────────────────────────────
  const run = async () => {
    const m = modRef.current;
    if (!m || !readyRef.current) return;
    try {
      setErr(null);
      await m.getAudioContext().resume();
      await m.evaluate(runCode(projectRef.current));
      setPlaying(true); playingRef.current = true;
    } catch (e: any) { setErr(String(e?.message || e)); }
  };
  const stop = () => {
    try { modRef.current?.hush(); } catch {}
    setPlaying(false); playingRef.current = false;
    window.clearTimeout(liveTimer.current);
  };
  // edits loop in while playing (debounced; Strudel hot-swaps on the cycle)
  const scheduleLive = () => {
    if (!playingRef.current) return;
    window.clearTimeout(liveTimer.current);
    liveTimer.current = window.setTimeout(() => { run(); }, 150);
  };

  // ── state plumbing: projectRef stays in sync synchronously; history optional ─
  const apply = (next: Project, pushHistory: boolean) => {
    if (pushHistory) {
      historyRef.current = [...historyRef.current, projectRef.current].slice(-HIST_CAP);
      futureRef.current = [];
    }
    projectRef.current = next;
    setProjectState(next);
    scheduleLive();
  };
  const undo = () => {
    if (!historyRef.current.length) return;
    const prev = historyRef.current[historyRef.current.length - 1];
    historyRef.current = historyRef.current.slice(0, -1);
    futureRef.current = [...futureRef.current, projectRef.current];
    projectRef.current = prev;
    setProjectState(prev);
    scheduleLive();
  };
  const redo = () => {
    if (!futureRef.current.length) return;
    const nextP = futureRef.current[futureRef.current.length - 1];
    futureRef.current = futureRef.current.slice(0, -1);
    historyRef.current = [...historyRef.current, projectRef.current].slice(-HIST_CAP);
    projectRef.current = nextP;
    setProjectState(nextP);
    scheduleLive();
  };

  // ── grid edits (discrete -> undoable) ───────────────────────────────────────
  const toggleStep = (laneIdx: number, stepIdx: number) => {
    const p = projectRef.current;
    const lane = p.lanes[laneIdx];
    const steps = lane.steps.slice(); steps[stepIdx] = !steps[stepIdx];
    const lanes = p.lanes.slice(); lanes[laneIdx] = { ...lane, steps };
    apply({ ...p, lanes }, true);
  };
  const toggleMute = (laneIdx: number) => {
    const p = projectRef.current;
    const lane = p.lanes[laneIdx];
    const lanes = p.lanes.slice(); lanes[laneIdx] = { ...lane, enabled: !lane.enabled };
    apply({ ...p, lanes }, true);
  };
  const toggleSolo = (id: SoundId) => {
    const p = projectRef.current;
    const soloIds = p.soloIds.includes(id) ? p.soloIds.filter((x) => x !== id) : [...p.soloIds, id];
    apply({ ...p, soloIds }, true);
  };
  const clearAll = () => {
    const p = projectRef.current;
    const lanes = p.lanes.map((l) => ({ ...l, steps: new Array(l.length).fill(false) }));
    apply({ ...p, lanes, soloIds: [] }, true);
  };

  // ── live performance knobs (continuous -> not pushed to undo) ───────────────
  const setCps = (v: number) => { const p = projectRef.current; apply({ ...p, cps: v }, false); };
  const setSwing = (v: number) => { const p = projectRef.current; apply({ ...p, swing: v }, false); };

  const accent = PANEL.brass;
  const analyser = ready ? (bridgeRef.current?.analyser ?? null) : null;
  const anySolo = project.soloIds.length > 0;

  // pinned scope
  const scope = <Scope analyser={analyser} mode="bars" height={92} />;

  // pinned transport (always reachable)
  const keyboard = (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <button onClick={() => (playing ? stop() : run())} disabled={!ready} aria-label={playing ? 'Stop' : 'Play'} style={{
        flex: '0 0 auto', width: 56, height: 40, borderRadius: 9, cursor: ready ? 'pointer' : 'default',
        border: `2px solid ${playing ? PANEL.phosphor : 'rgba(0,0,0,0.5)'}`,
        background: playing ? `linear-gradient(180deg, ${PANEL.phosphor}, #4f9a3e)` : 'linear-gradient(180deg,#211c16,#14100c)',
        color: playing ? '#08120a' : (ready ? PANEL.ink : PANEL.inkMute), fontSize: 18,
        boxShadow: playing ? `0 0 18px ${PANEL.phosphor}66` : 'inset 0 1px 0 rgba(255,255,255,0.06)',
      }}>{playing ? '■' : '▶'}</button>
      <div style={{ flex: 1, display: 'flex', justifyContent: 'space-around', alignItems: 'center' }}>
        <Knob label="CPS" value={project.cps} min={0.2} max={2} onChange={setCps} size={46} format={(v) => v.toFixed(2)} accent={accent} />
        <Knob label="Swing" value={project.swing} min={0} max={0.5} onChange={setSwing} size={46} format={(v) => `${Math.round(v * 100)}`} accent={accent} />
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={undo} disabled={!historyRef.current.length} title="Undo (⌘Z)" style={{
            width: 36, height: 36, borderRadius: 8, cursor: historyRef.current.length ? 'pointer' : 'default',
            background: '#181410', border: `1px solid ${PANEL.line}`, color: historyRef.current.length ? PANEL.ink : 'rgba(232,220,196,0.25)', fontSize: 15,
          }}>↶</button>
          <button onClick={redo} disabled={!futureRef.current.length} title="Redo (⌘⇧Z)" style={{
            width: 36, height: 36, borderRadius: 8, cursor: futureRef.current.length ? 'pointer' : 'default',
            background: '#181410', border: `1px solid ${PANEL.line}`, color: futureRef.current.length ? PANEL.ink : 'rgba(232,220,196,0.25)', fontSize: 15,
          }}>↷</button>
        </div>
      </div>
    </div>
  );

  const tag = ready ? 'strudel groovebox' : loadError ? 'engine failed to load' : 'loading engine…';

  return (
    <SynthShell name="PHASELOOM" tag={tag} onClose={onClose} accent={accent} scope={scope} keyboard={keyboard}>

      {/* header strip: status + clear */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Engrave>Pattern</Engrave>
        <span style={{ fontFamily: '"JetBrains Mono",monospace', fontSize: 8.5, color: playing ? PANEL.phosphor : PANEL.inkMute }}>
          {playing ? '◉ looping · edits live' : '○ idle'}
        </span>
        {loadError && <span style={{ marginLeft: 4, fontFamily: 'monospace', fontSize: 9, color: '#e6b0a0' }}>load failed</span>}
        <button onClick={clearAll} title="Clear all lanes" style={{
          marginLeft: 'auto', padding: '0 10px', height: 26, borderRadius: 6, cursor: 'pointer',
          background: '#181410', border: `1px solid ${PANEL.line}`, color: PANEL.inkMute, fontSize: 9, fontFamily: 'monospace',
        }}>CLR</button>
      </div>

      {/* the lane grid — every lane visible at once (tracker view) */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {project.lanes.map((lane, li) => {
          const hue = HUE(li);
          const soloed = project.soloIds.includes(lane.id);
          const dim = !lane.enabled || (anySolo && !soloed);
          return (
            <div key={lane.id} style={{ display: 'flex', alignItems: 'center', gap: 4, opacity: dim ? 0.4 : 1, transition: 'opacity .12s' }}>
              {/* left cluster: the actual Strudel token + solo/mute */}
              <span title={SOUND_LABELS[lane.id]} style={{
                width: 26, flex: '0 0 auto', fontFamily: '"JetBrains Mono",monospace', fontSize: 11,
                color: `hsl(${hue},70%,68%)`, letterSpacing: 0.5,
              }}>{lane.id}</span>
              <button onClick={() => toggleSolo(lane.id)} aria-pressed={soloed} title="Solo" style={{
                width: 16, height: 16, flex: '0 0 auto', borderRadius: 4, cursor: 'pointer', fontSize: 8, fontFamily: 'monospace',
                border: `1px solid ${soloed ? PANEL.brassLite : PANEL.line}`,
                background: soloed ? PANEL.brass : 'rgba(0,0,0,0.25)', color: soloed ? '#1a0d04' : PANEL.inkMute,
              }}>S</button>
              <button onClick={() => toggleMute(li)} aria-pressed={!lane.enabled} title={lane.enabled ? 'Mute' : 'Unmute'} style={{
                width: 16, height: 16, flex: '0 0 auto', borderRadius: 4, cursor: 'pointer', fontSize: 8, fontFamily: 'monospace',
                border: `1px solid ${!lane.enabled ? '#a8472a' : PANEL.line}`,
                background: !lane.enabled ? 'rgba(168,71,42,0.4)' : 'rgba(0,0,0,0.25)', color: !lane.enabled ? '#e6b0a0' : PANEL.inkMute,
              }}>M</button>
              {/* 16 step cells */}
              <div style={{ flex: 1, display: 'flex', gap: 2, minWidth: 0 }}>
                {lane.steps.map((on, si) => {
                  const beat = si % 4 === 0;
                  return (
                    <button key={si} onClick={() => toggleStep(li, si)} aria-label={`${lane.id} step ${si + 1}`} style={{
                      flex: 1, minWidth: 0, height: 22, borderRadius: 4, cursor: 'pointer', padding: 0,
                      marginLeft: beat && si > 0 ? 3 : 0,
                      border: `1px solid ${on ? `hsl(${hue},80%,55%)` : beat ? 'rgba(202,160,82,0.28)' : PANEL.line}`,
                      background: on ? `hsl(${hue},78%,52%)` : 'rgba(255,255,255,0.035)',
                      boxShadow: on ? `0 0 7px hsla(${hue},85%,50%,0.45)` : 'none',
                    }} />
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* read-only mirror of the Strudel this grid emits (editable drawer = next phase) */}
      <div>
        <button onClick={() => setShowCode((s) => !s)} style={{
          display: 'flex', alignItems: 'center', gap: 6, width: '100%', padding: '6px 8px', borderRadius: 6, cursor: 'pointer',
          background: 'rgba(0,0,0,0.22)', border: `1px solid ${PANEL.line}`, color: PANEL.inkMute, fontFamily: 'monospace', fontSize: 9, letterSpacing: 1,
        }}>
          <span>{showCode ? '▾' : '▸'} CODE</span>
          <span style={{ marginLeft: 'auto', color: 'rgba(232,220,196,0.35)' }}>read-only · grid writes it</span>
        </button>
        {showCode && (
          <pre style={{
            margin: '6px 0 0', padding: '10px 12px', borderRadius: 6, maxHeight: 150, overflow: 'auto',
            background: PANEL.screen, border: `1px solid ${PANEL.brassDark}`,
            color: PANEL.phosphor, fontFamily: '"JetBrains Mono",monospace', fontSize: 11, lineHeight: 1.5, whiteSpace: 'pre',
          }}>{compile(project)}</pre>
        )}
      </div>

      {/* AGPL §13 source notice */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontFamily: 'monospace', fontSize: 8.5, color: 'rgba(232,220,196,0.35)' }}>
        <span>powered by Strudel (AGPL-3.0) · plays the KNURL drums · space=play · ⌘Z undo</span>
        <a href="https://github.com/dknos/bluegrasstuner" target="_blank" rel="noreferrer" style={{ color: PANEL.inkMute, textDecoration: 'underline' }}>source</a>
      </div>
    </SynthShell>
  );
};

export default Phaseloom;
