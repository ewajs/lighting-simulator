# Windows and daylight

Windows let daylight in: Lux Studio calculates it with the sky you choose,
overcast or clear with the sun, and shows it in the 3D view.

## Adding windows

At the top of the **Catalog**, choose **Windows**. There are three:

- **Window:** 1.2 × 1.2 m, its sill (the bottom edge) at 0.9 m.
- **Tall window:** 1.8 × 2.1 m, nearly down to the floor.
- **Skylight:** 0.9 × 0.9 m, in the ceiling.

![The windows catalog](/screenshots/en/windows-catalog.png)

**Click** one and it appears in the middle of the back wall (the skylight, in
the middle of the ceiling). Or **drag** it into the 3D view: it goes into the
wall nearest where you drop it, or into the ceiling above.

## Picking and moving

Click a window to pick it, and **drag** it: it slides along its wall, or
across the ceiling, without leaving it. With the **Move** tool (W), the arrows
move it in one direction. While you move it, lines show the distance to the
nearest corner and the height of its sill.

**⌘A** (or **Ctrl+A**) with a window picked picks them all. In the **Scene**
list, windows have their own section.

To see the ceiling and its skylights, orbit below the horizon: drag upwards
on empty space.

## Properties

![A window's properties](/screenshots/en/window-inspector.png)

- **Size:** width and height (in the ceiling, width and depth). Changing the
  height keeps the sill where it was.
- **Position:** the **surface** it's in (one of the four walls or the
  ceiling), where along it, and the **sill**.
- **Glass:** **clear** (lets 80 % of the light through), **tinted** (50 %) or
  **frosted** (70 %, and scatters it: no sun shows through, but the window
  glows evenly).
- **Covering:** **none**, a **sheer curtain** (lets 60 % through and scatters
  it) or a closed **blind** (10 %).

**⌘D** copies the window beside it, on its wall, and **Delete** removes it.

## The daylight

With nothing picked, at the end of the **Room** panel:

![The daylight: sky, time of day, month, latitude and north](/screenshots/en/daylight-settings.png)

- **Sky:** **overcast** (CIE's overcast sky, no sun), **clear, with sun**, or
  **night** (no daylight).
- **Time of day:** **morning** (9), **noon** (12) or **afternoon** (16), or any
  time with the slider. It's **solar time**: at 12 the sun is at its highest.
  It can differ from the clock by up to an hour.
- **Month:** on the 21st, so the solstices and equinoxes fall on it.
- **Latitude:** where the project is; southern ones are negative (Buenos
  Aires, −34.6).
- **North:** which way north is. At 0°, behind the back wall; at 90°, behind
  the right wall.

A line below says how high the sun is, or that it has set.

The daylight is saved with the scene. **New** keeps it: a template is a room,
not a place.

## In the view

![The morning sun coming in through a tall window](/screenshots/en/sun-through-window.png)

With the sun, its light comes in through the windows facing it and draws its
patch on the floor and walls, with the furniture's shadows. Each window glows
with the sky seen through it, and outside you see the sky: grey when
overcast, blue when clear, dark at night.

By day a room has ten times the light of lamps alone: the **exposure** adapts,
as the eye does, so it looks like a room and not a white-out. The exposure
control still works on top.

## In the analysis

The [calculation](./analysing) counts daylight alongside the luminaires'
light, with all its bounces. Light reaching a window leaves the room: even at
night, a room with large windows reads a little darker.

- The probe shows daylight apart: **Direct · daylight · bounced**.
- In **Calculation settings**, the **Daylight** switch leaves it out.
- By day the colour scale goes to 10,000 lx: daylight is far more than the
  luminaires' light.
- Points on a window's glass don't count in the figures, like those covered
  by furniture.

The results agree with Radiance's within 1 %
([Daylight, in Analysis](./analysis/daylight)).

## What it doesn't do yet

- The glass lets the same share of the light through at any angle; real glass
  lets less through when the light grazes it.
- Walls have no thickness: no reveal casts a shadow.
- No weather or yearly figures: one sky, at one time.
