# 0039. Move handle: our own arrows, shown on the selection

- **Status:** Accepted
- **Date:** 2026-10-12

## Context

Dragging a luminaire (ADR 0038) is quick but imprecise, especially along a
wall seen almost edge-on. SPEC §5 asks for move handles. Every move has to go
through the Simulator, so it respects mount constraints and undo. Touch has
to work.

## Options

- **Handles:** three.js `TransformControls` (in `three/addons`, so no new
  dependency), or our own arrows on top of the existing pointer handling and
  ray maths
- **When the handle shows:** whenever something is selected, or only after
  pressing `W` or a toolbar button

## Decision

- **Our own arrows.** `TransformControls` moves an `Object3D` freely, with its
  own pointer handling and fixed red/green/blue colours. It would need a proxy
  object reset after every Simulator edit, it would compete with fixture drags
  and the camera, its arrows are hard to hit by touch, and its rotate mode
  doesn't express tilt and pan for the aim handle (M2.3).
- **Axes per mount** (`luminaireAxes`, `groupAxes` in `move-handle.ts`):
  - Ceiling and floor mounts get x and z, and pendants also get height.
  - Wall fixtures get "along their wall" (x or z, depending on the wall) and height.
  - A selection gets the axes all of its luminaires share, so a ceiling light
    with a back-wall light gets only x. The handle sits at the selection's centre.
- **Sliding** uses the point on the axis closest to the pointer ray
  (`axisOffset`). The whole group moves by one distance, limited so that
  every luminaire stays in the room, which keeps the group's shape. One drag
  is one undo step.
- **Look:**
  - Double-headed arrows with a 16 px gap in the middle, so the fixture under
    them can still be dragged. Presses within the gap are never handle presses,
    even when an arrow points at the camera.
  - Constant on-screen size. 28 px wide invisible grab areas for touch.
  - Drawn on top of the scene. The hovered or dragged axis turns amber.
- **API:** `Viewport.handle` (`'move' | 'none'`, default `'none'`) and
  `<lxs-viewport handle>`. `<lxs-app>` shows the move handle whenever
  something is selected. `W`/`E` switching and a toolbar toggle come with the
  aim handle (M2.3).
- **Colours under exposure:** the renderer tone-maps the whole frame for
  real light levels, so a plain colour comes out nearly black. The handle's
  and the selection outline's materials divide the exposure back out
  (`color / toneMappingExposure`).

## Consequences

- New public API: `Viewport.handle`, `HandleMode`, and `handle` on `<lxs-viewport>`.
- Pressing a handle never changes the selection. Clicks pass through to
  fixtures only in the centre gap.
- The selection outline is now amber, as intended. Before this it was
  nearly black.
- An arrow pointing almost straight at the camera is short on screen and
  moves the luminaire fast. Orbiting, or the other arrows, avoids it.
