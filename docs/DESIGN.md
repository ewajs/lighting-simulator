# Front-end Design System

The visual system for `@luxstudio/ui`. The UI is a **quiet frame around the
light**. A lighting tool is judged by its viewport, so the chrome is neutral,
low-contrast and out of the way. Colour is kept for state (selection, focus)
and data (the false-colour scale).

## Principles

1. **Dark by default.** A dark frame doesn't compete with the rendered scene
   and doesn't bias how bright the scene looks. A light theme exists for
   print/screenshots and user preference.
2. **One accent.** A warm amber (light-coloured, "2700 K") marks selection,
   focus and primary actions. Nothing else is saturated except data.
   Integrators can swap the accent for their brand colour (see Theming).
3. **Dense but calm.** It's a professional tool: 13 px base text, 32 px
   controls, 8 px grid, and hairline separators instead of boxes.
4. **Numbers are first-class.** Tabular figures, units always shown, monospace
   for live readouts. Formatting follows the active locale: `2,70 m` in
   `es-AR`, `2.70 m` in `en`.
5. **Nothing moves without reason.** Ease-out transitions on panels and
   hovers only: side panels and sheets slide in and out (250 ms), dialogs
   fade, notices rise (120–200 ms) ([ADR 0055](./decisions/0055-help-redesign-and-panel-motion.md)).
   No decorative animation.

## Theming

**Design tokens are the integrator's theming surface.** Every visual value
(colour, font, radius, spacing, layout size) is a CSS custom property named
`--lxs-*`, and the components only reference tokens. The ui package ships
`@luxstudio/ui/theme.css`, which defines them on `:root`. A host imports
it once and rebrands by overriding tokens anywhere, without touching
component code:

```css
:root {
  --lxs-accent: #0a7cff;
  --lxs-font-ui: "Host Sans", system-ui, sans-serif;
}
```

The `--lxs-` prefix keeps our tokens from clashing with the host page's own
CSS variables. Below, token names are listed without the prefix.

- Token names are part of the public API. Renaming or removing one is a
  breaking change.
- Logos, product names and other branding come from the host (slots or
  properties), never from the library.
- Built-in themes: dark (default) and light. Set `data-lxs-theme="light"`
  on `<lxs-app>` (its theme toggle does this) or on any ancestor of the
  elements (e.g. `<html>`).

## Tokens

| Group | Tokens |
|---|---|
| Surfaces | `--bg` (app), `--surface-1` (panels), `--surface-2` (fields, cards), `--surface-3` (hover), `--overlay` (floating controls), `--viewport-bg` |
| Lines | `--line` (hairline), `--line-strong` (field borders) |
| Text | `--text`, `--text-muted`, `--text-faint` |
| Accent | `--accent`, `--accent-hover`, `--accent-soft` (tinted bg), `--on-accent` |
| Status | `--ok`, `--warn`, `--danger` |
| Data | `--heat-0 … --heat-7` (false colour), `--cct-gradient` |
| Type | `--font-ui`, `--font-mono`, sizes `--fs-xs/sm/md/lg/xl` |
| Space | `--sp-1 … --sp-8` (4 px steps) |
| Shape | `--r-sm` 4, `--r-md` 6, `--r-lg` 10, `--shadow` |
| Layout | `--topbar-h` 48, `--statusbar-h` 28, `--panel-w` 304, `--inspector-w` 300, `--control-h` 32, `--icon-btn` 36, `--segment-h` 26, `--chip-h` 24 (the last four grow towards 44 px on touch screens) |
| Motion | `--ease`, `--t-fast` 120 ms, `--t-med` 200 ms, `--t-panel` 250 ms for panels and sheets (all 0 under `prefers-reduced-motion`) |

**Fonts:** a system UI stack by default (`Inter` if installed). Hosts change
`--font-ui` / `--font-mono` to use their own fonts.

**False-colour scale** (`--heat-*`): a perceptually ordered scale, dark
blue → cyan → green → yellow → orange → red → white, mapped on a log scale
from 0 to 2000 lx by default. The legend always shows the scale and the range.

## Layout

The full-app shell is a CSS grid:

```
grid-template-areas:
  "top    top      top"
  "left   viewport right"
  "status status   status";
```

- Side panels collapse to an icon rail. The viewport takes the freed space
  and the renderer resizes through a `ResizeObserver`.
- **< 1200 px**: the library starts collapsed to its rail (landscape tablets).
- **≤ 900 px**: the inspector becomes a sheet over the viewport. It shows only
  its header until something is selected or the header is tapped.
- **≤ 600 px (phones)**: a full-screen viewport, a compact top bar (brand,
  undo/redo, ⋯ menu), and a bottom tab bar (Catálogo, Escena, Propiedades,
  Vista) that opens each panel in a half-height sheet, with a button for full
  height. Selecting a fixture opens Propiedades.
- **Landscape phones** (touch, ≤ 500 px tall): the same pieces, with the tab
  bar as a left rail and sheets sliding in from the right at half width
  (full width on demand).
- **< 600 px**: view-only. Both panels hidden, top bar reduced.

The viewport has an overlay layer for floating controls: render-mode switch
(top centre), view presets (top right), legend and exposure (bottom right),
hints (bottom left). Overlay controls use a translucent surface with
backdrop blur so the scene shows through.

Each part (viewport, panels, inspector) is a component of its own, so
integrators can use the full shell or only the pieces they need.

## Components

These are the visual building blocks. The ones that are elements of their
own carry an `lxs-` name (`<lxs-number-field>`, `<lxs-sheet>`…); the rest are
shared styles in `packages/ui/src/styles.ts` and `field-styles.ts`.

| Component | Notes |
|---|---|
| **Icon button** | 32×32, ghost by default, `aria-pressed` for toggles, tooltip and `aria-label` from a localised string. |
| **Button** | Ghost / primary (accent) / subtle. 32 px tall. |
| **Segmented control** | Mutually exclusive modes (render mode, language, the catalog's Luminaires / Furniture switch). Arrow keys move the selection. |
| **Rail tabs** | Left panel: Catalog · Scene · Analysis. Clicking the active tab collapses the panel. |
| **Switch** | On/off for a setting that applies at once (a checkbox with `role="switch"`, drawn as a sliding knob): label on the left, an optional one-line hint below it. |
| **Field** | Label on top (xs, muted). Input with unit suffix inside (`m`, `lx`, `K`, `%`). ↑/↓ steps, Shift ×10. Accepts the locale's decimal separator. |
| **Slider + value** | For dimming, exposure, CCT. The track shows the value. The CCT track shows a warm→cool gradient. |
| **Swatch** | A surface's colour (a colour picker) or its texture's thumbnail, beside its reflectance slider. |
| **Chip** | A preset to pick with one tap: a colour dot or a texture thumbnail, and a name. `aria-pressed` marks the current one. |
| **Product card** | Thumbnail, name, short spec line (power · CCT · flux). Click to add, drag to place. |
| **Section** | Collapsible group inside panels, uppercase xs heading. |
| **Legend** | Vertical gradient bar with lux ticks. |
| **Status item** | Icon + mono value, separated by hairlines. |
| **Notice** | `<lxs-notice>`, bottom left of the viewport: a line or two of info or error. It rises in, and closes itself after 7 s or with ✕. |
| **Dialog** | A native `<dialog>` (New scene, Help), centred, fading and scaling in. |
| **Sheet** | `<lxs-sheet>`: a panel that slides up over the viewport on phones, with buttons for half or full height and ✕ to close it. |

## Touch

- Under `(pointer: coarse)` the size tokens grow towards 44 px touch targets,
  and hover-only hints are always visible.
- Tap = click (10 px movement allowed). Long press (500 ms) = Shift-click:
  it adds or removes a luminaire or piece of furniture from the selection, in
  3D and in the scene list.
- Dragging products from the catalog is mouse-only; on touch, tap to add.

## States

- **Hover**: `--surface-3` background.
- **Focus**: 2 px accent outline with offset (`:focus-visible` only).
- **Selected**: accent-soft background + accent text/icon. In 3D, an accent
  outline around the fixture.
- **Disabled**: 40 % opacity, no pointer events.
- **Empty states**: a short sentence and one action (e.g. "No luminaires
  yet" with a button that opens the catalog).

## Accessibility

- All controls reachable by keyboard. Panels are landmarks (`aside`, `main`,
  `header`, `footer` roles).
- Contrast ≥ 4.5:1 for text on all surfaces in both themes, which integrator
  token overrides should keep.
- Icon-only buttons always have an accessible label.
- False-colour mode is paired with numeric readouts (probe and legend), so
  colour is never the only carrier of information.
- Respect `prefers-reduced-motion` (transitions off).
