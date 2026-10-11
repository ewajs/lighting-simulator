# Front-end Design System

The UI is a **quiet frame around the light**. A lighting tool is judged by its
viewport, so the chrome is neutral and low-contrast and gets out of the way.
Colour is kept for state (selection, focus) and data (the false-colour scale).

## Principles

1. **Dark by default.** A dark frame doesn't compete with the rendered scene
   and doesn't bias how bright the scene looks. A light theme exists for
   print/screenshots and user preference (`data-theme="light"`).
2. **One accent.** A warm amber (light-coloured, "2700 K") marks selection,
   focus and primary actions. Nothing else is saturated except data.
3. **Dense but calm.** It's a professional tool: 13 px base text, 32 px
   controls, 8 px grid, and hairline separators instead of boxes.
4. **Numbers are first-class.** Tabular figures, units always shown
   (`2.70 m`, `450 lx`, `3000 K`), monospace for live readouts.
5. **Nothing moves without reason.** 120–200 ms ease-out transitions on
   panels and hovers only. No decorative animation.

## Tokens

All tokens live in `src/styles/tokens.css` as CSS custom properties. Components
use only tokens, never raw values.

| Group | Tokens |
|---|---|
| Surfaces | `--bg` (app), `--surface-1` (panels), `--surface-2` (fields, cards), `--surface-3` (hover) |
| Lines | `--line` (hairline), `--line-strong` (field borders) |
| Text | `--text`, `--text-muted`, `--text-faint` |
| Accent | `--accent`, `--accent-hover`, `--accent-soft` (tinted bg), `--on-accent` |
| Status | `--ok`, `--warn`, `--danger` |
| Type | `--font-ui`, `--font-mono`, sizes `--fs-xs/sm/md/lg/xl` |
| Space | `--sp-1 … --sp-8` (4 px steps up to 8, then 8 px) |
| Shape | `--r-sm` 4, `--r-md` 6, `--r-lg` 10 |
| Layout | `--topbar-h` 48, `--statusbar-h` 28, `--panel-w` 280, `--inspector-w` 300 |

**Fonts:** system UI stack (`Inter` if installed). Replace with brand
fonts (DIN Next for UI/numbers, Simplifica for the logo only) by changing
`--font-ui`, once the licence for web embedding is confirmed.

**False-colour scale** (`--heat-0 … --heat-6`): a perceptually ordered
scale, dark blue → cyan → green → yellow → orange → red → white, mapped on a
log scale from 0 to 2000 lx by default. The legend always shows the scale and
the range.

## Layout

CSS grid app shell (`src/styles/layout.css`):

```
grid-template-areas:
  "top    top      top"
  "left   viewport right"
  "status status   status";
```

- Side panels collapse to an icon rail (`data-left="collapsed"` on the
  shell). The viewport takes the freed space and the renderer resizes through
  a `ResizeObserver`.
- **< 900 px**: the inspector becomes a bottom sheet over the viewport.
- **< 600 px**: view-only. Both panels hidden, top bar reduced.

The viewport has its own overlay layer (`.viewport-overlay`) for floating
controls: render-mode switch (top-centre), view presets (top-right),
legend and exposure (bottom-right), hints (bottom-left). Overlay controls use
a translucent surface with backdrop blur so the scene shows through.

## Components

| Component | Notes |
|---|---|
| **Icon button** | 32×32, ghost by default, `aria-pressed` for toggles, tooltip from `title`. |
| **Button** | `.btn` ghost / `.btn--primary` (accent) / `.btn--subtle`. 32 px tall. |
| **Segmented control** | Mutually exclusive modes (render mode, units). Keyboard arrows move selection. |
| **Tabs** | Left panel: Catalog · Room · Scene. Underline indicator in accent. |
| **Field** | Label on top (xs, muted). Input with unit suffix inside (`m`, `lx`, `K`, `%`). Number inputs accept arrow keys (±0.1, Shift ±1). |
| **Slider + value** | For dimming, exposure, CCT. Track shows the value. CCT track shows a warm→cool gradient. |
| **Swatch** | Surface colour + reflectance. |
| **Product card** | Thumbnail, name, short spec line (`10 W · 3000 K · 900 lm`). Draggable. Hover shows "drag to place". |
| **Section** | Collapsible group inside panels, uppercase xs heading. |
| **Legend** | Vertical gradient bar with lux ticks. |
| **Status item** | Icon + mono value, separated by hairlines. |

## States

- **Hover**: `--surface-3` background.
- **Focus**: 2 px accent outline with offset (`:focus-visible` only).
- **Selected**: accent-soft background + accent text/icon. In 3D, an accent
  outline on the fixture plus a halo marker on the light.
- **Disabled**: 40 % opacity, no pointer events.
- **Empty states**: a short sentence and one action ("No luminaires yet. Drag
  one from the catalog.").

## Accessibility

- All controls reachable by keyboard; panels are landmarks (`<aside>`,
  `<main>`, `<header>`, `<footer>`).
- Contrast ≥ 4.5:1 for text on all surfaces in both themes.
- Icon-only buttons always have `aria-label`.
- False-colour mode is paired with numeric readouts (probe and legend), so
  colour is never the only carrier of information.
- Respect `prefers-reduced-motion` (transitions off).
