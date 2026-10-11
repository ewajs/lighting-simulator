# 0023. Icons from the lucide package

- **Status:** Accepted
- **Date:** 2026-10-11

## Context

The UI needs about 15 icons (tabs, search, add, mount types, later undo/redo, views, delete). The prototype had hand-drawn SVGs.

## Options

- `lucide` as a runtime dependency
- Copy the needed Lucide SVGs into the repo
- Draw our own

## Decision

Add `lucide` (ISC licence) to `@luxstudio/ui` and render its icon data through a small `icon()` helper in `icons.ts`.

## Consequences

- Icons are plain data and the package is side-effect free, so bundles only include the icons we import (checked: unused icon paths are absent from the build).
- Adding an icon is one import. The visual style is consistent with a widely used set.
- One more runtime dependency for ui, pinned exactly like the others.
