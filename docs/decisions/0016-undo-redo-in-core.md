# 0016. Undo/redo lives in core

- **Status:** Accepted
- **Date:** 2026-10-11

## Context

Every scene edit should be undoable. History can be kept by core or by each host (our ui package, or a client's own app).

## Options

- Core owns the history
- Host owns the history
- Decide later

## Decision

Core keeps snapshot-based history of scene changes and exposes `undo()`, `redo()`, `canUndo()` and `canRedo()`. Names are indicative and finalised in step 0.3.

## Consequences

- Every integrator gets undo, including those who don't use our UI. Hosts with their own undo system can ignore it.
- Only the scene document (room, luminaires, …) is recorded. View and UI state (selection, camera, panels) is not.
- Rapid repeated edits (slider drags, typing) are coalesced into one history entry.
