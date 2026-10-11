# Roadmap

What we build and in what order. [SPEC.md](./SPEC.md) describes the
features, and [decisions/](./decisions/) records why.

**How each step runs:** Claude posts a short plan for the step → the owner
approves it → the work happens on a feature branch → PR → the owner reviews
and merges. The next step starts only after that merge.

## Phase 0: Realignment ✅

Done. Step 0.6 shipped as four PRs: foundations, catalog and scene panels, inspector, then top bar, viewport controls and shortcuts.

The first prototype (plain JS, a home-grown DOM helper, sample data inside
the app) is replaced by the agreed structure. It is deleted, not migrated.
Its ideas get re-implemented to the new standards, slice by slice.

| Step | Scope | Pages |
|---|---|---|
| **0.1 Docs** ✅ | Make SPEC and DESIGN client-agnostic. Add this roadmap. Add ADRs 0013–0016. | Prototype (unchanged) |
| **0.2 Workspaces + tooling** ✅ | Delete the prototype. Empty `packages/core`, `packages/ui`, `apps/demo` with TS strict, ESLint (with the boundary rule), Prettier and Vitest. A CI workflow on PRs runs lint, typecheck, unit tests and the build. The Pages workflow builds `apps/demo`. | Placeholder page |
| **0.3 Core: scene model** ✅ | Types (Room, Product, Luminaire, Scene) and pure, tested scene operations, plus snapshot undo/redo (ADR 0016). | Placeholder |
| **0.4 Core: renderer** ✅ | A three.js `Viewport` that renders a scene: room, luminaires with the fallback lighting model, CCT colour, shadows, picking reported to the host (ADR 0019). | Placeholder |
| **0.5 Demo on core** ✅ | A minimal `apps/demo` page with a sample catalog injected into core. No ui package yet. A local Playwright smoke harness against the demo. | Core-only demo |
| **0.6 UI: Lit + i18n** ✅ | Lit components for the shell, panels and inspector. Design tokens as the theming surface. `es-AR` (default) and `en` strings. The demo uses the full UI. | Full demo |

## Phase 1+: Features

| Milestone | Scope |
|---|---|
| **M1 Photometry** | IES LM-63 parser in core (pure, tested against hand-made files), a photometry provider interface, IES-driven lights, three.js sample IES files in the demo (ADR 0014). |
| **M2 Analysis** | Illuminance at points and on planes (Web Worker), lux probe, false-colour heatmap and legend, plane stats (avg / min / max / U₀). |
| **M3 Manipulation** | Drag to move, move/aim handles, snapping to ceiling, walls and floor. |
| **M4 Persistence** | Versioned scene schema, import/export, local autosave, storage provider interface for backends. |

Each milestone is split into steps when it is planned, like Phase 0.

## Later (unordered)

- Backend adapter (reference implementation of the providers)
- Simplified customer-facing mode
- Path-traced "Render" stills for better indirect light
- PDF report, bill of materials
- Polygon rooms, openings, furniture / glTF import
- Product name: package scope, element prefix, file extension (ADR 0007)
