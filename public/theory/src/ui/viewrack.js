/**
 * VIEW RACK — the four representations, wired to one piece of state.
 *
 * This is the component the whole product rests on. Click E♭ anywhere and E♭
 * lights up on the staff, the keyboard, the fretboard and the pitch ring at
 * the same instant, in the same colour, while the audio engine plays it. A
 * learner who sees that once understands that these are four pictures of one
 * thing, which is the single hardest idea in early music theory.
 *
 * Views are loaded on demand. A lesson that only needs a keyboard never pays
 * for the fretboard renderer, and a view that hasn't been built yet simply
 * doesn't appear rather than taking the page down with it.
 */

const REGISTRY = {
  piano: {
    label: 'Keyboard',
    hint: 'Distance you can see',
    load: () => import('../views/piano.js').then((m) => m.createPianoView),
  },
  staff: {
    label: 'Staff',
    hint: 'How it is written',
    load: () => import('../views/staff.js').then((m) => m.createStaffView),
  },
  fretboard: {
    label: 'Fretboard',
    hint: 'Where it falls under the hand',
    load: () => import('../views/fretboard.js').then((m) => m.createFretboardView),
  },
  ring: {
    label: 'Pitch ring',
    hint: 'No instrument at all',
    load: () => import('../views/pitchring.js').then((m) => m.createPitchRingView),
  },
};

export const VIEW_IDS = Object.keys(REGISTRY);

/**
 * @param {HTMLElement} container
 * @param {object} opts
 * @param {string[]} [opts.views]  which representations to show, in order
 * @param {(note:object)=>void} [opts.onSelect]
 * @param {(note:object|null)=>void} [opts.onHover]
 * @param {boolean} [opts.collapsible] show a toggle per bay
 * @param {object} [opts.viewOptions] per-view option overrides, keyed by id
 */
export function createViewRack(container, opts = {}) {
  const wanted = (opts.views ?? ['piano', 'staff']).filter((id) => REGISTRY[id]);

  const root = document.createElement('div');
  root.className = 'views';
  container.appendChild(root);

  /** @type {Map<string, {api:object, bay:HTMLElement}>} */
  const mounted = new Map();
  let state = { notes: [], tonic: null, sounding: [], labelMode: 'name', focus: null };
  let destroyed = false;

  for (const id of wanted) {
    const meta = REGISTRY[id];

    const bay = document.createElement('section');
    bay.className = 'view-bay';
    bay.dataset.view = id;

    const head = document.createElement('header');
    head.className = 'view-bay-head';
    head.innerHTML =
      `<span class="label">${meta.label}</span>` +
      `<span class="label-sm">${meta.hint}</span>`;

    const body = document.createElement('div');
    body.className = 'view-bay-body';
    body.setAttribute('aria-busy', 'true');

    bay.append(head, body);
    root.appendChild(bay);

    meta.load().then((factory) => {
      if (destroyed) return;
      const api = factory(body, {
        onSelect: opts.onSelect,
        onHover: opts.onHover,
        ariaLabel: `${meta.label}. ${meta.hint}`,
        ...(opts.viewOptions?.[id] ?? {}),
      });
      body.removeAttribute('aria-busy');
      mounted.set(id, { api, bay });
      api.update(state);
    }).catch((err) => {
      // A missing or broken representation must never take the lesson down.
      console.warn(`[viewrack] ${id} unavailable:`, err?.message ?? err);
      bay.remove();
    });
  }

  return {
    element: root,

    update(next) {
      state = { ...state, ...next };
      for (const { api } of mounted.values()) {
        try { api.update(state); } catch (err) { console.warn('[viewrack] update failed', err); }
      }
    },

    /** Which views actually made it onto the page. */
    get active() { return [...mounted.keys()]; },

    destroy() {
      destroyed = true;
      for (const { api } of mounted.values()) { try { api.destroy(); } catch { /* ignore */ } }
      mounted.clear();
      root.remove();
    },
  };
}
