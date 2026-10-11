# 0004. UI built as Web Components with Lit

- **Status:** Accepted
- **Date:** 2026-10-11

## Context

The UI layer must embed in hosts that use React, Vue, Angular or plain HTML. The first scaffold used a home-grown `h()` DOM helper, which was starting to become our own framework.

## Options

- Web Components + Lit
- Plain Web Components (no library)
- React
- Preact

## Decision

Build the UI as standard custom elements using Lit.

## Consequences

- Works in any host framework. Lit adds about 5 kB gz and is a small, well-maintained, BSD-3 dependency.
- The home-grown DOM helper (`src/ui/dom.js`) will be removed when the current code is realigned.
- The custom element tag prefix is chosen together with the product name (see 0007).
