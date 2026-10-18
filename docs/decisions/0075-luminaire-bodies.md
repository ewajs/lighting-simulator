# 0075. Luminaire bodies hide bounced light

- **Status:** Accepted
- **Date:** 2026-10-18

## Context

ADR 0070 found where Lux Studio's bounced light read high: in Radiance a
luminaire's glowing surface hides bounced light, as a black body would, and
in Lux Studio luminaires hid nothing. An experiment that gave each luminaire
a black box took the mean bounced-light difference over all twelve reference
rooms from +1.56 % to +0.16 % (ADR 0073). The small bathroom, where
everything is near a luminaire, went from +6 to +9 % to within 0.7 %. The
owner decided to make it part of the calculation, with a switch in the
settings if that didn't take much code.

## Decision

**A luminaire's body.** `luminaireBody(frame, opening)` gives the box of its
IES luminous opening:
- centred on its light, and turned about the vertical as it is;
- a round opening becomes the square of the same area, and a flat one a
  1 mm plate;
- black, because a glowing surface reflects no bounced light.

Tilt is left out, since furniture boxes only turn about the vertical and the
tilted luminaires are mostly small spots. A luminaire without an opening (a
point source, as most IES files state) has no body. Every placed luminaire
has its body whether it's on or off: switched off, it's still there.

**What it does.** `DirectLight` gains `bodies`. With
`CalculationOptions.luminaireBodies`, on by default and needing
`bouncedLight`, the bodies join the furniture in hiding bounced light:
- between patches;
- between grid points and patches.

They aren't patches, since they reflect nothing. They don't hide the light
leaving the luminaires, or their own cells would be inside them. They don't
shade other luminaires' direct light either. Radiance's bodies do, but it
only shows in the bathroom, where the downlight's disc shades the wall
light's uplight on the ceiling 3 cm above it.

**The switch.** The Analysis panel's settings gain "Cuerpo de las
luminarias / Luminaire bodies". It goes off with bounced light, as furniture
in bounced light does. The cost is in moving: the bodies are part of the
room's geometry for bounced light, so the form factor cache (ADR 0065) keys
on them, and moving a luminaire recalculates the room. Dimming or switching
one doesn't. With the switch off, moving is as fast as before.

**Measured (all twelve rooms, every surface's average):**

| | Total light | Bounced light |
|---|---|---|
| Without bodies | worst 6.1 % (bathroom) | mean +1.56 % |
| With bodies | worst 0.8 % | mean +0.16 % |

The reference test's total-light bounds tighten:
- averages 4 % → 1.5 %;
- near points 16 % → 12 %.

The bathroom's known gap is only its ceiling over the downlight now. The two
ceiling points right above a downlight, 3 cm under it, are still the
largest Emin differences: +94 % in the busy room and +55 % in the bathroom,
down from +130 % and +77 %. There our square body, seen with 4 rays a patch,
hides less than Radiance's disc.

The feature study gains a last step, `luminaire-bodies`, and BOUNCE.md now
compares the option off and on, instead of an experiment of its own.

## Consequences

- Most rooms' bounced light, and so their averages, drop a little: the
  starter scene's work plane goes from 424 to 417 lx.
- Moving a luminaire with a body costs as much as a calculation from scratch;
  dimming stays fast. In the bench room (M1 Pro): 0.86 s from scratch, up
  from 0.69 s, and 0.12 s for a light change, as before.
- Bodies make every bounced-light visibility test check them, so a
  calculation from scratch takes 15–70 % longer. It costs most in rooms
  without furniture, which had no boxes to test before: the tall hall goes
  from 2.2 to 3.7 s for its reference points.
- Two more planted mistakes in the mutation check: bodies left out of
  bounced light, and covered points counted (ADR 0074).
