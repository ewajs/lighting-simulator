<script setup>
import LxSpeed from '../../../.vitepress/theme/components/analysis/LxSpeed.vue'
import { data } from '../../../.vitepress/theme/diagrams/analysis.data'
import { headline } from '../../../.vitepress/theme/analysis/headline'

const h = headline(data.summary, data.timings)
const n = (v) => Math.round(v).toLocaleString('en')
const t = data.timings
</script>

# Speed

How long Lux Studio takes to calculate each test room, and how long Radiance
takes for the same points.

<LxSpeed :timings="data.timings">
  Measured on an {{ t.machine.cpu }} ({{ t.machine.cores }} cores), Node {{ t.machine.node }}, on {{ t.generated }}. Lux Studio: the median of {{ t.runs }} runs, on one thread. Radiance: wall-clock time, with several processes in parallel.
</LxSpeed>

## What's measured

- **Lux Studio** reads the IES files, prepares the luminaires' light, solves
  the bounces and calculates every point of the room: everything it does to
  show a result. It runs on one thread, built as the app is.
- **Radiance** calculates direct light in one run, and bounced light in two
  more (total light, and direct light to subtract), at its reference settings:
  4,096 rays per sample, up to 24 bounces, nothing interpolated. It uses every
  core of the machine.

## How to read it

Lux Studio's full calculation takes {{ n(h.oursMinMs) }} to {{ n(h.oursMaxMs) }}
ms per room. Almost all of it is bounced light, and in the furnished rooms,
the furniture in it: they're the slowest. With direct light only, a room takes
about a millisecond.

Radiance takes {{ n(h.radianceMinS) }} to {{ n(h.radianceMaxS) }} s, but **it's
not a race**: its settings were chosen to make it an exact reference, however
long it takes. At its usual settings it would be much faster, and less
accurate too. The comparison shows what Lux Studio's model costs, not that
it's faster than Radiance.

## How it grows with the room

The [busy open-plan room](./busy-open-plan) is the slowest: larger
(6 × 5 m), with more points, more luminaires and more than twice the living
room's furniture. Almost all the extra time is furniture inside bounced
light: every ray between two patches, and between each point and each patch,
is tested against every piece.

In the app, the analysis runs apart from the 3D view, without freezing it,
and keeps what depends only on the room. Measured on the same machine, with
six luminaires:

| | 3 pieces, 5 × 4 m | 10 pieces, 6 × 5 m |
|---|---|---|
| From scratch, or after moving furniture | 0.7 s | 2.4 s |
| When only the light changes | 0.13 s | 0.24 s |

Moving or dimming a luminaire recalculates right away even in a full room;
moving furniture takes a few seconds, because it changes the bounces of the
whole room. It hasn't been measured on other machines yet: on a phone or an
older computer, it will take longer.
