/**
 * SETTINGS — and, more usefully, the honest view of what the app thinks you know.
 *
 * The mastery table is here rather than buried in a dashboard because it is the
 * one screen that can tell a learner something they did not already know about
 * themselves: that they can name a thing they cannot hear.
 */

import { getState, setSetting, resetAll, SKILLS, SKILL_BLURB, getMastery, weakestSkill } from '../ui/store.js';
import { audio } from '../audio/index.js';

export function render(host, { setTransport }) {
  setTransport({ label: 'Settings', detail: '', play: null });

  const s = getState();
  const concepts = Object.entries(s.mastery).filter(([, m]) => m.attempts > 0);
  const weak = weakestSkill();

  host.innerHTML = `
    <header class="lesson-head">
      <span class="label">Your setup</span>
      <h1>Settings</h1>
    </header>

    <section class="panel settings-block">
      <h2 class="display" style="font-size:var(--step-2)">Sound and display</h2>
      <div class="settings-grid">
        <label class="field">
          <span class="label-sm">Theme</span>
          <select data-set="theme">
            <option value="dark">Dark</option>
            <option value="light">Light</option>
          </select>
        </label>

        <label class="field">
          <span class="label-sm">Note labels</span>
          <select data-set="labelMode">
            <option value="name">Note names</option>
            <option value="degree">Semitones from the root</option>
            <option value="interval">Interval symbols</option>
            <option value="none">None</option>
          </select>
        </label>

        <label class="field">
          <span class="label-sm">Prefer sharps or flats</span>
          <select data-set="preferAccidental">
            <option value="auto">Follow the key</option>
            <option value="sharp">Always sharps</option>
            <option value="flat">Always flats</option>
          </select>
        </label>

        <label class="field">
          <span class="label-sm">Fretboard tuning</span>
          <select data-set="tuning">
            <option value="guitar-standard">Guitar (standard)</option>
            <option value="guitar-drop-d">Guitar (drop D)</option>
            <option value="bass-4">Bass (4 string)</option>
            <option value="ukulele">Ukulele</option>
          </select>
        </label>
      </div>
      <p class="settings-note">
        "Follow the key" is the honest choice: in E♭ major the app writes E♭, and in
        B major it writes D♯, because those really are different notes even though they
        are the same key on a piano.
      </p>
    </section>

    <section class="panel settings-block">
      <h2 class="display" style="font-size:var(--step-2)">What you know</h2>
      ${concepts.length === 0 ? `
        <p class="prose" style="margin-top:var(--s-3);color:var(--text-dim)">
          Nothing tracked yet. Answer a few questions and this fills in.
        </p>` : `
        ${weak ? `<p class="prose" style="margin-top:var(--s-3)">
          Your weakest area right now is <strong>${SKILL_BLURB[weak.skill].toLowerCase()}</strong>.
          Daily practice will lean that way until it catches up.
        </p>` : ''}
        <div class="mastery-table">
          ${concepts.map(([id, m]) => `
            <div class="mastery-concept">
              <div class="mastery-name">${escapeHtml(id)}</div>
              <div class="mastery">
                ${SKILLS.map((sk) => `
                  <div class="mastery-row">
                    <span class="label-sm">${sk}</span>
                    <span class="meter"><i style="width:${Math.round((m[sk] ?? 0) * 100)}%"></i></span>
                    <span class="data" style="font-size:var(--step--2)">${Math.round((m[sk] ?? 0) * 100)}</span>
                  </div>`).join('')}
              </div>
            </div>`).join('')}
        </div>
        <p class="settings-note">
          Five numbers, not one. Recognition is naming it on the page; listening is naming it
          with your eyes shut. They come apart more often than people expect, and averaging
          them into a single score would hide exactly the gap worth working on.
        </p>`}
    </section>

    <section class="panel settings-block">
      <h2 class="display" style="font-size:var(--step-2)">Data</h2>
      <p class="prose" style="margin-top:var(--s-3);color:var(--text-dim)">
        Everything is stored in this browser only. Nothing is sent anywhere.
      </p>
      <div class="row-wrap" style="margin-top:var(--s-4)">
        <button class="btn" data-act="export">Download my progress</button>
        <button class="btn" data-act="reset">Erase everything</button>
      </div>
    </section>
  `;

  // Reflect current values.
  for (const sel of host.querySelectorAll('[data-set]')) {
    const key = sel.dataset.set;
    if (s.settings[key] != null) sel.value = s.settings[key];
    sel.addEventListener('change', () => {
      setSetting(key, sel.value);
      if (key === 'theme') document.documentElement.dataset.theme = sel.value;
    });
  }

  host.addEventListener('click', (ev) => {
    const act = ev.target.closest('[data-act]')?.dataset.act;
    if (act === 'reset') {
      if (confirm('Erase all progress, mastery and settings? This cannot be undone.')) {
        resetAll();
        location.reload();
      }
    }
    if (act === 'export') {
      const blob = new Blob([JSON.stringify(getState(), null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'overtone-progress.json';
      a.click();
      URL.revokeObjectURL(a.href);
    }
  });

  return {};
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
