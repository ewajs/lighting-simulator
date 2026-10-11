# 0025. Elements edit the Simulator directly; events are for UI state

- **Status:** Accepted
- **Date:** 2026-10-11

## Context

ADR 0021 set "props down, events up". The inspector makes many kinds of
document edits (room size, surfaces, luminaire output, position, aim,
duplicate, delete). Routing each through an event to `<lsim-app>` would add
about eight event types that only forward to Simulator methods.

## Options

- Elements receive the Simulator as a property and call its methods for document edits
- Elements emit an event per edit and `<lsim-app>` applies it

## Decision

The Simulator is the shared document model, passed down like any other
property. Elements call its methods for **document edits** (always with a
`mergeKey` per gesture, ADR 0018). Events up are only for **UI state** the
parent owns, such as the selection (`lsim-select`, `lsim-set-selection`).

## Consequences

- One rule to follow: document edits → Simulator API; UI state → events.
- Undo/redo covers every edit automatically, because it all goes through the Simulator.
- Standalone elements need a `simulator` property to be editable.
