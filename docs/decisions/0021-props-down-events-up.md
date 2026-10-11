# 0021. UI state: props down, events up

- **Status:** Accepted
- **Date:** 2026-10-11

## Context

UI elements need the simulator, the selection and view settings. Elements must also work standalone for integrators who compose their own layout.

## Options

- Props down, events up (the shell owns state and passes it as properties; children emit DOM events)
- `@lit/context`

## Decision

`<lxs-app>` owns UI state (e.g. the selection) and passes it to children as properties. Children report user actions as DOM `CustomEvent`s named `lxs-*` (bubbling, composed). Custom elements use the prefix `lxs-` (ADR 0027).

## Consequences

- No extra dependency. Every element can be used standalone by setting its properties.
- Deep trees mean some prop drilling; revisit with `@lit/context` only if it becomes painful (that would be a new ADR).
- Event names and element names are public API.
