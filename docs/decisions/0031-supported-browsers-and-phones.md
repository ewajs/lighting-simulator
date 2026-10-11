# 0031. Supported browsers, and full phone support

- **Status:** Accepted
- **Date:** 2026-10-11

## Context

The SPEC promised the latest Chrome, Edge, Safari and Firefox, with phones
view-only. The owner doesn't need Firefox, and wants the simulator to look
good and be useful on phones too, for example sales staff building a scene
in front of a customer.

## Options

- **Phone scope:** everything, adapted / review and tweak / view only
- **Phone pattern:** a bottom tab bar with sheets / one drawer with floating buttons
- **Landscape phones:** the same pattern with sheets from the side / portrait only
- **Sheet resizing:** a half/full toggle / a drag handle

## Decision

- **Supported:** the latest two versions of Chrome and Edge (desktop and Android) and Safari (macOS and iOS/iPadOS). **Firefox is not supported** and isn't tested.
- **Phones get every feature.** At ≤ 600 px wide, `<lxs-app>` switches to a phone layout: a full-screen viewport, a compact top bar (brand, undo/redo, a ⋯ menu with screenshot, theme and language), and a bottom tab bar (Catálogo, Escena, Propiedades, Vista) whose tabs open the existing panels in a `<lxs-sheet>`. Vista holds the viewport controls (`variant="panel"`).
- Sheets open at half height, with a button for full height. Selecting a fixture opens Propiedades, adding a product shows the new luminaire's properties, and clearing a selection closes a sheet that selection opened.
- Landscape phones (P.4b) use the same pieces: the tab bar becomes a side rail and sheets slide in from the right.

## Consequences

- Panels are reused unchanged in sheets; their headers expose `part="header"` so the sheet can hide duplicates.
- WebKit (iOS Safari) gets its own test pass in P.5.
- Open sheets cover part of the 3D view; re-framing the camera into the visible area is a possible follow-up.
