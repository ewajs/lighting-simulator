# 0003. Headless core with an optional UI layer

- **Status:** Accepted
- **Date:** 2026-10-11

## Context

Clients may want our full simulator UI, or only the engine inside their own interface.

## Options

- Core + optional UI, as separate layers
- Engine only, every host builds its UI
- Full app as one unit

## Decision

Split into a headless **core** (scene model, photometry, lighting, three.js rendering, a JS API) and an optional **ui** layer built on the core's public API.

## Consequences

- The core must be fully usable without the UI, so the UI can't depend on core internals.
- The demo exercises both layers and acts as the reference integration.
