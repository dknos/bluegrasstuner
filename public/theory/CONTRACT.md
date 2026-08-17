# View + module contract

Read this before writing any module. It exists so four people can build four
visualizations that behave as one instrument.

## Non-negotiables

1. **Zero dependencies.** No npm packages, no CDN links, no build step. Plain
   ES modules loaded by the browser, plain `node --test` for tests.
2. **The theory engine is the only source of musical truth.** Never compute an
   interval, spelling, or chord by hand inside a view. Import it from
   `src/theory/`. If you need something the engine doesn't expose, say so —
   do not work around it.
3. **Colour comes only from `src/ui/color.js`.** Call `intervalCategory()` and
   set `data-iv` on the element. Never hard-code a hex value in a view.
4. **All content is original.** Explanations, examples and exercises are
   written fresh or generated from musical rules. Do not copy prose, tables,
   or example sets from any book.

## The shared state object

Every view receives the same object and renders whatever part of it applies.

```js
/**
 * @typedef {object} ViewState
 * @property {Note[]}  notes     Notes to display, low to high.
 * @property {Note|null} tonic   Reference note for interval colouring.
 * @property {number[]} sounding MIDI numbers audibly playing right now.
 * @property {'none'|'name'|'degree'|'interval'|'semitones'} labelMode
 * @property {Note|null} focus   Note under keyboard focus, if any.
 * @property {object}   opts     View-specific extras (see each view).
 */
```

`Note` is `{ letter, alter, octave }` from `src/theory/pitch.js`. Never a
number — the whole engine exists to keep spelling alive.

## The view interface

```js
export function createPianoView(container, options = {}) {
  // ... build DOM/SVG once ...
  return {
    element,                 // the root node you created
    update(state) {},        // cheap; called on every state change (may be 60/s)
    destroy() {},            // remove listeners, stop observers
  };
}
```

Rules:

- `update()` must be idempotent and must not rebuild the DOM. Build once in
  `create`, then only toggle attributes/classes. It gets called on every audio
  tick.
- Views are **controlled**. They never mutate state. To report a click, call
  `options.onSelect(note)` / `options.onHover(note|null)`.
- Views must work with `notes: []` and `tonic: null` without throwing.
- Every interactive element is reachable by keyboard and has an accessible
  name. Arrow keys move between notes; Enter/Space selects.
- Root element gets `role="group"` and a meaningful `aria-label`.

## Sizing

Views are SVG and scale to their container via `viewBox` +
`width:100%; height:auto`. Do not read `window.innerWidth`. Must stay legible
at 360px wide. Labels that cannot fit are dropped, never overlapped.

## Sounding notes

When a MIDI number appears in `state.sounding`, add class `is-ringing` to that
note's element and set `data-iv`. The animation is defined in `tokens.css` —
do not write your own.

## Files

| Module | Path | Owner |
|---|---|---|
| Piano keyboard | `src/views/piano.js` | lead |
| Staff notation | `src/views/staff.js` | agent |
| Guitar fretboard | `src/views/fretboard.js` | agent |
| Pitch ring | `src/views/pitchring.js` | agent |
| Audio engine | `src/audio/engine.js` | agent |

Each view ships a companion `test/<name>.test.js` that renders it under a
minimal DOM shim and asserts structure (see `test/domshim.js`).
