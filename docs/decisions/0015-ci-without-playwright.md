# 0015. CI checks on PRs, Playwright local only

- **Status:** Accepted
- **Date:** 2026-10-11

## Context

PRs should show a green or red check before merging. Headless WebGPU on CI runners can be unreliable.

## Options

- Lint, typecheck, unit tests and build in CI, plus Playwright
- Same, without Playwright
- No CI

## Decision

A GitHub Actions workflow on every PR runs ESLint, `tsc`, Vitest and the build. Playwright smoke tests run locally before a PR is opened.

## Consequences

- Each PR description says whether the Playwright smoke tests were run and passed.
- Revisit Playwright in CI if it becomes reliable on hosted runners (that would be a new ADR).
