/**
 * COURSE MAP — the dependency graph, drawn.
 *
 * Music theory is not a list, it is a structure, and the single most useful
 * thing you can show a learner early is the shape of what they are climbing.
 * Nodes are concepts, edges are "you need this first", and the layout comes
 * from a topological sort so the picture is the truth rather than a drawing of
 * the truth.
 */

import { CONCEPTS, PREREQUISITES, LESSON_FOR_CONCEPT, isStubConcept } from '../lessons/index.js';
import { topoOrder } from '../lessons/schema.js';
import { overallMastery, getState } from '../ui/store.js';

export function render(host, { go, setTransport }) {
  setTransport({ label: 'Course map', detail: '', play: null });

  const done = new Set(getState().completedLessons);
  const layers = layerByDepth(CONCEPTS);

  host.innerHTML = `
    <header class="lesson-head">
      <span class="label">Where you are</span>
      <h1>Course map</h1>
      <p class="prose" style="margin-top:var(--s-3);color:var(--text-dim)">
        Every idea in the course, and what has to be understood before it. Lines run from a
        concept to the things it depends on. Nothing here is arbitrary. If you cannot reach a
        node yet, the path to it is visible.
      </p>
    </header>

    <div class="map-legend row-wrap">
      <span class="chip" data-iv="perfect">Solid</span>
      <span class="chip" data-iv="major">In progress</span>
      <span class="chip" data-iv="none">Not started</span>
      <span class="label-sm">Dimmed nodes belong to worlds still being written</span>
    </div>

    <div class="map" role="list">
      ${layers.map((layer, depth) => `
        <div class="map-layer" role="listitem">
          <div class="map-layer-rule"><span class="label-sm">Depth ${depth}</span></div>
          <div class="map-nodes">
            ${layer.map((id) => renderNode(id, done)).join('')}
          </div>
        </div>`).join('')}
    </div>
  `;

  host.addEventListener('click', (ev) => {
    const node = ev.target.closest('[data-concept]');
    if (!node) return;
    const lesson = LESSON_FOR_CONCEPT[node.dataset.concept];
    if (lesson) go('lesson', lesson.id ?? lesson);
  });

  return {};
}

function renderNode(id, done) {
  const c = CONCEPTS[id];
  const m = overallMastery(id);
  const stub = isStubConcept(id);
  const lesson = LESSON_FOR_CONCEPT[id];
  const cat = m >= 0.6 ? 'perfect' : m > 0 ? 'major' : 'none';

  return `
    <button class="map-node ${stub ? 'is-stub' : ''}" data-concept="${esc(id)}" data-iv="${cat}"
            ${lesson ? '' : 'disabled'}
            title="${esc(c.summary ?? '')}">
      <span class="map-node-title">${esc(c.title)}</span>
      ${c.requires?.length
        ? `<span class="map-node-req label-sm">needs ${c.requires.map((r) => esc(CONCEPTS[r]?.title ?? r)).join(', ')}</span>`
        : `<span class="map-node-req label-sm">start here</span>`}
      <span class="map-node-meter meter"><i style="width:${Math.round(m * 100)}%"></i></span>
    </button>`;
}

/** Longest path from a root — puts every concept below everything it needs. */
function layerByDepth(concepts) {
  const depth = new Map();
  const visit = (id, seen = new Set()) => {
    if (depth.has(id)) return depth.get(id);
    if (seen.has(id)) return 0; // defensive: the graph is validated acyclic
    seen.add(id);
    const reqs = concepts[id]?.requires ?? [];
    const d = reqs.length ? 1 + Math.max(...reqs.map((r) => visit(r, seen))) : 0;
    depth.set(id, d);
    return d;
  };
  for (const id of Object.keys(concepts)) visit(id);

  const max = Math.max(0, ...depth.values());
  const layers = Array.from({ length: max + 1 }, () => []);
  for (const [id, d] of depth) layers[d].push(id);
  for (const l of layers) l.sort((a, b) => (concepts[a].world - concepts[b].world) || a.localeCompare(b));
  return layers;
}

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
