# 0052. Autosave in localStorage, and New from room templates

- **Status:** Accepted
- **Date:** 2026-10-15

## Context

After M4.1 (ADR 0051) a scene can be saved to a file, but a reload still
lost unsaved work and brought back the starter scene. There was no way to
start over except deleting everything. SPEC §4.6 asks for autosave
(IndexedDB) and §4.1 for room templates.

## Options

- **Where autosave keeps the scene:** localStorage / IndexedDB
- **Who restores it:** the host, when it creates the Simulator / `<lxs-app>`,
  replacing the scene after start-up
- **Templates' pictures:** images from the host / a floor plan drawn from
  the template's scene
- **Where templates come from:** host data / built into the library

## Decision

- **localStorage, not IndexedDB.** A scene is a few KB: products, IES files
  and textures are stored by id. localStorage is synchronous and needs no
  wrapper code or dependency; the UI already uses it for "help seen".
  SPEC §4.6 is updated.
- **`<lxs-app autosave>`** writes the scene as a scene file (ADR 0051) to
  `lxs-autosave`, a second after the last change. A drag is written once,
  not per pointer move. A pending write is flushed when the page is hidden
  or left; phones often hide a page without ever unloading it. A failed
  write (storage blocked or full) logs an error once.
- **The host restores it:** `loadAutosave()` returns the saved scene, or
  undefined if there's none or it can't be read. The host passes it as the
  Simulator's starting scene, so it isn't an edit and undo can't take it
  apart. The demo does `loadAutosave() ?? starterScene`.
- **New** (top bar; on phones the ⋯ menu) opens a dialog of templates:
  - an empty room first, always;
  - then the host's templates, `DisplayCatalog.templates`: an id, a name in
    the active language, a scene, and an optional picture.
  - Picking one replaces the scene as one undo step, like opening a file,
    re-frames the view and shows a notice.
- **A floor plan instead of a picture,** when a template has none. It's a
  small SVG drawn from the scene: the room, furniture footprints and
  luminaires as dots. It needs no assets, stays in sync with the template,
  and works for any host's templates.
- **Templates are host data.** They name the host's products, so they can't
  live in the library. The demo builds a dining room (also its starter
  scene), a living room, a bedroom, a home office and a small shop from its sample
  products, once at start-up so their ids stay put.

## Consequences

- New public API (UI): `<lxs-app autosave>`, `loadAutosave`, `AUTOSAVE_KEY`,
  `RoomTemplate`, `DisplayCatalog.templates`, `<lxs-new-scene>` with
  `lxs-template-pick`, and `lxs-new-request` from the top bar.
  `LxsNotice` and `Notice` are now exported too.
- One autosave per browser and origin: two apps on the same origin would
  share it.
- An autosaved scene with an IES file imported in an earlier visit keeps
  those luminaires, not drawn, as with files (ADR 0051).
- ⌘N isn't offered: browsers keep it for a new window.
