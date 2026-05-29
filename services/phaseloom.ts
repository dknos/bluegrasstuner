// phaseloom.ts
// PHASELOOM — a grid-first groovebox that COMPILES to Strudel mini-notation and
// plays through the shared KNURL bridge (sounds kk ks kh ko kc kt kr kp).
//
// Phase 1 model (this file): 8 lanes of on/off steps + mute + solo + tempo +
// global swing. The grid is the single source of truth; `compile()` is a pure
// derived selector (grid -> Strudel string). Polymeter / knobs / signals /
// scenes / a code drawer that edits back are later phases — the model is kept
// deliberately small here.
//
// Verified against installed @strudel/web v1.3.0:
//   • `$: s("…")` -> transpiler rewrites to s("…").p('$') (each line stacks).
//   • `.swingBy(x, n)` is a registered Pattern method (chains inside all(...)).
//   • `silence` exists -> used to cleanly kill the loop when every lane is muted.

export const SOUND_IDS = ['kk', 'ks', 'kh', 'ko', 'kc', 'kt', 'kr', 'kp'] as const;
export type SoundId = typeof SOUND_IDS[number];

export const SOUND_LABELS: Record<SoundId, string> = {
  kk: 'Kick', ks: 'Snare', kh: 'Hat', ko: 'OpenHat', kc: 'Clap', kt: 'Tom', kr: 'Rim', kp: 'Perc',
};

export const DEFAULT_LEN = 16;
export const SWING_SUBDIV = 16;

export interface Lane {
  id: SoundId;
  enabled: boolean;   // false = muted (omitted from the stack)
  length: number;     // Phase 1: always DEFAULT_LEN (per-lane polymeter = Phase 2)
  steps: boolean[];   // length === length
}

export interface Project {
  cps: number;        // -> setcps(cps)
  swing: number;      // 0..0.5 -> global .swingBy(swing, SWING_SUBDIV) in the run-time prefix
  lanes: Lane[];      // 8, one per SoundId
  soloIds: SoundId[]; // non-empty -> only these lanes emit
}

// trim float noise so the emitted code reads clean (0.5 not 0.50000001)
const num = (x: number) => String(Math.round(x * 1000) / 1000);

export function emptyLane(id: SoundId, length = DEFAULT_LEN): Lane {
  return { id, enabled: true, length, steps: new Array(length).fill(false) };
}

/** A satisfying starter groove so RUN makes a beat immediately. */
export function createProject(): Project {
  const lanes = SOUND_IDS.map((id) => emptyLane(id));
  const set = (id: SoundId, idxs: number[]) => {
    const lane = lanes.find((l) => l.id === id)!;
    idxs.forEach((i) => { lane.steps[i] = true; });
  };
  set('kk', [0, 4, 8, 12]);              // four on the floor
  set('ks', [4, 12]);                    // backbeat
  set('kh', [0, 2, 4, 6, 8, 10, 12, 14]); // 8th-note hats
  return { cps: 0.5, swing: 0, lanes, soloIds: [] };
}

/** Is a lane audible in the current solo/mute state and non-empty? */
function laneEmits(p: Project, lane: Lane): boolean {
  if (!lane.enabled) return false;
  if (p.soloIds.length > 0 && !p.soloIds.includes(lane.id)) return false;
  return lane.steps.some(Boolean);
}

/** The Strudel document body: one setcps line + one `$:` line per emitting lane.
 *  When nothing emits, `silence` keeps the clock running but plays nothing. */
export function compile(p: Project): string {
  const lines: string[] = [`setcps(${num(p.cps)})`];
  let voices = 0;
  for (const lane of p.lanes) {
    if (!laneEmits(p, lane)) continue;
    const seq = lane.steps.map((on) => (on ? lane.id : '~')).join(' ');
    lines.push(`$: s("${seq}")`);
    voices++;
  }
  if (voices === 0) lines.push('silence');
  return lines.join('\n');
}

/** The run-time prefix (global, never shown in the drawer): analysis tap +
 *  global swing. swing===0 -> byte-identical to the REPL's shipping ANALYZE. */
export function buildPrefix(p: Project): string {
  const swing = Math.max(0, Math.min(1, p.swing));
  const inner = swing > 0
    ? `x => x.analyze(1).swingBy(${num(swing)}, ${SWING_SUBDIV})`
    : `x => x.analyze(1)`;
  return `all(${inner})`;
}

/** What we actually evaluate: hidden prefix + visible document. */
export function runCode(p: Project): string {
  return `${buildPrefix(p)}\n${compile(p)}`;
}
