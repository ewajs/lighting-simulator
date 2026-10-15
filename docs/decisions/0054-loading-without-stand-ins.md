# 0054. Loading without stand-ins, and no page zoom on phones

- **Status:** Accepted
- **Date:** 2026-10-16

## Context

On load, the scene drew before its files arrived: generic lights before the
IES files, placeholder boxes before the models, a plain colour before the
oak floor. Then everything swapped in, which looks wrong and unfinished. The
same happened, smaller, whenever a new product or material came in. Before
any of that, the page was blank while 353 KB (gzipped) of JavaScript loaded.

On phones, a double tap or a pinch on a panel zoomed the whole page, pushing
the top bar or the sheet off screen.

## Options

- **While files load:** draw stand-ins and swap / hide what isn't ready /
  hide the whole scene
- **The spinner:** always / only when loading takes longer than feels
  instant
- **A hung provider:** wait forever / give up after a while
- **Page zoom:** block double-tap only / double-tap and pinch

## Decision

- **Nothing shows with a stand-in.**
  - **A luminaire** isn't drawn until its product has settled: its IES file
    and model have each arrived, turned out not to exist, failed or timed
    out, and the model has been parsed.
  - **A surface** keeps the texture it had while a new one loads and
    decodes; a surface that had none shows its colour.
  - **At start-up**, `<lxs-viewport>` keeps the whole scene hidden until
    nothing is loading, then fades it in (no fade with reduced motion) and
    fires `lxs-ready`. Opening a whole scene (a file, a template, a link)
    hides it the same way through `cover()`, if anything still needs
    loading.
- **A spinner only after ¼ s:** "Cargando escena…" over the hidden scene,
  or a small "Cargando…" pill over a visible one. Anything quicker feels
  instant and shows no spinner.
- **Core reports it:**
  - `Simulator.productSettled`, `textureSettled` and `onAssetSettled`, which
    fires when a load ends in any way, so what waited on a failed file
    still appears without it;
  - `Viewport.loading` and `onLoadingChange`, which also count model
    parsing and texture decoding.
- **Loads time out after 15 s** (`LOAD_TIMEOUT_MS`) with a warning, so a hung
  provider can't keep things hidden forever. A file that still arrives later
  is used then.
- **Before any script runs,** the demo's `index.html` shows a plain HTML and
  CSS loader in the theme's colours, removed on `lxs-ready`. Hosts do the
  same in their own page.
- **No page zoom on the app:** `touch-action: pan-x pan-y` on `<lxs-app>`
  turns off double-tap and pinch zoom on its panels and bars; scrolling
  still works and the 3D view keeps its own gestures. iOS Safari zooms on a
  pinch whatever CSS says, so its `gesturestart` is cancelled too, for
  pinches that start on the app. The demo's viewport meta also asks for no
  scaling. The cost: no pinch-zoom to read small text in the panels; the
  phone's own text size still applies.

## Consequences

- New public API:
  - core: `Simulator.productSettled`, `textureSettled`, `onAssetSettled`,
    `Viewport.loading`, `onLoadingChange`;
  - UI: `<lxs-viewport>.cover()` and `lxs-ready`.
- `Diagnostics.luminaires` now counts luminaires drawn, not in the scene.
- A luminaire whose IES file is slow appears late rather than wrong. If a
  provider takes over 15 s, it appears with the generic light, then swaps.
- Opening a scene with nothing new to load shows it at once; one with new
  files shows a blank viewport for up to ¼ s, then the spinner.
- The e2e suite waits for the page's loader to go (`ready()`) before
  touching the app.
