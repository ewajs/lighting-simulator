# Analysing the light

Lux Studio calculates how much light reaches the work plane and each of the
room's surfaces, in lux, bounced light included
([How Lux Studio calculates](./concepts/how-it-calculates)). You see it three
ways: the numbers in the **Analysis** panel, the **Illuminance** view in
colour, and the light at a point, with the mouse or a finger.

## The Analysis panel

![The Analysis panel with the starter room](/screenshots/en/analysis-panel.png)

Open it with the third icon in the left panel, the bar chart; on a phone,
with the **Analysis** tab. While it's open, it recalculates by itself every
time you change the scene.

- **Work plane:** the average illuminance $\bar{E}$, the minimum, the maximum
  and the uniformity $U_0$ ([The work plane](./concepts/work-plane),
  [Uniformity](./concepts/uniformity)). Compare them with the
  [recommended levels](./concepts/recommended-levels) for what the room is
  used for.
- **Room surfaces:** the same for the floor, the ceiling and each wall.
- At the top it says how long the calculation took. While it calculates, the
  previous numbers are dimmed until the new ones arrive.
- If a luminaire has no IES file, it says so: its light is an estimate.

With **Calculate as I edit** off, it calculates only when you press
**Calculate**. That helps in a large room with lots of furniture, where each
calculation takes a few seconds.

## Calculation settings

![The calculation settings, at the end of the panel](/screenshots/en/analysis-settings.png)

- **Maintenance factor:** the share of the light left after years of use
  ([Maintenance factor](./concepts/maintenance)). Every number in the panel
  is a maintained value.
- **Work plane height** and **border:** how high it's measured, and the strip
  along the walls that's left out.
- **Shadow detail:** the size of the cells each luminaire is split into, 10,
  5 or 2.5 cm. Smaller, shadow edges and points very close to a large
  luminaire come out more exact, and the calculation takes longer (see
  below).
- **Light that bounces:** off, only direct light counts. It's faster, but a
  third or more too dark.
- **Furniture in bounced light:** off, furniture shades direct light only.
  It's faster in a furnished room, and less accurate near the furniture. It
  needs bounced light on.

How much each one improves the result and how long it takes, measured against
Radiance: [Feature by feature](./analysis/feature-by-feature). For now, the
settings aren't saved with the scene: reloading the page puts them back to
the usual ones.

## How much shadow detail

Each luminaire is calculated as a grid of small light sources. Against the
exact value for a panel that glows evenly, the grid is within 1 % from two
cells away, and each time the cells halve, the difference drops about four
times. What changes most is the **penumbra**: a point that sees a luminaire
just past a piece of furniture's edge. Measured against Radiance in the twelve
test rooms:

| Detail | Lit points more than 10 % from Radiance | Time when a light changes |
|---|---|---|
| 10 cm (the usual) | 59 of 11045 | 1 × |
| 5 cm | 36 of 11045 | up to 3 × |
| 2.5 cm | 34 of 11045 | up to 8 × |

Of those points, 32 don't change with the cells: they're in the small
bathroom and beside the sconce, where what's missing is the luminaires'
bodies. The ones that do change are in penumbrae, in the room with ten pieces
of furniture: 27, 4 and 2.

The time grows with the size of the luminaires: with small downlights it
barely changes, with long linear luminaires it's what the table says. A good
habit: design at 10 cm and check the final result at 5 cm. The full detail is
in [SOURCE-CELL.md](https://github.com/ewajs/lighting-simulator/blob/master/accuracy/SOURCE-CELL.md).

## The Illuminance view

![The Illuminance view, reading the light at a point on the work plane](/screenshots/en/illuminance.png)

Pick **Illuminance** above the view, or press **3**. Each calculated surface
is painted by the light it gets, from dark blue (0 lx) to white (2000 lx or
more), with the scale at the bottom right. The work plane shows at its
height, above the floor. The view recalculates just as the panel does, and
the scale says so meanwhile.

## The light at a point

In the Illuminance view, move the mouse over a surface: a label shows the
light at that point, in lux, and how much of it is **direct** and how much
**bounced**. On a touch screen, tap the surface. The number is calculated at
that exact point, not read from the colour, and it updates when the scene
changes.

## Before you trust the numbers

- They're a good guide for designing and comparing, not a certified
  calculation. How close they are to Radiance, room by room:
  [Where we stand](./analysis/).
- Furniture counts as boxes: a sofa is a block, a table is just its top.
- In a room with lots of furniture, moving a piece takes a few seconds to
  recalculate; moving or dimming a luminaire, much less
  ([Speed](./analysis/speed)).
