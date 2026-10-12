# 0040. Aim handle: aim point and rotation ring

- **Status:** Accepted
- **Date:** 2026-10-12

## Context

Recessed and track heads have a tilt and a pan (`Aim`). Until now they could
only be set with the inspector's number fields. Lighting designers think in
terms of where light lands ("on the painting"), and asymmetric IES products
such as wall washers also need their throw turned around the vertical.

## Options

- **Handle:** an aim point you drag to where the beam should land, plus a
  ring that turns pan; or two angle rings (tilt and pan) like a classic
  rotate gizmo
- **Which products:** recessed and track, as in the inspector; or also
  pendants (a linear pendant's orientation)

## Decision

- **An aim point and a rotation ring**, shown in aim mode for one selected
  recessed or track luminaire:
  - **Aim point:** a marker where the beam centre lands (`beamHit`), joined to
    the luminaire by a line. Dragging it across the floor and walls (as the
    camera shows them, `roomSurfaceHit`) aims the luminaire at the point
    (`aimAt`). Tilt is capped at 90°, as in the inspector.
  - **Ring:** a horizontal circle around the luminaire. Dragging around it turns pan
    by as much as the pointer turns (`bearingAround`) and keeps tilt. It's
    needed for asymmetric light, and for a luminaire pointing straight down,
    where the aim point can't express pan.
  - Each drag is one undo step. The handle is amber like the selection and
    turns orange while hovered or dragged, and it keeps a constant size on
    screen. The marker wins over the ring and the fixture when they overlap.
- **Pendants are left out for now.** Their orientation matters for linear
  products, but it would also need a pan field in the inspector and a model
  that shows the orientation. That's a separate decision.
- **Switching:** `HandleMode` gains `'aim'`. In `<lxs-app>`, `W` (move) and
  `E` (aim) switch the tool, as does a Move/Aim toggle at the top left of the
  viewport (in the View sheet on phones). With several luminaires selected, or
  a non-aimable one, aim mode shows no handle and the inspector still edits
  the aim.
- **Overlay helpers:** `render/overlay.ts` now holds `overlayColor` (the
  colour divided by the exposure, ADR 0039) and `worldPerPixel`. It's the
  third user (outline, move handle, aim handle), so the code was extracted.

## Consequences

- New public API: `'aim'` in `HandleMode`, `lxs-tool-change` on
  `<lxs-viewport-controls>`, and a `tool` property on it.
- Aiming is from the luminaire's position, a few centimetres from a track
  head's lamp. The marker can be that far off the true beam centre.
- Many screenshot baselines changed, because the toolbar shows in every desktop and tablet view.
