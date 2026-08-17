/**
 * STORE — app state, mastery tracking and local persistence.
 *
 * Mastery is deliberately not one percentage. Someone can recognise a minor
 * seventh on paper instantly and still fail to hear one, and a single number
 * hides exactly the gap the learner most needs to close. So every concept
 * carries five independent scores, and the practice scheduler is allowed to
 * see all five.
 *
 * Persistence is localStorage for now. The shape is versioned and flat so it
 * can move to a server later without a migration nightmare.
 */

const KEY = 'mta.v1';

/** @typedef {'recognition'|'construction'|'listening'|'application'|'retention'} Skill */
export const SKILLS = ['recognition', 'construction', 'listening', 'application', 'retention'];

export const SKILL_BLURB = {
  recognition: 'Naming it when you see it',
  construction: 'Building it yourself',
  listening: 'Hearing it without looking',
  application: 'Using it in real music',
  retention: 'Still knowing it next week',
};

function emptyMastery() {
  return { recognition: 0, construction: 0, listening: 0, application: 0, retention: 0 };
}

function defaultState() {
  return {
    version: 1,
    profile: { experience: null, goal: null, onboarded: false },
    settings: {
      theme: 'dark',
      volume: 0.7,
      tempo: 96,
      labelMode: 'name',
      instrument: 'piano',
      tuning: 'guitar-standard',
      reducedMotion: false,
      preferAccidental: 'auto',
    },
    /** conceptId -> { …five skills, attempts, correct, lastSeen, dueAt, ease } */
    mastery: {},
    /** every answered question, newest last. Trimmed to the last 2000. */
    history: [],
    completedLessons: [],
    /** Concept ids credited by finishing a lesson. Gating reads this, not
     *  completedLessons, because prerequisites are concepts. */
    completedConcepts: [],
    practiceLog: [],
    achievements: [],
    streak: { current: 0, best: 0, lastDay: null },
  };
}

let state = load();
const listeners = new Set();

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw);
    // Merge onto defaults so a new field never breaks an old save.
    return { ...defaultState(), ...parsed, settings: { ...defaultState().settings, ...parsed.settings } };
  } catch {
    return defaultState();
  }
}

let saveTimer = null;
function save() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* quota or private mode */ }
  }, 250);
}

export function getState() { return state; }

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function emit() {
  for (const fn of listeners) fn(state);
  save();
}

export function update(fn) {
  const next = fn(state);
  if (next) state = next;
  emit();
}

export function setSetting(key, value) {
  state = { ...state, settings: { ...state.settings, [key]: value } };
  emit();
}

// ---------------------------------------------------------------------------
// Mastery
// ---------------------------------------------------------------------------

export function getMastery(conceptId) {
  return state.mastery[conceptId] ?? {
    ...emptyMastery(), attempts: 0, correct: 0, lastSeen: null, dueAt: 0, ease: 2.3,
  };
}

/**
 * Record an answer.
 *
 * `confidence` genuinely changes the schedule. A correct answer the learner
 * flagged as a guess should come back soon; a confident correct one can wait.
 * Without this, lucky guesses quietly get treated as knowledge.
 *
 * @param {object} p
 * @param {string[]} p.conceptIds
 * @param {Skill} p.skill
 * @param {boolean} p.correct
 * @param {'guessed'|'unsure'|'sure'} [p.confidence]
 * @param {number} [p.responseMs]
 */
export function recordAnswer({ conceptIds, skill, correct, confidence = 'unsure', responseMs = 0 }) {
  const now = Date.now();
  const mastery = { ...state.mastery };

  for (const id of conceptIds) {
    const m = { ...getMastery(id) };
    m.attempts += 1;
    if (correct) m.correct += 1;

    const confidenceWeight = { guessed: 0.25, unsure: 0.65, sure: 1 }[confidence] ?? 0.65;
    const delta = correct ? 0.18 * confidenceWeight : -0.26;
    m[skill] = clamp01((m[skill] ?? 0) + delta);

    // A confident wrong answer is worse than an unsure one — it means the
    // learner has a wrong model, not a missing one.
    if (!correct && confidence === 'sure') m[skill] = clamp01(m[skill] - 0.12);

    m.ease = clamp(correct ? m.ease + 0.06 * confidenceWeight : m.ease - 0.25, 1.3, 3.2);
    m.lastSeen = now;
    m.dueAt = now + nextIntervalMs(m, correct, confidence);
    mastery[id] = m;
  }

  const history = [...state.history, {
    at: now, conceptIds, skill, correct, confidence, responseMs,
  }].slice(-2000);

  state = { ...state, mastery, history };
  touchStreak();
  emit();
}

/** Spaced repetition. Deliberately gentle — this is not a memorization app. */
function nextIntervalMs(m, correct, confidence) {
  const MIN = 60 * 1000;
  const DAY = 24 * 60 * 60 * 1000;
  if (!correct) return 3 * MIN;
  if (confidence === 'guessed') return 10 * MIN;
  const strength = SKILLS.reduce((a, s) => a + (m[s] ?? 0), 0) / SKILLS.length;
  const days = Math.pow(m.ease, strength * 4) - 0.6;
  return Math.max(20 * MIN, days * DAY);
}

/** Concepts due for review, weakest and most overdue first. */
export function dueForReview(limit = 20) {
  const now = Date.now();
  return Object.entries(state.mastery)
    .filter(([, m]) => (m.dueAt ?? 0) <= now && m.attempts > 0)
    .sort((a, b) => (a[1].dueAt ?? 0) - (b[1].dueAt ?? 0))
    .slice(0, limit)
    .map(([id, m]) => ({ conceptId: id, mastery: m }));
}

/**
 * The weakest SKILL, not just the weakest concept. This is what lets the app
 * say "you can name these but you can't hear them" and act on it.
 */
export function weakestSkill(conceptIds = null) {
  const ids = conceptIds ?? Object.keys(state.mastery);
  if (!ids.length) return null;
  const totals = Object.fromEntries(SKILLS.map((s) => [s, { sum: 0, n: 0 }]));
  for (const id of ids) {
    const m = state.mastery[id];
    if (!m || !m.attempts) continue;
    for (const s of SKILLS) { totals[s].sum += m[s] ?? 0; totals[s].n += 1; }
  }
  const scored = SKILLS
    .filter((s) => totals[s].n > 0)
    .map((s) => ({ skill: s, score: totals[s].sum / totals[s].n }));
  if (!scored.length) return null;
  return scored.sort((a, b) => a.score - b.score)[0];
}

export function overallMastery(conceptId) {
  const m = getMastery(conceptId);
  return SKILLS.reduce((a, s) => a + (m[s] ?? 0), 0) / SKILLS.length;
}

/**
 * A lesson's `prerequisites` are CONCEPT ids, so they have to be checked
 * against concepts the learner has covered, not against lesson ids. Checking
 * `completedLessons` here was a real trap: the two id spaces never intersect,
 * so finishing a lesson unlocked nothing and the only way forward was to grind
 * drills to 45% mastery. Someone who reads carefully and skips the drills would
 * have found the whole course bolted shut behind lesson one.
 */
export function isUnlocked(conceptId, prerequisites = []) {
  if (!prerequisites.length) return true;
  return prerequisites.every(
    (p) => overallMastery(p) >= 0.45 || state.completedConcepts.includes(p),
  );
}

/**
 * @param {string} lessonId
 * @param {string[]} [taught] the concept ids this lesson teaches, so finishing
 *   it credits them and opens what depends on them
 */
export function completeLesson(lessonId, taught = []) {
  const newConcepts = taught.filter((c) => !state.completedConcepts.includes(c));
  if (newConcepts.length) {
    state = { ...state, completedConcepts: [...state.completedConcepts, ...newConcepts] };
  }
  if (state.completedLessons.includes(lessonId)) { emit(); return; }
  state = { ...state, completedLessons: [...state.completedLessons, lessonId] };
  emit();
}

function touchStreak() {
  const today = new Date().toISOString().slice(0, 10);
  const { streak } = state;
  if (streak.lastDay === today) return;
  const yesterday = new Date(Date.now() - 864e5).toISOString().slice(0, 10);
  const current = streak.lastDay === yesterday ? streak.current + 1 : 1;
  state = { ...state, streak: { current, best: Math.max(current, streak.best), lastDay: today } };
}

export function logPractice(minutes, kinds) {
  state = {
    ...state,
    practiceLog: [...state.practiceLog, { at: Date.now(), minutes, kinds }].slice(-500),
  };
  emit();
}

export function resetAll() {
  state = defaultState();
  emit();
}

const clamp01 = (n) => Math.min(1, Math.max(0, n));
const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));

// Exposed for tests, which run without a browser.
export const __internals = { defaultState, nextIntervalMs, clamp01 };
