# 0017. Packages consumed from source, not published to npm

- **Status:** Accepted
- **Date:** 2026-10-11

## Context

The workspace packages need to reach the demo (and later client apps). The
owner doesn't plan to publish to npm, and the repo will become private later.

## Options

- Packages export their TypeScript source; the consuming app's bundler (Vite) compiles it
- Each package has its own library build (Vite library mode + `.d.ts`), consumed from `dist/`

## Decision

Each package's `exports` points at `src/index.ts`. The demo's Vite build
compiles everything together. No library builds and no npm publishing.

## Consequences

- No build or watch step for packages during development.
- Packages stay `private: true`. The "rename before first publish" note in ADR 0007 no longer applies; the rename happens whenever a product name is chosen.
- How client apps will receive the library (a bundled build, a git dependency, a private registry) is still open and gets its own ADR when the first integration needs it.
- Making the repo private affects GitHub Pages: free plans can't serve Pages from a private repo.
