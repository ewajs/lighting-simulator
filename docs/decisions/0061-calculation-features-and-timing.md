# 0061. The calculation's features as switches, measured one by one

- **Status:** Accepted
- **Date:** 2026-10-17

## Context

The owner asked to tell the calculation's story with data:
- show how each feature (direct light, splitting openings, furniture
  shadows, bounced light, and later furniture in bounced light) changes the
  agreement with Radiance, and admit it in numbers when one makes things worse;
- measure how long each feature takes, on a stated machine, and how long
  Radiance takes for the same points;
- later, let users switch features off to trade accuracy for speed. A
  feature that only makes sense with another may require it.

## Decision

### Switches in `CalculationOptions`

`CalculationOptions` (ADR 0060) gains three booleans, all on by default:

| Switch | Off means |
|---|---|
| `splitOpenings` | each luminaire is one point of light, however large its opening |
| `furnitureShadows` | furniture blocks no direct light |
| `bouncedLight` | no light reflected by the room: direct light only |

They're independent of each other. Furniture in bounced light (next steps)
will require `bouncedLight`. `checkCalculationOptions` refuses sizes that
aren't positive and finite, and a tolerance outside 0–1, with a message that
names the value, since the options may come from users.

### The feature study

`accuracy/typescript/src/features.ts` adds the features one at a time:

1. **point-sources:** each luminaire one point of direct light, nothing else;
2. **+ bounced light;**
3. **+ split openings;**
4. **+ furniture shadows:** the full calculation.

Bounced light comes first because it's a third or more of a room's light:
added last, it would hide what the others do. Every step is compared with
Radiance's **full** light, the room as it is with furniture: what a light
meter would read. The results go into `accuracy/summary.json` and
`REPORT.md`, which a test keeps current.

Mean error over each room's bright points (at least 10 % of its brightest):

| Room | Point sources | + bounced light | + split openings | + furniture shadows |
|---|---|---|---|---|
| Four downlights and a wall washer | 44.4 % | 0.29 % | 0.29 % | 0.29 % |
| Furnished living room | 49.5 % | 13.7 % | 13.7 % | 6.5 % |
| Pendant over a table | 70.1 % | 9.8 % | 7.9 % | 6.8 % |
| One downlight | 22.6 % | 0.12 % | 0.12 % | 0.12 % |
| Two track spots | 14.7 % | 0.42 % | 0.42 % | 0.42 % |
| Wall sconce | 74.3 % | 3.0 % | 2.6 % | 2.6 % |

- **Bounced light** is the largest step everywhere.
- **Split openings** matter near large luminaires: the worst point within
  1 m of the sconce falls from 56 % to 15 %, of the pendant from 33 % to
  1.6 %. Some surface averages get slightly worse, by up to 0.6 points
  (the sconce's worst average, 2.7 % to 3.3 %); `REPORT.md` shows each.
- **Furniture shadows** halve the furnished rooms' error. What's left is
  furniture's part in bounced light (ADR 0060), the next steps. They also
  raise the pendant's worst point within 1 m from 1.6 % to 3.3 %: each cell
  of the opening is either blocked or not, so a shadow's edge is a few steps,
  where Radiance's is smooth.

A test (`features.test.ts`) holds the story: in every room, no step may
raise the mean bright-point error by more than 0.5 points.

### Timing

`npm run accuracy:timings` writes `accuracy/timings.json`: for each room and
step, the median of 7 runs, after a warm-up, of reading the IES files,
preparing the light, solving bounced light and computing every reference
point, bundled with Vite as the app ships, on one thread. The references now
record Radiance's wall-clock and CPU seconds, the machine and its process
count. Timings vary from run to run, so no test checks them; the file names
the machine.

On an Apple M1 Pro (10 cores), Node 24:

| Room | Points | Direct only | Full calculation | Radiance, direct | Radiance, bounced (10 processes) |
|---|---|---|---|---|---|
| Four downlights and a wall washer | 920 | 3 ms | 297 ms | 0.05 s | 63 s (552 CPU s) |
| Furnished living room | 1,036 | 1 ms | 361 ms | 0.07 s | 55 s (448 CPU s) |
| Pendant over a table | 1,500 | 1 ms | 412 ms | 0.03 s | 49 s (415 CPU s) |
| One downlight | 1,036 | 0.3 ms | 289 ms | 0.02 s | 23 s (185 CPU s) |
| Two track spots | 1,130 | 1 ms | 295 ms | 0.02 s | 32 s (276 CPU s) |
| Wall sconce | 1,140 | 1 ms | 454 ms | 0.04 s | 77 s (672 CPU s) |

- **Bounced light is almost all of our time:** about 280 ms of a room's
  300–450. Splitting openings adds up to 150 ms (the sconce's 51 cm box is
  many cells, and every patch samples them).
- **Radiance's bounced light is a reference, not a rival:** 4,096 rays per
  sample, 24 bounces, no interpolation, chosen for accuracy whatever the
  time. Its default settings would be far faster and far noisier. The
  comparison says what our model costs, not that we're faster than Radiance.

### Radiance's bounced light repeats

Regenerating the references showed some points' bounced light changing by
about 10 % between identical runs, at bright points next to furniture.
Bounced light is total light less a second direct run, and both used
Radiance's default source testing (`-dt 0.05 -dc 0.5`), which skips faint
sources by statistics that depend on the order rays arrive in; running on
every core (`-n`) changes that order. The two direct parts then didn't
cancel. Both runs now test every source (`-dt 0 -dc 1`), at no measurable
cost. A test runs the furnished room's floor twice: the worst point fell
from 5 % to 1.2 %, the mean from 0.53 % to 0.34 %.

## Options considered

- **Steps in code order** (split openings first, bounced light last). The
  bounced step would swamp the others, and their effect wouldn't show.
- **Each feature switched off alone, from the full calculation.** Says what
  each costs at the end, but not the story of building it up. The study's
  steps can be changed in one place if that's wanted.
- **Timings in `summary.json`.** They vary from run to run, so the test that
  keeps the summary current would fail. They have their own file.
- **Comparing timings with Radiance at its defaults.** That's another
  reference to maintain, at a quality we wouldn't trust as one.

## Consequences

- Public API: `CalculationOptions` gains `splitOpenings`, `furnitureShadows`
  and `bouncedLight`; `checkCalculationOptions` is new.
- The UI (M5.4) can offer the switches that buy real time: bounced light,
  and later furniture in bounced light. Split openings and furniture shadows
  cost little and are wrong without, so they're better left on.
- The references record their timings; regenerating them changes those
  lines every time.
