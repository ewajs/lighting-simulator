# 0055. Help redesign, and panels that slide

- **Status:** Accepted
- **Date:** 2026-10-16

## Context

The getting-started help (ADR 0046) had fallen behind and looked rough:
- every card reused the same room and cone, and the light's pool floated
  below the cone instead of meeting it;
- the undo arrow was hand-drawn, a slider floated on the floor, and the
  "look around" arc and the IES card's shape were hard to read;
- nothing covered furniture, materials, or saving and sharing.

Separately, panels, sheets and dialogs appeared and vanished abruptly, which
reads as unpolished. DESIGN.md allows 120–200 ms transitions on panels, and
nothing decorative.

## Decision

**The help**
- **Ten cards at most** (nine, plus IES when the host turns import on):
  - welcome;
  - add luminaires *and furniture* (the catalog switch);
  - pick, move *and turn* (arrows, and the floor ring);
  - aim;
  - adjust the light;
  - *the room* (size, colours and materials);
  - look around;
  - precise and undoable;
  - *save, share, start over*;
  - your own IES file.
- **One visual language:**
  - a beam ends exactly at its pool, drawn with gradients, so the light
    visibly lands;
  - the aim card's beam meets the spot on the picture at its tangent points;
  - interface parts are real Lucide icons placed inside the drawings
    (`iconMarkup`): the catalog switch, undo, New/Open/Save/Share, the
    sliders;
  - the move arrow is drawn in the x axis's red, and the floor ring is shown
    turning a sofa.
  - The IES card shows a polar candela chart, the diagram lighting people
    know from photometric reports.
- **Theme tokens only,** as before. Each loop lasts a few seconds. With
  reduced motion, every drawing stands still, and each element's resting
  style is that still pose (the room card shows planks; the files card,
  New).

**Panel motion**
- Short slides and fades with `--lxs-ease`. Panels and sheets take
  `--lxs-t-panel` (250 ms, slow enough to follow by eye); dialogs, menus and
  notices `--lxs-t-fast` / `--lxs-t-med`. The theme sets all three to 0
  under `prefers-reduced-motion`.
- **Side panels** ease the grid's columns open and closed. This only
  switches on after the first layout: an animated start, such as a tablet's
  collapsed library, would frame the 3D view mid-slide. A panel keeps its
  full width while its column changes, so it slides in and out under the
  edge (the library's panel under the rail, the inspector past the window's
  edge) instead of squeezing; it's hidden once the column has closed.
- **Phone sheets** slide up (from the right in landscape). On closing they
  slide out the same way at the same speed: `<lxs-sheet>.leave()` resolves
  when they're out of sight, and the app removes them then. The way out has
  keyframes of its own: reusing the arrival's name would only update that
  finished animation, and nothing would play.
- **The tablet's properties sheet** folds its body through a grid row
  easing from `1fr` to `0fr`. Its contents are inert while folded and hidden
  once the fold ends.
- **Dialogs** (help, New) and the ⋯ menu fade and settle in and out with
  `@starting-style` and discrete transitions. Where unsupported, they just
  appear.
- **Notices and the loading pill** rise or fade in.

*Revised after review:* panels slowed from 200 to 250 ms with their own
token, and side panels made to slide out as they slide in (at first their
contents vanished at once on closing).

## Consequences

- New public API: `<lxs-sheet>.leave()`. `iconMarkup` is internal.
- The manual's screenshots are taken with reduced motion, so nothing is
  caught mid-slide; the e2e screenshots already finish animations.
- ADR 0046's card list is replaced by the one above.
