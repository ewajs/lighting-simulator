<script setup>
import LxGridPlan from '../../../.vitepress/theme/components/LxGridPlan.vue'
import LxPlot from '../../../.vitepress/theme/components/LxPlot.vue'
import { data } from '../../../.vitepress/theme/diagrams/rooms.data'
import { formatNumber } from '../../../.vitepress/theme/diagrams/plot'

const n = (v, d = 2) => formatNumber(v, 'en', d)
</script>

# The work plane

Nobody reads on the floor. To know whether a room has the light it needs,
illuminance is calculated on a **work plane**: an imaginary horizontal surface
at the height of the task, a desk's for example.

## Height and border

- **Height:** {{ n(data.workPlaneM) }} m by default, the one DIALux uses for
  EN 12464-1 work areas. A dining table or a desk is about 0.75 m high.
- **Border:** a strip along the walls, {{ n(data.borderM, 1) }} m by default,
  is left out, because nobody works pressed against a wall. The standard
  allows leaving it out unless there's a workplace there.

## The grid

Illuminance is calculated on a grid of points, each at the centre of a cell.
EN 12464-1 sets the **largest gap** $p$ between points from the longer side
$d$ of the surface:

$$p = 0.2 \cdot 5^{\log_{10} d}\ \text{m}, \qquad p \le 10\ \text{m}$$

So a 1 m side gets a point every 0.2 m; 10 m, every 1 m; 100 m, every 5 m. The
number of points is rounded up, so they're never further apart than $p$. With
a fixed grid, minimums and averages can be compared with other programs'.

<LxGridPlan
  :room="data.room"
  :border-m="data.borderM"
  :points="data.gridPoints"
  border-label="border"
  :caption="`A 5 × 4 m room: the work plane without its ${n(data.borderM, 1)} m border, with a point every ${n(data.gridSpacingM)} m.`"
/>

<LxPlot
  :series="[{ label: 'p', points: data.spacingRule }]"
  x-label="Longer side of the surface (m)"
  y-label="Largest gap between points (m)"
  caption="The standard's rule: larger surfaces, sparser points."
/>

Besides the work plane, Lux Studio calculates the floor, the ceiling and each
wall, in full, by the same rule.
