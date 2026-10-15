# 0051. Scene files: versioned `.luxstudio.json`, opened as one undo step

- **Status:** Accepted
- **Date:** 2026-10-14

## Context

Nothing was ever saved: a reload brought back the starter scene. M4 adds
persistence. M4.1, this step, covers files: saving a scene, opening it
again, and a format that can change without breaking old files. Autosave
and templates come in M4.2, sharing in M4.3.

## Options

- **Extension:** `.lux.json` (ADR 0027) / `.luxstudio.json`
- **Product data in files:** ids only / a copy of each product's data
- **Opening:** one undo step / clearing the history after a confirmation
- **Products the catalog lacks:** kept, not drawn / dropped on open
- **Reading untrusted files:** check every field and keep only known ones /
  trust the JSON and let the scene's assertions catch problems

## Decision

- **`.luxstudio.json`**, at the owner's request, to promote the name. This
  replaces ADR 0027's `.lux.json`.
- **A versioned envelope:** `{ "format": "lux-studio-scene", "version": 1,
  "scene": { room, luminaires, furniture } }`, as indented JSON.
  - The format string tells scene files apart from other JSON.
  - A file from an older version is upgraded step by step on opening: a
    list of functions, each turning one version's scene into the next.
    It's empty while only version 1 exists. `SCENE_FILE_VERSION` is one
    past the last upgrade, so the two can't drift apart.
  - A file from a newer version is refused with its own reason.
- **Reading checks every field.** A file comes from outside, so
  `parseScene` builds a fresh scene, checking each field's type and
  dropping unknown ones. Then the scene's assertions check ranges, known
  furniture kinds and finishes, and that ids are unique. It throws a
  `SceneFileError` whose `problem` is `not-a-scene`, `newer-version` or
  `invalid`, for a translated message, and whose `message` names the
  field.
- **Product ids, not product data.** The host's catalog stays the single
  source of truth: when a client updates a product, every scene follows.
  The cost is that a file only works fully with the catalog it was made
  with.
- **Products the catalog lacks are kept, not drawn,** with a notice saying
  how many luminaires that is. Saving again keeps them.
  `unknownProducts(scene, catalog)` lists their product ids.
- **Opening is one undo step:** `Simulator.setScene(scene)`. No "are you
  sure?" dialog; ⌘Z brings the previous scene back.
- **UI:**
  - Save and Open in the top bar (on phones in the ⋯ menu), plus ⌘S and ⌘O;
    a file dropped on the viewport opens too.
  - Saved files are named like screenshots: a neutral, translated base and
    the time, e.g. `escena-2026-10-14-1830.luxstudio.json`.
  - What happened is shown in a new `<lxs-notice>`. It sits at the bottom
    left, clear of the exposure control, and hides itself after 7 s.
  - Messages don't name the product: hosts ship the UI under their brand.

## Consequences

- New public API:
  - core: `serializeScene`, `parseScene`, `SceneFileError`,
    `SceneFileProblem`, `SceneFile`, `SceneUpgrade`, `unknownProducts`,
    `SCENE_FILE_FORMAT`, `SCENE_FILE_VERSION`, `SCENE_FILE_EXTENSION`,
    `Simulator.setScene`;
  - UI: `lxs-open-request` and `lxs-save-request` from the top bar,
    `lxs-drop-file` from the viewport.
- The first real change to the scene's shape must add an upgrade, a test
  for it, and bump nothing else.
- IES files a visitor imported aren't in the file. Reopened in a later
  visit, their luminaires are kept but not drawn until the file is
  imported again.
