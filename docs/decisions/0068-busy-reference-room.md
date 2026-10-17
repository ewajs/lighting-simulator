# 0068. A busy reference room: how accuracy and time scale

- **Status:** Accepted
- **Date:** 2026-10-17

## Context

The reference rooms (ADR 0058) had at most four pieces of furniture, in
5 × 4 m. A real project is fuller. Before telling users how far to trust the
numbers, we wanted to know two things: whether the agreement with Radiance
holds in a crowded room, and how the time grows.

## Decision

### The room

`accuracy/rooms/busy-open-plan.json`, 6 × 5 × 2.7 m:
- **Ten pieces at the demo's usual sizes:** a sofa, two armchairs, a coffee
  table, a TV unit, two bookcases, a dining table, a kitchen island and a desk.
  The manual's room picture rebuilds them from the demo, which now also sets
  the room's size.
- **Finishes** run from walnut (0.15) to white (0.8).
- **Nine luminaires:** seven downlights, the linear pendant over the table,
  and the wall washer on the back wall.
- **Points:** 1924, on the work plane, floor, ceiling, left wall and back wall.

### What it shows

**Averages hold.** Every surface's average is within 1 % of Radiance, in
direct and total light. So is every surface with the furniture taken out.

**A few points don't: penumbrae.** The worst far point is 68 % in direct
light and 45 % in total. Those points are on the floor between furniture:
- in the 30 cm gap between the sofa and the coffee table;
- behind the island.

From those points, a downlight shows only just past an edge, by millimetres.
Radiance's source is the opening's 15 cm disc, and part of it shows.
Lux Studio splits the opening into 7.6 cm cells, and each cell is seen or not,
so the point reads 0 or double. Of the bright points, 2.7 % are off by more
than 10 % in direct light and 1.6 % in total. The other rooms: under 1 %.

**Beside the island:** three work-plane points read 10–12 % low. They sit
2.5 cm from its side and 10 cm below its top, and the whole difference is in
bounced light. Patches half the size only take it to 10 %, so it isn't the
patch size. The cause isn't established yet.

**Time grows mostly with furniture in bounced light.**

| Lux Studio, single thread, Apple M1 Pro | Living room (4 pieces, 1036 points) | Busy room (10 pieces, 1924 points) |
|---|---|---|
| Full calculation of the reference points | 1.0 s | 3.8 s |
| Of which furniture in bounced light | 0.7 s | 3.0 s |
| App bench, from scratch (6 luminaires, `npm run bench`) | 0.70 s (3 pieces, 5 × 4 m) | 2.36 s |
| App bench, only the light changed (ADR 0065) | 0.13 s | 0.24 s |

Radiance took 215 s on ten processes, against 55 s for the living room.

In the app:
- Moving or dimming a luminaire stays well under a second in a full room.
- Moving furniture takes about 2.4 s on this machine, because it changes the
  bounces of the whole room. The panel keeps showing the last result while
  it calculates (ADR 0064).

### How the tests bound it

`references.test.ts` keeps the averages' bounds for every room. A room listed
in `PENUMBRAE` is bounded differently on points:
- by how few of its bright points are off by more than 10 % (under 3.5 %);
- with its worst point only as a regression ceiling (75 %).

Only the busy room is listed. A worst-point bound tight enough for it would
say nothing about the other rooms, and one loose enough would hide a real
regression in them.

The manual quotes the busy room's worst points apart from the headline
(`BUSY_ROOM` in `headline.ts`), and its "What it doesn't count yet" list now
names stepped shadow edges.

## Options not taken yet (the owner's call)

- **Smaller source cells.** 5 cm instead of 10 cm takes the busy room's direct
  worst point from 68 % to 41 %, and the total-light points off by more than
  10 % from 36 to 9, for about 13 % more time. 3 cm takes the direct worst to
  17 %, for about 40 % more time. Penumbrae would still be stepped, only
  finer. It's a default change (ADR 0057), so it's left for a decision.
- **Faster furniture visibility.** Every segment is still tested against
  every box. A coarse grid or bounding-volume tree would cut the 3 s, but it
  is new structure, worth it only if moving furniture in full rooms feels slow
  in practice.

## Consequences

- The report, `summary.json`, `comparison.json`, `timings.json` and
  `PATCH-SIZE.md` include the busy room; regenerating every reference now
  takes about 14 minutes on an M1 Pro.
- The manual's Analysis section has a seventh room page, and its Speed page
  says how the time grows with the room and what that means in the app.
