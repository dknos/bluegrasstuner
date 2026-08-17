/**
 * HOME.
 *
 * The hero is the Interval Lab itself, running, above the fold. Not a
 * screenshot, not a video, not a marketing card that links to the demo — the
 * actual tool. A visitor who changes one note has already understood the
 * entire pitch of the product, and no paragraph could have done that.
 */

import { createIntervalLab } from '../labs/intervalLab.js';
import { getState, overallMastery } from '../ui/store.js';

export function render(host, { go, setTransport }) {
  host.innerHTML = `
    <header class="hero">
      <div class="hero-eyebrow label">Interactive music theory</div>
      <h1>Stop reading about intervals.<br><em>Move one.</em></h1>
      <p class="hero-lede">
        Every idea here is something you can hear, watch on four instruments at once, and
        take apart with your hands. Start below: change either note and watch the name,
        the notation and the sound all follow.
      </p>
      <div class="hero-cta">
        <button class="btn btn-primary" data-route="course">Start the course</button>
        <button class="btn" data-route="labs">Open the Lab</button>
        <button class="btn btn-ghost" data-route="games">Play a game</button>
      </div>
    </header>

    <section class="demo" aria-label="Interval Lab">
      <div class="demo-strip">
        <span class="label">Live: try it</span>
        <span class="label-sm">Click any key, or use the − and + buttons</span>
      </div>
      <div id="hero-lab"></div>
    </section>

    <section class="pitch">
      <h2 class="display" style="font-size:var(--step-4)">How this course is built</h2>
      <div class="pitch-grid">
        <article>
          <h3>Nothing is only words</h3>
          <p>Concepts arrive as things you manipulate. You meet the sound of a minor third
          before you are ever told the phrase "minor third".</p>
        </article>
        <article>
          <h3>Four pictures of one thing</h3>
          <p>Staff, keyboard, fretboard and pitch ring stay locked together. The same note
          lights up in the same colour in all four at once.</p>
        </article>
        <article>
          <h3>Spelling is taken seriously</h3>
          <p>F♯ major contains an E♯, not an F. Most apps quietly get this wrong. The whole
          engine here is built around keeping it right.</p>
        </article>
        <article>
          <h3>Knowing and hearing are tracked apart</h3>
          <p>You can recognise a chord on paper and still not hear one. Progress is measured
          as five separate skills, so practice goes where it is actually needed.</p>
        </article>
      </div>
    </section>

    <section class="colourkey panel">
      <div class="colourkey-head">
        <span class="label">The colour system</span>
        <p>Colour is not decoration here. Every note is tinted by its distance from whichever
        note you are measuring from, and it keeps that colour in every view.</p>
      </div>
      <ul class="colourkey-list">
        <li data-iv="tonic"><i></i><b>Tonic</b><span>the note you are measuring from</span></li>
        <li data-iv="perfect"><i></i><b>Perfect</b><span>4ths, 5ths, octaves: the stable frame</span></li>
        <li data-iv="major"><i></i><b>Major</b><span>the brighter option at a degree</span></li>
        <li data-iv="minor"><i></i><b>Minor</b><span>the same degree, lowered</span></li>
        <li data-iv="tritone"><i></i><b>Tritone</b><span>half an octave; belongs to nobody</span></li>
      </ul>
    </section>
  `;

  const lab = createIntervalLab(host.querySelector('#hero-lab'), {
    low: 'C4',
    high: 'E4',
    views: ['piano', 'staff', 'ring', 'fretboard'],
  });

  setTransport({
    label: 'Interval Lab',
    detail: 'Two notes, four views, one sound',
    play: () => lab.play(),
  });

  // Returning learners should land on their work, not on a sales page.
  const { completedLessons } = getState();
  if (completedLessons.length > 0) {
    const resume = document.createElement('div');
    resume.className = 'resume panel';
    resume.innerHTML = `
      <div>
        <span class="label">Welcome back</span>
        <p>You have finished ${completedLessons.length} lesson${completedLessons.length === 1 ? '' : 's'}.</p>
      </div>
      <button class="btn btn-primary" data-route="course">Continue</button>`;
    host.prepend(resume);
  }

  return { destroy: () => lab.destroy() };
}
