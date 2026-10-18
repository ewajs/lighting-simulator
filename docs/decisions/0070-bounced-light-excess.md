# 0070. Where bounced light's excess comes from

- **Status:** Accepted (the study); the feature it points to is the owner's call
- **Date:** 2026-10-17

## Context

An outside review of the Analysis section subtracted direct from total light
and found Lux Studio's bounced light higher than Radiance's on almost every
surface:
- +0.2 to +1.3 % in most rooms, and +3.4 to +4.5 % around the wall sconce;
- larger for larger luminaires.

The review suggested the cause: a glowing surface in Radiance hides bounced
light like a black body, while Lux Studio's luminaires hide nothing. The
sconce's split-openings step also worsened its average by 0.6 points, which
the manual had called noise.

## Decision

### Bounced light reported on its own

The report, `summary.json` and each room page's surface table now show
bounced light alone (total less direct, on both sides) next to direct and
total. `compare.ts` gains the `bounced` light (`radianceLx`, `oursLx`).

### The study

`npm run accuracy:bounce` writes `accuracy/BOUNCE.md`. It's an experiment;
core's calculation is unchanged.

**Luminaire bodies.** Each luminaire gets a black box the size of its IES
luminous opening, centred on its light. A flat opening becomes a 1 mm plate,
a round one the square of the same area, and tilt is ignored (the tilted
luminaires are 10 cm spots). The boxes hide bounced light between patches,
and between points and patches. They don't touch the light leaving the
luminaires.

| | As calculated | Bodies hide bounced light |
|---|---|---|
| Mean bounced-light difference, every surface | +1.00 % | +0.01 % |
| Mean size of the difference | 1.03 % | 0.37 % |
| Wall sconce, by surface | +3.4 to +4.5 % | +0.25 to +0.39 % |

The bias is gone. The busy room overshoots a little (its work plane goes
from +0.3 % to −1.0 %): flat plates and equal-area squares are only
approximations of ies2rad's shapes.

**What's left is the patches.** With the bodies, the mean size halves with
each halving of the patch size: 0.95 %, 0.37 %, 0.19 % at 50, 25 and 12.5 cm.
The mean difference stays near zero (+0.01, +0.01, −0.07 %). That's
discretization, not a bias. The review's 6.25 cm step would need 23,000
patches in a 5 × 4 m room, about 4 GB of form factors, so the study stops at
12.5 cm, where the trend is already clear.

**The sconce's split-openings step.** Its worst total average goes from
2.70 % to 3.29 % as calculated. With bodies it goes from 0.36 % to 0.38 %:
no regression. Splitting the box puts cells nearer the wall behind it. That
wall then gets more light, which Radiance's box partly hides and Lux Studio
returns in full. The manual no longer calls it noise.

## The feature this points to (built: ADR 0075)

Making luminaires hide bounced light in core would bring every room's average
to about Radiance's. Its costs:
- Each luminaire needs a body. The IES luminous opening gives one for files
  that state it; point openings (most files) have none, and their luminaires
  are small anyway.
- The bodies become part of the room's geometry for bounced light. The form
  factor cache (ADR 0065) would have to include luminaire positions, so moving
  a luminaire recomputes them: about 0.7 s, as from scratch, instead of
  0.13 s in the bench room. Dimming or switching off would stay fast.
- A choice to make: whether a luminaire that is off still hides light. In
  Radiance it would, as a black body.

My recommendation is to build it as one more feature step, measured like the
others (ADR 0061), with the cache keyed on luminaire bodies only when they
have size.

## Consequences

- Documented limits now state the cause and the numbers: the manual's "What
  it doesn't count yet", the sconce's room note and the feature page.
- `bounce.ts` imports core's radiosity parts by path, as `source-cell.ts`
  imports the area formula: an experiment assembles them its own way.
