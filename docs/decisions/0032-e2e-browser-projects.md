# 0032. E2E runs on Chrome (WebGPU), Chrome (WebGL 2) and WebKit

- **Status:** Accepted
- **Date:** 2026-10-11

## Context

Until P.5 the e2e suite only ran on desktop Chrome with WebGPU. Users will
also be on Safari (macOS, iOS, iPadOS; ADR 0031) and on browsers or devices
without WebGPU, where three.js falls back to WebGL 2.

## Options

- Run the whole suite on each engine/backend, or only a desktop subset on the extra ones
- Disable WebGPU in Chrome with a command-line flag, or hide it from the page

## Decision

`apps/demo/playwright.config.ts` defines three projects that each run the
whole suite: `chrome` (WebGPU), `chrome-webgl2` (Chrome with WebGPU hidden)
and `webkit` (Playwright's WebKit, which has no WebGPU, so it also renders
with WebGL 2). WebGPU is hidden by a `disableWebGPU` fixture option that
removes `navigator.gpu` before the page loads, because none of the Chrome
flags tried (`--disable-features=WebGPU`, `--disable-webgpu`,
`--disable-blink-features=WebGPU`) actually disabled it. A test asserts that
each project renders with the backend it targets.

## Consequences

- Specs import `test` and `expect` from `e2e/fixtures.ts`, not from `@playwright/test`.
- Screenshot baselines exist per project (`…-chrome-…`, `…-chrome-webgl2-…`, `…-webkit-…`).
- Tests that drive touch through Chrome's DevTools protocol (long press) are skipped on WebKit.
- Playwright's WebKit is close to Safari but not identical; real iPhone checks stay manual.
- The full run takes about three times as long; `--project chrome` gives a quick run.
