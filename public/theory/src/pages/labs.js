/**
 * THE LAB — tools, not lessons.
 *
 * These exist for someone who never touches the course: a player who wants to
 * check what notes are in G♯ harmonic minor, or hear a m7 against a M6 twice.
 * Reference value is the one genuinely good thing about a dense theory book,
 * and losing it would be a bad trade for all this interactivity.
 */

import { createIntervalLab } from '../labs/intervalLab.js';
import { createWidget } from '../lessons/widget.js';
import { SCALES, buildScale, degreeLabels, stepPattern, compareScales } from '../theory/scale.js';
import { CHORDS, buildChord, chordSymbol, chordToneRoles } from '../theory/chord.js';
import { diatonicChords, keySignature, CIRCLE_OF_FIFTHS } from '../theory/key.js';
import { parseNote, noteName } from '../theory/pitch.js';
import { createViewRack } from '../ui/viewrack.js';
import { audio } from '../audio/index.js';

const KEYS = ['C', 'G', 'D', 'A', 'E', 'B', 'F#', 'Db', 'Ab', 'Eb', 'Bb', 'F'];

const TOOLS = {
  interval: { title: 'Interval Explorer', blurb: 'Two notes. Every representation, every name, both directions.' },
  scale: { title: 'Scale Explorer', blurb: 'Build any scale on any note, and change one degree to hear what it becomes.' },
  chord: { title: 'Chord Builder', blurb: 'Stack a chord, take it apart, see what each note is doing.' },
  key: { title: 'Key Room', blurb: 'One key at a time: its notes, its chords, its neighbours.' },
};

export function render(host, { arg, go, setTransport }) {
  const tool = TOOLS[arg] ? arg : null;
  if (!tool) {
    setTransport({ label: 'The Lab', detail: '', play: null });
    host.innerHTML = `
      <header class="lesson-head">
        <span class="label">Tools</span>
        <h1>The Lab</h1>
        <p class="prose" style="margin-top:var(--s-3);color:var(--text-dim)">
          No lessons here, no score, nothing to unlock. Just the instruments.
        </p>
      </header>
      <div class="game-grid">
        ${Object.entries(TOOLS).map(([id, t]) => `
          <button class="game-card" data-route="labs" data-arg="${id}">
            <span class="game-card-title">${esc(t.title)}</span>
            <span class="game-card-blurb">${esc(t.blurb)}</span>
          </button>`).join('')}
      </div>`;
    return {};
  }

  const back = `<button class="btn btn-ghost" data-route="labs" style="margin-bottom:var(--s-5)">← All tools</button>`;

  if (tool === 'interval') {
    host.innerHTML = `${back}<header class="lesson-head"><h1>${TOOLS.interval.title}</h1></header><div id="lab"></div>`;
    const lab = createIntervalLab(host.querySelector('#lab'), { views: ['piano', 'staff', 'ring', 'fretboard'] });
    setTransport({ label: 'Interval Explorer', detail: '', play: () => lab.play() });
    return { destroy: () => lab.destroy() };
  }

  if (tool === 'scale') return scaleExplorer(host, back, setTransport);
  if (tool === 'chord') return chordBuilder(host, back, setTransport);
  return keyRoom(host, back, setTransport);
}

// ---------------------------------------------------------------------------
function scaleExplorer(host, back, setTransport) {
  const s = { root: 'C', scaleId: 'major', compare: 'aeolian' };

  host.innerHTML = `${back}
    <header class="lesson-head"><h1>${TOOLS.scale.title}</h1></header>
    <div class="lab-bar row-wrap">
      <label class="widget-field"><span class="label-sm">Root</span>
        <select data-f="root">${KEYS.map((k) => `<option ${k === s.root ? 'selected' : ''}>${k}</option>`).join('')}</select></label>
      <label class="widget-field"><span class="label-sm">Scale</span>
        <select data-f="scaleId">${Object.values(SCALES).map((x) => `<option value="${x.id}" ${x.id === s.scaleId ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}</select></label>
      <label class="widget-field"><span class="label-sm">Compare with</span>
        <select data-f="compare">${Object.values(SCALES).map((x) => `<option value="${x.id}" ${x.id === s.compare ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}</select></label>
      <button class="btn btn-primary" data-a="play">Play</button>
      <button class="btn" data-a="ab">Hear the difference</button>
    </div>
    <div id="out"></div>`;

  const out = host.querySelector('#out');
  let rack = null;

  function paint() {
    const root = parseNote(s.root + '4');
    const def = SCALES[s.scaleId];
    const notes = buildScale(root, s.scaleId, { includeOctave: true });
    const labels = degreeLabels(s.scaleId);
    const steps = stepPattern(s.scaleId);
    const diff = compareScales(root, s.scaleId, s.compare);

    out.innerHTML = `
      <div class="panel" style="padding:var(--s-5);margin-bottom:var(--s-4)">
        <h2 class="display" style="font-size:var(--step-3)">${esc(noteName(root))} ${esc(def.name.toLowerCase())}</h2>
        <p class="prose" style="margin-top:var(--s-2);color:var(--text-dim)">${esc(def.character)}</p>
        <div class="degree-strip" style="margin-top:var(--s-4)">
          ${notes.slice(0, labels.length).map((n, i) => `
            <span class="degree-cell"><b>${esc(labels[i])}</b><i>${esc(noteName(n))}</i></span>`).join('')}
        </div>
        <div class="step-strip data">${steps.join('  ')}</div>
        <p class="prose" style="margin-top:var(--s-4)">
          Against <strong>${esc(SCALES[s.compare].name.toLowerCase())}</strong>: ${esc(diff.summary)}
        </p>
      </div>
      <div id="views"></div>`;

    rack?.destroy();
    rack = createViewRack(out.querySelector('#views'), { views: ['piano', 'staff', 'ring', 'fretboard'] });
    rack.update({ notes, tonic: notes[0], labelMode: 'name' });
    setTransport({ label: `${noteName(root)} ${def.name}`, detail: steps.join(' '), play: () => audio.sequence(notes, {}) });
  }

  host.addEventListener('change', (ev) => {
    const f = ev.target.dataset.f;
    if (f) { s[f] = ev.target.value; paint(); }
  });
  host.addEventListener('click', (ev) => {
    const a = ev.target.closest('[data-a]')?.dataset.a;
    const root = parseNote(s.root + '4');
    if (a === 'play') audio.sequence(buildScale(root, s.scaleId, { includeOctave: true }), {});
    if (a === 'ab') {
      audio.sequence(buildScale(root, s.scaleId, { includeOctave: true }), {});
      setTimeout(() => audio.sequence(buildScale(root, s.compare, { includeOctave: true }), {}), 2600);
    }
  });

  paint();
  return { destroy: () => rack?.destroy() };
}

// ---------------------------------------------------------------------------
function chordBuilder(host, back, setTransport) {
  const s = { root: 'C', chordId: 'maj7', inversion: 0 };

  host.innerHTML = `${back}
    <header class="lesson-head"><h1>${TOOLS.chord.title}</h1></header>
    <div class="lab-bar row-wrap">
      <label class="widget-field"><span class="label-sm">Root</span>
        <select data-f="root">${KEYS.map((k) => `<option ${k === s.root ? 'selected' : ''}>${k}</option>`).join('')}</select></label>
      <label class="widget-field"><span class="label-sm">Chord</span>
        <select data-f="chordId">${Object.values(CHORDS).map((c) => `<option value="${c.id}" ${c.id === s.chordId ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</select></label>
      <button class="btn btn-primary" data-a="block">Block</button>
      <button class="btn" data-a="arp">Arpeggiate</button>
    </div>
    <div id="out"></div>`;

  const out = host.querySelector('#out');
  let rack = null;

  function paint() {
    const root = parseNote(s.root + '4');
    const def = CHORDS[s.chordId];
    const notes = buildChord(root, s.chordId);
    const roles = chordToneRoles(root, s.chordId);

    out.innerHTML = `
      <div class="panel" style="padding:var(--s-5);margin-bottom:var(--s-4)">
        <h2 class="display" style="font-size:var(--step-3)">${esc(chordSymbol(root, s.chordId))}</h2>
        <p class="prose" style="margin-top:var(--s-2);color:var(--text-dim)">${esc(def.character)}</p>
        <table class="role-table">
          <thead><tr><th>Note</th><th>Interval</th><th>Role</th><th>What it does</th></tr></thead>
          <tbody>${roles.map((r) => `
            <tr><td class="data">${esc(r.name)}</td><td class="data">${esc(r.interval)}</td>
            <td>${esc(r.role)}</td>
            <td class="role-note">${r.isGuideTone ? 'Guide tone: carries the chord\'s quality' : r.kind === 'tension' ? 'Colour, not structure' : 'Structural'}</td></tr>`).join('')}
          </tbody>
        </table>
      </div>
      <div id="views"></div>`;

    rack?.destroy();
    rack = createViewRack(out.querySelector('#views'), { views: ['piano', 'staff', 'ring', 'fretboard'] });
    rack.update({ notes, tonic: notes[0], labelMode: 'name' });
    setTransport({ label: chordSymbol(root, s.chordId), detail: def.name, play: () => audio.chord(notes, { style: 'block' }) });
  }

  host.addEventListener('change', (ev) => {
    const f = ev.target.dataset.f;
    if (f) { s[f] = ev.target.value; paint(); }
  });
  host.addEventListener('click', (ev) => {
    const a = ev.target.closest('[data-a]')?.dataset.a;
    const notes = buildChord(parseNote(s.root + '4'), s.chordId);
    if (a === 'block') audio.chord(notes, { style: 'block' });
    if (a === 'arp') audio.chord(notes, { style: 'arpeggio' });
  });

  paint();
  return { destroy: () => rack?.destroy() };
}

// ---------------------------------------------------------------------------
function keyRoom(host, back, setTransport) {
  const s = { root: 'C', sevenths: false };

  host.innerHTML = `${back}
    <header class="lesson-head"><h1>${TOOLS.key.title}</h1></header>
    <div class="lab-bar row-wrap">
      <label class="widget-field"><span class="label-sm">Key</span>
        <select data-f="root">${KEYS.map((k) => `<option ${k === s.root ? 'selected' : ''}>${k}</option>`).join('')}</select></label>
      <label class="widget-field"><span class="label-sm">Chords</span>
        <select data-f="sevenths"><option value="">Triads</option><option value="1">Sevenths</option></select></label>
      <button class="btn btn-primary" data-a="all">Play them all</button>
    </div>
    <div id="out"></div>`;

  const out = host.querySelector('#out');

  function paint() {
    const root = parseNote(s.root + '4');
    const sig = keySignature(root, 'major');
    const chords = diatonicChords(root, 'major', s.sevenths ? 4 : 3);

    out.innerHTML = `
      <div class="panel" style="padding:var(--s-5)">
        <h2 class="display" style="font-size:var(--step-3)">${esc(noteName(root))} major</h2>
        <p class="prose" style="margin-top:var(--s-2);color:var(--text-dim)">
          ${esc(sig.label)}${sig.count ? `: ${sig.accidentals.map((n) => esc(noteName(n))).join(', ')}` : ''}.
          Relative minor: ${esc(noteName(chords[5].root))} minor.
        </p>
        <div class="harmony-table">
          ${chords.map((c) => `
            <button class="harmony-cell" data-deg="${c.degree}" data-fn="${c.function}">
              <span class="hc-roman">${esc(c.roman)}</span>
              <span class="hc-sym">${esc(c.symbol)}</span>
              <span class="hc-fn label-sm">${esc(c.function)}</span>
            </button>`).join('')}
        </div>
        <p class="prose" style="margin-top:var(--s-4);color:var(--text-dim)">
          The pattern of qualities is the same in every major key. Change the key above and the
          letters move, but the Roman numerals do not. That is the whole reason they exist.
        </p>
      </div>`;
    setTransport({ label: `${noteName(root)} major`, detail: sig.label, play: () => playAll() });
  }

  function playAll() {
    const chords = diatonicChords(parseNote(s.root + '4'), 'major', s.sevenths ? 4 : 3);
    chords.forEach((c, i) => setTimeout(() => audio.chord(c.notes, { style: 'block' }), i * 700));
  }

  host.addEventListener('change', (ev) => {
    const f = ev.target.dataset.f;
    if (f) { s[f] = f === 'sevenths' ? !!ev.target.value : ev.target.value; paint(); }
  });
  host.addEventListener('click', (ev) => {
    const cell = ev.target.closest('[data-deg]');
    if (cell) {
      const chords = diatonicChords(parseNote(s.root + '4'), 'major', s.sevenths ? 4 : 3);
      audio.chord(chords[Number(cell.dataset.deg) - 1].notes, { style: 'block' });
    }
    if (ev.target.closest('[data-a="all"]')) playAll();
  });

  paint();
  return {};
}

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
