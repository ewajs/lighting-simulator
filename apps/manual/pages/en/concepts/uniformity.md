<script setup>
import LxHeatmap from '../../../.vitepress/theme/components/LxHeatmap.vue'
import { data } from '../../../.vitepress/theme/diagrams/rooms.data'
import { formatNumber } from '../../../.vitepress/theme/diagrams/plot'

const n = (v, d = 0) => formatNumber(v, 'en', d)
const top = Math.max(data.spread.maxLx, data.bunched.maxLx)
</script>

# Uniformity

Two rooms can have the same light on average and feel very different: one
even, the other with pools of light and dark corners. That's why, besides the
average, the extremes count.

## The figures

Over the points of the [work plane](./work-plane)'s grid:

| Figure | What it is |
|---|---|
| $\bar{E}$ | the **average** illuminance |
| $E_\text{min}$ | the darkest point's |
| $E_\text{max}$ | the brightest point's |
| $U_0 = E_\text{min} / \bar{E}$ | the **uniformity**: 1 would be perfectly even |

EN 12464-1 sets a minimum uniformity alongside the average: 0.60 for desk
work, 0.40 for corridors (see [Recommended levels](./recommended-levels)). The
eye adapts to the light in front of it; moving often between bright and dark
areas is tiring.

## More average isn't better light

The same four demo downlights in a 5 × 4 m room, first spread out and then
bunched in the middle. Colours run from blue (little light) to white (a lot),
on the same scale for both; the dashed line marks the border left out:

<div class="lx-pair">
<LxHeatmap :map="data.spread" :room="data.room" :border-m="data.borderM" :scale-max-lx="top" caption="Spread out" />
<LxHeatmap :map="data.bunched" :room="data.room" :border-m="data.borderM" :scale-max-lx="top" caption="Bunched" />
</div>

Bunched, the **average goes up**: from {{ n(data.spread.averageLx) }} to
{{ n(data.bunched.averageLx) }} lx, because almost all the light falls inside
the measured plane. But the darkest point drops from
{{ n(data.spread.minLx) }} to {{ n(data.bunched.minLx) }} lx, and uniformity
from {{ n(data.spread.uniformity, 2) }} to {{ n(data.bunched.uniformity, 2) }}:
a brightly lit middle and dim corners. Looking at the average alone, the worse
layout would look like the better one.

These are direct light only, with no maintenance factor.
