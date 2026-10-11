# 0010. Testing with Vitest and Playwright

- **Status:** Accepted
- **Date:** 2026-10-11

## Context

Core logic (IES parsing, photometry math, scene operations) needs fast unit tests, and the rendered demo needs a check that it works in a real browser.

## Options

- Vitest + Playwright
- Vitest only
- Decide later

## Decision

Use Vitest for unit tests and Playwright for a small set of browser smoke tests against the demo.

## Consequences

- Physics functions are tested against hand-calculated reference values.
- Every bug fix comes with a test that failed before the fix.
