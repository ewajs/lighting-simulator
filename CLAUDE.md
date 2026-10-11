# CLAUDE.md

Guardrails for working on this repo. The reasoning behind each rule lives in
[docs/decisions/](docs/decisions/). This file states the rules; the ADRs say why.
What we build next is in [docs/ROADMAP.md](docs/ROADMAP.md).

## What this is

**Lux Studio**: a client-agnostic 3D lighting simulation library for the
web, built on three.js, plus a demo app that uses it.

The library never contains client names, branding, catalogs, credentials or
backend details. Sample data and backend adapters live outside the library
and are injected. ([ADR 0002](docs/decisions/0002-client-agnostic-library.md))

## Repo layout (npm workspaces)

```
packages/core   headless engine: scene model, photometry (IES), lighting,
                three.js rendering. No DOM UI.
packages/ui     optional Lit web components built on core.
apps/demo       uses core + ui, provides sample data, deploys to GitHub Pages.
docs/           spec, design system, decisions (ADRs)
```

Dependencies only go one way: **demo → ui → core**. Nothing in `packages/`
imports from `apps/`, and core never imports ui. ESLint enforces this.

Packages are consumed from TypeScript source and are not published to npm
([ADR 0017](docs/decisions/0017-consume-packages-from-source.md)).

## Commands

```
npm run dev           demo dev server (apps/demo)
npm run build         production build of the demo → apps/demo/dist
npm run lint          ESLint (type-aware, plus the boundary rule)
npm run typecheck     tsc in every workspace
npm test              Vitest in every workspace
npm run test:e2e      Playwright smoke tests (local only; system Chrome)
npm run format        Prettier (Markdown is excluded)
npm run i18n:extract  collect msg() strings into packages/ui/xliff/
npm run i18n:build    regenerate locale modules after editing the XLIFF
npm run i18n:check    fail if any UI string lacks a translation
```

CI runs `format:check`, lint, typecheck, test and build on every PR. Run
them locally before opening one, plus `test:e2e` (CI doesn't run it, ADR 0015).
When rendering changes on purpose, refresh the screenshot baselines with
`npm run test:e2e -- --update-snapshots=all` (plain `--update-snapshots` skips
images within the tolerance, which can leave stale baselines) and review the
new images in the PR. Run `npm run i18n:build` first if translations changed.

## Data boundary

- Core defines the types and interfaces (Product, Photometry, Scene, …) and
  accepts data through injected providers.
- No hard-coded catalogs, URLs or `fetch` calls in `packages/`.
- Sample data lives in `apps/demo` only.

## How we work

- **Plan first.** One agreed step at a time, small enough to review in one sitting.
- **Claude may do without asking:**
  - implement a step whose plan was approved, including helpers private to one module
  - fix bugs in the step's area, and report each fix
  - write and update tests
  - keep docs in sync with the code (without changing decisions)
- **Ask first:** new dependencies (runtime or dev), new shared abstractions,
  folder or package structure, public API changes, starting a new step,
  anything not in the plan.
- When there's a choice, give the options with a recommendation, then wait.
- Prefer established libraries over home-grown frameworks.
- Each significant decision gets an ADR in `docs/decisions/NNNN-title.md`.

## Coding standards

### Simplicity
- Build the simplest thing that solves the current step. Don't add options,
  extension points or configurability for needs we don't have yet.
- Abstractions earn their place: duplicate first, extract on the third real
  use. Any new shared abstraction needs approval.
- Stateless logic is plain functions over plain data. Stateful objects are
  classes with `#private` fields and ordinary methods, used with `new`, the
  same way three.js works. Callers pass methods as callbacks with an arrow
  wrapper (`() => sim.undo()`).
- No clever code: no metaprogramming, no inheritance beyond extending
  framework base classes (LitElement, three.js types).
- Measure before optimizing.

### Readability
- Names say what something is. Suffix non-obvious units: `beamDeg`,
  `fluxLm`, `heightM`. SI is the default, so plain names mean SI.
- One job per file and per function. ~300 lines per file and ~40 per
  function are signals to split, not hard limits.
- Comments explain why, not what. Every exported symbol has a TSDoc comment.
- No magic numbers: named constants, with units and a source where it's physics.

### Testability
- Pure logic (photometry math, IES parsing, scene operations) has no
  three.js or DOM imports, so it can be unit-tested in Node.
- Side effects live at the edges (rendering, DOM, fetch, storage) and are
  passed in as parameters, not reached through globals or singletons.
- Core logic changes come with unit tests. Physics functions are tested
  against hand-calculated reference values.
- Every bug fix comes with a test that failed before the fix.

### Types and errors
- TypeScript strict. No `any` without a comment saying why. Public types are exported.
- Validate at the boundaries (injected data, IES files, user input) and fail
  with clear messages. Trust internal code.

### Dependencies
- Allowed runtime deps: **core → three**, **ui → core + lit + @lit/localize +
  lucide** (ADRs 0004, 0020, 0023). Anything else
  needs approval and an ADR covering why, bundle size, maintenance health,
  licence (MIT/BSD/Apache-compatible) and the alternatives considered.
- New dev dependencies also need approval, with a one-line justification in the PR.
- Don't add a dependency for something that takes a few clear lines.
- Commit the lockfile.

## Conventions

- TypeScript (strict), ESLint + Prettier.
- Code, comments, docs, commits and PRs: English.
- UI text is never inline. All strings use `msg()` from `@lit/localize`
  ([ADR 0020](docs/decisions/0020-i18n-lit-localize.md)). Spanish (Argentina,
  `es-AR`, the default) and English (`en`) are always kept complete.
- Lit elements: `lxs-` prefix, legacy TypeScript decorators
  ([ADR 0022](docs/decisions/0022-legacy-typescript-decorators.md)), state
  passed down as properties and actions reported up as `lxs-*` events
  ([ADR 0021](docs/decisions/0021-props-down-events-up.md)). Styles only use
  `--lxs-*` tokens from `theme.css`. Document edits call the Simulator
  directly, each gesture with its own `mergeKey`; events are only for UI
  state like selection
  ([ADR 0025](docs/decisions/0025-elements-edit-simulator-directly.md)).
- Units: SI. 1 world unit = 1 m, Y-up. Light in lm / cd / lx, colour
  temperature in K.
- Product name: **Lux Studio**. Packages `@luxstudio/*`, element, event and
  token prefix `lxs-`, scene files `.lux.json`
  ([ADR 0027](docs/decisions/0027-product-name-lux-studio.md)).

## Verification before "done"

Build, lint and tests pass, and UI changes are checked in a real browser
(Playwright). State explicitly anything that was not verified.

## Git

- A feature branch and a PR per step, into `master`. The owner reviews and merges.
- Open PRs with `gh`.
- Commit and push only as part of an agreed step.
- GitHub Pages deploys the demo from `master` (`.github/workflows/pages.yml`).
