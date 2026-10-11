# Lighting Simulator — Product & Technical Spec

Status: **Draft v0.1** · Owner: Ezequiel Wajs · Last updated: 2026-10-11

## 1. Purpose

A browser-based 3D tool where a user builds a simple space (a room), places
Leuk luminaires from the catalog, and sees a believable preview of how the
space will be lit. The tool also shows how much light reaches each surface,
using the luminaires' real photometric data (IES files).

It sits between a marketing configurator and a full lighting-design package
(DIALux, Relux). It is good enough to support a sale and a first-pass layout,
but it is not a certified calculation tool.

### Goals

1. **Visual confidence**: a customer can tell what a room will feel like with
   a given set of fixtures.
2. **Photometric honesty**: light distribution comes from each product's IES
   file, not from generic spotlights.
3. **Speed**: a useful scene in under 2 minutes, with no training.
4. **Shareable**: a scene can be saved, reopened and sent as a link.

### Non-goals (for now)

- Certified lighting calculations, standards compliance reports (EN 12464, etc.).
- Daylight simulation.
- Arbitrary CAD/BIM import (IFC, DWG). Possibly later via glTF.
- Multi-user real-time editing.

## 2. Users

| User | Need |
|---|---|
| **End customer** (retail / web) | "Will this pendant look good over my table?" Wants a picture, not numbers. |
| **Sales / showroom staff** | Builds a scene with the customer and adjusts it live. Needs speed and a few presets. |
| **Architect / interior designer** | Wants approximate lux levels, uniformity and product counts to pick fixtures before a formal calculation. |

The MVP targets **sales staff and designers**. The customer-facing mode is a
simplified skin over the same engine (see §9).

## 3. Core concepts (domain model)

```
Project
 └─ Scene
     ├─ Room            dimensions, surfaces (floor / ceiling / walls), materials
     ├─ Objects[]       optional furniture / props (boxes, tables, imported glTF)
     ├─ Luminaires[]    instances of catalog Products
     │    ├─ productId
     │    ├─ transform  position, rotation (aim), mount type
     │    ├─ dimming    0–100 %
     │    └─ cct        colour temperature override (if the product allows it)
     ├─ CalcPlanes[]    work planes / surfaces where illuminance is sampled
     └─ View            camera bookmarks, exposure, render mode
```

**Product** (catalog entry): id, name, category, finish/colour, wattage,
luminous flux (lm), CCT (K), CRI, beam angle, mount type(s), dimensions,
3D model (glTF), photometry (IES LM-63 file), thumbnail.

Catalog categories follow the existing Leuk catalog: *Colgante, Spot de
embutir, Cardánico de embutir, Riel, Exterior, Velador, Lámpara de pie, Aplique*.

**Units**: SI throughout. Metres for geometry, lumens / candelas / lux for
light, Kelvin for CCT. One three.js world unit = 1 m, Y-up.

## 4. Features

Priority: **P0** = MVP, **P1** = next, **P2** = later.

### 4.1 Room

- P0: Rectangular room from width × depth × height (defaults 5 × 4 × 2.7 m).
- P0: Per-surface material: colour + reflectance (ρ), with presets
  (white paint 0.8, concrete 0.4, wood floor 0.3, dark 0.1).
- P1: L-shaped / polygon floor plans drawn in a 2D plan view.
- P1: Openings (doors, windows) as cut-outs.
- P2: glTF import for furniture and architecture.

### 4.2 Luminaires

- P0: Browse the catalog by category, search by name, filter by mount type / CCT.
- P0: Drag a product into the viewport. It snaps to a valid surface
  (recessed and pendant go on the ceiling, wall-mounted on walls, floor and
  table lamps on the floor).
- P0: Select, move, rotate/aim, duplicate, delete. Undo/redo.
- P0: Per-instance dimming and on/off.
- P1: Array tool: grid placement (rows × cols, spacing) on the ceiling.
- P1: Track (riel) systems with heads that snap along a rail.
- P1: Groups / scenes ("Dinner", "Work") that switch dimming presets.

### 4.3 Photometry & lighting

- P0: Parse IES LM-63-2002/2019 files. Use them as the light's intensity
  distribution (three.js `IESSpotLight` / IES texture profile).
- P0: Light colour comes from CCT (blackbody approximation). Intensity comes
  from the IES candela values scaled by dimming.
- P0: Physically based units: `renderer.physicallyCorrectLights` behaviour
  (default in r155+), candela on lights, exposure control on the camera.
- P0: Shadows from luminaires (shadow maps, quality setting).
- P1: Approximate indirect light (bounce). Options to evaluate: light probes /
  irradiance volume, or a progressive path-traced "Render" mode
  (e.g. `three-gpu-pathtracer`) for stills.
- P2: Glare indicators, UGR estimate.

### 4.4 Analysis

- P0: **False-colour (heatmap) mode**: illuminance on floor and work plane,
  with a legend in lux.
- P0: Point probe: hover or click any surface to read lux.
- P1: Calc grid summary per plane: E<sub>avg</sub>, E<sub>min</sub>,
  E<sub>max</sub>, uniformity U₀ = E<sub>min</sub>/E<sub>avg</sub>.
- P1: Power density (W/m²) and fixture count summary / bill of materials.
- P2: Export PDF report.

Illuminance is computed **analytically** (direct component). For each sample
point, sum over all luminaires: E = I(θ,φ) · cos(α) / d², with I taken from the
IES table and occlusion from a ray test. This runs in a Web Worker (or a GPU
compute pass) so it doesn't block rendering. It is independent from the
rendered image, so the numbers stay the same whatever the visual quality.

### 4.5 Views & output

- P0: Orbit / pan / zoom 3D camera. Preset views: Perspective, Top (plan),
  Front, Side.
- P0: Render modes: **Realistic**, **Illuminance (false colour)**, **Clay**
  (white materials, shows light only).
- P0: Screenshot to PNG.
- P1: Walk mode (first-person at eye height 1.6 m).
- P1: Camera bookmarks.

### 4.6 Persistence

- P0: Autosave the current scene to `localStorage`/IndexedDB.
- P0: Export / import scene as JSON (`.leuk.json`, versioned schema).
- P1: Save to backend (`leuk-api`, Laravel) with a shareable URL.
  Catalog served from the same API.

## 5. Front-end UX

See [DESIGN.md](./DESIGN.md) for the visual system. Layout summary:

```
┌───────────────────────────────────────────────────────────────┐
│ Top bar: logo · project name · undo/redo · view modes · share │
├──────────┬───────────────────────────────────────┬────────────┤
│ Left     │                                       │ Right      │
│ panel    │            3D viewport                │ inspector  │
│ (tabs:   │                                       │ (context:  │
│ Catalog, │   floating: view cube, exposure,      │ room /     │
│ Room,    │   heatmap legend                      │ luminaire /│
│ Scene)   │                                       │ multi-sel) │
├──────────┴───────────────────────────────────────┴────────────┤
│ Status bar: selection · cursor lux · fixtures · W · fps       │
└───────────────────────────────────────────────────────────────┘
```

Key interaction rules:

- **The viewport is the hero.** Panels can collapse; on narrow screens they
  become bottom sheets.
- **Direct manipulation first.** Drag from the catalog, move with gizmos.
  Numeric fields exist for precision in the inspector.
- **Inspector is contextual.** Nothing selected shows the room. One luminaire
  shows its product and instance settings. Several selected show the shared
  fields.
- **Every edit is undoable** (command pattern on the store).
- Keyboard: `W/E/R` move/rotate/aim, `Del` delete, `Ctrl/⌘+D` duplicate,
  `Ctrl/⌘+Z / Shift+Z` undo/redo, `1/2/3` render modes, `F` frame
  selection, `Esc` deselect.

## 6. Architecture

**Stack**: Vanilla JavaScript (ES modules) + Vite + three.js. No UI
framework at this stage. The UI is small, and a thin component helper keeps
it dependency-free. Revisit (Lit / Preact / React) if the panel count grows.
TypeScript-style checking via JSDoc + `// @ts-check` is optional.

**Renderer**: `WebGPURenderer` from `three/webgpu`. It falls back to WebGL 2
automatically, and it is where `IESSpotLight` and TSL node materials live
(required for IES profiles).

```
src/
  main.js              bootstrap: store → scene → UI
  state/
    store.js           single observable store, actions, undo/redo history
  scene/
    Viewport.js        renderer, camera, controls, resize, render loop
    RoomBuilder.js     room state → meshes
    LuminaireLayer.js  luminaire state → lights + fixture meshes   (P0)
    ies/               IES parsing/caching                         (P0)
    analysis/          illuminance worker, false-colour material   (P0)
  ui/
    dom.js             tiny h() element helper
    icons.js           inline SVG icon set
    TopBar.js, SidePanel.js, CatalogPanel.js, RoomPanel.js,
    Inspector.js, StatusBar.js, ViewportOverlay.js
  data/
    catalog.js         sample catalog (later: fetched from leuk-api)
  styles/
    tokens.css         design tokens (colour, type, spacing, radii)
    base.css           reset + element defaults
    layout.css         app shell grid
    components.css     buttons, fields, panels, lists…
public/
  ies/                 IES files served statically (MVP)
  models/              fixture glTF models (MVP)
```

**Data flow** is one-way: UI dispatches actions → store updates state and
notifies → scene layer and UI re-render the parts that changed. The scene layer
never mutates state directly. Picking in the viewport dispatches `select` /
`move` actions like any other UI.

## 7. Performance targets

| Metric | Target |
|---|---|
| First interactive load | < 3 s on broadband, JS bundle < 400 kB gz (three included) |
| Frame rate (Realistic, 20 luminaires, shadows on) | ≥ 50 fps on a 2022 laptop iGPU |
| Heatmap recompute after an edit | < 300 ms for a 0.25 m grid in a 50 m² room |
| Max luminaires per scene | 100 (shadows auto-limited to the 8 most significant) |

Shadow-casting lights are expensive. Lights beyond the shadow budget still
light the scene but don't cast shadows. The analysis worker still runs its
occlusion test for every light.

## 8. Browser support

Latest two versions of Chrome, Edge, Safari and Firefox. WebGPU where
available, WebGL 2 otherwise. Desktop and tablet first. Phone is view-only
(open a shared scene and orbit).

## 9. Milestones

| # | Milestone | Contents |
|---|---|---|
| M0 | **Scaffold** (this commit) | Vite + three, app shell UI, design tokens, store, parametric room, sample catalog |
| M1 | **Place & light** | Drag-and-drop luminaires, IES loading, CCT, dimming, selection + gizmos, undo/redo |
| M2 | **Analysis** | Illuminance worker, false-colour mode, lux probe, legend, plane stats |
| M3 | **Persist & share** | JSON import/export, autosave, screenshot, API save + share link |
| M4 | **Customer mode** | Simplified UI skin, presets, embeddable on leuk website |

## 10. Open questions

1. **Catalog source of truth**: is `leuk-api` (Simulador V2) the backend for
   this, or is this a separate product? It decides the catalog schema and auth.
2. **IES coverage**: do we have IES + glTF for every product, or only some?
   What fallback do we use for products without photometry (generic beam
   from the beam angle)?
3. **Language**: UI in Spanish, English, or both? The architecture keeps
   strings in one place to allow i18n.
4. **Brand fonts**: DIN Next / Simplifica licences allow web embedding?
   The UI uses a system stack until confirmed.
5. **Indirect light**: is a "Render" button (wait a few seconds for a
   path-traced still) acceptable, or must real-time look final?
