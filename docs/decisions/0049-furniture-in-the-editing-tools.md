# 0049. Furniture in the editing tools: arrows, a floor ring, edge distances

- **Status:** Accepted
- **Date:** 2026-10-13

## Context

After M3.2 (ADR 0047), furniture could only be dragged by its body. Luminaires
also have move arrows (ADR 0039), a rotation ring (ADR 0040) and distances to
the walls while moving (ADR 0042). M3.3 brings those to furniture, and stops
new pieces from landing on top of the table. It ships as two PRs: M3.3a
(handles) and M3.3b (distances, free spot).

## Options

- **Where the rotation ring lives:** in the Move tool, on the floor around
  the piece / in the Aim tool, like a luminaire's pan / a third Rotate tool (R)
- **What distances measure:** from the piece's edges / from its centre, like
  luminaires
- **Where a piece added by click goes:** the room centre, as before / the
  free spot nearest the centre
- **Which items get a free spot:** furniture only / luminaires too

## Decision

- **The ring is part of the Move tool.** A selected floor piece shows the
  move arrows at its middle and a ring on the floor around it. Furniture has
  no aim, so everything a piece can do shows at once, as in room planners,
  without a mode switch for one gesture.
  - The ring's radius clears the corners of the footprint by 12 cm. It is
    never less than 84 px on screen, so around a small piece it stays clear
    of the arrows (68 px). Its thickness stays the same on screen.
  - It turns in 15° steps with the magnet, freely with Alt, one undo step
    per drag. The luminaire's pan ring and the furniture ring share one drag
    (`TurnDrag`); `PAN_STEP_DEG` became `TURN_STEP_DEG`.
  - It shows for one piece at a time. Pictures get none: their wall sets
    their rotation.
- **The arrows work on furniture** the same as on luminaires: floor pieces
  slide along x and z, pictures along their wall and up. Several pieces move
  together. The distance stops where the first item would be stopped (each
  one's own constraint, so a footprint stays inside the room), so the group
  keeps its shape. `AxisDrag` uses the per-kind rules from ADR 0048
  (`item-rules.ts`), shared with dragging an item.
- **Select all (⌘/Ctrl+A) selects all of the kind selected**: all furniture
  with a piece selected, otherwise all luminaires.
- **Distances measure from the piece's edges** to the nearest walls: what
  matters is the gap behind a sofa, not where its centre is. A picture
  measures from its side to the nearer corner of its wall, and from its
  bottom edge to the floor. They show while a piece is dragged, slid with an
  arrow or turned with the ring (turning changes its gaps). A group shows
  only the shortest distance each way, as luminaires do. (M3.3b)
- **A piece added by click goes to the free spot nearest its usual place,**
  where it keeps 10 cm from every other piece. The usual place is the room
  centre, or for a picture the middle of the back wall, so a second picture
  goes along that wall, not onto the front wall the camera looks through.
  Spots are 10 cm grid points; pieces only clash with what their boxes
  touch, so a plant can stand below a picture. With no free spot, it goes
  to the usual place. A dropped piece still lands under the pointer.
  Luminaires added by click keep going to the centre: stacked lights are
  rarer and easier to see. (M3.3b)

## Consequences

- Handles win over items when pressed. With a big piece selected, its ring
  can run under a chair beside it; pressing the chair right on the ring
  turns the selected piece instead. Clicking elsewhere on the chair picks it.
- Pieces may still overlap while dragged. It's a design tool: blocking each
  other would feel sticky.
- No rotating a whole group around its centre, and no distances between
  pieces yet.
- `Viewport.handle` now covers furniture; `HandleMode` is unchanged.
