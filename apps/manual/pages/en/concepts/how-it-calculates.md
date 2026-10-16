<script setup>
import LxAccuracy from '../../../.vitepress/theme/components/LxAccuracy.vue'
import { data } from '../../../.vitepress/theme/diagrams/accuracy.data'

const rooms = {
  'single-downlight': 'One downlight',
  'downlights-and-wall-washer': 'Four downlights and a wall washer',
  'track-spots': 'Two tilted track spots',
  'linear-pendant-over-table': 'A linear pendant over a table',
  'wall-sconce': 'A wall sconce',
}
</script>

# How Lux Studio calculates

Lux Studio calculates illuminance with the ideas on these pages, in this
order:

1. **Each luminaire is a light source** with its IES file's distribution. If
   its opening is larger than 10 cm, it's split into cells of at most 10 cm,
   across, along and in height ([Distance and angle](./distance-and-angle)).
   Without an IES file, its flux is spread over its beam angle as an estimate,
   and the result says so.
2. **At each point of the grid** ([The work plane](./work-plane)) it adds up
   what reaches it from each source: $E = I \cos\alpha / d^2$.
3. **Furniture casts shadows:** if a piece stands in the way, that source adds
   nothing. Tables block with their top only; chairs, plants and pictures
   don't block.
4. **It multiplies by the maintenance factor** ([Maintenance factor](./maintenance)).
5. **It sums up** each surface: $\bar{E}$, $E_\text{min}$, $E_\text{max}$ and
   $U_0$ ([Uniformity](./uniformity)).

## What it doesn't count yet

::: warning Direct light only, for now
Light bouncing off the walls, ceiling and floor isn't added yet. It's a
significant share of the total, more the lighter the surfaces, so for now the
values come out **below** DIALux's or Relux's. It arrives in a coming version.
:::

Nor does it count light reflected by furniture, or shiny and mirrored
surfaces: everything reflects diffusely.

## How accurate it is

It's been checked against **Radiance**, the research lighting simulator from
Lawrence Berkeley National Laboratory, which reads IES files with its own
code. Five test rooms, with the demo's real files, and thousands of points.
The largest difference, room by room:

<LxAccuracy
  :summary="data"
  :room-names="rooms"
  :headings="['Room', 'Averages', 'Points over 1 m away', 'Points within 1 m']"
/>

"Points" counts only those getting at least 10 % of the room's brightest
point's light. Very close to a large luminaire, like the sconce, the two
programs approximate a glowing opening differently, and the IES file doesn't
say what the light is like that close.

Before Radiance is trusted, it must reproduce values worked out by hand from
each file; a Radiance version with a known bug fails those checks. The details
are in the [accuracy report](https://github.com/ewajs/lighting-simulator/blob/master/accuracy/REPORT.md).

Lux Studio isn't certified calculation software: it's for designing and
comparing with confidence, not for signing off a project.
