<script setup>
import { data } from '../../../.vitepress/theme/diagrams/analysis.data'
import { headline } from '../../../.vitepress/theme/analysis/headline'

const h = headline(data.summary, data.timings)
const n = (v) => Math.round(v).toLocaleString('en')
const release = data.summary.rooms[0].radianceRelease
</script>

# How we compare

## The reference: Radiance

**Radiance** is the research lighting simulator from Lawrence Berkeley
National Laboratory, widely used as a reference in validation studies. The
release is always the same, 6.0 patch 2 (`{{ release }}`), checked by its
digital fingerprint.

**What's independent and what isn't.** Radiance's calculation and its IES
reader are its own: they share no code with Lux Studio. What they do share
is the description of the room: both get the same sizes, the same luminaires
with their positions and aims, furniture as boxes, and surfaces that reflect
diffusely. So agreement says Lux Studio calculates that simplified room
correctly, not that a real room will read the same. And a mistake in
describing the room, such as a luminaire turned the wrong way, would show up
the same in both: the checks worked out by hand, which depend on neither
program, cover that.

DIALux and Relux are validated with the test cases of the CIE 171:2006
standard. Lux Studio hasn't run them yet.

## Before Radiance is trusted

Radiance must pass its own tests before it writes a single reference:

- **194 values worked out by hand** from each IES file, 20 m away, where the
  inverse-square law is exact. A Radiance release with a known bug in its IES
  reader fails every one, and a test proves it.
- **The integrating sphere:** in a hollow sphere 1.5 m in radius that
  reflects 80 %, with the light at its centre, bounced light is the same at
  every point and must match the formula, $E = \rho\,\Phi / (A\,(1-\rho))$,
  within 0.1 %. With 64 bounces it gives 177.778 lx, exactly the formula's
  value. With the references' 24 bounces it would read 0.5 % low, so the check
  uses more (in the rooms, whose floors reflect 30 %, 24 are plenty).
- **Orientation, by hand:** for the track spots, the centre of each pool of
  light falls on its beam's vertical plane, within 1 cm, and where the tilt
  puts it; the wall washer gives, beside its wall, what's worked out by hand
  from its IES file, within 0.4 %. The sums come from the room's sizes and
  the written conventions, not from either program, and are checked on both
  programs' points: a mistake in describing the room, such as a luminaire
  turned the wrong way, wouldn't pass.
- **Convergence:** more rays, more bounces or fainter rays don't change the
  result, and the same run twice gives the same values but for sampling noise,
  about 0.3 % per point.

These tests found two Radiance settings that cut bounced light short or made
it unrepeatable; both are fixed and covered by a test.

## The test rooms

{{ h.rooms }} rooms, each one meant to test something: a single luminaire,
several together, tilted beams, a large luminaire close by, a glowing box
against a wall, a living room with four pieces of furniture, and an
open-plan room with ten, which shows how the difference and the time grow in
a full room. They measure 5 × 4 × 2.7 m, except the last, at 6 × 5 m. They
use the demo's real IES files. Points are measured on grids over the work plane, the floor,
the ceiling and the walls: {{ n(h.points) }} in all.

## How the difference is measured

- **Each surface's average:** Lux Studio / Radiance − 1. It's what a lighting
  report shows.
- **Lit points:** only those getting at least 10 % of the room's brightest
  point's light. In a dark corner, 1 lx against 2 lx is a 100 % nobody cares
  about.
- **Far and near:** within 1 m of a luminaire, the two programs approximate a
  glowing opening differently, and the IES file doesn't say what the light is
  like that close. They're counted apart.

## Always current

Everything in this section comes from the code. Every time the calculation
changes, Lux Studio's tests compare each point with Radiance and fail if
anything strays further than measured; another test checks that these pages
show the current results. Times are measured separately, on a quiet machine,
and say which.

The technical detail is in the
[accuracy report](https://github.com/ewajs/lighting-simulator/blob/master/accuracy/REPORT.md)
and in the repository's design decisions 0058, 0060 and 0061.
