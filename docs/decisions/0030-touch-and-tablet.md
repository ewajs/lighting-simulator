# 0030. Touch and tablet interaction

- **Status:** Accepted
- **Date:** 2026-10-11

## Context

On tablets the UI had small touch targets, hover-only hints, no way to
select several luminaires (no Shift key), and panels that left little room
for the viewport: 420 px wide in landscape, and half covered by the
inspector in portrait.

## Options

- **Landscape:** start with the library collapsed below 1200 px / both panels collapsed / no change
- **Portrait:** a collapsible bottom sheet / a side drawer / no change
- **Multi-select on touch:** long press toggles / a "select several" mode / not now

## Decision

- **Sizing:** under `@media (pointer: coarse)`, `theme.css` enlarges `--lxs-control-h`, `--lxs-icon-btn`, `--lxs-segment-h` and `--lxs-chip-h` towards 44 px. Hover-only hints are always shown under `(hover: none)`.
- **Taps:** a tap tolerates 10 px of movement (4 px for the mouse).
- **Long press** (touch and pen, `LONG_PRESS_MS` = 500 ms) toggles a luminaire in or out of the selection, like Shift-click. In 3D, core's `PickEvent` gains `longPress`, fired while the finger is still down. Scene list rows do the same.
- **Landscape:** `<lxs-app>` starts with the library collapsed when it is narrower than 1200 px, unless the host set `library-collapsed`.
- **Portrait (≤ 900 px):** the inspector is a sheet over the viewport. It shows only its header until something is selected or the header is tapped, and folds again when the selection is cleared. Floating controls stay above it.
- Dragging products from the catalog stays mouse-only; touch users tap to add.

## Consequences

- Desktop is visually unchanged; the e2e desktop baselines didn't move.
- `PickEvent.longPress` and `LONG_PRESS_MS` are new public API in core.
- Dragging products into the room on touch would need custom pointer-based dragging; it can come with M2 (manipulation).
