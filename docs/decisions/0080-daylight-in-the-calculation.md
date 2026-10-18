# 0080. Daylight in the calculation: CIE skies through windows as area sources

- **Status:** Accepted
- **Date:** 2026-10-18

## Context

Windows (ADR 0078) and the daylight settings (ADR 0079) are in the scene. The calculation (ADRs 0057, 0060) should now count the daylight they let in, together with the luminaires' light and every bounce of both. The plan's steps were:

- the overcast sky first;
- the sun if it costs about 10–15 % more;
- a check against an exact formula;
- a comparison with Radiance afterwards (W6).

## Decision

**The sky** (`analysis/sky.ts`) is one of CIE's standard luminance distributions:

- *overcast* (Moon & Spencer): L(γ)/Lz = (1 + 2 sin γ)/3;
- *clear* (CIE 1973, Kittler), which depends on the angle from the sun.

Their levels follow the IES daylight availability model (IES Lighting Handbook, 9th ed., ch. 8). The sky's horizontal illuminance is 0.3 + 21 sin αs klx overcast and 0.8 + 15.5 √(sin αs) klx clear. The zenith luminance is set so that the distribution integrates to it. On a clear day the sun adds a beam of 127.5 klx · e^(−0.21 / sin αs), with the Earth's orbit's ±3.4 %.

Below the horizon is the ground, a diffuse reflector of 0.2 (Radiance gensky's default) lit by the sky and the sun. Night, or the sun below the horizon, means no daylight. Twilight isn't modelled.

**Windows are area sources** (`analysis/window-light.ts`):

- **Clear and tinted glass** show the sky behind them. Each window is split into cells of the options' `sourceCellM`, as luminaires are (ADR 0057). A point gets τ · L(d) · cos θp · cos θw · A / r² from each cell, where L(d) is the luminance along the line from the point through the cell, outside. The sun comes through as a beam where the line towards it leaves through the opening.
- **Frosted glass, a sheer curtain or a blind** scatter what they let through. The window glows evenly at τ · E_out / π, where E_out is the sky's, ground's and sun's illuminance on its outside. A point gets L · π · F, with the exact form factor (ADR 0060). Furniture hides it through 4 × 4 samples.
- The transmittance τ is the glass's times the covering's (`GLAZINGS`, `COVERINGS`), at every angle: no angular dependence yet.

Furniture shadows daylight as it does the luminaires' light.

**In the room:**
- **Bounced light.** Daylight on each patch joins the luminaires' light in the bounced-light solve.
- **Openings.** A patch's reflectance is cut by the share of it that's a window, so light reaching a window leaves the room. This holds even with daylight off.
- **Glass.** Grid points on a window's glass count as covered (ADR 0074) and stay out of the figures.
- **Maintenance factor.** It isn't applied to daylight: it's the installation's, and glazing dirt isn't modelled.
- **Results.** They carry `daylightLx` beside `directLx` and `indirectLx`. The probe shows it, and `CalculationOptions.daylight` (a switch in the Analysis panel) leaves it out.

**By day the false-colour scale goes to 10 000 lx** (`DAYLIGHT_FALSE_COLOUR_STOPS`). It uses the same colours, with stops at 100, 300, 500, 1000, 2000 and 5000 lx, and is chosen when any daylight came in. On the 2000 lx scale a daylit room was all white.

**Speed.** The daylight on the patches doesn't change when only the luminaires do, so the `AnalysisCache` keeps it while the room, windows, sky and furniture stay. Measured with `npm run bench -w packages/core` on the furnished room with three windows under a clear sky:

| | from scratch | luminaire edit, room cached |
|---|---|---|
| by night | 868 ms | 124 ms |
| by day | 950 ms (+10 %) | 129 ms (+4 %) |

## Checks

- **Under a uniform sky, a clear skylight** gives a point below τ · L · π · F, with F Howell's exact form factor for a parallel rectangle (catalog B-3). It matches within 0.1 %, and frosted glass of the same τ matches within 1 %.
- **The CIE overcast sky** gives 7π/9 of its zenith luminance on a horizontal plane, and a vertical plane 39.6 % of that (Hopkinson).
- **Flux:** all the light entering through a skylight lands on the room, whether from the overcast sky, the clear sky (τ · Eh · A) or the sun (τ · Edn · cos θ · A, to 1e-6).
- **A side window's daylight** falls off with depth.
- **Night, or the switch off,** gives no daylight.
- **The cache** gives the same results as a fresh calculation.

## Consequences

- Daylight is as exact as the sky models. It isn't a climate-based simulation: no weather data, no annual metrics (SPEC §1).
- No glass transmittance at an angle: at grazing angles the real glass lets less through, so light from low skies is slightly overcounted.
- Walls have no thickness (ADR 0078), so there's no reveal shading the window.
- W6 compares rooms by day against Radiance, giving gensky the same sky.
