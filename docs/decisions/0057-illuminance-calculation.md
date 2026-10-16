# 0057. How illuminance is calculated, and how we know it's right

- **Status:** Accepted
- **Date:** 2026-10-16

## Context

M5 adds lighting analysis: lux on the work plane and the room's surfaces,
with the averages, minimums and uniformity lighting designers judge a
design by. The owner's bar: "doing bad calculations is worse than doing
none". The numbers needn't be engineering grade, but a designer must be
able to trust them, and they will be compared with DIALux, the industry's
standard tool.

So the maths must be plain enough for a person to review, and checked
against references that don't depend on our own code.

M5.1 covers direct light: what reaches a point straight from the
luminaires. Light bouncing off the room (ADR 0028) is M5.3.

## Decision

### The model

**Direct illuminance** at a point P on a surface facing n is the
inverse-square law with Lambert's cosine law, summed over point sources:

```
E(P) = MF · Σ level · I(θ, φ) · cos α / d²
```

- I is read from the luminaire's IES file in its own Type C angles.
- d is the distance to the source, and α the angle between n and the
  direction to it.
- level is the luminaire's dimming (0 when off), and MF the maintenance
  factor.

A source behind the surface, or hidden by furniture, adds nothing.

**One frame for picture and numbers.** Where a luminaire's light leaves
from, and which way its axes point, is computed by pure functions
(`fixture-layout.ts`, `luminaire-frame.ts`). The renderer applies the same
functions to its three.js objects.
- A model's `light` and `head` nodes (ADR 0043) are read from the .glb file
  by a small pure reader (`glb.ts`), so the calculation needs no three.js.
- A track head now carries its light round its pivot as it tilts, as it
  physically does. Before, the light stayed put while the head turned, up
  to 8 cm off.

**Large luminaires are split.** The inverse-square law holds within about
1% beyond five times a source's size (the "five-times rule"). An IES file
states its luminous opening, which the parser used to drop.
- An opening larger than 10 cm is split into cells of at most 10 cm. Each
  cell is a point source with an equal share of the intensity, as DIALux
  and Relux do.
- Round openings keep the cells whose centres fall inside them.
- The 1.2 m linear pendant becomes 13 sources. 0.6 m below a 1.2 m line
  source, a single point would read 41% too high.

**Products without an IES file** use the renderer's estimate: the flux
spread evenly over the beam, or over the whole sphere for a wide beam.
Their luminaires are listed as `estimatedLuminaires`, so the UI can say
their figures are rough.

**Furniture blocks direct light only** (the owner's choice). Each piece is
one box, turned with it:
- tables and desks are only their 3 cm top, so light still gets between
  the legs;
- sofas, armchairs, beds, bookcases, cabinets, the kitchen island and
  plinths are solid;
- chairs, plants and pictures don't block.

Light reflected off furniture isn't counted. DIALux does model furniture
fully.

**Grids follow EN 12464-1.**
- The maximum spacing is p = 0.2 · 5^log₁₀(d), where d is the surface's
  longer side, capped at 10 m.
- The point count along each side is rounded up, with points at the cell
  centres.
- The work plane leaves out a border strip. The six room surfaces are
  calculated in full.

**Figures:** Ē (the mean of the points, which stand for equal areas),
Emin, Emax, U₀ = Emin/Ē and Emin/Emax.

**Settings and defaults:**
- work plane at 0.80 m, with a 0.5 m border: DIALux's defaults for
  EN 12464-1 work areas;
- maintenance factor 0.80, as DIALux reports commonly show.

All three are settings, validated at the boundary.

### The API

**Exports:**
- `analyseDirect(scene, inputs, settings)` gives every surface's grid,
  values and figures.
- `directLight` prepares a scene's sources and shadows once;
  `directIlluminance(point, normal, …)` then reads any point (for the lux
  probe in M5.4).
- `Photometry` gains `luminousOpening`.
- The frame and layout functions are exported for hosts and tests.

`inputs` are the host's data as the Simulator holds them: catalog,
photometry and model files.

### How we know it's right

Every check is committed, so it can be rerun as evidence.

1. **Hand references.**
   - The inverse-square and cosine laws.
   - Interpolation in the table.
   - Aim, pan and an asymmetric distribution.
   - A table's shadow.
   - The textbook line-source formula.
   - Two points read by hand from a real file: 156.67 and 98.15 lx under
     the Cooper downlight. Our values land within 0.3%, the cells' effect;
     Radiance gives 156.71 and 98.16.
2. **Conservation.** In a closed room, all the light a luminaire emits
   lands on its surfaces.
   - Illuminance × area over the six surfaces must equal the luminaire's
     flux, for every position, aim, wall turn and split opening.
   - Synthetic distributions and all five demo IES files land within
     0.06%.
   - This catches scale, unit, solid-angle and splitting mistakes. It
     can't catch a mirrored or rotated distribution, which still conserves
     flux; the hand references and the agreement tests cover those.
3. **Agreement.** The real `LuminaireMeshes` and `luminaireFrame` place
   and turn every mount type identically. The pure .glb reader finds the
   same `light` and `head` nodes as three.js in all five demo models.
4. **A mutation check** (`npm run mutation-check -w packages/core`).
   - It plants ten plausible mistakes one at a time: a mirrored angle, no
     cosine, an unsquared distance, cells not sharing intensity, tilt the
     wrong way, no wall turn, a head's light left behind, no maintenance
     factor, no furniture shadow, the grid from the wrong side.
   - Each must fail at least one test, and today each fails 3 to 17.
5. **Independent references (M5.2).** Radiance 6.0P2 runs reference rooms
   from the same IES files.
   - Its own IES reader, `ies2rad`, is independent of ours.
   - Releases from 2026-02-20 until a fix on 2026-10-15 drop `ies2rad`'s
     multiplier, making IES lights 1/area too dark: 55× for the demo
     downlight. So a reference is accepted only if Radiance first
     reproduces hand-checked points.
   - Then DIALux (M5.5), run by the owner from a written guide.

## Options considered

- **A single point source per luminaire.** Simpler, but up to 41% wrong
  under linear pendants at table height. Splitting is cheap.
- **Integrating each luminous opening exactly as an area source.** More
  accurate within 5× the opening's size, but needs a luminance model of the
  opening, which IES files don't give. Cells of 10 cm keep the error below
  1% from 0.5 m away, closer than any work plane.
- **Reading the light origin from the renderer.** That couples the
  calculation to three.js and to a Web Worker-hostile scene graph. The pure
  reader is 100 lines and is tested against three.js.
- **Furniture blocking bounced light too.** Much more work; DIALux does
  it. Deferred.

## Consequences

- Public API:
  - new: `Photometry.luminousOpening`, `LuminousOpening`, the analysis
    functions and types, `fixtureLayout`/`modelLayout`, `luminaireFrame`;
  - changed: `Fixture.lightOrigin` is gone from the internal renderer.
- Track spots render their light a few centimetres from where they did when
  tilted, now matching their heads.
- Known limits, recorded for the UI and the manual:
  - direct light only until M5.3;
  - diffuse surfaces only;
  - furniture as boxes, blocking direct light only;
  - estimated distributions for products without IES files;
  - a luminous opening's height isn't split (sconces, lamp shades).
- `apps/demo`'s Vite config lists `.glb` as an asset, so tests can import
  the demo's models.
