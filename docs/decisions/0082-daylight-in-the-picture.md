# 0082. Daylight in the picture: the sun with shadows, a glow per window, the eye's adaptation

- **Status:** Accepted
- **Date:** 2026-10-18

## Context

The calculation counts daylight (ADR 0080), and Radiance confirms it (ADR 0081), but the 3D view still lit rooms by their lamps alone. The plan's W7 asked for:

- the sun, with shadows;
- the sky's light through the windows;
- an exposure that suits each sky;
- the daylight's colour;
- night.

It should do this without changing how rooms look by lamplight, and at the frame rate the view keeps.

## Decision

The picture reads the same sky as the calculation (`skyFor`) and turns it into lights a real-time renderer draws (`render/daylight-lighting.ts`, pure; `render/DaylightLights.ts`).

**Lights:**
- **The sun** is a directional light. Its illuminance is the sun's direct normal illuminance times the clear windows' transmittance, in lx. It casts shadows: the walls' back faces are drawn in its shadow map, so its beam comes in only through the openings, and the furniture shades it. Its colour warms from 5500 K at 40° and above to 2000 K at the horizon. It always casts shadows, with intensity 0 when there's no sun, because switching `castShadow` off breaks three's WebGPURenderer (as with the luminaires).
- **Each window** gets a wide spot just inside it, aimed into the room. The spot is as bright as a Lambertian panel of the sky's average luminance through the glass: I = τ · E_out / π · A, where E_out is the sky's and ground's illuminance on the window's outside. Its colour is 6500 K under an overcast sky and 9000 K under a clear one. A scattering window (frosted glass or a covering) takes the sun into its glow, with no beam. The sun's beam uses the clear windows' transmittance: one light for all of them.
- **The room's bounce:** the integrating-sphere fill (SPEC §6) now counts daylight's flux in lumens beside the luminaires'.

**The eye adapts.** Up to 300 lx, the room's average daylight as the integrating sphere estimates it, the exposure stays calibrated for lamps (`BASE_EXPOSURE`). Above that it's lowered in proportion, as the eye adjusts to a bright room. A room by day therefore reads as a room, not a white-out, and the exposure slider works on top. At night, or with no windows, the scale is 1, so the picture is exactly as before: no existing baseline changed.

**Outside the windows** the backdrop follows the sky: pale grey overcast, blue clear, dark at night. It's one uniform shared by every window, so a change of sky rebuilds nothing.

**The illuminance view** turns daylight's lights off, as it does the luminaires' (ADR 0066).

## Why not area lights

three's `RectAreaLight` would draw each window as a true area source. In the WebGPU renderer it needs `RectAreaLightTexturesLib`, a 315 kB table in the bundle, and it casts no shadows either. A spot whose falloff spreads over the half-space is close enough for the picture. The calculation, not the picture, is the exact one.

## Consequences

- The sun patch, its shadows and the windows' glow are drawn, and the frame rate holds: 120 fps on an Apple M1 Pro, by night and by day with three windows and the sun.
- The glow is a point, so near a window a wall is lit unevenly, more than the calculation says. The illuminance view shows the true values.
- All clear windows share one sun with the highest transmittance among them. A tinted window beside a clear one lets in a clear one's beam.
- The exposure adapts from an estimate, not the calculation, so it doesn't change while a calculation runs.
