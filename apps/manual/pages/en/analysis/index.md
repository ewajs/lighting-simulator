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

## In short

- **What Lux Studio calculates, it calculates well.** In the rooms without
  furniture, and in the furnished ones with the furniture taken out in both
  programs, each surface's average is within **{{ pct(h.modelledAverage) }}**
  of Radiance's, and no lit point more than 1 m from a luminaire is off by more
  than **{{ pct(h.modelledFar) }}**.
- **Furniture doesn't count for bounced light yet.** It casts shadows on
  direct light, but bounced light passes through it and it reflects none. With
  furniture, an average is off by up to **{{ pct(h.furnishedAverage) }}** and a
  point next to a piece by up to **{{ pct(h.furnishedFar, 0) }}**. It's the
  next thing to fix.
- **Bounced light is half the story.** With direct light only, the numbers
  are off by {{ pct(h.directOnlyMin, 0) }} to {{ pct(h.directOnlyMax, 0) }}
  per point on average ([Feature by feature](./feature-by-feature)).
- **It's fast.** The full calculation takes {{ n(h.oursMinMs) }} to
  {{ n(h.oursMaxMs) }} ms per room on an {{ h.machine }}; Radiance, at its
  reference settings, {{ n(h.radianceMinS) }} to {{ n(h.radianceMaxS) }} s
  ([Speed](./speed)).

## Room by room

Each room's worst difference with the full calculation. In grey, the
furnished rooms without their furniture: the gap between the two bars is what
letting bounced light through furniture costs.

<LxStanding :summary="data.summary" />

Each room has its own page, with its maps point by point:

<ul>
  <li v-for="id in ROOM_ORDER" :key="id">
    <a :href="`./${id}.html`">{{ ROOMS[id].en.name }}</a>
  </li>
</ul>

## What it doesn't count yet

- **Furniture in bounced light**, measured above: the largest difference left.
- **Luminaires don't hide bounced light either.** A large sconce right against
  its wall reads a few points higher than in Radiance.
- **Every surface reflects diffusely:** no gloss, no mirrors.
- **Rooms are rectangular**, and there are no windows yet.

Lux Studio isn't certified calculation software: it's for designing and
comparing with confidence, not for signing off a project.
