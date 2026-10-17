# 0065. Keeping the room's work between calculations

- **Status:** Accepted
- **Date:** 2026-10-17

## Context

The Analysis panel recalculates as the scene changes (ADR 0064). A furnished
room took about 700 ms on an Apple M1 Pro each time, though most edits only
change the light. Timed stage by stage (6 luminaires in 72 cells, 3 pieces of
furniture, 1,698 patches, 360 grid points):

| Stage | Time | Depends on |
|---|---|---|
| Form factors between patches, past the furniture | 424 ms | the room's size, the furniture, the patch size |
| Bounced light at the grid points | 128 ms | the same, and the grid |
| Direct light on the patches | 87 ms | the luminaires |
| The solve | 39 ms | the luminaires and the reflectances |
| Direct light at the grid points | 5 ms | the luminaires |

## Decision

**`AnalysisCache`** (core, `analysis/cache.ts`) keeps what depends only on the
geometry: the form factors, and for each grid, how much each point sees of
each patch (`pointViews`, the weights `indirectIlluminanceAt` uses). The
bounced light at a point is then a dot product with the patches' exitance.

- **Its key** (`bounceGeometryKey`): the room's size, the furniture's boxes
  when they take part in bounced light, and the patch size. Not the
  reflectances, which only the solve uses, nor the luminaires.
- **One room at a time:** a new key drops the old factors and views.
- **Optional:** `analyseIlluminance(..., cache)` and `sceneLight(..., cache)`
  take one; without it, nothing changes.
- **Where it lives:** the analysis worker keeps one for its life (ADR 0064),
  and each answer says whether the room was reused (logged with `?debug`).

**Measured** (`npm run bench -w packages/core`, which now times both):

| | Median |
|---|---|
| From scratch | 702 ms |
| The light changed, the room cached | 126 ms |

**It mustn't change a result.** Tests compare every figure with and without
the cache after each kind of change: the light (reused), a reflectance
(reused), the furniture moving or the room's size (recalculated), and a new
work plane height (new grid views). `pointViews` is tested against
`indirectIlluminanceAt`. The mutation check adds a key that ignores the
furniture: it's caught.

## Options considered

- **Caching inside `formFactors` by the patches' coordinates.** Hashing
  1,700 polygons per call costs more than building the key from the room
  and furniture, which `indirectLight` already has.
- **Several rooms at once.** The app edits one room; switching scenes
  recalculates once.
- **Updating the solve incrementally** (only the patches near a moved
  luminaire). More complex; the solve is 39 ms.

## Consequences

- Public API: `AnalysisCache`, `bounceGeometryKey`, and an optional `cache`
  argument on `analyseIlluminance` and `sceneLight`.
- Memory: a grid's views are points × patches numbers, 5 MB for the
  benchmark's room. A much larger room would need coarser patches anyway
  (form factors grow with the square of the patches).
- What's left of a lighting change is mostly the direct light on the patches
  (87 ms).
