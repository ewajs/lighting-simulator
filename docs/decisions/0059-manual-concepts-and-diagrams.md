# 0059. The manual's Concepts section: maths, and diagrams computed by core

- **Status:** Accepted
- **Date:** 2026-10-16

## Context

The analysis (M5) gives lighting designers numbers they must understand to
trust: lux, uniformity, a maintenance factor, a work plane. The owner, new to
lighting design, asked for a section of the manual to learn from. It needs
properly typeset formulas, plots and diagrams.

Diagrams of physics drift from the code that computes it if they're drawn by
hand or generated once and committed.

## Decision

**A Concepts section** ("Conceptos" / "Concepts"), eight pages in es-AR and en:
1. light and its units;
2. IES files and polar charts;
3. the inverse-square and cosine laws;
4. the work plane and its grid;
5. uniformity;
6. the maintenance factor;
7. recommended levels;
8. how Lux Studio calculates, and how accurate it is.

Bounce light gets its page when it's computed (M5.3), and using the analysis
gets its pages with the UI (M5.4).

**Maths** through VitePress's built-in support, with `markdown-it-mathjax3`
4.3.2, the major version VitePress 1.6 expects. Formulas render to SVG at
build time.

**Diagrams are computed by Lux Studio's own core when the manual is built:**
- **Computing:** VitePress data loaders (`.vitepress/theme/diagrams/*.data.ts`)
  run in Node at build time. They call core's functions on the demo's real
  IES files: `parseIes`, `candelaAt`, `beamAngleDeg`, `directLight`,
  `directIlluminance`, `analyseIlluminance` (`analyseDirect` until ADR 0060),
  `maxGridSpacing`.
  - Loaders are bundled with esbuild. Imported by package name, core would be
    left to Node, which can't load its TypeScript source (ADR 0017), so
    `diagrams/core.ts` imports it by path. It reads the IES files with
    `readFileSync`, declared in `env.d.ts` rather than adding `@types/node`.
- **Drawing:** small Vue components (`LxPlot`, `LxPolar`, `LxHeatmap`,
  `LxColorScale`, `LxGridPlan`, `LxUnits`, `LxAccuracy`) render the data as
  inline SVG.
  - They use the theme's colour variables, so they follow light and dark.
    Data series take a palette of their own (`--lx-c-1` to `--lx-c-5`,
    Lux Studio's amber first, then blue, teal, rose and violet), and grid
    lines and axes stronger greys than VitePress's dividers, which vanished
    in charts.
  - Labels come from each page, in its language.
  - Plotting helpers live in `diagrams/plot.ts`, which tsc type-checks; it
    doesn't read `.vue` files.
- **What reaches the browser:** plain numbers, not core or three.js.
- **Figures in the prose** (averages, uniformities, the maintained value)
  come from the same data, so the text can't contradict the diagrams. They
  sit outside formulas, since MathJax renders before Vue fills values in.

**Accuracy figures** come from `accuracy/summary.json`.
- `npm run accuracy:report` writes it with `REPORT.md`, from one function.
- A test fails if either file isn't what the references give now.

**Recommended levels** are only those confirmed in a published copy of
EN 12464-1:2021's table: office desk work, meeting rooms, reception desks,
archives and corridors. Each source is cited. Values the sources disagree on,
and spaces found only in the 2011 edition, are left out.

## Options considered

- **Static SVGs from a committed script.** Easy to inspect in a PR, but they
  go stale unless someone remembers to regenerate them, and they can't
  follow the theme.
- **Computing in the browser.** It would ship core and three.js with every
  manual page.
- **A charting library.** A few plain SVG components do the job; the CLAUDE.md
  rule is not to add a dependency for something that takes a few clear lines.

## Consequences

- The manual depends on `@luxstudio/core` (apps → packages, allowed). A
  change to core's maths changes the manual's diagrams on the next build.
- Writing that quotes a computed figure has to be reread when the figure
  changes. Writing this section caught one: bunching four downlights raises
  the average while ruining uniformity, the opposite of the draft's claim.
- The manual's own captures and e2e are unaffected: no app code changed.
