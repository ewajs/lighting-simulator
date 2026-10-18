# 0074. Points covered by furniture don't count

- **Status:** Accepted
- **Date:** 2026-10-18

## Context

The calculation grids (ADR 0057) cover the whole work plane and every room
surface, whatever stands on them. A grid point inside a bookcase, or on the
floor under a sofa, gets about 0 lx, and the panel's Emin and U₀ became 0
whatever the lighting (ADR 0072). Whether that happened depended on where
the grid happened to fall: a bookcase moved 10 cm took the work plane's Emin
from 63 lx to 0. EN 12464-1 measures where the task happens, and no one
measures inside furniture. The owner decided to leave those points out.

## Decision

**What "covered" means.** A point is covered when it's inside a piece's box,
or when a box starts within `COVERED_GAP_M` (5 cm) in front of it, along its
surface's normal. That includes:
- the floor under a sofa or a bed;
- a wall behind a bookcase or a TV unit standing near it;
- work-plane points inside a tall piece.

It leaves out the floor beside a piece, and the floor under a table: only the
table's top blocks light, 72 cm up. The boxes are the furniture's own
(`furnitureBlockers`), whatever the calculation options, since a piece stands
there even when its shadows are switched off. Chairs and plants have no box,
so they cover nothing.

`coveredByFurniture(point, normal, blockers)` is a segment test along the
normal, using the shadow test's code. It's exported from core.

**What changes:**
- Each `SurfaceResult` gains `covered`, and its `stats` leave covered points
  out. Their illuminance is still calculated, so the probe and the data stay
  whole.
- The Analysis panel says how many points it left out.
- The illuminance view draws covered points grey (`COVERED_COLOUR`), a colour
  the false-colour scale never uses.
- The accuracy comparison applies the same rule (`PointComparison.covered`),
  so it compares the figures the app reports. Every surface's Emin and U₀ can
  now be compared: none is "–" any more.

**The bounds that follow.** With the points in furniture's shadow now
counted, Emin's worst differences are:
- 7.2 % (the wall-wash room's floor);
- 7.0 % (the bathroom);
- 6.9 % (the busy room's floor beside a piece).

The least-lit points get mostly bounced light, which reads high (ADR 0070).
The reference test's Emin and U₀ bound is 7.5 %, with the two ceiling points
above a downlight still excepted. Luminaire bodies (ADR 0075) should bring
these down.

## Consequences

- An empty room gives the same figures as before; a furnished one gives
  figures that no longer depend on where the grid falls inside a piece.
- 5 cm is a judgement. A piece standing 6 cm from a wall leaves the wall
  behind it counted, dark.
