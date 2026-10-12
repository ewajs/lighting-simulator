# 0041. Snapping: grid, alignment, pan steps

- **Status:** Accepted
- **Date:** 2026-10-12

## Context

Dragging (ADR 0038) and the move and aim handles (ADRs 0039, 0040) place
luminaires wherever the pointer goes. Layouts want round numbers and
fixtures in line ("a row of downlights"). Touch has no modifier keys.

## Options

- **Grid origin:** the room centre, or a wall corner
- **Turning it off:** Alt during a drag only, or Alt plus a toolbar toggle
- **Scope:** snapping together with distances to the walls, or snapping
  first and distances as their own step (M2.5)

## Decision

- **Snapping comes first; distances to the walls are M2.5.** Distances need
  locale-formatted labels drawn by the UI, which is a separate change.
- **Grid:** 10 cm (`GRID_STEP`), measured from the room centre, which suits
  symmetric layouts. A drag snaps the coordinates it changes:
  - dragging a luminaire: x and z, along the wall and height for wall fixtures,
    and never a pendant's height;
  - a move arrow: the group's centre along that axis.
  In a group, the grabbed luminaire (or the handle's centre) snaps and the
  rest keep their offsets.
- **Alignment:** across the room, a coordinate within 8 px on screen
  (converted to metres at the luminaire's distance) of another luminaire's
  x or z, or of a room centre line, snaps onto it. Alignment wins over the
  grid. A dashed blue guide line across the room shows each alignment while
  dragging. Blue keeps it apart from the amber selection.
- **Rotation ring:** pan snaps to 15° steps (`PAN_STEP_DEG`). The aim point
  doesn't snap.
- **Turning it off:** hold Alt/Option during a drag for free movement. A
  magnet toggle ("Imán") under Move/Aim switches snapping for everyone,
  including touch. It's on by default.
- **Code:** the rules are pure (`snap.ts`). The drags take a `SnapOptions | null`
  and return the guides they found. The handles, press targets and drags moved
  from `Viewport` into `render/Manipulator.ts` (no behaviour change), and guides
  are drawn by `render/SnapGuides.ts`.

## Consequences

- New public API: `Viewport.snapping` (default true), `snapping` on
  `<lxs-viewport>` and `<lxs-viewport-controls>`, and the
  `lxs-snapping-change` event.
- A room whose half-width isn't a multiple of 10 cm has walls off the grid.
  Snapping can't reach the wall exactly there; the inspector can.
- Drops from the catalog don't snap yet.
