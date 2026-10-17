<script setup>
import LxFormFactor from '../../../.vitepress/theme/components/LxFormFactor.vue'
import LxBounces from '../../../.vitepress/theme/components/LxBounces.vue'
</script>

# Light that bounces

A luminaire's light doesn't end where it lands. The floor, the walls and the
ceiling give back part of what they receive, and that light bounces again. In
a light-coloured room, bounced light can add as much as the direct light, or
more.

## Reflectance

A surface's **reflectance** ρ is the share of the light it receives that it
gives back: from 0, a black that absorbs everything, to 1, a white that
absorbs nothing. A white wall is about 0.8; a wooden floor, about 0.3. Lux
Studio starts with 0.3 for the floor, 0.8 for the walls and 0.85 for the
ceiling, and you change them in [The room](../room).

Every surface is matte: it gives light back evenly in every direction, with no
gloss or reflections.

## Patches

To calculate it, Lux Studio splits the floor, the ceiling and each wall into
**patches** of at most 25 cm. Each patch receives direct light from the
luminaires and light from every other patch, and gives back the share its
reflectance says. What it gives back per square metre is its **exitance**
$M$, in lm/m²:

$$M_i = \rho_i \left( E_{\text{direct},\,i} + \sum_j F_{ij}\, M_j \right)$$

- $E_{\text{direct},\,i}$ is the direct light reaching patch $i$.
- $F_{ij}$ is the **form factor**: the share of the light leaving patch $i$
  that reaches patch $j$.

## The form factor

It depends on geometry alone: how far apart the two patches are, and how they
face each other. A patch sees the whole hemisphere above it, but not all of it
weighs the same: what's in front of it counts more than what it sees at a
slant, by the same cosine law as in [Distance and angle](./distance-and-angle).

There's a way to see it, **Nusselt's analogy**: project the other surface
onto a hemisphere centred on the patch, and that shadow straight down onto
the base. The share of the base's circle it covers is the form factor.

Move the panel by dragging its middle dot, turn it from its end, or use the
controls:

<LxFormFactor
  :labels="{
    x: 'Panel position',
    height: 'Panel height',
    angle: 'Panel angle',
    patch: 'patch',
    panel: 'panel',
    share: 'of the light leaving the patch reaches the panel.',
  }"
  caption="A small patch on the floor and a panel 1 m wide, running far into the page, seen end-on. The amber stretch of the base is its form factor; the number comes from the same function Lux Studio uses."
/>

Close and facing it, the panel takes a good share of the light; far away,
edge-on or well to the side, almost none. Between all the surfaces of a
closed room, a patch sees everything: its form factors add up to 1.

Lux Studio calculates each form factor with the exact formula for a polygon,
with no approximation.

## Bounce after bounce

The equation above has $M$ on both sides: each patch's light depends on all
the others'. Lux Studio solves it in rounds: it starts from the direct light,
shares out one bounce, then another, and stops when no patch changes by more
than a ten-thousandth of what the brightest one gives.

Then, at each point of the [grid](./work-plane), it adds up the light reaching
it from each patch, with the same form factor, and adds that to the direct
light.

## How much the bounces add

Picture a room with the same reflectance ρ on every surface. A share ρ of the
direct light comes back; of that, ρ again, and so on:

$$\rho + \rho^2 + \rho^3 + \dots = \frac{\rho}{1 - \rho}$$

Try different reflectances:

<LxBounces
  :labels="{
    reflectance: 'Reflectance',
    direct: 'Direct',
    bounce: 'Bounce',
    share: 'What each bounce gives, against the direct light',
    total: 'The direct light plus every bounce',
  }"
  caption="Each bounce gives ρ times the one before. With ρ = 0.5 the bounces add as much as the direct light; with 0.8, four times as much."
/>

That's why a room with light walls looks much brighter with the same
luminaires, and a dark one much dimmer.

### The integrating sphere

It's the ideal case: a hollow sphere, all of one reflectance. If a source
emits a flux $\Phi$ inside it and the inner surface measures $A$, the bounced
light reaches every point evenly:

$$E = \frac{\rho\,\Phi}{A\,(1 - \rho)}$$

In any closed space of a single reflectance, the same sum gives the average.

**Example.** A source of 100 cd in every direction emits
$\Phi = 4\pi \cdot 100 = 1257$ lm. In a cube 3 m a side, $A = 54$ m², with
$\rho = 0.8$:

$$E = \frac{0.8 \cdot 1257}{54 \cdot 0.2} = 93.1\ \text{lx}$$

Lux Studio's tests use this sum to check the bounces, and Radiance has to
match it, within 2 %, before it's used for comparison
([How Lux Studio calculates](./how-it-calculates)).

## Furniture too

Furniture is part of the room: it hides bounced light (the floor under a table
doesn't see the ceiling), and each of its faces is one more patch, reflecting
as its finish does. Luminaires, though, don't hide bounced light. How much
each of these changes is in [Feature by feature](../analysis/feature-by-feature).
