# 0042. Distances to the walls while moving

- **Status:** Accepted
- **Date:** 2026-10-12

## Context

Lighting layouts are specified by distances to the walls, such as "0,60 m from the
back wall". The inspector shows coordinates from the room centre, and
snapping (ADR 0041) gives round numbers. While dragging, though, you can't
see how far from the walls the luminaire sits. Labels must follow the active
language's number format ("1,25 m" in es-AR).

## Options

- **When:** only while moving, or also whenever one luminaire is selected
- **Labels:** drawn by the UI from a core event, or as text sprites in 3D
  drawn by core with a formatter supplied by the host

## Decision

- **Only while moving.** Dimensions appear during a drag of a luminaire or a
  move arrow, and disappear when it ends. The view stays clean otherwise.
- **What is measured** (`luminaireDimensions` in `measure.ts`), from the
  luminaire's centre:
  - ceiling and floor mounts, and pendants: to the nearer side wall (x) and
    the nearer back or front wall (z);
  - wall fixtures: along their wall to the nearer corner, and down to the floor;
  - pendants also get their height above the floor while their height arrow
    is dragged.
  A move arrow on a group measures, for each direction, the luminaire nearest
  that wall (`groupDimensions`), so a row shows its distance to each wall.
  Aiming measures nothing.
- **Core draws the lines, and the UI draws the labels.**
  - Core draws thin blue lines with end ticks (`render/DimensionLines.ts`).
  - Core reports each length and its label position on screen through
    `Viewport.onMeasure`, only when something changed, and with an empty list
    when the drag ends.
  - `<lxs-viewport>` draws the labels as small pills over the canvas, using
    the UI's locale formatting and theme tokens.
  - Text stays crisp and themable, and core stays free of DOM UI.

## Consequences

- New public API: `Viewport.onMeasure` and `Measurement`.
- Hosts with their own UI get the lines for free and add labels from the
  event if they want them.
- Distances are measured to the luminaire's centre, the usual reference in
  layouts, not to the edge of its body.
