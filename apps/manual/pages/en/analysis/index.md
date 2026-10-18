<script setup>
import LxStanding from '../../../.vitepress/theme/components/analysis/LxStanding.vue'
import { data } from '../../../.vitepress/theme/diagrams/analysis.data'
import { headline } from '../../../.vitepress/theme/analysis/headline'
import { ROOM_ORDER, ROOMS } from '../../../.vitepress/theme/analysis/names'

const h = headline(data.summary, data.timings)
const pct = (v, digits = 1) => `${(v * 100).toLocaleString('en', { maximumFractionDigits: digits, minimumFractionDigits: digits })} %`
const n = (v) => Math.round(v).toLocaleString('en')
</script>

# Where we stand

How far can you trust Lux Studio's numbers? This section shows it with data:
the same {{ n(h.points) }} points in {{ h.rooms }} test rooms, calculated by Lux
Studio and by **Radiance**, the research lighting simulator from Lawrence
Berkeley National Laboratory. Every number and chart comes from the code and
is regenerated with it ([How we compare](./method)).

Both programs calculate the same simplified room: furniture is boxes and
every surface reflects diffusely. Agreement says Lux Studio's calculation is
right for that room, not that a real room will read exactly the same.

## In short

- **It agrees with Radiance.** In all {{ h.rooms }} rooms, furniture
  included, each surface's average is within **{{ pct(h.worstAverage) }}** of
  Radiance's, and no lit point
  ([at least 10 % of the brightest](./method#what-the-cutoff-leaves-out)) more
  than 1 m from a luminaire is off by more than **{{ pct(h.worstFar) }}**. The exception is a few points in the [room
  with ten pieces of furniture](./busy-open-plan), in the penumbra of a piece's
  edge: up to {{ pct(h.busyWorstFar, 0) }}.
- **The minimum and the uniformity,** what decides whether a project passes
  ([Uniformity](../concepts/uniformity)), are within
  **{{ pct(h.worstMin) }}**. The exception is a ceiling point in the room with
  ten pieces of furniture, right above a downlight, which the luminaire's body
  hides in Radiance: {{ pct(h.busyWorstMin, 0) }}.
- **Furniture counts for bounced light too:** it hides it and reflects it, as
  its finish does. In the furnished rooms, that took the mean difference per
  point from {{ pct(h.furnishedBefore) }} to **{{ pct(h.furnishedAfter) }}**.
- **Bounced light is half the story.** With direct light only, the numbers
  are off by {{ pct(h.directOnlyMin, 0) }} to {{ pct(h.directOnlyMax, 0) }}
  per point on average ([Feature by feature](./feature-by-feature)).
- **It's fast.** The full calculation takes {{ n(h.oursMinMs) }} to
  {{ n(h.oursMaxMs) }} ms per room on an {{ h.machine }}; Radiance, at its
  reference settings, {{ n(h.radianceMinS) }} to {{ n(h.radianceMaxS) }} s
  ([Speed](./speed)).

## Room by room

Each room's worst difference with the full calculation. In grey, the
furnished rooms with the furniture taken out in both programs: when the two
bars look alike, the furniture is counted right.

<LxStanding :summary="data.summary" />

Each room has its own page, with its maps point by point:

<ul>
  <li v-for="id in ROOM_ORDER" :key="id">
    <a :href="`./${id}.html`">{{ ROOMS[id].en.name }}</a>
  </li>
</ul>

## What it doesn't count yet

- **Furniture is boxes:** a sofa is a block, a table is just its top.
- **Shadows have stepped edges.** A luminaire's opening is split into 10 cm
  cells, and each one is hidden or not. In the penumbra of a piece's edge, a
  point can read 0 or double Radiance's, which sees part of the opening. With
  finer shadow detail (5 or 2.5 cm), those points come closer, at a cost in
  time ([Analysing the light](../analysing)).
- **Luminaires don't hide bounced light.** In Radiance, the glowing body
  does. That's why bounced light reads 1 % higher than Radiance's on
  average, and up to 4.5 % around the sconce. In a trial where each
  luminaire's body hides bounced light, the mean difference drops to 0.0 %,
  and what's left shrinks with the patch size ([BOUNCE.md](https://github.com/ewajs/lighting-simulator/blob/master/accuracy/BOUNCE.md)).
- **Every surface reflects diffusely:** no gloss, no mirrors.
- **Rooms are rectangular**, and there are no windows yet.

Lux Studio isn't certified calculation software: it's for designing and
comparing with confidence, not for signing off a project.
