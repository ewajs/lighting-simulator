# Lux Studio: Product & Technical Spec

Status: **Draft v0.3** · Last updated: 2026-10-11

Working rules are in [CLAUDE.md](../CLAUDE.md), the reasoning behind
decisions is in [decisions/](./decisions/), and the delivery order is in
[ROADMAP.md](./ROADMAP.md). This document describes **what** we are
building.

## 1. Purpose

A client-agnostic library for building browser-based 3D lighting
simulators. With an app built on it, a user sets up a simple space (a room),
places luminaires from a catalog the host app provides, and sees a
believable preview of how the space will be lit. The app also shows how
much light reaches each surface, using the luminaires' photometric data
(IES files).

It sits between a marketing configurator and a full lighting-design package
(DIALux, Relux). It is good enough to support a sale and a first-pass layout,
but it is not a certified calculation tool.

### Goals

1. **Visual confidence**: the user can tell what a room will feel like with
   a given set of fixtures.
2. **Photometric honesty**: light distribution comes from each product's IES
   file, not from generic spotlights.
3. **Speed**: a useful scene in under 2 minutes, with no training.
4. **Shareable**: a scene can be saved, reopened and sent as a link.
5. **Embeddable and agnostic**: any lighting company can integrate it with
   its own catalog, backend and branding, without changes to the library.

### Non-goals (for now)

- Certified lighting calculations, standards compliance reports (EN 12464, etc.).
- Daylight simulation.
- Arbitrary CAD/BIM import (IFC, DWG). Possibly later via glTF.
- Multi-user real-time editing.

## 2. Users

| User | Need |
|---|---|
| **Integrator** (a lighting company's dev team) | Plugs in their catalog, photometry, storage and branding. Uses our UI, or builds their own on the core. |
| **End customer** (retail / web) | "Will this pendant look good over my table?" Wants a picture, not numbers. |
| **Sales / showroom staff** | Builds a scene with the customer and adjusts it live. Needs speed and a few presets. |
| **Architect / interior designer** | Wants approximate lux levels, uniformity and product counts to pick fixtures before a formal calculation. |

The first end-user target is **sales staff and designers**. A simplified
customer-facing mode comes later, on the same engine.

## 3. Core concepts (domain model)

```
Scene
 ├─ Room            dimensions, surfaces (floor / ceiling / walls), materials
 ├─ Objects[]       optional furniture / props (boxes, tables, imported glTF)
 ├─ Luminaires[]    instances of catalog Products
 │    ├─ productId
 │    ├─ transform  position, aim, mount type
 │    ├─ dimming    0–1
 │    └─ cct        colour temperature override (if the product allows it)
 ├─ CalcPlanes[]    work planes / surfaces where illuminance is sampled
 └─ View            camera bookmarks, exposure, render mode
```

**Product** comes from the host's catalog and has two halves:

- **Simulation data**, which core needs: id, mount type (recessed, pendant,
  track, wall, floor, table), power (W), luminous flux (lm), CCT (K), beam
  angle, pendant suspension. Later also photometry (IES LM-63) and a 3D
  model (glTF).
- **Display data**, which only the UI or host needs: name, category, finish,
  CRI, dimensions, thumbnail. Categories are defined by the host, not by
  the library.

Core's `Product` type covers only the first half ([ADR 0018](./decisions/0018-core-api-shape.md)).

**Units**: SI throughout. Metres for geometry, lumens / candelas / lux for
light, kelvin for CCT. One three.js world unit = 1 m, Y-up.

## 4. Features

Priority: **P0** = first version, **P1** = next, **P2** = later.
[ROADMAP.md](./ROADMAP.md) has the milestone each one lands in.

### 4.1 Room

- P0: Rectangular room from width × depth × height (defaults 5 × 4 × 2.7 m).
- P0: Per-surface material: colour + reflectance (ρ), with presets
  (white paint 0.8, concrete 0.4, wood floor 0.3, dark 0.1).
- P1: L-shaped / polygon floor plans drawn in a 2D plan view.
- P1: Openings (doors, windows) as cut-outs.
- P1: Simple parametric furniture and props (table, sofa, desk, shelf) for
  scale and to catch light.
- P1: Room templates: starter scenes (living room, kitchen, office, shop)
  with sizes, finishes and a lighting layout.
- P2: glTF import for furniture and architecture.

### 4.2 Luminaires

- P0: Browse the host's catalog by category, search by name, filter by
  mount type / CCT.
- P0: Place a product in the viewport. It snaps to a valid surface
  (recessed and pendant on the ceiling, wall-mounted on walls, floor and
  table lamps on the floor).
- P0: Select, move, aim, duplicate, delete. Undo/redo for every scene edit.
- P0: Per-instance dimming and on/off.
- P1: Array tool: grid placement (rows × cols, spacing) on the ceiling.
- P1: Track systems with heads that snap along a rail.
- P1: Groups / presets ("Dinner", "Work") that switch dimming levels.

### 4.3 Photometry & lighting

- P0: Parse IES LM-63 files (every edition, Type C;
  [ADR 0033](./decisions/0033-ies-support-scope.md)) and use them as the
  light's full intensity distribution, including asymmetric and upward light.
- P0: Light colour comes from CCT (blackbody approximation). Intensity comes
  from the IES candela values, scaled by dimming.
- P0: Physically based units: candela on lights, AgX tone mapping, user
  exposure control.
- P0: Shadows from luminaires, with a shadow budget (see §7).
- P1: Try your own IES file: an opt-in UI to load one as a temporary product
  ([ADR 0037](./decisions/0037-ies-import.md)).
- P0: Fallback for products without IES: a generic distribution derived
  from flux and beam angle.
- P1: Better indirect light (bounce). Options to evaluate: light probes /
  irradiance volume, or a progressive path-traced "Render" mode for stills.
- P2: Glare indicators, UGR estimate.

### 4.4 Analysis

- P0: **False-colour (heatmap) mode**: illuminance on the floor and work
  plane, with a legend in lux.
- P0: Point probe: hover or click any surface to read lux.
- P1: Calc grid summary per plane: E<sub>avg</sub>, E<sub>min</sub>,
  E<sub>max</sub>, uniformity U₀ = E<sub>min</sub>/E<sub>avg</sub>.
- P1: Power density (W/m²) and fixture count summary / bill of materials.
- P2: Export PDF report.

Illuminance has two parts, computed in a Web Worker so rendering never blocks
([ADR 0028](./decisions/0028-indirect-illuminance-radiosity.md)):

- **Direct:** for each sample point, sum over all luminaires
  E = I(θ,φ) · cos(α) / d², with I taken from the IES table and occlusion from
  a ray test.
- **Indirect:** a radiosity solve over the room surfaces split into patches,
  iterating a few bounces, using each surface's reflectance. In light rooms
  this adds roughly 20–40%, so leaving it out would make results read low
  compared with DIALux/Relux.

The numbers are independent of the rendered image, so they stay the same
whatever the visual quality.

### 4.5 Views & output

- P0: Orbit / pan / zoom camera. Preset views: Perspective, Top (plan),
  Front, Side.
- P0: Render modes: **Realistic**, **Illuminance (false colour)**, **Clay**
  (neutral materials, shows light only).
- P0: Screenshot to PNG.
- P1: Walk mode (first-person at eye height 1.6 m).
- P1: Camera bookmarks.

### 4.6 Persistence

- P0: Export / import a scene as versioned JSON. The file extension is
  chosen with the product name.
- P0: Autosave the current scene locally (IndexedDB).
- P1: Save and share through a host-provided storage provider (e.g. the
  integrator's backend), giving a shareable URL.

## 5. Front-end UX

See [DESIGN.md](./DESIGN.md) for the visual system. Reference layout of our
UI package:

```
┌───────────────────────────────────────────────────────────────┐
│ Top bar: host logo · project name · undo/redo · share         │
├──────────┬───────────────────────────────────────┬────────────┤
│ Left     │                                       │ Right      │
│ panel    │            3D viewport                │ inspector  │
│ (rail +  │                                       │ (context:  │
│ tabs:    │   floating: render mode, views,       │ room /     │
│ Catalog, │   exposure, heatmap legend, hints     │ luminaire /│
│ Scene)   │                                       │ multi-sel) │
├──────────┴───────────────────────────────────────┴────────────┤
│ Status bar: selection · cursor lux · fixtures · W · fps       │
└───────────────────────────────────────────────────────────────┘
```

Key interaction rules:

- **The viewport is the hero.** Panels can collapse. On narrow screens they
  become bottom sheets.
- **Direct manipulation first.** Place from the catalog, move with handles.
  Numeric fields in the inspector are there for precision.
- **Inspector is contextual.** Nothing selected shows the room (size and
  surfaces). One luminaire shows its product and instance settings. Several
  selected show the shared fields.
- **Every scene edit is undoable.** History lives in core
  ([ADR 0016](./decisions/0016-undo-redo-in-core.md)).
- **All UI text is localised**: `es-AR` default, `en` always available
  ([ADR 0012](./decisions/0012-language-and-i18n.md)).
- Keyboard: `⌘/Ctrl+Z` undo, `⇧⌘Z` / `Ctrl+Y` redo, `⌘/Ctrl+D` duplicate,
  `⌘/Ctrl+A` select all, `Del` delete, `H` on/off, `F` frame selection,
  `Esc` deselect, `1/2` render modes (`3` for illuminance in M5), `0/7/8/9` perspective / top / front
  / side, and `W/E` move/aim once handles exist.
- Touch: tap = click, long press = Shift-click (add to or remove from the
  selection). On tablets the library starts collapsed and the inspector
  becomes a foldable sheet ([ADR 0030](./decisions/0030-touch-and-tablet.md)).

## 6. Architecture

Structure and rules are in [CLAUDE.md](../CLAUDE.md). In short:

- **`@luxstudio/core`** (TypeScript, depends on three.js): scene model
  and its operations, undo/redo history, photometry (IES parsing,
  candela lookup), the lighting model, three.js rendering
  (`WebGPURenderer` with WebGL 2 fallback,
  [ADR 0013](./decisions/0013-webgpu-renderer.md)), picking, and illuminance
  analysis. No DOM UI.
- **`@luxstudio/ui`** (TypeScript, Lit): optional web components built on
  core's public API, with i18n and design tokens.
- **`apps/demo`**: a reference integration. It provides sample catalog and
  photometry data and deploys to GitHub Pages.

**Injection points.** The host supplies data through providers instead of
the library fetching it. Each one's API is designed in the milestone that
needs it:

| Provider | Supplies | Needed in |
|---|---|---|
| Catalog | products and categories | port (0.3 / 0.5) |
| Photometry | IES files for a product ([ADR 0034](./decisions/0034-photometry-provider.md)) | M1 |
| Storage | save / load / share scenes | M4 |

**Data flow** is one-way. UI or host calls core operations → core updates
the scene (recording history) and notifies → the renderer and UI update
what changed. Picking in the viewport goes through the same operations as
any other input.

**Lighting model before IES (fallback).** A spot product's candela is
estimated from its lumens spread over its beam cone. A wide product is
treated as isotropic (lm / 4π). Indirect light is one uniform fill from the
integrating-sphere formula E = Φ·ρ̄ / (A·(1−ρ̄)). Display exposure is
calibrated so 100–500 lx interiors sit mid-range. Shadow maps re-render
only when the scene changes.

## 7. Performance targets

| Metric | Target |
|---|---|
| First interactive load | < 3 s on broadband, JS bundle < 400 kB gz (three included) |
| Frame rate (Realistic, 20 luminaires, shadows on) | ≥ 50 fps on a 2022 laptop iGPU |
| Heatmap recompute after an edit | < 300 ms for a 0.25 m grid in a 50 m² room |
| Max luminaires per scene | 100 (shadows auto-limited to the 8 most significant) |

Shadow-casting lights are expensive. Lights beyond the shadow budget still
light the scene but don't cast shadows. The analysis still runs its
occlusion test for every light.

## 8. Browser support

Latest two versions of Chrome and Edge (desktop and Android) and Safari
(macOS, iOS and iPadOS). Firefox is not supported. WebGPU where available,
WebGL 2 otherwise. Desktop, tablets and phones are all first-class: phones
get every feature in a layout of their own, with a tab bar and sheets
([ADR 0031](./decisions/0031-supported-browsers-and-phones.md)).

## 9. Open questions

1. **Provider shape**: sync or async, how auth is passed, how catalogs page
   or search server-side. Decided per provider in its milestone.
2. **Missing photometry**: is the generic fallback (flux + beam) good enough,
   or should products without IES be flagged or blocked in analysis mode?
3. **Indirect light**: is a "Render" button (wait a few seconds for a
   path-traced still) acceptable, or must real-time look final?
4. **Customer mode**: a separate set of components, or a configuration of
   the same ones?
5. **Delivery format** for clients (bundled script, git dependency, private
   registry): decided in M6.
