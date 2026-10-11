# Leuk Lighting Simulator

A browser-based 3D lighting simulator for Leuk luminaires, built with
[three.js](https://threejs.org) (WebGPU with a WebGL 2 fallback) and Vite.
You lay out a room, place fixtures from the catalog, and preview the light.

**Live demo:** https://ewajs.github.io/lighting-simulator/ (deployed from `master` by `.github/workflows/pages.yml`)

- **Product & technical spec:** [docs/SPEC.md](docs/SPEC.md)
- **Front-end design system:** [docs/DESIGN.md](docs/DESIGN.md)

## Getting started

```bash
npm install
npm run dev       # http://localhost:5173
npm run build     # production build in dist/
npm run preview   # serve the build
```

Requires Node 20+.

## Status

Milestone **M0 (scaffold)**:
- App shell: top bar, catalog/scene panel, contextual inspector, viewport overlays, status bar.
- Dark and light themes.
- Parametric room with editable surfaces.
- Click or drag a product to place it, then select it and edit it in the inspector.
- Undo/redo, Realistic and Clay render modes, PNG snapshot.

Photometry is approximate for now: lumens and beam angle only, no IES yet.
See the milestones in the spec.

## Layout

```
docs/        spec and design system
src/state/   store, actions, initial state
src/scene/   three.js viewport, room and luminaire layers
src/ui/      DOM components (no framework)
src/styles/  tokens → base → layout → components
src/data/    sample catalog
public/ies/  IES photometry files
```

In dev mode, `store`, `actions` and `viewport` are exposed on `window` for
console debugging.
