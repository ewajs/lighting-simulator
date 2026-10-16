---
title: Working on the code
group: Guides
---

# Working on the code

The rules live in [`CLAUDE.md`](https://github.com/ewajs/lighting-simulator/blob/master/CLAUDE.md).
This page is the short version, for finding your way around.

## Commands

```
nvm use               # Node 24
npm install
npm run dev           # the demo, with hot reload
npm run lint          # ESLint, including the demo → ui → core boundary
npm run typecheck     # TypeScript in every package
npm test              # unit tests (Vitest)
npm run test:e2e      # end-to-end tests (Playwright), all three browser projects
npm run test:e2e:quick -- <specs>   # just those specs, on Chrome
npm run coverage      # unit-test coverage, into coverage/
npm run mutation-check -w packages/core   # proves the tests catch known mistakes in the lux maths
npm run accuracy:check        # the accuracy checks' Python: lint, docstrings, types, tests
npm run accuracy:references   # regenerate the Radiance references and accuracy/REPORT.md
npm run docs          # this site, into apps/demo/dist/docs
npm run manual        # the user manual, into apps/demo/dist/manual
npm run manual:screenshots   # retake the manual's screenshots after UI changes
                             # (`npm run screenshots -w apps/manual -- --grep <name>` for some)
npm run build         # the demo, into apps/demo/dist
```

CI runs format, lint, typecheck, unit tests, the build, the docs, the manual
and the translation check on every pull request. The end-to-end tests run
locally
([ADR 0015](../decisions/0015-ci-without-playwright.md)).

**While working,** run the unit tests and only the end-to-end specs for the
area you changed, with `test:e2e:quick`. Run the full `test:e2e` once, before
the pull request. When screenshots change on purpose, update them with
`--update-snapshots=changed` and look at each one
([ADR 0056](../decisions/0056-leaner-test-runs.md)).

## How changes are made

1. **A plan for one step,** proposed and approved before work starts. The
   [roadmap](../ROADMAP.md) lists the milestones and their steps.
2. **A branch and a pull request per step.** The description says:
   - what changed and how it was verified;
   - **where to look**: the few files with the real logic;
   - **what could break**;
   - **a short "try it yourself" checklist** for the browser.
3. **An ADR** in `docs/decisions/` for every significant decision: the
   context, the options weighed, and the consequences.

## Standards that show up everywhere

- **Pure logic is plain functions over plain data,** without three.js or the
  DOM, and tested in Node. Stateful things are classes with `#private` fields.
- **SI units.** Names carry any other unit: `beamDeg`, `fluxLm`.
- **Every exported symbol has a doc comment.** This site is generated from
  them, and `npm run docs` fails if one is missing or a link is broken.
- **UI text is always in `msg()`,** in `es-AR` (voseo, the default) and `en`
  ([ADR 0020](../decisions/0020-i18n-lit-localize.md)).
- **Log through the injected logger** with an area prefix such as `[scene]`,
  never `console` directly ([ADR 0044](../decisions/0044-logging-and-loud-failures.md)).
- **Every bug fix comes with a test** that failed before the fix.
