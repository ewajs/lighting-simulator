# 0002. Client-agnostic library, data injected

- **Status:** Accepted
- **Date:** 2026-10-11

## Context

The project is the owner's own product, a front-end lighting library and simulator. It will be offered to several clients, and the first prospect is a lighting retailer. The first scaffold mixed that prospect's branding, product names and backend references into the app.

## Options

- Library contains no client specifics; data injected from outside
- Build per-client forks
- Client data bundled in the library behind config flags

## Decision

The library is client-agnostic. It defines types and interfaces and receives catalogs, photometry and persistence through injected providers. Sample data and backend adapters live in `apps/demo` (or in a client's own app), never in `packages/`.

## Consequences

- No client names, branding, catalogs, URLs or credentials in `packages/`.
- Existing client references are removed going forward. Git history is left as is (the repo is public and history is not rewritten).
- A backend adapter will be designed as an injected provider when we get there.
