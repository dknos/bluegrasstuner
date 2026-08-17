/**
 * GAME SHELL — the loop every game shares.
 *
 * Ask, answer, judge, teach, schedule, repeat. The part worth getting right is
 * the teaching: a wrong answer here is never just marked wrong. It gets the
 * reasoning that would have produced the right answer, and then it gets the
 * two sounds back to back, because "these are different" is a thing you learn
 * with your ears and not with your eyes.
 *
 * Confidence is asked for, not inferred. A learner who guesses correctly and
 * says so gets the question again soon; without that, luck silently reads as
 * knowledge and the scheduler stops being useful.
 */

import { recordAnswer } from '../ui/store.js';
import { audio, isAudioReady, unlockAudio } from '../audio/index.js';
import { noteName } from '../theory/pitch.js';

const CONFIDENCE = [
  { id: 'guessed', label: 'I guessed' },
  { id: 'unsure', label: 'Not sure' },
  { id: 'sure', label: 'Sure' },
];

/**
 * @param {HTMLElement} host
 * @param {object} cfg
 * @param {string} cfg.title
 * @param {string} cfg.blurb
 * @param {() => object} cfg.nextQuestion  must return the generator question shape
 * @param {'recognition'|'construction'|'listening'|'application'} cfg.skill
 * @param {(q:object, el:HTMLElement) => (void|{destroy?:Function})} [cfg.renderStimulus]
 *        optional custom presentation (a keyboard to click, a staff to read…)
 * @param {boolean} [cfg.askConfidence=true]
 * @param {number} [cfg.timeLimitMs] 0 or undefined for untimed
 */
export function createGame(host, cfg) {
  let disarm = null;
  const state = {
    q: null,
    asked: 0,
    correct: 0,
    streak: 0,
    bestStreak: 0,
    startedAt: 0,
    answered: false,
    chosenId: null,
    confidence: null,
    timerId: null,
    stimulus: null,
  };

  host.innerHTML = `
    <header class="game-head">
      <div>
        <span class="label">Game</span>
        <h1 class="display" style="font-size:var(--step-4)">${esc(cfg.title)}</h1>
        <p class="game-blurb">${esc(cfg.blurb)}</p>
      </div>
      <div class="scorestrip" id="g-score"></div>
    </header>

    <section class="game-body panel">
      <div class="game-stimulus" id="g-stimulus"></div>
      <div class="game-prompt" id="g-prompt"></div>
      <div class="choices" id="g-choices"></div>
      <div id="g-verdict"></div>
    </section>

    <div class="game-foot">
      <button class="btn" data-act="replay">Hear it again</button>
      <button class="btn btn-ghost" data-act="skip">Skip</button>
      <span class="game-timer data" id="g-timer" aria-live="off"></span>
    </div>
  `;

  const $ = (id) => host.querySelector(id);
  const elStim = $('#g-stimulus');
  const elPrompt = $('#g-prompt');
  const elChoices = $('#g-choices');
  const elVerdict = $('#g-verdict');
  const elScore = $('#g-score');
  const elTimer = $('#g-timer');

  // -------------------------------------------------------------------------
  function paintScore() {
    const pct = state.asked ? Math.round((state.correct / state.asked) * 100) : 0;
    elScore.innerHTML = `
      <div class="stat"><span class="v">${state.correct}/${state.asked}</span><span class="k">Correct</span></div>
      <div class="stat"><span class="v">${pct}%</span><span class="k">Accuracy</span></div>
      <div class="stat"><span class="v">${state.streak}</span><span class="k">Streak</span></div>
      <div class="stat"><span class="v">${state.bestStreak}</span><span class="k">Best</span></div>`;
  }

  function clearTimer() {
    if (state.timerId) { clearInterval(state.timerId); state.timerId = null; }
    elTimer.textContent = '';
  }

  function startTimer() {
    if (!cfg.timeLimitMs) return;
    const end = Date.now() + cfg.timeLimitMs;
    state.timerId = setInterval(() => {
      const left = Math.max(0, end - Date.now());
      elTimer.textContent = `${(left / 1000).toFixed(1)}s`;
      elTimer.classList.toggle('is-low', left < cfg.timeLimitMs * 0.3);
      if (left <= 0) { clearTimer(); if (!state.answered) answer(null); }
    }, 100);
  }

  // -------------------------------------------------------------------------
  function ask() {
    clearTimer();
    if (state.stimulus?.destroy) { try { state.stimulus.destroy(); } catch { /* ignore */ } }
    elStim.innerHTML = '';
    elVerdict.innerHTML = '';

    state.q = cfg.nextQuestion();
    state.answered = false;
    state.chosenId = null;
    state.confidence = null;
    state.startedAt = performance.now();

    elPrompt.innerHTML = `<p class="game-question">${esc(state.q.prompt)}</p>`;

    state.stimulus = cfg.renderStimulus?.(state.q, elStim) ?? null;

    elChoices.innerHTML = (state.q.choices ?? []).map((c) => `
      <button class="choice" data-choice="${esc(c.id)}">
        <span class="choice-main">${esc(c.label)}</span>
        ${c.sub ? `<span class="choice-sub">${esc(c.sub)}</span>` : ''}
      </button>`).join('');

    playStimulus();
    startTimer();
  }

  function playStimulus() {
    const p = state.q?.promptAudio;
    if (!p) return;

    // A browser will not start audio until the page has been interacted with,
    // so a question asked on a freshly loaded URL cannot sound yet. For an ear
    // game that is the difference between playable and broken, so arm the
    // first gesture to play it rather than letting the learner sit in silence
    // wondering what they are supposed to be identifying.
    if (!isAudioReady()) {
      armFirstGesture();
      return;
    }

    if (p.style === 'harmonic') audio.chord(p.notes, { style: 'block' });
    else if (p.style === 'chord') audio.chord(p.notes, { style: p.arp ? 'arpeggio' : 'block' });
    else audio.sequence(p.notes, { gap: p.gap ?? 0.42 });
  }

  /** One-shot: replay the current question as soon as audio is allowed. */
  function armFirstGesture() {
    if (state.armed) return;
    state.armed = true;
    const fire = () => {
      window.removeEventListener('pointerdown', fire, true);
      window.removeEventListener('keydown', fire, true);
      state.armed = false;
      // Wait on the unlock itself rather than guessing at a delay. Opening the
      // context is synchronous but building the engine behind it is not, and a
      // fixed timeout races that: too short and the question stays silent,
      // which is the exact failure this whole mechanism exists to prevent.
      unlockAudio().then((ok) => { if (ok) playStimulus(); }, () => {});
    };
    window.addEventListener('pointerdown', fire, true);
    window.addEventListener('keydown', fire, true);
    disarm = fire;
  }

  // -------------------------------------------------------------------------
  function answer(choiceId) {
    if (state.answered) return;
    state.answered = true;
    clearTimer();

    const q = state.q;
    const correct = choiceId === q.answerId;
    const responseMs = Math.round(performance.now() - state.startedAt);

    state.asked += 1;
    if (correct) {
      state.correct += 1;
      state.streak += 1;
      state.bestStreak = Math.max(state.streak, state.bestStreak);
    } else {
      state.streak = 0;
    }
    state.chosenId = choiceId;
    paintScore();

    for (const b of elChoices.querySelectorAll('.choice')) {
      b.disabled = true;
      if (b.dataset.choice === q.answerId) b.classList.add('is-correct');
      if (b.dataset.choice === choiceId && !correct) b.classList.add('is-wrong');
    }

    renderVerdict(correct, choiceId, responseMs);
  }

  function renderVerdict(correct, choiceId, responseMs) {
    const q = state.q;
    const teaching = safeExplain(q, choiceId);

    elVerdict.innerHTML = `
      <div class="verdict ${correct ? 'is-correct' : 'is-wrong'}">
        <h3>${correct ? 'Yes.' : choiceId === null ? 'Time.' : 'Not that one.'}</h3>
        ${teaching.headline ? `<p class="prose">${esc(teaching.headline)}</p>` : ''}
        ${teaching.steps?.length ? `
          <ul class="reasoning">
            ${teaching.steps.map((s) => `
              <li><span class="r-key">${esc(s.key)}</span><span class="r-val">${s.html ?? esc(s.value)}</span></li>`).join('')}
          </ul>` : ''}
        ${teaching.compare ? `
          <div class="compare">
            <span class="label-sm">Hear the difference</span>
            <div class="row-wrap" style="margin-top:var(--s-2)">
              <button class="btn" data-act="cmp-a">${esc(teaching.compare.aLabel)}</button>
              <button class="btn" data-act="cmp-b">${esc(teaching.compare.bLabel)}</button>
              <button class="btn btn-primary" data-act="cmp-ab">Both, back to back</button>
            </div>
          </div>` : ''}

        ${cfg.askConfidence !== false ? `
          <div class="confidence-block">
            <span class="label-sm">How sure were you?</span>
            <div class="confidence" style="margin-top:var(--s-2)">
              ${CONFIDENCE.map((c) => `<button class="btn btn-ghost" data-conf="${c.id}">${c.label}</button>`).join('')}
            </div>
          </div>` : `<div style="margin-top:var(--s-4)"><button class="btn btn-primary" data-act="next">Next</button></div>`}
      </div>`;

    if (cfg.askConfidence === false) commit('unsure', correct, responseMs);
    else elVerdict.dataset.pending = JSON.stringify({ correct, responseMs });
  }

  function commit(confidence, correct, responseMs) {
    recordAnswer({
      conceptIds: state.q.conceptIds ?? [],
      skill: cfg.skill,
      correct,
      confidence,
      responseMs,
    });
  }

  /** Never let a generator bug take the game down mid-question. */
  function safeExplain(q, choiceId) {
    try {
      const out = q.explain?.(choiceId);
      return out && typeof out === 'object' ? out : { headline: '' };
    } catch (err) {
      console.warn('[game] explain failed', err);
      return { headline: '' };
    }
  }

  // -------------------------------------------------------------------------
  host.addEventListener('click', (ev) => {
    const choice = ev.target.closest('[data-choice]');
    if (choice && !state.answered) { answer(choice.dataset.choice); return; }

    const conf = ev.target.closest('[data-conf]')?.dataset.conf;
    if (conf) {
      const pending = JSON.parse(elVerdict.dataset.pending ?? '{}');
      commit(conf, pending.correct, pending.responseMs);
      ask();
      return;
    }

    const act = ev.target.closest('[data-act]')?.dataset.act;
    if (!act) return;
    const cmp = safeExplain(state.q, state.chosenId).compare;
    if (act === 'replay') playStimulus();
    if (act === 'skip') { if (!state.answered) answer(null); else ask(); }
    if (act === 'next') ask();
    if (act === 'cmp-a' && cmp) audio.sequence(cmp.a, { gap: 0.42 });
    if (act === 'cmp-b' && cmp) audio.sequence(cmp.b, { gap: 0.42 });
    if (act === 'cmp-ab' && cmp) {
      audio.sequence(cmp.a, { gap: 0.42 });
      setTimeout(() => audio.sequence(cmp.b, { gap: 0.42 }), 1500);
    }
  });

  // Number keys pick answers — a game you have to mouse through is not a game.
  function onKey(ev) {
    if (/^(INPUT|TEXTAREA|SELECT)$/.test(ev.target.tagName)) return;
    const n = Number(ev.key);
    if (n >= 1 && n <= 9) {
      const btns = [...elChoices.querySelectorAll('.choice')];
      btns[n - 1]?.click();
    }
    if (ev.key === 'r') playStimulus();
    if (ev.key === 'Enter' && state.answered) {
      host.querySelector('[data-act="next"]')?.click();
      host.querySelector('[data-conf="unsure"]')?.click();
    }
  }
  document.addEventListener('keydown', onKey);

  paintScore();
  ask();

  return {
    replay: playStimulus,
    destroy() {
      if (disarm) { disarm(); disarm = null; }
      clearTimer();
      document.removeEventListener('keydown', onKey);
      if (state.stimulus?.destroy) { try { state.stimulus.destroy(); } catch { /* ignore */ } }
    },
  };
}

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
