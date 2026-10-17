# Decision records

Each file records one decision: context, options, decision and consequences. To change a decision, add a new ADR that supersedes the old one; don't edit the old one.

| # | Decision | Status |
|---|---|---|
| 0001 | [Record decisions as ADRs](0001-record-decisions-as-adrs.md) | Accepted |
| 0002 | [Client-agnostic library, data injected](0002-client-agnostic-library.md) | Accepted |
| 0003 | [Headless core with an optional UI layer](0003-headless-core-optional-ui.md) | Accepted |
| 0004 | [UI built as Web Components with Lit](0004-ui-web-components-lit.md) | Accepted |
| 0005 | [TypeScript](0005-typescript.md) | Accepted |
| 0006 | [npm workspaces monorepo](0006-npm-workspaces-monorepo.md) | Accepted |
| 0007 | [Placeholder package names](0007-placeholder-package-names.md) | Superseded by 0027 |
| 0008 | [A branch and a PR per step](0008-branch-and-pr-per-step.md) | Accepted |
| 0009 | [What Claude may do without asking](0009-claude-autonomy-boundaries.md) | Accepted |
| 0010 | [Testing with Vitest and Playwright](0010-testing-vitest-playwright.md) | Accepted |
| 0011 | [ESLint and Prettier](0011-eslint-prettier.md) | Accepted |
| 0012 | [Language and i18n](0012-language-and-i18n.md) | Accepted |
| 0013 | [WebGPURenderer with WebGL 2 fallback](0013-webgpu-renderer.md) | Accepted |
| 0014 | [Sample IES sources](0014-sample-ies-sources.md) | Superseded by 0035 |
| 0015 | [CI checks on PRs, Playwright local only](0015-ci-without-playwright.md) | Accepted |
| 0016 | [Undo/redo lives in core](0016-undo-redo-in-core.md) | Accepted |
| 0017 | [Packages consumed from source, not published to npm](0017-consume-packages-from-source.md) | Accepted |
| 0018 | [Core API: Simulator class, sync catalog, merge keys](0018-core-api-shape.md) | Accepted |
| 0019 | [Viewport reports picks; the host owns selection](0019-viewport-host-owned-selection.md) | Accepted |
| 0020 | [UI translations with @lit/localize](0020-i18n-lit-localize.md) | Accepted |
| 0021 | [UI state: props down, events up](0021-props-down-events-up.md) | Accepted |
| 0022 | [Legacy TypeScript decorators for Lit](0022-legacy-typescript-decorators.md) | Accepted |
| 0023 | [Icons from the lucide package](0023-lucide-icons.md) | Accepted |
| 0024 | [Display catalog references core product ids](0024-display-catalog.md) | Accepted |
| 0025 | [Elements edit the Simulator directly; events are for UI state](0025-elements-edit-simulator-directly.md) | Accepted |
| 0026 | [App shell API: brand slot, locale event, app-owned view state](0026-app-shell-api.md) | Accepted |
| 0027 | [Product name: Lux Studio](0027-product-name-lux-studio.md) | Accepted |
| 0028 | [Illuminance includes inter-reflections (room radiosity)](0028-indirect-illuminance-radiosity.md) | Accepted |
| 0029 | [Screenshots: core capture, cancelable UI event, neutral file name](0029-screenshots.md) | Accepted |
| 0030 | [Touch and tablet interaction](0030-touch-and-tablet.md) | Accepted |
| 0031 | [Supported browsers, and full phone support](0031-supported-browsers-and-phones.md) | Accepted |
| 0032 | [E2E runs on Chrome (WebGPU), Chrome (WebGL 2) and WebKit](0032-e2e-browser-projects.md) | Accepted |
| 0033 | [IES support scope](0033-ies-support-scope.md) | Accepted |
| 0034 | [Photometry provider: async IES text, cached in core](0034-photometry-provider.md) | Accepted |
| 0035 | [Sample IES files from real manufacturers](0035-sample-ies-sources.md) | Accepted |
| 0036 | [Full-sphere IES light](0036-ies-light.md) | Accepted |
| 0037 | [Try your own IES file](0037-ies-import.md) | Accepted |
| 0038 | [Drag to move, built into the Viewport](0038-drag-to-move.md) | Accepted |
| 0039 | [Move handle: our own arrows, shown on the selection](0039-move-handle.md) | Accepted |
| 0040 | [Aim handle: aim point and rotation ring](0040-aim-handle.md) | Accepted |
| 0041 | [Snapping: grid, alignment, pan steps](0041-snapping.md) | Accepted |
| 0042 | [Distances to the walls while moving](0042-distances-while-moving.md) | Accepted |
| 0043 | [Fixture models: a model provider and glTF conventions](0043-fixture-models.md) | Accepted |
| 0044 | [Logging, diagnostics and loud test failures](0044-logging-and-loud-failures.md) | Accepted |
| 0045 | [User manual with VitePress, in Spanish and English](0045-user-manual-vitepress.md) | Accepted |
| 0046 | [In-app help: a getting-started carousel](0046-in-app-help.md) | Accepted |
| 0047 | [Furniture: procedural pieces in one design language](0047-furniture.md) | Accepted |
| 0048 | [One set of edits for luminaires and furniture](0048-one-set-of-edits-for-scene-items.md) | Accepted |
| 0049 | [Furniture in the editing tools: arrows, a floor ring, edge distances](0049-furniture-in-the-editing-tools.md) | Accepted |
| 0050 | [Surface textures from a host provider, brightness matched to reflectance](0050-surface-textures.md) | Accepted |
| 0051 | [Scene files: versioned `.luxstudio.json`, opened as one undo step](0051-scene-files.md) | Accepted |
| 0052 | [Autosave in localStorage, and New from room templates](0052-autosave-and-templates.md) | Accepted |
| 0053 | [Share links through a scene storage; the demo's links carry the scene](0053-share-links.md) | Accepted |
| 0054 | [Loading without stand-ins, and no page zoom on phones](0054-loading-without-stand-ins.md) | Accepted |
| 0055 | [Help redesign, and panels that slide](0055-help-redesign-and-panel-motion.md) | Accepted |
| 0056 | [Leaner test runs: tests where they matter, screenshots of their subject](0056-leaner-test-runs.md) | Accepted |
| 0057 | [How illuminance is calculated, and how we know it's right](0057-illuminance-calculation.md) | Accepted |
| 0058 | [Accuracy checks: Lux Studio against Radiance](0058-accuracy-checks.md) | Accepted |
| 0059 | [The manual's Concepts section: maths, and diagrams computed by core](0059-manual-concepts-and-diagrams.md) | Accepted |
| 0060 | [Bounced light: a room radiosity solve, checked against Radiance](0060-bounced-light.md) | Accepted |
| 0061 | [The calculation's features as switches, measured one by one](0061-calculation-features-and-timing.md) | Accepted |
| 0062 | [The manual's Analysis section: every comparison, charted](0062-manual-analysis-section.md) | Accepted |
| 0063 | [Furniture in bounced light: it hides it and reflects it](0063-furniture-in-bounced-light.md) | Accepted |
| 0064 | [The analysis in the app: a panel, calculated in a Web Worker](0064-analysis-in-the-app.md) | Accepted |
| 0065 | [Keeping the room's work between calculations](0065-analysis-cache.md) | Accepted |
| 0066 | [The illuminance view: the calculation drawn in false colour](0066-illuminance-view.md) | Accepted |
| 0067 | [The lux probe: the light at any point, exactly](0067-lux-probe.md) | Accepted |
| 0068 | [A busy reference room: how accuracy and time scale](0068-busy-reference-room.md) | Accepted |
