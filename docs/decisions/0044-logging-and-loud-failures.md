# 0044. Logging, diagnostics and loud test failures

- **Status:** Accepted
- **Date:** 2026-10-12

## Context

Two bugs reached the deployed demo unnoticed. One made three.js throw
every frame after a light was dimmed to zero; the other printed about 15
warnings on a drag. The e2e suite only checked page errors in some tests,
and never warnings. The library's own messages went straight to
`console.warn`, and there was no way to see what it was doing step by step.
The owner wants to follow the system more closely and catch problems before
showing it to anyone.

## Options

- **Logging:** call `console` directly, or inject a logger like the providers
- **Tests:** keep per-test error checks, or fail every test on any unexpected
  page error, console error or warning

## Decision

- **An injected `Logger`** (`debug`, `info`, `warn`, `error`; `console` is
  one) on `SimulatorOptions.logger`.
  - The default, `consoleLogger('warn')`, passes only warnings and errors,
    so production consoles stay quiet. `consoleLogger('debug')` shows every
    step.
  - The viewport and the UI log through the same logger (`simulator.logger`).
  - Messages start with their area: `[scene]`, `[photometry]`, `[models]`,
    `[render]`, `[drag]`, `[ui]`.
- **What is logged:**
  - At debug level:
    - every scene edit, once per undo step (a whole slider or pointer drag is one line), and undo/redo;
    - each IES and model load, with timing and a summary: the file's own name, angle grid, peak, flux and beam; the model's size and the named parts it has;
    - shadow budget changes;
    - drag start and end.
  - At info level: the renderer backend.
  - Warnings and errors: unchanged in substance.
- **Diagnostics:** `Viewport.diagnostics()` returns backend, smoothed fps,
  luminaires, shadow casters, and draw calls and triangles per frame.
  `<lxs-app diagnostics>` shows them over the viewport.
- **The demo's `?debug`** URL switch turns on both: debug logging and the overlay.
- **Every e2e test fails** on an unexpected page error, console error or
  console warning (`e2e/fixtures.ts`). Tests that cause one on purpose
  declare it with `allowConsole`. three.js's "WebGPU is not available"
  notice is always allowed.

## Consequences

- New public API: `Logger`, `LogLevel`, `consoleLogger`,
  `SimulatorOptions.logger`, `Simulator.logger`, `Viewport.diagnostics()`,
  `Diagnostics`, and `diagnostics` on `<lxs-app>` and `<lxs-viewport>`.
- A new warning anywhere now fails the suite, which is the point: it gets
  looked at instead of scrolling past.
- Hosts can send the library's messages to their own logging or error tracking.
