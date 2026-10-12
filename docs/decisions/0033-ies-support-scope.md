# 0033. IES support scope

- **Status:** Accepted
- **Date:** 2026-10-11

## Context

Lux Studio should work with arbitrary IES files: a prospect or client can
hand us any manufacturer's file. IES LM-63 has five editions (1986, 1991,
1995, 2002, 2019), three photometric types (A, B, C), optional tilt data and
several horizontal symmetries. Supporting everything costs time on cases no
indoor luminaire uses.

## Options

- Full LM-63, including Type A and B and tilt correction
- Type C only, every edition and symmetry, tilt data skipped
- Only the 2002 edition, as three.js's `IESLoader` assumes

## Decision

Core's `parseIes` reads all five editions, `TILT=NONE`, `TILT=INCLUDE` and
`TILT=<file>`, and every Type C horizontal layout: one angle (rotational),
0–90° (quadrant), 0–180°, the legacy 90–270° and 0 to more than 180° (no
symmetry; a file stopping short of 360° wraps to its 0° row). Vertical
angles may cover any ascending range within 0–180°; intensity outside it is
0 cd.

- **Type A and B are rejected** with a clear message. They are used for
  floodlights and vehicle lamps, not indoor luminaires.
- **Tilt data is parsed past and ignored.** It only corrects lamps whose
  output changes with their orientation (some discharge lamps), never LEDs,
  and a referenced tilt file couldn't be loaded anyway.
- **Scaling:** candela values are multiplied by the candela multiplier and
  the ballast factor, and in editions before 2002 by the ballast-lamp
  photometric factor (2002 reserves that field, 2019 uses it for the file
  generation type).
- **Between angles** the intensity is interpolated linearly in both
  directions. Total flux and beam angle are derived from the table: flux by
  an integration that is exact for that interpolation, beam angle at 50 % of
  the peak of the profile averaged over all horizontal angles.
- Parsing takes a string; decoding the bytes is the host's job.

## Consequences

- Malformed or out-of-scope files fail with a `SyntaxError` naming the
  problem and, where known, the line.
- The candela table, not the product's `flux` and `beamDeg`, is the source
  of truth for products that have photometry.
- Floodlight or street-light catalogs would need Type B support later.
