# 0019. Viewport reports picks; the host owns selection

- **Status:** Accepted
- **Date:** 2026-10-11

## Context

The renderer needs to show which luminaires are selected, and the UI needs
to edit them. Selection is UI state, not part of the scene document (ADR 0016).

## Options

- The host owns selection; the viewport reports clicks and highlights what it's told
- The Simulator owns selection as non-undoable state
- The Viewport owns selection (click and shift-click policy built in)

## Decision

`Viewport.onPick(listener)` reports every click as `{ luminaireId | null, event }`.
`Viewport.setHighlighted(ids)` outlines whatever the host passes. Neither
core class stores a selection.

## Consequences

- Selection rules (shift-click, select all, what Esc does) live in the UI layer: our ui package, or a client's own UI.
- The scene model stays a pure document, and the viewport stays a view.
- Hosts that want the simplest behaviour wire it in two lines (see the `Viewport` doc comment).
