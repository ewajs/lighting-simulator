<script setup>
import LxUnits from '../../../.vitepress/theme/components/LxUnits.vue'
</script>

# Light and its units

Talking about lighting takes three questions, each with its own unit:

1. How much light leaves the luminaire? **Luminous flux**, in lumens (lm).
2. How much goes in one direction? **Luminous intensity**, in candelas (cd).
3. How much lands on a surface? **Illuminance**, in lux (lx).

<LxUnits
  :labels="['Flux: the lumens leaving', 'Intensity: candelas in one direction', 'Illuminance: lux on the surface']"
  caption="A ceiling luminaire: the cone is all its flux; the arrow, one direction; the patch, a surface the light lands on."
/>

## Luminous flux: lumens

All the light a source gives out, in every direction. The demo's 6-inch
downlight gives **1153 lm**. A 60 W incandescent bulb gave about 800 lm.

Divided by the electrical power, it's the **efficacy**: how much light each
watt gives. That downlight uses 15.8 W:

$$\frac{1153\ \text{lm}}{15.8\ \text{W}} = 73\ \text{lm/W}$$

## Luminous intensity: candelas

A luminaire doesn't share its light out evenly: a downlight sends a lot
downwards and almost none sideways. Intensity says **how much light leaves in
one direction**: the flux per **solid angle**, the part of space a cone takes
up, measured in steradians (sr).

$$I = \frac{\Phi}{\Omega} \qquad \text{(cd = lm/sr)}$$

A whole sphere takes up $4\pi \approx 12.57$ sr. A cone with half-angle
$\alpha$ takes up $\Omega = 2\pi(1 - \cos\alpha)$.

**Example.** 1000 lm spread evenly in every direction give
$1000 / 4\pi = 79.6$ cd. The same 1000 lm squeezed into a 60° beam
($\alpha = 30°$): $\Omega = 2\pi(1 - \cos 30°) = 0.842$ sr, and
$1000 / 0.842 = 1188$ cd. The same light, fifteen times as intense where it
points.

The intensity in each direction is what an IES file measures: see
[IES files and polar charts](./polar-charts).

## Illuminance: lux

The light **reaching** a surface, per square metre. It's what a light meter
reads and what standards ask for: 500 lx on a desk, for example.

$$E = \frac{\Phi}{A} \qquad \text{(lx = lm/m²)}$$

**Example.** 1000 lm spread evenly over a 2 m² table give $1000 / 2 = 500$ lx.

In practice light never arrives evenly: it depends on distance and angle, as
[Distance and angle](./distance-and-angle) shows.

## Luminance

What the eye sees as a surface's brightness is its **luminance**, in candelas
per square metre (cd/m²). It depends on how much light the surface receives
and how much it sends back (its reflectance). Lux Studio shows it in the
picture, but its numbers are illuminance.

## In short

| Quantity | Question | Unit | Symbol |
|---|---|---|---|
| Luminous flux | How much light leaves? | lumen (lm) | $\Phi$ |
| Luminous intensity | How much in that direction? | candela (cd = lm/sr) | $I$ |
| Illuminance | How much lands on the surface? | lux (lx = lm/m²) | $E$ |
| Luminance | How bright does it look? | cd/m² | $L$ |
