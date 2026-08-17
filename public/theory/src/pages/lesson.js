/**
 * LESSON.
 *
 * Renders the arc: why → hear → see → discover → name → practice → apply →
 * challenge → review. The order is the pedagogy, so the page walks it rather
 * than dumping all nine sections at once — you do not get the terminology
 * before you have heard the thing it names.
 *
 * Each step kind has its own shape in the schema, and each gets exactly the
 * furniture it needs: `hear` is a play button and nothing to look at, `see`
 * adds the views, `discover` is a widget with the controls, `name` finally
 * hands over the vocabulary. Rendering them all identically would flatten the
 * arc back into an article.
 */

import { LESSONS_BY_ID } from '../lessons/index.js';
import { STEP_KINDS, DEPTHS, DEPTH_INTENT, resolveExample } from '../lessons/schema.js';
import { createWidget } from '../lessons/widget.js';
import { createViewRack } from '../ui/viewrack.js';
import { audio } from '../audio/index.js';
import { completeLesson, getState, setSetting } from '../ui/store.js';
import { parseNote } from '../theory/pitch.js';

/** What each step is called on screen. The kind stays as the eyebrow. */
const STEP_TITLE = {
  why: 'Why this matters',
  hear: 'Listen first',
  see: 'Now look at it',
  discover: 'Try it yourself',
  name: 'What it is called',
  practice: 'Practice',
  apply: 'Use it',
  challenge: 'Challenge',
  review: 'What to keep',
};

const VIEW_ALIAS = (v) => (v === 'pitchring' ? 'ring' : v);

export function render(host, { arg, go, setTransport }) {
  const lesson = LESSONS_BY_ID[arg];
  if (!lesson) {
    host.innerHTML = `<div class="panel" style="padding:var(--s-6)">
      <h1 class="display" style="font-size:var(--step-3)">No such lesson</h1>
      <p style="margin-top:var(--s-3)"><button class="btn" data-route="course">Back to the course</button></p></div>`;
    return {};
  }

  const state = {
    depth: getState().settings.depth ?? 'normal',
    reached: 2,          // why + hear + see are open from the start
    tonic: 'C4',
    mounted: [],
  };

  host.innerHTML = `
    <header class="lesson-head">
      <div class="row-wrap" style="justify-content:space-between;align-items:flex-start">
        <div>
          <span class="label">World ${lesson.world} · lesson ${lesson.index} · ${lesson.minutes} min</span>
          <h1>${esc(lesson.title)}</h1>
          ${lesson.subtitle ? `<p class="lesson-sub">${esc(lesson.subtitle)}</p>` : ''}
        </div>
        <div class="depth" role="group" aria-label="How much detail">
          ${DEPTHS.map((d) => `<button data-depth="${d}" aria-pressed="${d === state.depth}"
             title="${esc(DEPTH_INTENT[d])}">${d}</button>`).join('')}
        </div>
      </div>
      <p class="lesson-depth prose" id="l-depth"></p>
    </header>

    <div class="arc" id="l-arc"></div>

    <footer class="lesson-foot panel">
      <div>
        <span class="label">Finished?</span>
        <p>Marking this done schedules it to come back for review later.</p>
      </div>
      <div class="row-wrap">
        <button class="btn" data-act="prev">Previous</button>
        <button class="btn btn-primary" data-act="done">I've got this</button>
        <button class="btn" data-act="next">Next lesson</button>
      </div>
    </footer>
  `;

  const arcEl = host.querySelector('#l-arc');
  const depthEl = host.querySelector('#l-depth');

  function paintDepth() {
    depthEl.textContent = lesson.depths?.[state.depth] ?? '';
    for (const b of host.querySelectorAll('[data-depth]')) {
      b.setAttribute('aria-pressed', String(b.dataset.depth === state.depth));
    }
  }

  function teardown() {
    for (const m of state.mounted) { try { m.destroy?.(); } catch { /* ignore */ } }
    state.mounted = [];
  }

  function paintArc() {
    teardown();
    arcEl.innerHTML = '';

    STEP_KINDS.forEach((kind, i) => {
      const step = lesson.steps?.[kind];
      if (!step) return;
      const locked = i > state.reached;
      const isLast = i === STEP_KINDS.length - 1;

      const sec = document.createElement('section');
      sec.className = `step ${locked ? 'is-locked' : ''}`;
      sec.dataset.kind = kind;
      sec.innerHTML = `
        <div class="step-head">
          <span class="step-kind">${esc(kind)}</span>
          <h2>${esc(kind === 'name' && step.term ? step.term : STEP_TITLE[kind])}</h2>
        </div>
        <div class="step-slot"></div>
        ${!locked && !isLast && i === state.reached
          ? `<div class="step-more"><button class="btn" data-more="${i}">Continue</button></div>` : ''}
      `;
      arcEl.appendChild(sec);

      const slot = sec.querySelector('.step-slot');
      if (locked) {
        slot.innerHTML = `<p class="step-locked-note">Work through the step above first.</p>`;
        return;
      }
      try {
        mountStep(kind, step, slot);
      } catch (err) {
        console.warn('[lesson] step failed', kind, err);
        slot.innerHTML = `<p class="step-locked-note">This step could not be built (${esc(err.message)}).</p>`;
      }
    });
  }

  // -------------------------------------------------------------------------
  function mountStep(kind, step, slot) {
    if (step.text) slot.insertAdjacentHTML('beforeend', `<div class="prose step-body">${paras(step.text)}</div>`);

    switch (kind) {
      case 'hear': return mountHear(step, slot);
      case 'see': return mountSee(step, slot);
      case 'discover': return mountDiscover(step, slot);
      case 'name': return mountName(step, slot);
      case 'practice':
      case 'challenge': return mountDrill(kind, step, slot);
      case 'apply': return mountApply(step, slot);
      case 'review': return mountReview(step, slot);
      default: return undefined;
    }
  }

  /** Sound only. Deliberately nothing to look at yet. */
  function mountHear(step, slot) {
    const { notes } = safeResolve(step.example);
    const el = document.createElement('div');
    el.className = 'hear-block';
    el.innerHTML = `<button class="btn btn-primary btn-big" data-play="1">Play it</button>
      <span class="hear-label label-sm">listen before reading on</span>`;
    const play = () => playExample(notes, step.playback);
    el.querySelector('[data-play]').addEventListener('click', play);
    slot.appendChild(el);
    setTransport({ label: lesson.title, detail: 'Listen', play });
  }

  function mountSee(step, slot) {
    const { notes } = safeResolve(step.example);
    const wrap = document.createElement('div');
    slot.appendChild(wrap);
    const rack = createViewRack(wrap, { views: (step.views ?? ['staff', 'piano']).map(VIEW_ALIAS) });
    rack.update({ notes, tonic: notes[0], labelMode: step.labelMode ?? 'name' });
    const play = document.createElement('button');
    play.className = 'btn';
    play.style.marginTop = 'var(--s-3)';
    play.textContent = 'Play what you are looking at';
    play.addEventListener('click', () => playExample(notes, step.playback));
    wrap.appendChild(play);
    state.mounted.push(rack);
  }

  /** Hands on the controls. The "what to notice" line stays hidden until they
   *  have had a go, so it reads as confirmation rather than instruction. */
  function mountDiscover(step, slot) {
    const w = step.widget ?? {};
    if (w.prompt) slot.insertAdjacentHTML('beforeend', `<p class="widget-prompt">${esc(w.prompt)}</p>`);
    const holder = document.createElement('div');
    slot.appendChild(holder);
    const widget = createWidget(holder, w, { tonic: state.tonic });
    state.mounted.push(widget);

    if (w.noticing) {
      const box = document.createElement('div');
      box.className = 'noticing';
      box.innerHTML = `<button class="btn btn-ghost" data-notice="1">What should I be noticing?</button>
        <p class="noticing-text" hidden>${esc(w.noticing)}</p>`;
      box.addEventListener('click', (ev) => {
        if (!ev.target.closest('[data-notice]')) return;
        box.querySelector('.noticing-text').hidden = false;
        ev.target.closest('[data-notice]').remove();
      });
      slot.appendChild(box);
    }
    setTransport({ label: lesson.title, detail: 'Explore', play: () => widget.play() });
  }

  /** The terminology, arriving only now. */
  function mountName(step, slot) {
    const bits = [];
    if (step.symbol) bits.push(`<span class="chip data" data-iv="perfect">${esc(step.symbol)}</span>`);
    for (const a of step.alsoCalled ?? []) bits.push(`<span class="chip" data-iv="none">also: ${esc(a)}</span>`);
    if (bits.length) slot.insertAdjacentHTML('afterbegin', `<div class="row-wrap name-chips">${bits.join('')}</div>`);
  }

  function mountApply(step, slot) {
    if (step.task) slot.insertAdjacentHTML('beforeend', `<p class="apply-task">${esc(step.task)}</p>`);
    if (!step.example) return;
    const { notes } = safeResolve(step.example);
    const wrap = document.createElement('div');
    slot.appendChild(wrap);
    const rack = createViewRack(wrap, { views: ['staff', 'piano'] });
    rack.update({ notes, tonic: notes[0], labelMode: 'name' });
    const play = document.createElement('button');
    play.className = 'btn';
    play.style.marginTop = 'var(--s-3)';
    play.textContent = 'Play it';
    play.addEventListener('click', () => audio.chord(notes, { style: 'block' }));
    wrap.appendChild(play);
    state.mounted.push(rack);
  }

  function mountReview(step, slot) {
    const items = (step.takeaways ?? []).map((t) => `<li>${esc(t)}</li>`).join('');
    slot.insertAdjacentHTML('beforeend', `
      ${items ? `<ul class="takeaways">${items}</ul>` : ''}
      ${step.next ? `<p class="next-up"><span class="label-sm">Up next</span> ${esc(step.next)}</p>` : ''}`);
  }

  /** Drills reuse the game shell, so a wrong answer inside a lesson teaches
   *  exactly the way a wrong answer in a game does. */
  function mountDrill(kind, step, slot) {
    const drill = step.drill ?? {};
    if (drill.prompt) slot.insertAdjacentHTML('beforeend', `<p class="widget-prompt">${esc(drill.prompt)}</p>`);
    const holder = document.createElement('div');
    slot.appendChild(holder);
    holder.innerHTML = '<p class="step-locked-note">Loading questions…</p>';

    Promise.all([import('../games/generators.js'), import('../games/gameShell.js')])
      .then(([gen, shell]) => {
        const pool = drill.pool ?? {};
        const byPool = {
          interval: gen.generateIntervalQuestion,
          chord: gen.generateChordQuestion,
          scale: gen.generateScaleDegreeQuestion,
          letter: gen.generateNoteHuntQuestion,
          clef: gen.generateNoteHuntQuestion,
          spelling: gen.generateNoteHuntQuestion,
          'step-size': gen.generateConstructionQuestion,
        };
        const make = byPool[pool.kind] ?? gen.generateIntervalQuestion;
        const rng = gen.makeRng(hash(lesson.id + kind));

        holder.innerHTML = '';
        const g = shell.createGame(holder, {
          title: STEP_TITLE[kind],
          blurb: drill.feedback ?? '',
          skill: kind === 'challenge' ? 'application' : 'recognition',
          askConfidence: kind === 'challenge',
          nextQuestion: () => make(rng, {
            difficulty: drill.difficulty ?? (kind === 'challenge' ? 3 : 2),
            allowed: pool.ids,
            mode: drill.mode,
          }),
        });
        state.mounted.push(g);
      })
      .catch((err) => {
        holder.innerHTML = `<p class="step-locked-note">Questions unavailable (${esc(err.message)}).</p>`;
      });
  }

  // -------------------------------------------------------------------------
  function playExample(notes, playback) {
    if (!notes?.length) return;
    if (playback === 'chord') return audio.chord(notes, { style: 'block' });
    if (playback === 'sequence-descending') return audio.sequence([...notes].reverse(), {});
    if (playback === 'pair') return audio.interval(notes[0], notes[notes.length - 1], { mode: 'ascending' });
    if (playback === 'sequence-then-chord') {
      audio.sequence(notes, {});
      return setTimeout(() => audio.chord(notes, { style: 'block' }), notes.length * 460 + 350);
    }
    return audio.sequence(notes, {});
  }

  function safeResolve(example) {
    if (!example) return { notes: [], label: '' };
    try {
      return resolveExample(example, state.tonic, {});
    } catch (err) {
      console.warn('[lesson] example failed', err);
      return { notes: [parseNote('C4')], label: '' };
    }
  }

  // -------------------------------------------------------------------------
  host.addEventListener('click', (ev) => {
    const d = ev.target.closest('[data-depth]')?.dataset.depth;
    if (d) { state.depth = d; setSetting('depth', d); paintDepth(); return; }

    const more = ev.target.closest('[data-more]');
    if (more) {
      state.reached = Math.min(STEP_KINDS.length - 1, Number(more.dataset.more) + 1);
      paintArc();
      arcEl.children[state.reached]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }

    const act = ev.target.closest('[data-act]')?.dataset.act;
    // Credit the concepts, not just the lesson: gating is by concept, so
    // without this nothing downstream would ever open.
    if (act === 'done') { completeLesson(lesson.id, lesson.teaches ?? []); go('course'); }
    if (act === 'next' || act === 'prev') {
      const all = Object.values(LESSONS_BY_ID)
        .filter((l) => l.world === lesson.world)
        .sort((a, b) => a.index - b.index);
      const i = all.findIndex((l) => l.id === lesson.id);
      const target = all[i + (act === 'next' ? 1 : -1)];
      if (target) go('lesson', target.id); else go('course');
    }
  });

  paintDepth();
  paintArc();

  return { destroy: teardown };
}

function paras(body) {
  return String(body).split(/\n{2,}/).map((p) => `<p>${esc(p.trim())}</p>`).join('');
}
function hash(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
