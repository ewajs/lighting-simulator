# 0064. The analysis in the app: a panel, calculated in a Web Worker

- **Status:** Accepted
- **Date:** 2026-10-17

## Context

The illuminance calculation (ADRs 0057, 0060, 0061, 0063) existed only in
core and the manual. M5.4 brings it to the app. The owner's decisions:
- live calculation, throttled, with a switch to calculate only on demand;
- maintenance factor and work plane configurable;
- users can trade accuracy for speed, with the switches that buy time;
- the results in a new **Analysis tab in the left panel**, next to Catalog
  and Scene, so they stay in sight while luminaires are edited on the right;
- the worker lives in `packages/ui`; core stays pure.

A calculation takes 0.3–1 s on an Apple M1 Pro (ADR 0061): on the main thread
it would freeze the 3D view at every edit. ADR 0028 already called for a
Web Worker.

## Decision

### Core: plain data, and an entry without rendering

- **`analysisSnapshot(scene, inputs)`** collects what a scene's calculation
  needs from the host's providers (its products, their photometry and model
  files) as plain data; **`snapshotInputs(snapshot)`** turns it back into
  `AnalysisInputs`. Providers are functions, which can't cross into a worker;
  the snapshot survives a structured clone, which a test checks.
- **`@luxstudio/core/analysis`**, a second entry in core's `exports`, holds
  the calculation without the rendering code. Imported from the main entry,
  the worker bundled 500 KB of three.js it never runs; from this one, 16.5 KB
  (6.7 KB gzipped).

### ui: a worker, a runner, a controller, a panel

| File | Job |
|---|---|
| `analysis-request.ts` | the request and answer, as plain data, and `runAnalysis`, which the worker runs: testable without a worker |
| `analysis-worker.ts` | the Web Worker: a few lines around `runAnalysis` |
| `analysis-runner.ts` | `AnalysisRunner`: one calculation at a time, each change waiting 250 ms for more, a newer request replacing a waiting one, old answers ignored |
| `analysis-controller.ts` | `AnalysisController`, a Lit reactive controller: the settings, options and auto switch, when to calculate, and the state the panel shows |
| `lxs-analysis-panel.ts` | the panel: shows what it's given, reports changes as events (ADR 0021) |

**When it calculates.** Only while the results are on screen: the Analysis
tab open on the desktop, its sheet on a phone. With "Calculate as I edit"
(on by default), each scene edit, setting change or IES file arriving
recalculates after 250 ms without another; a drag's moves don't queue a
calculation each. Off, a Calculate button runs it. Results stay on screen,
faded, while the next calculation runs or once they're out of date, and the
panel says which. The worker is created the first time it's needed and
stops when the app leaves the page.

**What it shows.**
- The work plane first: Ē large, then Emin, Emax and U₀, with its height and
  border.
- Every room surface: Ē, Emin and U₀ in a table.
- That values are maintained, with the factor; luminaires lit by an estimate
  (no IES file) or left out (not in the catalog).
- How long the calculation took.

**What it sets.**
- **The maintenance factor** (0.5–1).
- **The work plane's height and border.**
- **Light that bounces**, and **Furniture in bounced light**: the two
  switches that buy real time (ADR 0061). Turning bounced light off turns
  furniture in it off too, and disables its switch (ADR 0063's dependency).

Splitting openings and furniture shadows aren't offered: they cost little and
the results are worse without them.

**A switch component.** The design system had none; it's a checkbox with
`role="switch"`, drawn as a sliding knob from the theme's tokens, added to
DESIGN.md.

### Settings are UI state, for now

The maintenance factor and the work plane's height and border live in the
app, not in the scene: they reset on reload and aren't in saved files or
share links. Saving them with the scene means a new scene file version
(ADR 0051) and its upgrade; a decision for the owner, noted in the PR.

## Options considered

- **The calculation on the main thread, throttled.** Simpler, but a 1 s
  freeze in a furnished room at every pause in a drag.
- **The worker in core.** Core would own a browser-only module and its
  bundling; the host's worker needs vary (CSP, bundlers). In ui, hosts that
  don't use our UI can still call core directly.
- **Calculating whenever the scene changes, panel open or not.** A
  calculation a second while editing, for numbers nobody sees; the
  false-colour view (next step) will be another reason to calculate.
- **A section in the right inspector when nothing is selected.** It would
  disappear exactly when a luminaire is selected and its effect is wanted.

## Consequences

- Public API: core gains `analysisSnapshot`, `snapshotInputs`,
  `AnalysisSnapshot` and the `@luxstudio/core/analysis` entry; ui gains
  `LxsAnalysisPanel`, `AnalysisController`, `AnalysisState`, `NO_ANALYSIS`,
  `LibraryTab`, `WorkerLike`, `AnalysisRequest`, `AnalysisResponse`, and the
  `lxs-library-tab` event.
- Hosts bundle a Web Worker from ui's source (`new URL(..., import.meta.url)`),
  which Vite does as it is; other bundlers may need their worker support.
- The phone tab bar has five tabs: Catalog, Scene, Analysis, Properties,
  View.
