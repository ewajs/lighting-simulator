# 0081. Daylight against Radiance: open windows, gensky's CIE skies at Lux Studio's levels

- **Status:** Accepted
- **Date:** 2026-10-18

## Context

ADR 0080 put daylight in the calculation, checked against exact cases (Howell's form factor, the CIE sky's ratios, flux conservation). The plan's last check is Radiance's (ADR 0058), on rooms by day: a side window and a skylight under the overcast sky, a side window with the sun, and daylight with lamps. The owner asked to run Radiance only for these, not to regenerate the other references.

## Decision

**Four reference rooms by day** (`accuracy/rooms/daylight-*.json`):

| Room | Windows | Sky | Lamps |
|---|---|---|---|
| `daylight-side-window` | a 2 × 1.4 m window in the back wall of a 4 × 5 m room | overcast, noon | none |
| `daylight-skylight` | a 1.2 × 1.2 m skylight in a 4 × 4 × 3 m room | overcast, noon | none |
| `daylight-sun` | the side window again | clear, at 10:00, with the sun coming in | none |
| `daylight-and-lamps` | a window in the right wall | overcast, at 17:00 | two downlights |

All of them are in Buenos Aires on the March equinox. A room file's `windows` and `daylight` are Lux Studio's own (ADRs 0078, 0079).

**The Python works out the daylight on its own** (`sky.py`), with the same sources as ADR 0080:

- the sun's position (Duffie & Beckman, Spencer's declination);
- the sky's and the sun's levels (IES availability).

A test checks that its sun, levels and glass agree with Lux Studio's: the sun to 1e-4°, the levels to 1e-6.

**Radiance's gensky makes the sky.** It gets the sun's position with `-ang`, the sky's horizontal illuminance with `-B`, and the sun's on the ground with `-R`. Its own CIE overcast and clear distributions spread that light, its ground glows at 0.2, and the whole sky is turned to the room's north. New checks in `accuracy check` confirm that it gives the levels it was set to, out in the open:

| Check | Difference |
|---|---|
| overcast, horizontal | −0.14 % |
| overcast, vertical (the CIE 39.6 % plus the ground) | −0.24 % |
| clear sky alone, horizontal | −0.52 % |
| clear sky with the sun, horizontal | +0.01 % |

**Windows are holes, and the sky outside is dimmed by the glass's transmittance.** Lux Studio's glass lets the same share through at every angle; Radiance's `glass` follows Fresnel and lets less through at grazing angles. Dimming the sky compares the same physics on both sides. That's why a room's windows must all be of one glass, and clear: scattering glass would need a different model on Radiance's side. The walls are split into rectangles around the holes.

**Three runs per room by day:**

- **Daylight's first arrival:** the room and boxes black, the sky alone, `-ab 1 -ad 65536`. The sky is a glow that Radiance reaches only by sampling.
- **The luminaires' direct light,** without the sky.
- **The total with every bounce,** as for the other rooms.

**Where they live.** The comparison keeps the luminaire rooms (`REFERENCES`) apart from the daylight rooms (`DAYLIGHT_REFERENCES`). So the studies (patch size, source cells, bounce, timings) and REPORT.md stay about the luminaire rooms, unchanged. `daylight.test.ts` holds the daylight rooms to their bounds, and the docs PR (W8) adds them to the report.

## Consequences

- The comparison checks Lux Studio's transfer through windows, its sky distributions' normalisation, the ground, the sun's beam and daylight's bounces. It does not check the glass's angular transmittance, which Lux Studio leaves out (ADR 0080).
- Radiance samples the sky through a window with `-ad` rays per point. In the total run, at 4096, single points vary by several percent, and the averages hold the comparison.
- Generating the four rooms took 1 min 45 s on an Apple M1 Pro, the checks included. `uv run --directory accuracy/python accuracy references daylight-side-window daylight-skylight daylight-sun daylight-and-lamps` regenerates just them (`npm run accuracy:references` would pass room names to its report step instead).
