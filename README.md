# Lighting Simulator (working name)

A client-agnostic library for building 3D lighting simulators on the web,
using [three.js](https://threejs.org) (WebGPU with a WebGL 2 fallback).
With an app built on it, users lay out a room, place luminaires from a
catalog the host app provides, and see a believable, photometrically based
preview of the light.

Planned packages (npm workspaces):

- `@lighting-sim/core`: headless engine (scene model, photometry, rendering)
- `@lighting-sim/ui`: optional Lit web components, i18n (`es-AR` / `en`)
- `apps/demo`: reference integration with sample data, deployed to
  https://ewajs.github.io/lighting-simulator/

## Status

**Realignment in progress** (roadmap Phase 0). Core has the scene model,
undo/redo and a three.js viewport. The live demo shows a sample room with
selection, inside the first `@lighting-sim/ui` shell (Spanish by default).
The panels fill in during steps 0.6b–d.

```
nvm use          # Node 24
npm install
npm run dev
```

## Docs

- [CLAUDE.md](CLAUDE.md): working rules and coding standards
- [docs/ROADMAP.md](docs/ROADMAP.md): steps and milestones
- [docs/SPEC.md](docs/SPEC.md): product and technical spec
- [docs/DESIGN.md](docs/DESIGN.md): design system and theming
- [docs/decisions/](docs/decisions/): architecture decision records
