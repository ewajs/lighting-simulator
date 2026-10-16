<script setup>
import LxPlot from '../../../.vitepress/theme/components/LxPlot.vue'
import { data } from '../../../.vitepress/theme/diagrams/light.data'
</script>

# Distance and angle

How much light reaches a point depends on two things: **how far** it is from
the luminaire, and **at what angle** the light arrives.

## The inverse-square law

Light from a source spreads as it travels: at twice the distance, the same
beam covers a surface four times as large, so each square metre gets a
quarter.

$$E = \frac{I}{d^2}$$

with $I$ the intensity towards that point (cd) and $d$ the distance (m).

**Example.** A 1000 cd source 2 m from a surface facing it:
$1000 / 2^2 = 250$ lx. At 4 m: $1000 / 4^2 = 62.5$ lx, a quarter.

<LxPlot
  :series="[{ label: 'The demo downlight', points: data.falloff }]"
  x-label="Distance below the luminaire (m)"
  y-label="Illuminance (lx)"
  caption="Straight below the demo's downlight: at twice the distance, a quarter of the light."
/>

## The cosine law

Light arriving at a slant spreads over more surface, like the long shadows at
sunset. Illuminance is multiplied by the cosine of the angle $\alpha$ between
the light and the surface's perpendicular:

$$E = \frac{I \cos\alpha}{d^2}$$

That's the formula Lux Studio uses at every point, with $I$ read from the IES
file in the exact direction of the point.

**Example.** The same 1000 cd source, 2 m above the floor. A point on the
floor 1 m from the one straight below is $d = \sqrt{1^2 + 2^2} = \sqrt 5$ m
away, and the light reaches it with $\cos\alpha = 2/\sqrt 5$:

$$E = \frac{1000 \cdot 2/\sqrt 5}{5} = 178.9\ \text{lx}$$

On the floor below a downlight, both laws and the beam's shape add up. The
dashed curve shows how much the cosine weighs:

<LxPlot
  :series="[
    { label: 'Actual illuminance', points: data.floor[0] },
    { label: 'Without the cosine (I / d²)', points: data.floor[1], dashed: true, muted: true },
  ]"
  :x-min="-3"
  x-label="Position on the floor (m)"
  y-label="Illuminance (lx)"
  caption="The floor 2.7 m below the demo's downlight, computed by Lux Studio from its IES file."
/>

## Several luminaires

Light from several luminaires adds up: the illuminance at a point is the sum
of what reaches it from each. If a piece of furniture stands between a
luminaire and the point, that luminaire adds nothing: there's a shadow.

## Close to a large luminaire

The inverse-square law holds for a point of light. A real luminaire has a
size, and the law is right, to within 1 %, from **five times** its size away.
Closer, treating it as a point overstates.

That's why Lux Studio splits a luminaire's opening into cells of at most
10 cm, across, along and in height, each cell a point with its share of the
light. Below the middle of a 1.2 m line of light:

<LxPlot
  :series="[
    { label: 'Exact formula', points: data.line[0] },
    { label: 'Lux Studio (cells)', points: data.line[1], dashed: true },
    { label: 'A single point', points: data.line[2], muted: true },
  ]"
  :y-max="1000"
  x-label="Distance below the line of light (m)"
  y-label="Illuminance (lx)"
  caption="A 1.2 m line giving 100 cd: with cells, Lux Studio follows the exact formula; a single point overshoots close up."
/>

The exact formula for an even line of length $L$, at a distance $h$ from its
middle, is

$$E = \frac{I}{h\,\sqrt{h^2 + L^2/4}}$$
