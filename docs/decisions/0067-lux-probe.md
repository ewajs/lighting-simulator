# 0067. The lux probe: the light at any point, exactly

- **Status:** Accepted
- **Date:** 2026-10-17

## Context

SPEC §4.4: "hover or click any surface to read lux". The illuminance view
(ADR 0066) shows the light in colour; a designer also needs the number at the
point that matters, say the middle of a desk, and its parts.

## Decision

**Calculated, not read off the map.** The analysis worker keeps the scene's
light from its last calculation (`AnalysisService`): the luminaires' cells,
the furniture, and the patches' exitance. A probe asks it for the light at a
point and the way the surface there faces, and it answers with core's
`illuminanceAt`: direct, bounced and total, maintained, exact at that point,
not interpolated between grid points. A reading takes about a millisecond.
`analyseIlluminance` is now `sceneLight` plus `analyseSceneLight`, so the
worker keeps the light without calculating it twice.

**Where.** Core's viewport finds the point: `surfaceAt(x, y)` casts a ray at
the illuminance view's planes and returns the nearest one facing the camera,
with its surface and normal. It works only in that view, where what's
probed is what's shown.

**How.**
- With a mouse, the readout follows the pointer over the calculated surfaces,
  once per animation frame, and goes when the pointer leaves.
- With a finger, a tap (moving less than 10 px) places it, so drags and
  orbiting work as before.
- The readout (`lxs-probe`) sits beside the pointer and shows the total in
  lux, then the direct and bounced light, and the surface. It flips to the
  pointer's other side near the viewport's edges and the legend.
- A probe is sent at once; only the answer to the latest is shown.
- After each new calculation the controller reads the probed point again, so
  the number follows the scene as it changes.

## Options considered

- **Interpolating the grid in the browser.** No worker round trip, but the
  value would be the map's, between points up to 0.5 m apart, not the light
  at the point; near a spot's edge, quite different.
- **Pinning several probes.** Useful for reports (PDF, later); one live
  probe answers "how much light here?".
- **Probing in every render mode.** Outside the illuminance view nothing on
  screen says the analysis is current, and the room's own surfaces don't
  include the work plane.

## Consequences

- Public API: core gains `analyseSceneLight`, `Viewport.surfaceAt`,
  `SurfacePoint`, and `illuminanceAt`/`sceneLight` in the
  `@luxstudio/core/analysis` entry; ui gains `lxs-probe`, the `lxs-probe`
  event and `ProbeDetail`, `AnalysisController.probe`/`clearProbe`,
  `AnalysisState.probe`, and the worker's `ProbeRequest`/`ProbeResponse`,
  with `AnalysisService` in place of `runAnalysis`.
- The worker keeps one scene's light in memory: the sources, the patches and
  their exitance.
