# 0071. Tighter reference checks: a real sphere, and orientation by hand

- **Status:** Accepted
- **Date:** 2026-10-17

## Context

An outside review of the Analysis section made two points about the checks
behind the references (ADR 0058, 0060):
- **The integrating-sphere check was looser than the results it supports.**
  It allowed 2 %, while the rooms agree within 0.2–0.7 %.
- **Agreement between Radiance and Lux Studio can't catch a mistake in the
  room description they both read.** A luminaire turned the wrong way would
  pass every comparison.

## Decision

### A real integrating sphere

The old check put a point source in a 3 m cube that reflects 80 %. It
compared the mean bounced light at 4 × 4 points per face with
E = ρΦ / (A(1 − ρ)), and passed at +0.23 %. Taking it apart showed two
errors cancelling:
- **Missing bounces.** 24 bounces leave out 0.8²⁴ = 0.47 % of the light. At
  64 bounces the cube reads +0.69 %.
- **Too few points.** In a cube the formula holds only for the average over
  the surfaces, which 16 points per face approximate. That error shrinks as
  points are added: +0.69, +0.26, +0.14 % at 4, 8 and 12 per side.

The check is now a hollow sphere, 1.5 m in radius, that reflects 80 %, with a
100 cd point source at its centre. Inside a diffuse sphere, light reflected
anywhere reaches every point equally, so the formula holds at each point, not
just on average. Every point also sees the same light from every direction,
so Radiance's random sampling has nothing to vary.
- **Result:** with 64 bounces (`SPHERE_OPTIONS`), release 6.0P2 gives
  177.778 lx at 60 points, the formula's value to the last digit printed.
- **Bound:** 0.1 %.
- **New test:** the references' own 24 bounces fail it, reading 0.47 % low.
  The rooms keep 24: their floors reflect 30 %, and doubling the bounces
  changes them by under 0.1 % (`test_convergence.py`).

`build_scene` takes a `SphereShell` as well as a `RoomShell`.

### Orientation, worked out by hand

`accuracy/typescript/src/orientation.test.ts` works out where light should
land. It uses only the room files and the written conventions: C0 is the
fixture's front (ADR 0043), and the aim is (sin t sin p, −cos t, sin t cos p).
It asserts on Radiance's points and on Lux Studio's:
- **Track spots.** A round beam's pool is centred on the beam's vertical
  plane, which the pan alone sets. Both programs' pools are within 0.6 cm of
  it on the floor and 3 cm on the wall (bound 5 cm). Along the plane, the pool
  centres sit short of the axis, as they should at a slant: 2.29 m against
  2.5 m (bound 0.3 m; a 5° tilt error moves it 0.48 m).
- **Wall washer.** Beside its wall, direct light summed by hand from the IES
  tables (the test's own lookup) matches both programs within 0.4 % at every
  height (bound 1 %). The washer turned to face away would be 12 % off, and a
  test shows the check can tell.

## Not done

- **CIE 171:2006's test cases.** The document has to be bought. The analytic
  cases that need no document are here or in ADR 0069: the sphere, and a
  Lambertian area source. Claiming CIE 171 conformance waits for the
  document.
- **Tilted bodies and ies2rad's exact shapes:** see ADR 0070.

## Consequences

- `accuracy:check` takes about the same time: the sphere's 60 points run in
  17 s.
- The manual's method page and the bounced-light Concepts page describe the
  sphere and the hand checks.
