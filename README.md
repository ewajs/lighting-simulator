# Lux Studio

A client-agnostic library for building 3D lighting simulators on the web,
using [three.js](https://threejs.org) (WebGPU with a WebGL 2 fallback). With
an app built on it, users lay out and furnish a room, place luminaires from a
catalog the host app provides, and see a believable, photometrically based
preview of the light: real IES distributions, aimed and moved directly in 3D.
Scenes save themselves, and go to files or share links.

- **Live demo:** <https://ewajs.github.io/lighting-simulator/>. Add `?debug` to
  the URL for step-by-step logs and a diagnostics overlay.
- **User manual** (Spanish and English): <https://ewajs.github.io/lighting-simulator/manual/>
- **Docs and API reference:** <https://ewajs.github.io/lighting-simulator/docs/>

## Packages (npm workspaces)

- **`@luxstudio/core`:** the headless engine. Scene model and undo, IES
  photometry, three.js rendering, direct manipulation, furniture, scene
  files. All data (products, IES files, models, textures) is injected through
  providers.
- **`@luxstudio/ui`:** optional Lit web components, the full editor
  (`<lxs-app>`), in `es-AR` and `en`.
- **`apps/demo`:** the reference integration, with sample data. It's deployed
  to the link above.

## Status

Done:
- the editor shell, on desktop, tablets and phones;
- IES photometry;
- direct manipulation: drag, move and aim handles, snapping, distances;
- fixture models, furniture and surface textures;
- persistence: autosave, room templates, `.luxstudio.json` files and share links;
- loud failures, loading without stand-ins, in-app help and a user manual.

Next:
- M5, analysis: illuminance with inter-reflections, a lux probe, a heatmap
  and plane statistics;
- M6, distribution: how clients receive the library.

The [roadmap](docs/ROADMAP.md) has the details.

```
nvm use          # Node 24
npm install
npm run dev
```

## Docs

- [How it works](docs/guides/how-it-works.md): the architecture, and three actions traced through the code
- [Integrating Lux Studio](docs/guides/integrating.md): providers, models, events, theming
- [The demo app](docs/guides/demo.md) and [working on the code](docs/guides/working-on-it.md)
- [Roadmap](docs/ROADMAP.md), [spec](docs/SPEC.md), [design system](docs/DESIGN.md) and [decision records](docs/decisions/README.md)
- [CLAUDE.md](https://github.com/ewajs/lighting-simulator/blob/master/CLAUDE.md): working rules and coding standards
