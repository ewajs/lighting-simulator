# 0078. Windows: glazed openings in walls and the ceiling

- **Status:** Accepted
- **Date:** 2026-10-18

## Context

The owner asked for windows (M6): added to the room, moved, sized, with
kinds of glass and coverings, skylights included, and the daylight through
them in the calculation and the picture. The spec had daylight as a
non-goal; this brings the daylight from a given sky at a given time into
scope. Annual metrics, glare and weather data stay out. The milestone is
built as a minimum first, to learn from it.

## Decision

**A window is a scene item,** beside luminaires and furniture
(`Scene.windows`, `ItemKind` `'window'`). So selecting, removing,
duplicating, undo and saving come through the same paths (ADR 0048). It's
named `RoomWindow`, so it doesn't hide the DOM's `Window` type.

- **`surface`**: one of the four walls (`wall-x-`, `wall-x+`, `wall-z-`,
  `wall-z+`, as the calculation grids name them) or the `ceiling`. A
  skylight is a window in the ceiling, not a kind of its own.
- **`position`**: the opening's centre, on its surface's plane.
- **`width` and `height`**: on a wall, along it and up it. In the ceiling,
  along x and along z.
- **`glazing`**: `clear`, `tinted` or `frosted`.
- **`covering`**: `none`, `sheer` or `blind`.

`GLAZINGS` and `COVERINGS` give each one a visible transmittance, and say
whether it scatters light; daylight (W5) reads them.

**Where it can be.** `constrainWindow` keeps a window on its surface's
plane, its sides from 20 cm up to what the surface allows, and the whole of
it 5 cm inside the surface's edges. It runs on every edit, and when the room
resizes, so a window stays on its wall as the wall moves. Windows may
overlap each other for now. Walls have no thickness, so a window has no
reveal.

**Presets** (`WINDOW_TYPES`), for the catalog:
- a window, 1.2 × 1.2 m over a 0.9 m sill;
- a tall window, 1.8 × 2.1 m from 0.1 m;
- a skylight, 0.9 × 0.9 m.

A new wall window goes on the back wall, which the default camera faces,
centred.

**Moving.** A window slides along its own surface: a side wall's along z
and up, the ceiling's along x and z (`itemRules('window')`).

**`windowRect`** gives the opening's corner, its two side directions and its
inward normal, for the picture and the calculation.

**Scene files, version 2.** Scenes gained `windows`. A version 1 file,
share link or autosave opens as a scene without windows (the first entry in
`UPGRADES`).

## Consequences

- Every place that builds a `Scene` literal needs `windows: []`.
- Version 1 readers can't open version 2 files: they say it's a newer
  version, as designed (ADR 0051).
- The picture, the editing and the daylight come in the next PRs (W2–W7).
