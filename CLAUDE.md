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
apps/manual     the user manual (VitePress, es-AR and en), served at /manual.
accuracy/       Lux Studio's lux against Radiance (ADR 0058): python/ (uv
                project) checks Radiance and writes references/;
                typescript/ (npm workspace) compares; REPORT.md
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
npm test              Vitest in every workspace (seconds)
npm run coverage      unit test coverage over all source files, per workspace
                      (HTML report in each workspace's coverage/)
npm run mutation-check -w packages/core   plants known mistakes in the
                      illuminance maths one at a time; each must fail a test
                      (ADR 0057). Run after changing analysis/ or the frame
npm run bench -w packages/core   times a furnished room's illuminance
                      calculation, bundled as the app ships it
npm run accuracy:check        the accuracy Python: ruff (with docstrings),
                      mypy strict, pytest (Radiance tests run on macOS only)
npm run accuracy:references   check Radiance, regenerate accuracy/references
                      and accuracy/REPORT.md; after changing a room or the maths
npm run accuracy:docs         the Python's docs (pdoc), live
npm run test:e2e      Playwright e2e: every test on chrome, @all-browsers tests
                      also on chrome-webgl2 and webkit (local only; ADRs 0032, 0056)
npm run test:e2e:quick   the e2e suite on chrome only (~1 min); add spec files
                      to run just those, e.g. `-- furniture.spec.ts`
npm run format        Prettier (Markdown is excluded)
npm run docs          docs site (TypeDoc) → apps/demo/dist/docs; fails on an
                      undocumented export or a broken link
npm run manual        user manual (VitePress) → apps/demo/dist/manual
npm run manual:dev    user manual with hot reload
npm run manual:screenshots   retake the manual's screenshots from the demo,
                      in both languages; `npm run screenshots -w apps/manual --
                      --grep "<name>"` retakes just some
npm run i18n:extract  collect msg() strings into packages/ui/xliff/
npm run i18n:build    regenerate locale modules after editing the XLIFF
npm run i18n:check    fail if any UI string lacks a translation
```

CI runs `format:check`, lint, typecheck, test, build, docs and manual on every PR. Run
them locally before opening one, plus `test:e2e` (CI doesn't run it, ADR 0015).
Run `npm run i18n:build` first if translations changed.

### Running tests while working (ADR 0056)

- **While working:** `npm test`, plus the e2e specs for the area changed,
  on chrome: `npm run test:e2e:quick -- <spec files>`.
- **Before opening the PR:** the full `npm run test:e2e`, **once**. A failure
  that only shows under the full run's load gets one rerun of that test
  before being treated as real.
- **Baselines:** refresh only what changed on purpose, with
  `--update-snapshots=changed` on the affected specs, and look at each new
  image. Never `=all`: it rewrites every image and buries real changes in
  re-encoding noise.
- **The manual's screenshots:** retake only the captures whose subject
  changed, with `--grep`.

| Area changed | e2e specs |
|---|---|
| Catalog, inspector, room panel, top bar, shortcuts, i18n | `smoke`, `surfaces` |
| Selection, dragging, handles, snapping, distances | `manipulation` |
| Furniture | `furniture` |
| IES files, lights, models, rendering | `smoke`, `models`, `ies-import` |
| Illuminance maths (`analysis/`, `luminaire-frame.ts`) | unit tests (the Radiance comparison is among them), `mutation-check`, and `models` if the renderer's frame changed |
| Loading, assets, providers | `loading`, `models` |
| Files, templates, autosave, share links | `scene-files`, `new-and-autosave`, `share` |
| Help | `help` |
| Phone and tablet layouts, touch | `phone`, `tablet` |

### Writing e2e tests

- Tag a test `{ tag: '@all-browsers' }` when its outcome depends on
  rendering, pointer or touch input, or the browser engine; it then also
  runs on WebGL 2 and WebKit. UI logic runs on chrome only.
- Screenshot only what the test is about: the 3D view as
  `page.locator('lxs-viewport')`, a panel as its element. Whole-page
  screenshots are for layout tests only, so a change to the top bar or a
  panel doesn't touch dozens of baselines.

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
- No clever code: no metaprogramming.
- The scene stays plain readonly data, not class instances: it's saved as
  JSON, and undo keeps old snapshots, which only works if nothing changes in
  place. Where luminaires and furniture behave alike, use functions over
  both; where they differ, a small rules object per kind
  ([ADR 0048](docs/decisions/0048-one-set-of-edits-for-scene-items.md)).
  Inheritance is fine elsewhere when it makes the code simpler, as with
  LitElement and three.js types.
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
- Every e2e test fails on an unexpected page error, console error or
  warning. A test that causes one on purpose declares it with `allowConsole`
  ([ADR 0044](docs/decisions/0044-logging-and-loud-failures.md)).

### Types and errors
- TypeScript strict. No `any` without a comment saying why. Public types are exported.
- Validate at the boundaries (injected data, IES files, user input) and fail
  with clear messages. Trust internal code.

### Logging
- Log through the injected `Logger` (`simulator.logger`), never `console`
  directly ([ADR 0044](docs/decisions/0044-logging-and-loud-failures.md)).
- Start messages with their area in brackets: `[scene]`, `[photometry]`,
  `[models]`, `[textures]`, `[render]`, `[drag]`, `[ui]`.
- `debug` for each step at the edges (edits, loads, parses, budget
  changes), once per gesture, not per frame or pointer move. `info` for rare,
  notable events. `warn` when something is skipped but the library carries
  on, `error` when something fails.
- The demo's `?debug` URL switch shows debug logs and the diagnostics overlay.

### Python (accuracy/python)
- Python 3.14 through uv; `uv.lock` committed. Run it through the npm
  `accuracy:*` commands.
- Every public module, class and function has a Google-style docstring
  (ruff enforces it; pdoc publishes them at /docs/accuracy). Types pass
  mypy --strict. Dataclasses for data, frozen.
- No throwaway scripts: tools that produce evidence are committed, with
  their outputs.

### Dependencies
- Allowed runtime deps: **core → three**, **ui → core + lit + @lit/localize +
  lucide** (ADRs 0004, 0020, 0023). Anything else
  needs approval and an ADR covering why, bundle size, maintenance health,
  licence (MIT/BSD/Apache-compatible) and the alternatives considered.
- New dev dependencies also need approval, with a one-line justification in the PR.
  Python (accuracy/python) has dev dependencies only: ruff, mypy, pytest,
  pdoc (ADR 0058).
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
  token prefix `lxs-`, scene files `.luxstudio.json`
  ([ADR 0027](docs/decisions/0027-product-name-lux-studio.md)).

## Verification before "done"

Build, lint and tests pass, and UI changes are checked in a real browser
(Playwright). State explicitly anything that was not verified.

## Git

- A feature branch and a PR per step, into `master`. The owner reviews and merges.
- Open PRs with `gh`. Each PR description has, besides what changed and how
  it was verified:
  - **Where to look:** the few files with the real logic, versus wiring and tests.
  - **What could break:** an honest list of the risks.
  - **Try it yourself:** a short manual checklist for the owner to run in the
    browser (`npm run dev`, or the deployed demo after merge), including `?debug`.
- Commit and push only as part of an agreed step.
- GitHub Pages deploys the demo from `master` (`.github/workflows/pages.yml`).
