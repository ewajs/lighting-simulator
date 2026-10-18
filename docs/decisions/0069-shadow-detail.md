# 0069. Shadow detail: the source cell size as a choice

- **Status:** Accepted
- **Date:** 2026-10-17

## Context

A luminaire whose luminous opening is larger than `sourceCellM` (10 cm) is
split into cells, each a point source (ADR 0057). The busy reference room
(ADR 0068) showed where that falls short. A floor point between furniture can
see a downlight only just past an edge. Radiance sees part of the 15 cm
opening, while each of Lux Studio's cells is either seen or not, so the point
reads 0 or double. The owner asked to make the cell size configurable, with a
better default if there is one, and to document what it changes.

## Decision

### The evidence

`npm run accuracy:source-cell` writes `accuracy/SOURCE-CELL.md`.

**Against an exact value.** A 60 × 60 cm Lambertian panel's illuminance has
a closed form (Howell's configuration factor B-3). That depends on neither
Radiance nor the room description, which answers part of the outside review's
point that agreement with Radiance can share our mistakes.
- Cells are within 1 % from two cells away.
- Each halving of the cells cuts the error about four times.
- With a single point, the panel is 47 % off at 0.5 m.

`area-source.test.ts` holds these bounds, so the mutation check covers them
too.

**Against Radiance, all seven rooms:**

| Cell | Total-light points off by over 10 % | Worst far point, direct | Reference time |
|---|---|---|---|
| 10 cm | 31 of 6534 | 68 % | 6.7 s |
| 5 cm | 8 of 6534 | 41 % | 8.0 s |
| 2.5 cm | 6 of 6534 | 25 % | 15.3 s |

**In the app** (`npm run bench`, 6 luminaires with 1.2 m linear openings):

| Cell | Light edit, room cached | From scratch |
|---|---|---|
| 10 cm | 0.13 s | 0.70 s |
| 5 cm | 0.38 s | 0.95 s |
| 2.5 cm | 1.04 s | 1.62 s |

A two-dimensional opening has about four times the cells each time the cell
halves, and the light is shot from every cell to every patch.

### The default stays 10 cm

5 cm was the candidate. It's about four times better in the penumbrae, but it
makes a light edit up to three times slower with linear luminaires. That's
the interaction the Analysis panel is built around (ADR 0065), and most
points don't change: averages are within noise at every size. Penumbrae are
a few points between furniture, so finer cells are a choice to make when it
matters.

Finer cells don't always look better on their own. In the linear pendant
room, a floor point beyond the table's end agreed at 10 cm by luck: direct
light 17 % low cancelled bounced light that was high. At 5 cm direct
converges, and the total shows the bounced-light excess (+3.8 % there). That
excess is PR D's subject.

### The choice

The Analysis panel's settings gain **Shadow detail / Detalle de las
sombras**: 10 cm (faster), 5 cm, or 2.5 cm (more exact), with a hint saying
what it trades. It sets `CalculationOptions.sourceCellM`. The manual's
"Analysing the light" explains it with the numbers above, and suggests
designing at 10 cm and checking the final result at 5 cm.

## Options not taken

- **Coarser cells for bounced light only.** The first shot to the 25 cm
  patches may not need fine cells, which would make 5 cm nearly free. It's
  unmeasured, and patches next to a luminaire (a sconce's wall) do need them.
  Worth trying if 5 cm should become the default.
- **Sampling penumbrae adaptively.** Splitting further only where a cell is
  partly hidden. More code than the problem warrants today.

## Consequences

- The settings aren't saved with the scene yet (deferred), so the choice
  returns to 10 cm on reload.
- `brightPointsOff` moved into `compare.ts`; the reference test and the study
  share it.
