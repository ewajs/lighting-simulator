# 0026. App shell API: brand slot, locale event, app-owned view state

- **Status:** Accepted
- **Date:** 2026-10-11

## Context

Step 0.6d adds the top bar, viewport controls, panel collapsing and keyboard
shortcuts. Each needed a decision on what hosts can control and who owns the state.

## Options

- **Viewport controls:** owned by `<lxs-app>` with a separate `<lxs-viewport-controls>` element / built into `<lxs-viewport>`
- **Brand:** a `brand` slot / a text property
- **Language change:** `<lxs-app>` switches and fires `lxs-locale-change` / it only requests and the host switches
- **Panel collapsing:** now / later

## Decision

- `<lxs-app>` owns render mode, exposure, the current view, panel collapse and the theme. `<lxs-viewport-controls>` reports choices as events. `<lxs-viewport>` gains `setView()` and `frame()` methods.
- Hosts put their logo or name in `<lxs-app>`'s `brand` slot.
- The language toggle sets `locale`; after the translations load, `<lxs-app>` fires `lxs-locale-change { locale }` so the host can swap its `catalog` names.
- Panels collapse now: `library-collapsed` and `inspector-collapsed` attributes, set from the top bar or by clicking the active rail tab.
- The theme is the `data-lxs-theme` attribute on `<lxs-app>` (`dark` | `light`), so hosts can also set it in markup.

## Consequences

- `<lxs-viewport>` stays a pure view that hosts can use with their own controls.
- The slot, event and attribute names are public API.
- Keyboard shortcuts are handled by `<lxs-app>` on `window` and ignored while typing in a field.
