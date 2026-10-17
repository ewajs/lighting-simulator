# 0063. Furniture in bounced light: it hides it and reflects it

- **Status:** Accepted
- **Date:** 2026-10-17

## Context

Until now furniture cast shadows on direct light only; bounced light passed
through it (ADR 0060). Measured against Radiance, that was the largest error
left: furnished rooms were off by up to 7.4 % on averages and 43 % at points
under tables or beside a bookcase. The owner set the bar: worth doing only if
it buys more than a fraction of a percent. It does.

## Decision

### One switch, both halves

`CalculationOptions.furnitureInBouncedLight`, on by default, makes furniture
take part in bounced light in two ways:
- **It hides it.** The radiosity's `Visibility` hook (ADR 0060) gets
  `boxVisibility`: the share of a patch a point sees is the share of the
  patch's 2 × 2 sample points it has a clear line to, past the furniture's
  boxes. It applies between patches and from every grid point to every patch.
- **It reflects it.** Each box's faces become patches like the room's
  (`boxPatches`): the top, the four sides, and the underside when the box is
  off the floor (a table top). They reflect as the piece's main finish does;
  `Blocker` gains `reflectance`, from `FINISHES`.

It needs `bouncedLight` and `furnitureShadows`; `checkCalculationOptions`
refuses it without them.

**Why one switch.** Hiding without reflecting makes furniture black boxes
that swallow bounced light, and that is worse than not counting furniture at
all. The feature study shows it as a half step, with the reference's
furniture made black:

| Mean difference per point | Furniture shadows only | + hides bounced light (black) | + reflects it too |
|---|---|---|---|
| Furnished living room | 6.5 % | 17.9 % | 0.4 % |
| Pendant over a table | 6.8 % | 10.1 % | 0.7 % |

With both halves the furnished rooms agree with Radiance as well as the
empty ones do:

| | Before | After |
|---|---|---|
| Furnished living room: worst surface average | 5.5 % | 0.6 % |
| Furnished living room: worst point over 1 m away | 43.7 % | 6.5 % |
| Pendant over a table: worst surface average | 7.3 % | 0.7 % |
| Pendant over a table: worst point over 1 m away | 43.0 % | 4.4 % |

The total-light tolerances now hold every room as it is, furniture and all:
averages within 4 %, far points within 7.5 %, near points within 16 %
(measured worsts 3.3 %, 6.5 %, 15.1 %). The separate "known gap" bounds for
furnished rooms are gone.

### Speed

Hiding bounced light means millions of segment-against-box tests: every pair
of patches, and every grid point against every patch, four rays each. The
first version took 7.6 s for the furnished living room, 20 times its time
without. Measured and fixed in order:
1. **The slab test without allocations** (`segmentBlockedPrepared`): each
   box's frame and bounds worked out once, in a flat array; scalar maths. The
   same test serves furniture shadows (`segmentBlocked`), so there is still
   one implementation.
2. **A bounds check before any ray:** if no box's bounds meet the space
   between a point and a patch, it sees all of it.

On an Apple M1 Pro, bundled as the app ships (`accuracy/timings.json`):

| Room | Furniture shadows only | With furniture in bounced light |
|---|---|---|
| Furnished living room (4 pieces) | 315 ms | 1,039 ms |
| Pendant over a table (1 piece) | 415 ms | 655 ms |
| Rooms without furniture | 290–470 ms | unchanged |

**Considered and left out:** one ray to a far patch's centre instead of four
to its samples. It was 30 % faster, and less accurate by up to 1.7 points at
the worst point. Accuracy first; the UI step (M5.4) runs the analysis in a
worker and can keep what depends only on the room.

### Tests

- `boxVisibility` against geometry worked out by hand: nothing in the way, a
  table top hiding all, half, or none of a ceiling patch.
- `boxPatches`: their area is the box's surface (with or without the
  underside), they face out, with the box's reflectance.
- In a closed room with a turned box: reciprocity exact for every pair;
  each patch in view sees its whole hemisphere within 1 % on average and 10 %
  at worst (sampled visibility at the foot of the box's sides); light
  absorbed equals light emitted within 2 %.
- In the analysis: a white table lights the ceiling more than a charcoal one,
  and the floor under a sofa gets no bounced light.
- The mutation check gains three mistakes (furniture hiding nothing, its
  faces facing in, a turned box tested unturned): all 19 are caught.

## Options considered

- **Hiding only, without reflecting.** Simpler, and measurably worse than
  nothing.
- **Reflecting only, without hiding.** Light would reflect off furniture and
  pass through it at once: not a physical model.
- **Hemicubes or ray-traced form factors for everything.** A rewrite of the
  form factors for a gain the measurements don't call for; the exact
  contour integral times sampled visibility already matches Radiance.
- **Finer visibility (more samples per patch).** More rays for an error
  already within Radiance's own spread at far points.

## Consequences

- Public API: `CalculationOptions.furnitureInBouncedLight`, `Blocker.reflectance`.
- A furnished room costs more: 1.6 times with one piece, 3.3 times with four,
  growing with the number of pieces and their size.
- Known limits: furniture is boxes (a table is its top, a sofa a block);
  luminaires still don't hide bounced light.
