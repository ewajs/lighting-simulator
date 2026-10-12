# 0038. Drag to move, built into the Viewport

- **Status:** Accepted
- **Date:** 2026-10-12

## Context

M2 adds direct manipulation (SPEC §5: "direct manipulation first"). The first
step is dragging a luminaire in 3D. The viewport only reported clicks
(ADR 0019), and document edits go straight to the Simulator (ADR 0025).
Each mount type allows different places: ceiling, floor, a height below the
ceiling, or a wall (`constrainPosition`).

## Options

- **Who runs the drag:** core's `Viewport` edits the Simulator itself, or it
  only reports pointer rays and the UI layer does the edits
- **What can be dragged:** any luminaire, or only one already selected
- **Where a dragged luminaire goes:** onto the surface under the pointer for
  its mount type, or onto the floor point under the pointer (as drops did)

## Decision

- **The Viewport runs the drag.** A press on a fixture that moves past the tap
  tolerance becomes a drag. Each move calls `simulator.updateLuminaire` with
  one `mergeKey` per drag, so a drag is one undo step. Hosts with their own UI
  get dragging without writing any. `Viewport.onMoveStart` reports the start
  (`MoveStartEvent`, re-emitted by `<lxs-viewport>` as `lxs-move-start`).
- **Any luminaire can be dragged.** Dragging an unselected one selects it
  alone; dragging a selected one keeps the selection (`selectionForMove` in
  the UI). In core, the group is "the highlighted luminaires, if the grabbed
  one is highlighted", so the viewport still keeps no selection of its own.
- **Surfaces, computed by `mountSurfaceHit`** in `placement.ts`, which uses
  plain rays and is unit-tested in Node. Ceiling mounts slide on the ceiling,
  floor and table lamps on the floor, and pendants at their current height.
  Wall fixtures follow the pointer over the walls seen from inside, and over
  their own wall even when the camera has cut it away. The grab offset is
  kept, so nothing jumps to the pointer. The rest of a group moves by the same
  horizontal offset, then each is constrained to its own mount type.
- **Drops from the catalog use the same surfaces** (`Viewport.dropPoint`
  replaces `pointOnFloor`), so a product lands under the pointer.
- **Camera:** a press on a fixture switches OrbitControls off until it ends.
  Pointer handling lives in `render/PointerGestures.ts`.
- **Touch:** one finger on a fixture drags it, and long press still toggles the
  selection. Dragging products from the catalog stays mouse-only (ADR 0030).

## Consequences

- New public API in core: `Viewport.onMoveStart`, `MoveStartEvent`,
  `Viewport.dropPoint`. `Viewport.pointOnFloor` is removed (packages aren't
  published, ADR 0017).
- Orbiting must start on empty space. A pinch that starts with one finger on a
  fixture does nothing, because OrbitControls never saw that first finger.
- Dragging a wall fixture along a wall seen almost edge-on moves it fast. The
  move handle (M2.2) gives precise control.
- Dragging 20 selected luminaires kept 60 fps in headless Chrome on the
  development Mac. Phones are still unmeasured.
