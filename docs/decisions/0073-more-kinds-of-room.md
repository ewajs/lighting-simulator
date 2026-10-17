# 0073. More kinds of room

- **Status:** Accepted
- **Date:** 2026-10-17

## Context

Six of the seven reference rooms (ADR 0058, 0068) were 5 × 4 × 2.7 m with
the default reflectances: floor 0.3, walls 0.8, ceiling 0.85. An outside
review pointed out that dark rooms, very white rooms, tall spaces, small
rooms and rooms lit mostly by bounced light were untested, and error
behaviour changes with all of these.

## Decision

Five more rooms, compared like the others. Each has a page in the manual,
with a picture taken from the demo.

| Room | What it tests |
|---|---|
| `dark-room` | The four grid downlights, every surface 0.2: mostly direct light |
| `white-room` | The same, every surface 0.9: mostly bounced light, many bounces |
| `tall-hall` | 8 × 6 × 5 m, six up/down linear pendants at 3.5 m: a large room, and light sent to the ceiling first |
| `small-bathroom` | 2 × 1.6 × 2.4 m, tiled, a downlight and a wall light over the mirror: everything close to everything |
| `wall-wash` | Four 17° spots tilted 80° onto the walls below the ceiling: the work plane gets almost only bounced light |

The demo caps tilt at 90°, so an uplighter couldn't be pictured. A wall-wash
makes the work plane just as indirect.

**Bounces.** A room can now set Radiance's `bounces`; it's 24 when left out.
Radiance leaves out about ρⁿ of the bounced light after n bounces, which is
8 % at ρ = 0.9 with 24. The white room asks for 72, leaving out 0.05 %.
`scene.bounce_options` builds the options, and each reference records the
ones it used.

### What they show

| Room | Total averages | Bounced light | Bounced, bodies hiding it (ADR 0070) |
|---|---|---|---|
| Dark room | within 0.1 % | +0.4 % | +0.1 % |
| White room | +1.5 to +1.9 % | +1.8 to +2.2 % | +0.85 % |
| Tall hall | +0.9 to +1.1 % | +1.4 to +2.0 % | +0.1 to +0.6 % |
| Small bathroom | +3.5 to +6.1 % | +6.3 to +9.2 % | +0.2 to +0.7 % |
| Wall-wash | within 0.8 % | −0.2 to +0.7 % | −0.4 to +0.5 % |

In these five rooms, direct light agrees within 0.3 % on every average,
except the wall-wash's ceiling.

- **Luminaire bodies are the largest gap Lux Studio has left.** In the small
  bathroom every surface is near one, and in the tall hall and white room the
  light passes them many times. With the bodies hiding bounced light, the
  mean over all twelve rooms goes from +1.56 % to +0.16 % (BOUNCE.md). That's
  the strongest case yet for making it a feature (ADR 0070).
- **The white room keeps +0.85 % with bodies.** I haven't explained that
  yet.
- **The wall-wash room has two other gaps:**
  - its ceiling gets only the spots' light far off their axis, from 20 cm
    below, where the programs model the 9.5 cm opening differently (−4.5 %
    direct, −0.3 % total);
  - its bright wall pools are spread by 25 cm patches, so Emin is up to 7 %
    high.

### How the tests bound them

The bathroom and the wall-wash room are in `KNOWN_GAPS` in
`references.test.ts`. Each is bounded just above what it measures and says
why, so a regression still shows. The bathroom's ceiling minimum, above its
downlight, joins the busy room's in `MIN_EXCEPTIONS`. The manual quotes the
bathroom apart from the headline, like the busy room's penumbrae, and gives
the figures over the other ten rooms.

## Consequences

- Regenerating every reference takes about 25 minutes on an M1 Pro, and the
  accuracy tests about 2 minutes. Their per-test timeout went from 60 to
  240 s.
- The report and the manual each cover twelve rooms; `summary.json` and
  `comparison.json` grow with them.
- The room picture spec draws a room that sets its reflectances in greys
  that match them.
