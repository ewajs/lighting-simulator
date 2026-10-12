# 0036. Full-sphere IES light

- **Status:** Accepted
- **Date:** 2026-10-11

## Context

Products with an IES file must light the room the way the file says,
including asymmetric distributions (wall washers, linear fixtures) and light
going up (direct/indirect pendants, up/down wall lights). three.js's
`IESSpotLight` reads only the vertical angle (a rotationally symmetric
profile) and is a spotlight, limited to a cone below 90° from its axis.

## Options

- Our own light: a `PointLight` subclass whose shader looks the intensity up
  by both angles, over the whole sphere
- `IESSpotLight` as it is: asymmetry and upward light are lost
- Two `IESSpotLight`s per fixture, one down and one up, with a patched lookup:
  twice the lights and shadows, and still no wall-washer asymmetry beyond the cone

## Decision

`IesLight` extends `THREE.PointLight` and carries a profile texture.
`IesLightNode` extends three's `PointLightNode` and overrides `setupDirect`:
it takes the direction from the light to the surface, rotates it into the
luminaire's frame, converts it to Type C angles and multiplies the point
light's colour by the profile at those angles. The Viewport registers the
pair with `renderer.library.addLight`, the hook three.js uses for its own
lights; TSL compiles the shader for WebGPU and WebGL 2.

- **Profile texture.** Core resamples `candelaAt` onto a regular grid,
  0.5° vertical × 1° horizontal (361 × 360), normalised to the peak and
  uploaded as a single-channel half-float texture (~260 KB), shared by every
  luminaire of the product. Symmetry handling stays in tested TypeScript; the
  GPU does a plain bilinear lookup. Half floats are filterable on every
  WebGPU and WebGL 2 device, 32-bit floats are not. `intensity` is the peak in cd.
- **Orientation.** The luminaire's frame: −y is the aim (vertical 0°), +z the
  forward direction (horizontal 0°), +x horizontal 90° (anticlockwise seen
  from above). Tilt leans towards forward and pan turns around the vertical,
  so they rotate the whole distribution. Wall fixtures face into the room.
  Both asymmetric sample files throw towards 0°; a manufacturer that uses 90°
  for the main throw would need a per-product rotation offset, added when a
  client needs it.
- **Shadows.** An `IesLight` casts point-light (cube) shadows: six renders
  instead of one. The shadow budget stays at the 8 brightest lights, and
  shadows only re-render on edits.
- Products without a file keep the spot or point fallback.

## Consequences

- `PointLightNode.setupDirect` and its return shape are three.js internals.
  three is pinned to an exact version, and every upgrade must re-check this
  light (the e2e screenshots of each IES product cover it).
- The rendered distribution and core's `candelaAt` (used for lux analysis in
  M5) interpolate the same way, so pictures and numbers agree up to the grid
  resolution.
- Shadow updates cost more with many IES lights. Measured on the development
  Mac (Chrome, 1280 × 800): 10 IES luminaires, 8 with cube shadows, hold
  60 fps idle and while a slider re-renders every shadow map each frame, on
  both WebGPU and WebGL 2. Phones and tablets are not measured yet.
