# 0066. The illuminance view: the calculation drawn in false colour

- **Status:** Accepted
- **Date:** 2026-10-17

## Context

SPEC §4.4 asks for a false-colour mode: illuminance on the work plane and the
room's surfaces, with a legend in lux. DESIGN.md already had its colours (the
`--lxs-heat-*` tokens) and its place (the legend bottom right, where the
exposure slider sits), and the render-mode switch had a greyed-out
Iluminancia button waiting.

## Decision

**What it draws.** The `illuminance` render mode draws each surface the
analysis calculated (the work plane, the floor, the ceiling and the four
walls) as a plane coloured by its grid (`IlluminanceMeshes`):
- **one texel per grid point,** blended linearly between them;
- **unlit,** so the colours are the scale's, whatever the light;
- **facing into the room,** so from outside the near walls drop away, as
  the room's own do;
- **the work plane floats at its height,** within its border, over the
  floor, which shows in the border strip, as DIALux draws it;
- **furniture and luminaires in clay,** so you can see where they are.

The grid now records the rectangle it covers (`CalcGrid.rect`), so drawing
it never repeats how `roomGrids` lays it out.

**The scale** is one table in core (`FALSE_COLOUR_STOPS`, `falseColour`):
DESIGN.md's eight colours, from dark blue to white, at 0, 50, 100, 200, 300,
500, 1000 and 2000 lx. That's roughly logarithmic, and it puts the levels EN
12464-1 asks for at colour changes. The 3D view and its legend
(`lxs-illuminance-legend`, a gradient with a tick at each stop) both read
it, so they can't disagree.

**Tone mapping.** three's WebGPU renderer tone-maps the whole frame in its
output step, whatever a material says. Under the scene's AgX tone mapping and
physically calibrated exposure, the first version's colours came out dark and
muddy. In the illuminance mode the viewport switches tone mapping off and the
exposure to 1, so the colours come out exactly as the scale gives them. It
also turns the luminaires' lights off, since they're calibrated for the usual
exposure, and lights the clay furniture and fittings with a plain studio
light so they keep their shape. Leaving the mode restores all of it.

**When it calculates.** Choosing the view counts as the results being on
screen (ADR 0064): it calculates with the Analysis tab closed. The legend
says when the map is calculating or out of date. The `3` key selects it,
as SPEC planned, after `1` realistic and `2` clay.

## Options considered

- **Colouring the room's own materials.** It ties the analysis to the
  room's meshes and textures, and the work plane isn't one of them.
- **Isolux lines instead of colour.** Precise to read but harder to take in
  at a glance; the probe (next step) gives exact values.
- **A smooth scale computed per scene** (from its minimum to its maximum). Two
  scenes would colour the same lux differently; a fixed scale lets colours be
  compared.

## Consequences

- Public API: `RenderMode` gains `'illuminance'`; core exports
  `FALSE_COLOUR_STOPS`, `falseColour`, `FalseColourStop`, `GridRect` and
  `CalcGrid.rect`; `Viewport.illuminance`; ui gains `lxs-illuminance-legend`
  and the viewport controls' `legend-note`.
- On phones the legend shows in the View sheet with the other controls,
  not over the viewport.
