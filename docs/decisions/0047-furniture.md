# 0047. Furniture: procedural pieces in one design language

- **Status:** Accepted
- **Date:** 2026-10-12

## Context

An empty box room reads poorly, and furniture gives scale and catches light
(SPEC §4.1). The owner wants a coherent set that looks good, not raw cubes:
14 pieces covering living rooms, dining, offices, bedrooms, kitchens, retail
and galleries.

## Options

- **Generate the pieces in code,** in one shared design language
- **Use an open-source glTF set:** Kenney or Quaternius (CC0, toy-like or
  low-poly), or Poly Haven (CC0, photoreal, heavy, not one family)

## Decision

- **Procedural pieces, built in code** under `packages/core/src/render/furniture/`.
  - **`style.ts`** is the design language. Its header comment is the style
    guide: soft edges (`panel` and `cushion`), tapered legs, `GAP` reveals,
    parametric resizing that moves parts instead of stretching them, and one
    coordinated finish palette with real reflectances.
  - **Each piece is a `PieceBuilder`:** `(size, { main, accent }) => Group`.
    The origin is the centre of the footprint on the floor, and +z is the
    front. Wall pieces (artwork) use the centre of their back face instead.
- **The 14 pieces:**
  - **Living:** sofa, armchair, coffee table, plant, TV unit.
  - **Dining:** dining table, chair.
  - **Office:** desk, office chair, bookcase.
  - **Bedroom:** bed.
  - **Kitchen:** kitchen island.
  - **Retail and galleries:** display plinth.
  - **On the wall:** artwork.
- **They were designed in parallel:**
  1. a style test (sofa, dining set, plant) was approved by the owner;
  2. subagents then built the other pieces against the same guide;
  3. the whole set was reviewed together.
- **A development preview page,** `apps/demo/furniture-preview.html` (not
  part of the build), renders any piece or group in a neutral studio.
- **Downloaded models stay possible later** through glTF import (SPEC P2).

### In the scene

- **Data:** `Scene.furniture` is a list of `Furniture { id, kind, position,
  rotationDeg, size, finish: { main, accent } }`. Kinds are built in, not
  injected: they're part of the library, like the room. `FURNITURE_TYPES`
  (in `furniture-kinds.ts`, plain data) holds each kind's usual size, its
  finishes, the finishes offered for each part, and whether it hangs on a wall.
- **Constraints,** applied by every edit like luminaires' mount rules:
  - floor pieces stand on the floor with their turned footprint inside the room;
  - the artwork goes on the nearest wall, facing the room, at 1.5 m by default;
  - sizes stay between half and twice the usual, so parametric parts never
    break; finishes come from the palette only.
- **Simulator:** `addFurniture`, `updateFurniture`, `removeFurniture` and
  `duplicateFurniture`, one undo step each. A copy goes 0.5 m to its
  source's right, so a copied picture stays on its wall. (ADR 0048 later
  merged remove and duplicate into `remove` and `duplicate` for both kinds.)
- **Picking reports what was hit:** `PickEvent.target` and
  `MoveStartEvent.target` are `{ kind: 'luminaire' | 'furniture', id }`,
  replacing `luminaireId`. Luminaires win over furniture, even a few pixels
  off them: they're small, often over a piece (a pendant over a table), and
  what the tool is about. Pieces can also be picked in the scene list.
- **A selection holds one kind.** Shift-clicking the other kind starts a new
  selection, so delete, duplicate and the inspector always act on one kind.
- **Dragging** a floor piece slides it on the horizontal plane at the height
  where it was grabbed, so a table top stays under the pointer. Pictures
  slide over the walls. Snapping uses the grid and lines up centres with
  other pieces (ADR 0041). Handles, rotation by dragging and distances come
  in M3.3.
- **UI:** a "Luminaires / Furniture" switch at the top of the catalog; a
  furniture section in the scene list; a furniture inspector (size,
  position, rotation, finish chips per part, named per piece, e.g. a sofa's
  upholstery and legs). Catalog icons are drawn in Lucide's style, since
  Lucide has none for most pieces.
- **Rendering:** `FurnitureMeshes` rebuilds a piece only when its kind, size,
  finishes or the render mode change; moving it only moves its root. In clay
  mode every part shares one clay material.

## Consequences

- No third-party assets or licences, and tiny downloads: geometry is built
  on the fly.
- New pieces must follow `style.ts`. The preview page is where they're
  reviewed.
- Pieces cast and receive shadows, so they count towards shadow-map cost.
  Measured on the starter scene (a table, four chairs, a plant, a picture):
  +71 draw calls and +43k triangles, frame rate unchanged on a Mac. Most
  triangles are the subdivided cushions; they're the first thing to trim if
  phones struggle.
- `PickEvent` and `MoveStartEvent` changed shape: hosts reading
  `luminaireId` now read `target.id` (and `target.kind`).
