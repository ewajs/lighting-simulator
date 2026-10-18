<script setup>
import LxFeatureStory from '../../../.vitepress/theme/components/analysis/LxFeatureStory.vue'
import { data } from '../../../.vitepress/theme/diagrams/analysis.data'
import { headline, stepFigures } from '../../../.vitepress/theme/analysis/headline'
import { STEPS } from '../../../.vitepress/theme/analysis/names'

const h = headline(data.summary, data.timings)
const f = stepFigures(data.summary, data.timings)
const pct = (v, digits = 1) => `${(v * 100).toLocaleString('en', { maximumFractionDigits: digits, minimumFractionDigits: digits })} %`
const ms = (v) => v.toLocaleString('en', { maximumFractionDigits: v < 10 ? 1 : 0 })
</script>

# Feature by feature

Lux Studio's calculation can be built up one feature at a time, measuring what
each one adds. Here it starts from the simplest, each luminaire a point of
direct light, and adds one feature per step, the one that matters most first.
Every step is compared with Radiance's **total** light, with the room as it
is, furniture and all: what a light meter would read. Where a feature makes
something worse, it says so.

<LxFeatureStory :summary="data.summary" />

## Step by step

**Luminaires as points, direct light only.** Each luminaire is a point
spreading light as its IES file says; nothing bounces. The mean difference
per point runs from {{ pct(h.directOnlyMin, 0) }} to
{{ pct(h.directOnlyMax, 0) }}: all the light the ceiling, walls and floor send
back is missing.

**\+ light that bounces.** The biggest step. With bounces
([How Lux Studio calculates](../concepts/how-it-calculates)), the mean
difference per point in the rooms without furniture drops below
**{{ pct(f.bouncedEmptyMax) }}**.

**\+ openings split into cells.** A large luminaire isn't a point: splitting
its opening into 10 cm cells fixes the points close to it. The worst point
within 1 m of a luminaire goes from **{{ pct(f.nearBeforeSplit, 0) }}** to
**{{ pct(f.nearAfterSplit, 0) }}**. In exchange, an average gets worse, by
up to {{ pct(f.splitAverageRise, 1) }} points, in the wall sconce. It has the
same cause as the extra bounced light ([Where we stand](./#what-it-doesn-t-count-yet)):
in a trial where the sconce's body hides bounced light, as in Radiance,
splitting it no longer worsens the average ([BOUNCE.md](https://github.com/ewajs/lighting-simulator/blob/master/accuracy/BOUNCE.md)).

**\+ furniture shadows.** In the furnished rooms, the mean difference per
point drops from **{{ pct(f.beforeShadows) }}** to **{{ pct(f.afterShadows) }}**.
What's left is bounced light, which at this step still passes through
furniture. Shadows also raise one room's worst near point by
{{ pct(f.shadowsNearRise, 1) }} points: each cell of the opening is either
blocked or not, so a shadow's edge comes out in steps, where Radiance's is
smooth.

**\+ furniture hides bounced light (black).** Half a step, shown because it
makes things worse: furniture that hides bounced light but reflects none is a
set of black boxes swallowing it. The furnished rooms' mean difference per
point rises to **{{ pct(f.hidesOnly) }}**: everything reads lower than in
Radiance.

**\+ furniture reflects it too.** Each face of a piece becomes one more
patch, reflecting as its finish does (oak 45 %, linen 55 %). With both halves,
the furnished rooms' mean difference per point drops to
**{{ pct(f.hidesAndReflects) }}**: as in the rooms without furniture. That's
why the two halves go together, under one switch.

## What each step costs

Each step's time, averaged over the {{ h.rooms }} rooms, on an {{ h.machine }}
([Speed](./speed)):

<table>
  <thead><tr><th>Step</th><th>Time</th></tr></thead>
  <tbody>
    <tr v-for="s in f.stepMs" :key="s.step">
      <td>{{ STEPS[s.step].en.name }}</td>
      <td>{{ ms(s.ms) }} ms</td>
    </tr>
  </tbody>
</table>

Almost all the time is bounced light, and in a furnished room, the furniture
in it: every ray between two patches is tested against every piece. That's
why they're the two you can switch off in the Analysis panel's settings, to
calculate faster at the cost of accuracy
([Analysing the light](../analysing)); splitting openings and shadows cost
little and the result is worse without them, so they stay on.
