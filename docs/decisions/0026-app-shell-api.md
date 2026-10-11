# 0026. App shell API: brand slot, locale event, app-owned view state

- **Status:** Accepted
- **Date:** 2026-10-11

## Context

Step 0.6d adds the top bar, viewport controls, panel collapsing and keyboard
shortcuts. Each needed a decision on what hosts can control and who owns the state.

## Options

- **Viewport controls:** owned by `<lsim-app>` with a separate `<lsim-viewport-controls>` element / built into `<lsim-viewport>`
- **Brand:** a `brand` slot / a text property
- **Language change:** `<lsim-app>` switches and fires `lsim-locale-change` / it only requests and the host switches
- **Panel collapsing:** now / later

## Decision

- `<lsim-app>` owns render mode, exposure, the current view, panel collapse and the theme. `<lsim-viewport-controls>` reports choices as events. `<lsim-viewport>` gains `setView()` and `frame()` methods.
- Hosts put their logo or name in `<lsim-app>`'s `brand` slot.
- The language toggle sets `locale`; after the translations load, `<lsim-app>` fires `lsim-locale-change { locale }` so the host can swap its `catalog` names.
- Panels collapse now: `library-collapsed` and `inspector-collapsed` attributes, set from the top bar or by clicking the active rail tab.
- The theme is the `data-lsim-theme` attribute on `<lsim-app>` (`dark` | `light`), so hosts can also set it in markup.

## Consequences

- `<lsim-viewport>` stays a pure view that hosts can use with their own controls.
- The slot, event and attribute names are public API.
- Keyboard shortcuts are handled by `<lsim-app>` on `window` and ignored while typing in a field.
