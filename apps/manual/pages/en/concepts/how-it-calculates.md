<script setup>
import LxAccuracy from '../../../.vitepress/theme/components/LxAccuracy.vue'
import { data } from '../../../.vitepress/theme/diagrams/accuracy.data'

const rooms = {
  'single-downlight': 'One downlight',
  'downlights-and-wall-washer': 'Four downlights and a wall washer',
  'track-spots': 'Two tilted track spots',
  'linear-pendant-over-table': 'A linear pendant over a table',
  'wall-sconce': 'A wall sconce',
  'furnished-living': 'A furnished living room',
  'busy-open-plan': 'A busy open-plan room',
  'dark-room': 'A dark room',
  'white-room': 'A white room',
  'tall-hall': 'A tall hall',
  'small-bathroom': 'A small bathroom',
  'wall-wash': 'Light on the walls',
}
</script>

# How Lux Studio calculates

Lux Studio calculates illuminance with the ideas on these pages, in this
order:

1. **Each luminaire is a light source** with its IES file's distribution. If
   its opening is larger than 10 cm, it's split into cells of at most 10 cm
   (5 or 2.5 cm if you choose finer shadow detail), across, along and in height
   ([Distance and angle](./distance-and-angle)). Against the exact value for a
   panel that glows evenly, the cells are within 1 % from two cells away.
   Without an IES file, its flux is spread over its beam angle as an estimate,
   and the result says so.
2. **At each point of the grid** ([The work plane](./work-plane)) it adds up
   what reaches it from each source: $E = I \cos\alpha / d^2$.
3. **Furniture casts shadows:** if a piece stands in the way, that source adds
   nothing. Tables block with their top only; chairs, plants and pictures
   don't block.
4. **It adds daylight:** each window is a source as bright as the sky seen
   through it (CIE's overcast and clear skies, at IES levels), split into
   cells; the sun comes in as a beam. With frosted glass or a covering, the
   window glows evenly ([Windows and daylight](../windows)).
5. **It adds the light that bounces:** the floor, ceiling and walls are split
   into 25 cm patches, and each sends back the share of the light it receives
   that its reflectance says, bounce after bounce, until nothing changes. It's
   the radiosity method, a classic of interior lighting calculation
   ([Light that bounces](./light-that-bounces)). Furniture counts too: it
   hides bounced light, and each of its faces reflects it as its finish does.
   And each luminaire's body, the box of its opening, hides it too, as a
   glowing surface does. Daylight bounces the same way, and what reaches a
   window leaves the room.
6. **It multiplies the luminaires' light by the maintenance factor**
   ([Maintenance factor](./maintenance)).
7. **It sums up** each surface: $\bar{E}$, $E_\text{min}$, $E_\text{max}$ and
   $U_0$ ([Uniformity](./uniformity)).

## What it doesn't count yet

- **Furniture is boxes:** a sofa is a block, a table is just its top.
- **A luminaire's body is a box:** its opening's, not tilted. Right above a
  downlight it shows (see below).
- **Every surface reflects diffusely:** no gloss, no mirrors.
- **Rooms are rectangular**, and walls have no thickness.
- **Glass lets the same through at any angle**, and there's no weather: one
  sky, at one time.

## How accurate it is

It's been checked against **Radiance**, the research lighting simulator from
Lawrence Berkeley National Laboratory, which reads IES files with its own
code. Twelve test rooms, with the demo's real files, and thousands of points,
bounced light included. The largest difference, room by room:

<LxAccuracy
  :summary="data"
  :room-names="rooms"
  :headings="['Room', 'Averages', 'Points over 1 m away', 'Points within 1 m']"
/>

"Points" counts only those getting at least 10 % of the room's brightest
point's light. The sconce gives up to 3.3 % more on average, probably because
in Radiance its body hides some of the light bouncing off the wall behind it;
in Lux Studio, luminaires don't. Very close to a large luminaire, like the
sconce, the two programs approximate a glowing opening differently, and the
IES file doesn't say what the light is like that close.

Before Radiance is trusted, it must reproduce values worked out by hand from
each file; a Radiance version with a known bug fails those checks. Every
number, room by room and point by point, with maps, charts and timings, is in
the **[Analysis](../analysis/)** section.

Lux Studio isn't certified calculation software: it's for designing and
comparing with confidence, not for signing off a project.
