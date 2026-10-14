---
title: Integrating Lux Studio
group: Guides
---

# Integrating Lux Studio

How a host app (a lighting company's website, a showroom tool) puts Lux
Studio on a page with its own catalog. The demo
([`apps/demo/src/main.ts`](https://github.com/ewajs/lighting-simulator/blob/master/apps/demo/src/main.ts))
is a complete, working example of everything here.

Packages are consumed from TypeScript source, not from npm
([ADR 0017](../decisions/0017-consume-packages-from-source.md)). A bundler
such as Vite compiles them with the host's code. The delivery format for
clients is decided in milestone M6.

## Two ways to use it

- **The full editor:** {@link @luxstudio/ui!LxsApp | `<lxs-app>`} gives you
  the catalog, scene list, inspector, 3D viewport, handles, undo/redo and
  shortcuts. You supply data and listen to a few events.
- **Core only:** {@link @luxstudio/core!Simulator} plus
  {@link @luxstudio/core!Viewport}, with your own UI around them.

## The data you provide

Core never fetches. You hand it small objects that answer its questions:

| What | Interface | Required | Used for |
|---|---|---|---|
| Products | {@link @luxstudio/core!Catalog} | yes | simulation data per product id: mount, power, flux, CCT, beam |
| IES files | {@link @luxstudio/core!PhotometryProvider} | no | real light distributions; without one, light is estimated from flux and beam |
| 3D models | {@link @luxstudio/core!ModelProvider} | no | fixture models; without one, simple placeholders |
| Surface textures | {@link @luxstudio/core!TextureProvider} | no | photos of floors and walls, by texture id; without one, surfaces show their colour |
| Logging | {@link @luxstudio/core!Logger} | no | where messages go; default: warnings and errors to the console |
| Names and categories | {@link @luxstudio/ui!DisplayCatalog} | with the UI | what the catalog panel shows, in the active language, and the materials the room panel offers |

`Catalog.get` is synchronous, so keep your product list in memory. The
providers are asynchronous. Each file is requested once, on first use, and the
scene redraws when it arrives.

```ts
import { consoleLogger, Simulator, type ModelProvider, type PhotometryProvider } from '@luxstudio/core';

const products = new Map(myProducts.map((p) => [p.id, p]));

const photometry: PhotometryProvider = {
  async load(productId) {
    const url = myBackend.iesUrl(productId); // undefined if the product has no file
    if (!url) return undefined;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    // IES files are ASCII or Latin-1, never reliably UTF-8.
    return new TextDecoder('latin1').decode(await response.arrayBuffer());
  },
};

const models: ModelProvider = {
  async load(productId) {
    const url = myBackend.modelUrl(productId);
    return url ? (await fetch(url)).arrayBuffer() : undefined;
  },
};

const simulator = new Simulator({
  catalog: { get: (id) => products.get(id) },
  photometry,
  models,
  logger: consoleLogger('warn'),
});
```

A provider that throws, or a file that can't be used, produces a warning and a
fallback. It never breaks the scene.

### IES files

LM-63 Type C files of every edition
([ADR 0033](../decisions/0033-ies-support-scope.md)). The full distribution is
used, including asymmetric and upward light
([ADR 0036](../decisions/0036-ies-light.md)).

### 3D models

A binary glTF (`.glb`) per product
([ADR 0043](../decisions/0043-fixture-models.md)):

- **Metres, Y up, origin at the mounting point:** the ceiling cut-out, the
  top of a pendant, the wall plate, or the floor.
- **Front towards +Z.** That's the IES C0 plane, so the light and the model
  turn together. For wall fixtures, +Z points into the room.
- **Optional named parts:**
  - `light`: where the light sits;
  - `head`: what turns when aimed;
  - `cord…`: where pendant cables attach;
  - materials named `emissive…`: glow with the light.

### Surface textures

A surface names a texture by id (`Surface.texture`), and your
`TextureProvider` returns its image: a JPEG or PNG, plus how much of the
surface one copy covers, in metres
([ADR 0050](../decisions/0050-surface-textures.md)). Only the colours are
used, so a single photo per material is enough.

```ts
const textures: TextureProvider = {
  async load(textureId) {
    const finish = myBackend.finish(textureId); // e.g. { photoUrl, widthM: 1.8, heightM: 1.8 }
    if (!finish) return undefined;
    const data = await (await fetch(finish.photoUrl)).arrayBuffer();
    return { data, widthM: finish.widthM, heightM: finish.heightM };
  },
};
```

You don't need to correct the photos' brightness: the renderer scales each one
so its average equals the surface's reflectance ρ, which is also what the
lighting uses. To offer materials in the room panel, list them in
`DisplayCatalog.materials` with a name, a swatch, their typical ρ and the
surfaces they suit; picking one sets the texture and that ρ.

## The full editor

```ts
import '@luxstudio/ui';
import '@luxstudio/ui/theme.css';

const app = document.createElement('lxs-app');
app.simulator = simulator;
app.catalog = myDisplayCatalog('es-AR');
app.addEventListener('lxs-locale-change', ({ detail }) => {
  app.catalog = myDisplayCatalog(detail.locale); // product names follow the UI language
});

const logo = document.createElement('img');
logo.slot = 'brand';
logo.src = '/logo.svg';
app.append(logo);
document.body.append(app);
```

Properties worth knowing on `<lxs-app>`:
- `locale`: `es-AR` (the default) or `en`.
- `theme`: `dark` or `light`.
- `ies-import`: lets visitors try their own IES file.
- `diagnostics`: shows a frame-rate and draw-count overlay.
- `help-on-start`: opens the getting-started help on a visitor's first
  visit. The **?** button opens it any time.
- `manualUrls`: your user manual per language, such as
  `{ 'es-AR': '…', en: '…' }`. The help's last card links to it.
- `library-collapsed` and `inspector-collapsed`.

Events:

| Event | When | What to do |
|---|---|---|
| `lxs-locale-change` | the user switched language | update `catalog` names |
| `lxs-screenshot` | the user took a screenshot | cancelable: `preventDefault()` and use `detail.png` instead of the download |
| `lxs-import-ies` | the user added their own IES file (with `ies-import`) | add the product to your catalogs ([ADR 0037](../decisions/0037-ies-import.md)) |

**Theming:** every colour, size and font is a `--lxs-*` CSS custom property
in `theme.css`. Override them on any ancestor to rebrand. Put
`data-lxs-theme="light"` on an ancestor for the light theme.

## Core only

```ts
import { Viewport } from '@luxstudio/core';

const viewport = new Viewport({ simulator, container: document.querySelector('#stage')! });
await viewport.init();
viewport.onPick(({ target }) => viewport.setHighlighted(target ? [target.id] : []));
viewport.handle = 'move'; // arrows on the highlighted luminaires
```

The viewport has no selection of its own: you decide what a click means and
what to highlight. Drags edit the Simulator directly, one undo step each. Call
`viewport.dispose()` when you remove it.

## When something looks wrong

- Pass `consoleLogger('debug')` to see every step: loads, parses, edits,
  shadows and drags. Messages start with their area, such as `[photometry]`.
- `viewport.diagnostics()` (or `<lxs-app diagnostics>`) shows the backend,
  frame rate, shadows and draw calls.
- On a browser without WebGPU, three.js says it fell back to WebGL 2. That's
  expected.
