# 0062. The manual's Analysis section: every comparison, charted

- **Status:** Accepted
- **Date:** 2026-10-17

## Context

The comparison with Radiance (ADRs 0058, 0060, 0061) lived in
`accuracy/REPORT.md`, a Markdown file on GitHub. The owner asked for it in the
manual, under an analysis section:
- the values measured, the differences with Radiance, with and without
  bounces, with and without furniture;
- plots, bar charts and maps rather than tables alone;
- the story of each feature, and runtimes on a stated machine, against
  Radiance's;
- "don't reinvent the wheel": a charting library is welcome; keep the
  manual's identity, with better contrast and legibility.

## Decision

### Pages

A new sidebar section, **Análisis / Analysis**, after Concepts, in both
languages:

| Page | What it shows |
|---|---|
| Dónde estamos / Where we stand | the headline figures, every room's worst difference, as it is and without furniture, and what isn't counted yet |
| Función por función / Feature by feature | the feature story (ADR 0061), every room on one chart, and each step's time |
| Velocidad / Speed | Lux Studio's times against Radiance's, per room, and what each measures |
| Cómo comparamos / How we compare | Radiance, its checks, the rooms, how differences are measured |
| One page per test room | a plan, figures at a glance, a table per surface, maps of Radiance, Lux Studio and the difference with a choice of surface, light and feature step, every point against Radiance, and the room's feature story |

Room pages are VitePress **dynamic routes** (`analisis/[room].md` with
`[room].paths.ts`): one template per language, and each page carries only
its own room's data.

### Data from the accuracy workspace

The manual doesn't recompute the comparison. Its loaders can't import
packages by name (ADR 0059), and the comparison belongs to
`accuracy/typescript`. That workspace now also writes
**`accuracy/comparison.json`**: every point of every room, both sides'
direct and total light, Lux Studio's total at each feature step, and the
furnished rooms without their furniture. It's about 490 KB, compact, left
out of Prettier, and `report.test.ts` keeps it current like `summary.json`.
`timings.json` (ADR 0061) supplies the times.

Figures in the prose come from the data through `analysis/headline.ts`, so
the text can't contradict the charts and stays true when the numbers move.
The plan's arrows use core's own `aimDirection`, imported by path into the
build-time loader.

### Observable Plot

Charts are drawn with **Observable Plot** (`@observablehq/plot` 0.6.17), a
dev dependency of the manual only:
- **Why:** concise, declarative charts with axes, legends, log and diverging
  scales, faceting and tooltips; made for documentation. It replaces
  hand-written SVG for anything beyond the Concepts diagrams.
- **Licence:** ISC. **Maintenance:** Observable, actively maintained; built
  on D3.
- **Size:** 258 KB, 90 KB gzipped, with the D3 modules it uses, in a chunk
  the Analysis pages load; nothing reaches the library or the app.
- **Alternatives:** ECharts (Apache-2.0; heavier, canvas, more interactive
  than a manual needs), Chart.js (MIT; canvas, plainer, weaker scales), and
  more hand-written SVG (the Concepts diagrams stay that way; charts with
  log scales, legends and tooltips would be reinventing Plot).

Plot draws in the browser after hydration (`analysis/plot-frame.ts`), and
redraws when the theme, the width or the reader's choices change. It reads
the palette's tokens (ADR 0059) when drawing, since Plot writes colours into
SVG attributes, which can't use CSS variables. Lux Studio is always amber,
Radiance always blue; differences use a diverging blue–red scale centred on
0, and illuminance the false-colour ramp of the Concepts maps.

### Names

Room, surface, step and measure names, and the words the charts use, live in
`analysis/names.ts`, by language. Components read the page's language
themselves rather than taking every label as a prop.

## Options considered

- **Recomputing in the manual's loaders** by importing core by path, as the
  Concepts diagrams do. It would mean a second copy of the comparison,
  outside the workspace whose tests define it.
- **One loader with every room's points.** Every room page would carry
  every room's data, about 500 KB each.
- **Fetching JSON files at run time.** Another place to publish them, and the
  pages would render empty without JavaScript.
- **Pictures of the rooms rendered by the demo.** Planned: the demo opens a
  scene from a link, so the manual's screenshot script can capture each
  room, once the rooms have demo products and furniture. Until then each
  room page draws its plan.

## Consequences

- The manual gains a dev dependency (`@observablehq/plot`) and a generated
  file to keep current (`comparison.json`, by `npm run accuracy:report`).
- New features of the calculation add a step to the story: one entry in
  `FEATURE_STEPS` (ADR 0061) and its names in `analysis/names.ts`.
- `accuracy/REPORT.md` stays as the plain-text record; the manual is where
  people read the results.
