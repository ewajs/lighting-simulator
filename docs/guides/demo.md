---
title: The demo app
group: Guides
---

# The demo app

`apps/demo` is the reference host: everything a client integration would do,
with sample data. It's deployed at
<https://ewajs.github.io/lighting-simulator/>. Add `?debug` to the URL for
step-by-step logs and the diagnostics overlay.

## Files

| File | What it does |
|---|---|
| [`src/main.ts`](https://github.com/ewajs/lighting-simulator/blob/master/apps/demo/src/main.ts) | Creates the Simulator with the sample providers, builds the starter scene, mounts `<lxs-app>`, and handles `?debug` |
| [`src/sample-catalog.ts`](https://github.com/ewajs/lighting-simulator/blob/master/apps/demo/src/sample-catalog.ts) | Products for core: generic ones with typical values, and `ies-*` ones whose numbers come from real IES files |
| [`src/sample-display.ts`](https://github.com/ewajs/lighting-simulator/blob/master/apps/demo/src/sample-display.ts) | Names and categories in Spanish and English, for the catalog panel |
| [`src/sample-photometry.ts`](https://github.com/ewajs/lighting-simulator/blob/master/apps/demo/src/sample-photometry.ts) | Fetches real manufacturer IES files from `public/ies/` |
| [`src/sample-models.ts`](https://github.com/ewajs/lighting-simulator/blob/master/apps/demo/src/sample-models.ts) | Fetches fixture models from `public/models/` |
| [`src/imported-products.ts`](https://github.com/ewajs/lighting-simulator/blob/master/apps/demo/src/imported-products.ts) | Keeps visitors' own IES files for the visit |
| `public/ies/` | Five real IES files, unmodified ([`SOURCES.md`](https://github.com/ewajs/lighting-simulator/blob/master/apps/demo/public/ies/SOURCES.md), [ADR 0035](../decisions/0035-sample-ies-sources.md)) |
| `public/models/` | Simple generated models for those five products ([`SOURCES.md`](https://github.com/ewajs/lighting-simulator/blob/master/apps/demo/public/models/SOURCES.md)) |
| `scripts/build-models.js` | Regenerates the models; run by hand, output committed |
| `e2e/` | The Playwright end-to-end suite, run against the built demo |

## How a real integration differs

- Products, names, IES files and models come from the client's backend
  instead of files in the repo. Only the providers change.
- The starter scene comes from the host, or from a saved scene once M4 brings
  saving.
- The brand slot holds the client's logo, and the `--lxs-*` tokens carry their colours.

## The end-to-end tests

`npm run test:e2e` builds the demo, serves it, and drives it in Chrome with
WebGPU, in Chrome on WebGL 2, and in WebKit (Safari's engine)
([ADR 0032](../decisions/0032-e2e-browser-projects.md)). Screen positions in
the tests are for the default camera at 1280 × 800.

- **Screenshots:** compared to the baselines in `e2e/*-snapshots/`. When
  rendering changes on purpose, refresh them with
  `npm run test:e2e -- --update-snapshots=all` and look at every changed image.
- **The console guard:** every test fails on an unexpected page error,
  console error or warning ([ADR 0044](../decisions/0044-logging-and-loud-failures.md)).
  A test that causes one on purpose lists it with `allowConsole`.
