# Roadmap

What we build and in what order. [SPEC.md](./SPEC.md) describes the
features, and [decisions/](./decisions/README.md) records why.

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

Order reviewed on 2026-10-11: what makes the best demo first (IES light, direct manipulation, visuals, saving), then lux analysis, and packaging for clients last.

| Milestone | Scope |
|---|---|
| **P Polish** ✅ | Close the Phase 0 gaps: rename to **Lux Studio** (P.1 ✅), PNG screenshot and catalog filters (P.2 ✅), touch and tablet support (P.3 ✅), full phone layout: portrait (P.4a ✅) and landscape (P.4b ✅), then WebKit (iOS/macOS Safari) and WebGL 2 fallback checks (P.5 ✅). Firefox is not supported (ADR 0031). After M4, at the owner's request: loading without stand-ins and no page zoom on phones (P.6a ✅, ADR 0054), then a help redesign and panel animations (P.6b ✅, ADR 0055). |
| **M1 Photometry** ✅ | Work with arbitrary IES files: IES LM-63 parser and candela lookup in core (M1.1 ✅, ADR 0033), a photometry provider and five real manufacturer IES files in the demo (M1.2 ✅, ADRs 0034–0035), a full-sphere IES light that draws asymmetric and upward light (M1.3 ✅, ADR 0036), and a demo option to try your own IES file (M1.4 ✅, ADR 0037). |
| **M2 Manipulation** ✅ | Drag to move along the mount surface (M2.1 ✅, ADR 0038), a move handle (M2.2 ✅, ADR 0039), an aim handle with `W`/`E` switching (M2.3 ✅, ADR 0040), then snapping to a grid, to other luminaires and in 15° pan steps (M2.4 ✅, ADR 0041), and distances to the walls while moving (M2.5 ✅, ADR 0042). |
| **Q Quality** ✅ | Before M3.2, at the owner's request: loud failures (Q.1: an injected logger, a `?debug` switch with diagnostics, every e2e test failing on unexpected console warnings, ADR 0044) and a browsable docs site (Q.2: TypeDoc API reference with guides, at `/docs`). |
| **H Help** ✅ | At the owner's request: a user manual in Spanish and English with generated screenshots (H.1 ✅, ADR 0045, at `/manual`), then an in-app getting-started carousel with animated illustrations, linking to it (H.2 ✅, ADR 0046). |
| **M3 Visual quality** ✅ | Fixture models through a model provider (M3.1 ✅, ADR 0043), furniture: 14 procedural pieces you add, pick, edit and drag over the floor (M3.2 ✅, ADR 0047), furniture in the editing tools (M3.3 ✅, ADR 0049): move arrows and a rotation ring (M3.3a ✅), distances and adding at a free spot (M3.3b ✅), surface textures from a host provider, brightness matched to reflectance (M3.4 ✅, ADR 0050). Bounce light stays the uniform estimate until M5. |
| **M4 Persistence** ✅ | Scene files: a versioned `.luxstudio.json` format, Save and Open (M4.1 ✅, ADR 0051), then local autosave and New from room templates (M4.2 ✅, ADR 0052), then a storage provider for backends and share links (M4.3 ✅, ADR 0053). |
| **M5 Analysis** | Direct illuminance plus inter-reflections from a room radiosity solve, in a Web Worker (ADR 0028). Lux probe, false-colour heatmap and legend, plane stats (avg / min / max / U₀). Finally, the radiosity solution drives the rendered bounce light, replacing the uniform estimate. Done so far: direct illuminance (M5.1 ✅, ADR 0057), accuracy checks against Radiance (M5.2a ✅, ADR 0058), the manual's Concepts section (M5.2b ✅, ADR 0059), bounced light (M5.3a ✅, ADR 0060), the features as switches with their cost measured (ADR 0061), the manual's Analysis section (ADR 0062), furniture in bounced light (ADR 0063), the Analysis panel calculated in a Web Worker (M5.4a ✅, ADR 0064), the room's work kept between calculations (M5.4b ✅, ADR 0065), the illuminance view in false colour (M5.4c ✅, ADR 0066), the lux probe (M5.4d ✅, ADR 0067). |
| **M6 Distribution** | How clients receive the library (an ADR on the delivery format), an embeddable build, integrator docs, a sample integration. |

Each milestone is split into steps when it is planned, like Phase 0.

## Later (unordered)

- Backend adapter (reference implementation of the providers)
- Simplified customer-facing mode
- Path-traced "Render" stills
- PDF report, bill of materials
- Polygon rooms, openings, glTF import of architecture and furniture
- Performance benchmark: a 100-luminaire scene measured against SPEC §7
