# 0060. Bounced light: a room radiosity solve, checked against Radiance

- **Status:** Accepted
- **Date:** 2026-10-17

## Context

ADR 0028 decided that illuminance includes the light the room reflects, from
a radiosity solve over its surfaces. ADR 0057 computed direct light, and
ADR 0058 checked it against Radiance. This step adds the bounced light, with
the same standard: maths a person can review, tests against laws and hand
values, and a comparison with Radiance.

The owner's constraints for the step:
- furniture should be able to block bounced light later, but only if the
  gain is worth it: "if we would gain just .1% accuracy … we should highly
  deprioritize it", so the gain has to be measured;
- windows and non-rectangular rooms will come; mirrors would be nice, but
  not at any cost;
- tuning constants such as the patch size should become user settings
  eventually, with sound defaults now.

## Decision

### The model

Each surface of the room (floor, ceiling, four walls) is split into
**patches** no larger than `patchSizeM`. Each patch reflects diffusely: its
exitance M (lm/m²) is its reflectance ρ times everything it receives:

```
M_i = ρ_i · (E_direct,i + Σ_j F_ij · M_j)
```

- **E_direct,i** is the direct light on the patch, averaged over 2 × 2
  sample points, so a spot's sharp-edged pool counts for the part of the
  patch it covers.
- **F_ij**, the form factor, is the share of the light leaving patch i that
  reaches patch j. It's computed at a point with the exact contour integral
  for a polygon (Lambert's formula), after clipping the polygon to the
  half-space in front of the point (Sutherland–Hodgman). Patches on one flat
  surface see nothing of each other.
- **Reciprocity** (A_i F_ij = A_j F_ji) holds exactly: for distant pairs one
  factor is derived from the other; pairs closer than three patch sizes are
  sampled at 2 × 2 points both ways and share the mean of A · F.
- **The solve** is Gauss–Seidel iteration, which converges because every
  ρ < 1. It stops when no exitance changes by more than `tolerance` of the
  largest.
- **At any point**, the bounced light is E = Σ_j M_j · F(point → j), with
  the same exact point-to-polygon factor. Total light is direct plus bounced.

Direct light keeps its maintenance factor; bounced light comes from it, so
it carries the same factor.

### The code

| File | What it holds |
|---|---|
| `analysis/form-factor.ts` | `pointToPolygon`, `clipToFront`: pure geometry |
| `analysis/patches.ts` | `Patch`, a flat polygon with its normal, reflectance, area and samples; `roomPatches` |
| `analysis/radiosity.ts` | `formFactors`, `solveIndirectLight`, `indirectIlluminanceAt`, the `Visibility` hook |
| `analysis/direct-light.ts` | `directLight`: a scene's sources and blockers |
| `analysis/scene-light.ts` | `sceneLight`, `indirectLight`, `illuminanceAt`: the light at any point |
| `analysis/analyse.ts` | `analyseIlluminance`: grids, statistics, direct and bounced per point |
| `analysis/options.ts` | `CalculationOptions` and their defaults |

`analyseIlluminance` replaces `analyseDirect`, and each grid point carries
its direct, bounced and total light.

### Options instead of constants

`CalculationOptions { sourceCellM, patchSizeM, tolerance }` is plain data
passed through the calculation, with `DEFAULT_CALCULATION_OPTIONS`. The
analysis takes it as an optional argument, so making it a user setting is
wiring only. `SOURCE_CELL_M` (ADR 0057) became `sourceCellM`.

### The patch size, by measurement

`npm run accuracy:patch-size` writes `accuracy/PATCH-SIZE.md`: total light
against Radiance over every reference room, and the time, for each size.

| Patch size | Patches, 5 × 4 × 2.7 m room | Worst average | Worst far point | Time, all six rooms |
|---|---|---|---|---|
| 0.5 m | 376 | 3.36 % | 8.90 % | 0.5 s |
| **0.25 m** | 1,432 | 3.27 % | 4.35 % | 2.1 s |
| 0.125 m | 5,728 | 3.23 % | 4.00 % | 17.8 s |

The worst figures are the wall sconce's, which don't depend on the patch size
(see below). Room by room, 0.5 m is two to three times worse at far points
than 0.25 m, and 0.125 m gains at most 0.6 points for eight times the time.

**0.25 m is the default.** The core benchmark (6 luminaires, 3 pieces of
furniture, a 5 × 4 m room) runs the whole analysis in about 450 ms on an
Apple M1 Pro, fast enough for the throttled live calculation of M5.4.

### What the tests check

Core's unit tests check the maths against laws and hand values:
- the form factor against the catalogue formula for a rectangle's corner
  (to 12 digits) and against brute-force integration of its definition
  (to 4 digits);
- from inside a closed box, every point's factors add up to exactly 1;
- reciprocity for every pair, and each patch's factors adding up to 1
  within 1 %;
- the integrating sphere: with one reflectance everywhere, the reflected
  flux is ρΦ / (1 − ρ), and a point anywhere receives ρE / (1 − ρ);
- all light absorbed equals all light emitted, with mixed reflectances;
- a black room reflects nothing; twice the light reflects twice as much.

The mutation check (`scripts/mutation-check.js`) adds five deliberate
mistakes in the bounce maths: reflectance ignored, one bounce only, a
patch's facing reversed, no clipping, reciprocity the wrong way round. All
16 mistakes, old and new, are caught.

### Radiance's bounced light

The reference rooms gain their surfaces: grey, diffuse (`plastic` with no
specularity), with each room's reflectances, Lux Studio's defaults where a
room doesn't give them (floor 0.3, walls 0.8, ceiling 0.85).
- **Settings:** up to 24 bounces with no other depth limit, 4,096 rays per
  sample, no irradiance cache (`-ab 24 -lr 0 -ad 4096 -aa 0 -lw 1e-5`), so
  every point is sampled on its own and nothing is interpolated.
- **Split runs.** The fine source sampling direct light needs near a large
  luminaire (`-ds 0.01 -dt 0 -dc 1`) would apply at every bounce and take
  hours. So bounced light is total light less direct light, both with
  Radiance's ordinary source sampling, and the reference's total is the
  fine direct light plus that bounced light. The direct part's sampling
  error cancels in the difference.
- **Points are lifted 1 mm** off their surface, so Radiance's rays start in
  the room.
- **Converged:** a test doubles the rays per sample, doubles the bounces,
  and follows rays 100 times fainter, one at a time; the room's bounced light
  changes by under 0.05 % on average and 1 % at the worst point.
- **Checked before it's trusted:** a guard check puts 100 cd in a 3 m cube
  with ρ = 0.8 and compares the average bounced light with the integrating
  sphere's ρΦ / (A (1 − ρ)), within 2 %. Radiance gives 93.27 lx against
  93.08 lx (+0.2 %).
- **Time:** rtrace runs on every core (`-n`), which changes how fast, not
  what; regenerating every reference takes about six and a half minutes on
  an Apple M1 Pro.

A sixth room, a furnished living room (sofa, two tables, a bookcase, four
downlights), measures furniture's part; the table under the linear pendant
reflects too.

### The comparison

Total light against Radiance; the furnished rooms with their furniture taken
out on both sides, since that's what Lux Studio models (furniture below):

| Check | Tolerance | Measured worst | Elsewhere |
|---|---|---|---|
| Each surface's average | 4 % | 3.27 % | within 0.7 % |
| Bright points at least 1 m from a luminaire | 5 % | 4.35 % | within 3.7 % |
| Bright points nearer than 1 m | 16 % | 14.65 % | within 1.7 % |

Every worst is the wall sconce's. Our bounced light there runs 3 to 5 %
above Radiance's, though the direct light agrees within 0.5 %. Most of it is
likely the luminaire itself: Radiance's sconce is a 23 × 13 × 51 cm glowing
box that hides and absorbs light bouncing back to it, while Lux Studio's
luminaires are invisible to bounced light. By our own solve, 1.0 % of all
reflected light lands on that box, mostly off the wall 13 cm behind it; a
black absorber taking 1 % in a room of effective reflectance 0.7 lowers the
bounced light by about ρf / (1 − ρ) ≈ 2.3 %. That's an estimate, not a
measurement; the rest is plausibly the near-field difference seen in the
direct light (ADR 0058).

**How the comparison found a Radiance setting.** The first references put our
bounced light about 3 % above Radiance's in every room, with the direct light
in agreement and our own energy balance exact: the direct light landing on
the patches matches the IES flux within 0.06 %, and the form factors' rows
add up to 1.0009 on average. Doubling `-ad`, `-ab` or lowering `-lw` changed
nothing, because Radiance's default depth limit (`-lr -10`) was capping all
of them. With `-lr 0`, Radiance's bounced light rose 1.3 %, and then 12
bounces were no longer enough: 24 added another 1.1 %, and 48 nothing. The
guards now cover it:
- the convergence test changes each of `-ad`, `-ab` and `-lw` in turn;
- the integrating-sphere check uses ρ = 0.8, where missing bounces show, and
  a test proves it fails with the old settings.

### What furniture leaves out

Lux Studio's furniture blocks direct light but is invisible to bounced
light: it neither shadows nor reflects it. The references for rooms with
furniture also hold Radiance's values without it, and the report compares
Lux Studio with Radiance both ways, furnished and empty. The gap between the
two is what letting bounced light through furniture costs; it leaves out the
furniture's shadows on direct light, which Lux Studio models.

Measured: it is not a small effect.

| Room, surface | Average, furnished | Average, empty | Worst far point, furnished | Worst far point, empty |
|---|---|---|---|---|
| Living room, work plane | −4.1 % | 0.1 % | 19 % | 1.0 % |
| Living room, floor | 2.7 % | 0.2 % | 42 % | 0.7 % |
| Living room, wall by the bookcase | −5.4 % | 0.4 % | 43 % | 1.5 % |
| Pendant over a table, ceiling | −7.4 % | 0.6 % | 11 % | 3.6 % |
| Pendant over a table, floor | 2.0 % | 0.7 % | 35 % | 2.0 % |

- **Under furniture** (the floor under the coffee table and the dining
  table) Lux Studio counts bounced light from the ceiling that the table
  hides: up to 42 % too much.
- **Next to tall furniture** (the wall at the bookcase's edge) the same, from
  the half of the room the bookcase hides: up to 43 %.
- **Above lit furniture** (the ceiling over the pendant's table) Lux Studio
  misses the light the table top reflects: 7.4 % too little on average.

That's far above the owner's bar ("if we would gain just .1% accuracy …").
Furniture blocking and reflecting bounced light is the largest error left in
the calculation, and the next candidate step. The tests hold the furnished
rooms to their measured worsts (8 % on averages, 45 % at far points) as a
regression bound, to tighten when it lands.

## Paths for later

- **Furniture blocking bounced light:** `formFactors` takes a `Visibility`
  hook, the share of a patch a point sees; a ray test against the furniture
  boxes plugs in there, and furniture faces can become patches like any
  other polygon. The measurement above says it's worth doing.
- **Windows** are patches with a light of their own (daylight) or a
  reflectance of zero (night); the solve already takes any polygon.
- **Non-rectangular rooms:** `Patch` is a general flat polygon, so an L-shaped
  floor is more patches. Walls that hide each other need the same
  `Visibility` hook.
- **Mirrors and glossy surfaces:** a flat mirror can be modelled by the
  image method, the room reflected in its plane. Out of scope until asked.

## Options considered

- **The integrating-sphere estimate** (one number for the whole room, as the
  renderer uses). Exact for the average in a uniform room, but blind to
  where the light lands: a wall washer lights its wall and not the far one.
- **Progressive refinement** (shooting the brightest patch first). Gives a
  usable picture early, which matters for interactive rendering, not for an
  analysis computed in a worker. Gauss–Seidel is simpler to read and test.
- **Hemicube form factors.** The standard for occluded scenes, but
  approximate, and nothing occludes in a rectangular room. The exact
  contour integral is testable against closed forms.
- **Radiance with an irradiance cache** (`-aa 0.05`). Faster in principle,
  but slower here, and it interpolates, which a reference shouldn't.

## Consequences

- Public API: `analyseIlluminance`, `IlluminanceAnalysis`, `SurfaceResult`,
  `sceneLight`, `indirectLight`, `directLight`, `illuminanceAt`,
  `PointIlluminance`, `SceneLight`, `DirectLight`, `IndirectLight`, `Patch`,
  `CalculationOptions`, `DEFAULT_CALCULATION_OPTIONS`; `analyseDirect` and
  `SOURCE_CELL_M` are gone.
- The references are version 2, with direct and total light at each point.
- Known limits, for the UI and the manual:
  - diffuse surfaces only;
  - furniture blocks direct light only, measured above;
  - luminaires are invisible to bounced light;
  - rectangular rooms only.
- Form factors depend only on the room, so the UI step (M5.4) can cache
  them per room and re-solve only when the light changes.
