# 0037. Try your own IES file

- **Status:** Accepted
- **Date:** 2026-10-11

## Context

Prospects want to see their own fixtures in the demo without waiting for a
catalog integration. A showroom using the library may want the same: try a
file a customer brings. Products are created by the host (ADR 0002, 0018), and
an IES file says nothing reliable about the mount type or colour temperature.

## Options

- Where: an opt-in feature of the UI package, or a demo-only button
- How: a short form with defaults from the file, or add the product directly
  with guessed values

## Decision

`lxs-app` (and `lxs-catalog-panel`) take an `ies-import` flag, off by default.
When on, the catalog panel ends with a drop zone and a "Load IES file…"
button. `lxs-ies-import` reads the file as Latin-1, validates it with core's
`parseIes` and shows a form:

- **Name:** `[LUMINAIRE]`, else `[LUMCAT]`, else the file name.
- **Mount type:** recessed if all the light goes down, pendant if any goes up.
  The user can change it; it decides where the luminaire can be placed and
  can't be changed later.
- **Colour temperature:** a colour-temperature keyword, else a value like
  "3000K" in any keyword's text, else 3000 K.

Confirming fires `lxs-import-ies` with the form values, the file's text and
its parsed photometry. The host adds the product to its catalog, display
catalog and photometry provider. An unreadable file shows a translated
message followed by the parser's (English) detail.

## Consequences

- Hosts opt in and own the product: id, category, persistence.
- The demo keeps imported products in memory under "Your IES files"; a reload
  clears them. Saving them with the scene comes with persistence (M4).
- Power, flux and beam angle come from the file, so the product's numbers
  match how it lights the room.
