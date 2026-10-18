# 0072. Emin, uniformity, and what the bright-point cutoff leaves out

- **Status:** Accepted
- **Date:** 2026-10-17

## Context

Per-point figures count only points with at least 10 % of the room's
brightest point's light (ADR 0058), because in a dark corner a small
difference in lux is a large percentage. An outside review pointed out that
the app reports Emin and U₀ = Emin / Ē, which come from exactly the dim points
the cutoff leaves out, so an error there wouldn't show in any published
figure.

## Decision

### Emin and U₀ compared on their own

`summarize` gains `radianceMinLx`, `oursMinLx`, `minError` and
`uniformityError`. Each side's minimum is its own, as a report would quote
it. A surface whose Radiance Emin is under `MIN_SHARE` (1 %) of its average
isn't compared. That happens when a grid point lies inside a piece of
furniture: both sides give about 0, and the ratio means nothing.

They're shown in a table per room in `REPORT.md`, as two columns on each
room page's surface table, and as a headline in the manual.

| Total light | Worst Emin difference | Worst U₀ difference |
|---|---|---|
| Every comparable surface but one | 3.2 % (the sconce) | 2.5 % (track spots' floor) |
| The busy room's ceiling | +117 % | +116 % |

- **Emin reads 1–3 % high almost everywhere.** Dim points are lit mostly by
  bounced light, so they carry its excess (ADR 0070).
- **The busy room's ceiling minimum** is right above a downlight, 3 cm below
  it. In Radiance the glowing body hides the room from that point, and in
  Lux Studio nothing does. The test leaves it out by name, saying why.

`references.test.ts` bounds both at 4 % (`MIN_TOLERANCE`).

### What the cutoff leaves out

Every room's report also shows its per-point figures at a cutoff ten times
lower (1 %), with the number of points each counts. The manual's method page
has the same table.

| Total light | Points counted, 10 % | 1 % | Worst far point, 10 % | 1 % |
|---|---|---|---|---|
| Track spots | 58 of 1130 | 1121 | 1.7 % | 11.4 % |
| Linear pendant | 1421 of 1500 | 1500 | 4.4 % | 6.0 % |
| Single downlight | 398 of 1036 | 1036 | 0.6 % | 1.3 % |
| Others | | | unchanged | |

- **The track spots' figures covered only their two pools.** The beams are
  so bright that 10 % of them leaves out 94 % of the room.
- **What 1 % adds:**
  - beam and shadow edges, where the light changes a lot within centimetres;
  - bounced light beside a very bright pool, which 25 cm patches spread
    (+8.6 % at a dim floor point);
  - near points over a downlight's body (ADR 0070).

The 10 % cutoff stays the figures' definition: changing it would change every
published bound at once, and the table shows both.

## Open: Emin inside furniture, in the app

The same grid points inside furniture reach the app. Whenever a work-plane
grid point lands inside a tall piece, the Analysis panel shows Emin = 0 and
U₀ = 0, whatever the lighting. Checked with core: a bookcase under a downlight
leaves the work plane's Emin at 63 lx at z = −1 m, where no point lands inside
it. Moved 10 cm, two points do, and Emin drops to 0. In EN 12464-1, the task
area is where the task happens, so points inside solid furniture arguably
shouldn't count. Leaving them out is a
change to the calculation grid and to what the panel reports, so it's the
owner's call.

## Consequences

- `summary.json` grows each surface's Emin fields and each room's `cutoffs`.
- The room pages' surface table has eight columns. Its cells are tighter, and
  on a phone it scrolls sideways.
