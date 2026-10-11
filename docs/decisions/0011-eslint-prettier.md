# 0011. ESLint and Prettier

- **Status:** Accepted
- **Date:** 2026-10-11

## Context

We want consistent formatting and an enforced core/ui/demo boundary.

## Options

- ESLint + Prettier
- Biome
- Prettier only

## Decision

Use ESLint (typescript-eslint) for linting, including an import-boundary rule, and Prettier for formatting.

## Consequences

- The boundary rule fails lint when `packages/` imports from `apps/` or core imports ui.
