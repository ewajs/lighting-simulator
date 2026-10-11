# 0018. Core API: Simulator class, sync catalog, merge keys

- **Status:** Accepted
- **Date:** 2026-10-11

## Context

Step 0.3 introduces core's first public API: the scene model, its edits and
undo/redo (ADR 0016). We needed to choose how hosts call it, how it gets
product data, and how rapid edits become one undo step.

## Options

- **API shape:** a simulator facade with named methods / exported pure functions + a generic store / dispatched command objects
- **Facade implementation:** a closure returned by `createSimulator()` / a class
- **Product data:** a sync lookup given at creation / an async provider / the caller passing whole products
- **Undo merging:** an explicit `mergeKey` / a time window / transactions

## Decision

- `new Simulator({ catalog, scene? })` is a class with named methods (`addLuminaire`, `updateLuminaire`, `setRoomSize`, `undo`, `subscribe`, …) and `#private` state, following the established convention that three.js integrators already know. The pure scene functions behind it stay internal.
- `catalog` is a synchronous lookup, `{ get(productId) }`. Hosts load products however they like before creating the simulator.
- Edits accept `{ mergeKey }`. Consecutive edits with the same key are one undo step. The undo/redo method names from ADR 0016 are final.

## Consequences

- One discoverable entry point for integrators. Internals can change without breaking hosts.
- Methods are ordinary methods, so passing one as a callback needs an arrow wrapper: `onclick = () => sim.undo()`.
- Core's `Product` holds only simulation data (mount, power, flux, CCT, beam, suspension). Display data stays in the host catalog.
- When a backend needs async product loading, that's a new ADR (likely an async provider wrapped by a cache).
- The UI must create one merge key per gesture (e.g. per slider drag).
