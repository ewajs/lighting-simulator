# 0014. Sample IES sources

- **Status:** Accepted
- **Date:** 2026-10-11

## Context

The demo needs realistic IES files, and unit tests need IES files with known values. Files from manufacturers often have unclear licences and carry brand names, which conflicts with ADR 0002.

## Options

- three.js example IES files for the demo + hand-made synthetic files for tests
- Synthetic files only
- Public manufacturer downloads

## Decision

The demo uses IES files from the three.js repository's examples (MIT). Unit tests use small hand-made IES files whose expected values can be calculated by hand.

## Consequences

- Keep the three.js licence notice next to the copied files in `apps/demo`.
- Test fixtures live with the core tests, never in `packages/` source.
- Real client photometry only ever arrives through the photometry provider.
