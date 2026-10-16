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
| [`src/main.ts`](https://github.com/ewajs/lighting-simulator/blob/master/apps/demo/src/main.ts) | Creates the Simulator with the sample providers and the autosaved scene (else the first template), mounts `<lxs-app>` with autosave and link storage, hides the splash on `lxs-ready`, and handles `?debug` |
| [`src/sample-catalog.ts`](https://github.com/ewajs/lighting-simulator/blob/master/apps/demo/src/sample-catalog.ts) | Products for core: generic ones with typical values, and `ies-*` ones whose numbers come from real IES files |
| [`src/sample-display.ts`](https://github.com/ewajs/lighting-simulator/blob/master/apps/demo/src/sample-display.ts) | Names and categories in Spanish and English, for the catalog panel |
| [`src/sample-photometry.ts`](https://github.com/ewajs/lighting-simulator/blob/master/apps/demo/src/sample-photometry.ts) | Fetches real manufacturer IES files from `public/ies/` |
| [`src/sample-models.ts`](https://github.com/ewajs/lighting-simulator/blob/master/apps/demo/src/sample-models.ts) | Fetches fixture models from `public/models/` |
| [`src/sample-textures.ts`](https://github.com/ewajs/lighting-simulator/blob/master/apps/demo/src/sample-textures.ts) | Fetches surface textures from `public/textures/` |
| [`src/sample-templates.ts`](https://github.com/ewajs/lighting-simulator/blob/master/apps/demo/src/sample-templates.ts) | The room templates in the New dialog (the first is the starter scene), with their names in each language |
| [`src/link-storage.ts`](https://github.com/ewajs/lighting-simulator/blob/master/apps/demo/src/link-storage.ts) | A `SceneStorage` with no backend: the scene file, deflated, in the link's `#scene=` ([ADR 0053](../decisions/0053-share-links.md)) |
| [`src/imported-products.ts`](https://github.com/ewajs/lighting-simulator/blob/master/apps/demo/src/imported-products.ts) | Keeps visitors' own IES files for the visit |
| `public/ies/` | Five real IES files, unmodified ([`SOURCES.md`](https://github.com/ewajs/lighting-simulator/blob/master/apps/demo/public/ies/SOURCES.md), [ADR 0035](../decisions/0035-sample-ies-sources.md)) |
| `public/models/` | Simple generated models for those five products ([`SOURCES.md`](https://github.com/ewajs/lighting-simulator/blob/master/apps/demo/public/models/SOURCES.md)) |
| `public/textures/` | Six CC0 surface photos with thumbnails ([`SOURCES.md`](https://github.com/ewajs/lighting-simulator/blob/master/apps/demo/public/textures/SOURCES.md)) |
| `scripts/build-models.js` | Regenerates the models; run by hand, output committed |
| `src/dev/`, `furniture-preview.html` | A development page for designing furniture, not shipped ([ADR 0047](../decisions/0047-furniture.md)) |
| `e2e/` | The Playwright end-to-end suite, run against the built demo |

## How a real integration differs

- Products, names, IES files and models come from the client's backend
  instead of files in the repo. Only the providers change.
- The starter scene and the templates come from the host, and scenes are
  stored by the client's backend: a `SceneStorage` that saves them and returns
  a short link, instead of packing the whole scene into the link.
- The brand slot holds the client's logo, and the `--lxs-*` tokens carry their colours.

## The end-to-end tests

`npm run test:e2e` builds the demo, serves it, and drives it in Chrome with
WebGPU ([ADR 0032](../decisions/0032-e2e-browser-projects.md)). Tests tagged
`@all-browsers` (rendering, input and engine-specific behaviour) also run in
Chrome on WebGL 2 and in WebKit, Safari's engine
([ADR 0056](../decisions/0056-leaner-test-runs.md)). While working,
`npm run test:e2e:quick -- <specs>` runs only the given specs on Chrome. Screen
positions in the tests are for the default camera at 1280 × 800, and the
tests run with reduced motion.

- **Screenshots:** compared to the baselines in `e2e/*-snapshots/`; most
  capture the 3D view or one element, not the page. When rendering changes on
  purpose, refresh them with `npm run test:e2e -- --update-snapshots=changed`
  and look at every changed image.
- **The console guard:** every test fails on an unexpected page error,
  console error or warning ([ADR 0044](../decisions/0044-logging-and-loud-failures.md)).
  A test that causes one on purpose lists it with `allowConsole`.
