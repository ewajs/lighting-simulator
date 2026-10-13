# 0048. One set of edits for luminaires and furniture

- **Status:** Accepted
- **Date:** 2026-10-13

## Context

Furniture (ADR 0047) arrived as a parallel copy of the luminaire code. The
Simulator had `removeLuminaires` and `removeFurniture`, `duplicateLuminaires`
and `duplicateFurniture`. There were two drag classes that were mostly the
same, and two id lookups in the renderer. Callers branched on the kind to
pick the right one: the app's delete and duplicate, and the Manipulator's
drags. Small helpers (`add`, `subtract`, `clamp`, `DEG`) had been copied
into several files. Adding an item with anything but defaults took two calls
and two undo steps: an add, then an update.

M3.3 brings move arrows, a rotation ring and distances to furniture. Each of
those would have added more of the same branches.

## Options

- **A common base class** for luminaires and furniture, hydrated from JSON by
  kind. Each class carries its behaviour as methods.
- **Plain data, with generic functions where the kinds behave the same, and
  a small per-kind rules object where they don't.**
- **One merged list** (`Scene.items`) with a `kind` field on each item.
- **Fully generic edit methods:** `add(kind, …)` and `update(id, patch)` for
  both kinds.

## Decision

Plain data, generic where possible:

- **The scene stays plain readonly data.** Classes would need a copy method
  on every class, because undo keeps old snapshots and edits must never
  change an item in place. Every way a scene gets in (the host's starting
  scene, loading a file, tests) would need hydrating. Browser APIs a host
  might use (IndexedDB, `postMessage`, `structuredClone`) silently drop the
  class. And the behaviour needs the room and the catalog anyway, so the
  methods couldn't stand on their own.
- **`Simulator.remove(ids)` and `Simulator.duplicate(ids)`** take luminaires
  and pieces alike, since ids are unique across both lists. They replace the
  four per-kind methods. An empty list changes nothing and records no undo
  step.
- **`addLuminaire` and `addFurniture` take starting fields:**
  `addLuminaire(productId, { at, aim, dimming, … })` and
  `addFurniture(kind, { at, rotationDeg, size, … })`. The fields are applied
  by the same rules as an update, in the same undo step; a `position` wins
  over `at`.
- **Adds and updates stay per kind.** A single `update(id, patch)` would let
  `update(tableId, { aim })` compile, because an id doesn't say what kind of
  item it is. Separate methods keep that mistake a type error.
- **`findItem(scene, id)`** returns `{ kind, item }` and replaces the per-kind
  lookups. It's public, alongside the `ItemKind` and `SceneItem` types; the
  UI's selection rules use it.
- **One drag class, `ItemDrag`,** with a rules object per kind for the parts
  that differ: what it slides on, how it's constrained, which axes snap.
- **Rendering:** each item's root object is tagged with its id. `itemIdOf`
  walks up from a picked object to find the tag. `selectionOutline` builds
  the outline for both kinds.
- **Shared math helpers** live in `math.ts`.
- **Not a merged list.** Lighting, the scene summary and the panels want one
  kind at a time, and the save format would change for no gain.

CLAUDE.md's "no inheritance" line now gives this reason rather than a
blanket ban.

## Consequences

- Public API changes:
  - `removeLuminaires`, `removeFurniture`, `duplicateLuminaires` and
    `duplicateFurniture` are now `remove` and `duplicate`.
  - The second argument of `addLuminaire` and `addFurniture` is now an
    options object. `addLuminaire(id, { x, z })` becomes
    `addLuminaire(id, { at: { x, z } })`, and the type checker flags the old
    form.
- No behaviour changes: every e2e screenshot passes without refreshing a
  baseline.
- Source code is 63 lines shorter. Tests grew by 86 lines, covering the new
  add options, mixed removes and copies, and `findItem`.
- Furniture in M3.3 (arrows, ring, distances) goes into `ItemDrag`'s rules
  and the shared code, not into new parallel classes.
