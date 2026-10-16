# 0056. Leaner test runs: tests where they matter, screenshots of their subject

- **Status:** Accepted
- **Date:** 2026-10-16

## Context

Even small changes had started taking long to finish, and the tests
themselves weren't the reason. Measured:
- unit tests take 2 s;
- the e2e suite takes about a minute on one browser, and about 3.5 minutes
  on all three.

The time went into how they were run, and into screenshot churn:
- The full three-browser suite ran two or three times per PR, plus a
  refresh of every baseline, plus all 26 of the manual's captures.
- 36 screenshot checks captured the whole page, top bar included, on three
  browsers. One new top-bar button changed about 77 baselines, three PRs in
  a row.
- `--update-snapshots=all` rewrote every image, so real changes had to be
  picked out of re-encoding noise by hand.
- Every test ran on all three browsers, including UI logic the 3D backend
  can't affect.

Coverage wasn't measured. The unit tests cover about 97% of the logic they
target, but over all source files that is 32% of core and 10% of the UI:
rendering and the components are tested only through e2e.

## Decision

- **Tests run where they matter.**
  - Chrome (WebGPU) runs every test.
  - Chrome on WebGL 2, and WebKit, run only tests tagged `@all-browsers`:
    those whose outcome depends on rendering, pointer or touch input, or
    the browser engine (manipulation, models, phone, tablet, and the
    rendering tests in smoke, loading, furniture, surfaces, help and IES
    import).
  - That's 49 of the suite's 83 tests, so 181 runs instead of 248.
- **Screenshots of their subject.** Tests about the 3D scene capture the
  viewport (`page.locator('lxs-viewport')`). Whole-page shots are kept for
  ten layout tests: the desktop starter, the light theme in English, the
  help, and the phone and tablet layouts.
- **One full run per PR.** While working, only the affected specs, on Chrome
  (`npm run test:e2e:quick -- <specs>`). CLAUDE.md maps each area to its
  specs. The full suite runs once before opening the PR.
- **Baselines are refreshed with `--update-snapshots=changed`,** only for
  what changed on purpose, never `=all`.
- **The manual's captures** are retaken only for what changed, with `--grep`.
- **Unit coverage is measured over all source files** (`npm run coverage`,
  with `@vitest/coverage-v8`, MIT, from the Vitest team), so the report
  shows 32%, 10% and 7% rather than only the files the tests touch. E2E
  coverage isn't measured for now.
- **Tests:** the two screenshot-download tests became one. No other test
  was redundant: the cost was the multiplying factors, not duplicate tests.

## Consequences

- Baselines go from 117 to 107. Images that only differed by re-encoding
  were kept byte for byte, and 13 orphans were removed: screenshots of
  UI-logic tests on WebGL 2 and WebKit, which no longer run there.
- A top-bar or panel change now touches at most the ten whole-page layout
  shots, per browser that runs them, instead of ~77 images.
- Viewport captures still include the floating view controls (tools,
  views, exposure), which are drawn over the 3D view.
- UI-logic regressions specific to Safari would no longer be caught by the
  WebKit project, unless the test is tagged. Touch, layouts, dialogs and the
  phone menu stay tagged.
- New tests must decide whether they need `@all-browsers` (CLAUDE.md,
  "Writing e2e tests").
- New dev dependency: `@vitest/coverage-v8`. Reports go to each workspace's
  `coverage/`, which git ignores.
