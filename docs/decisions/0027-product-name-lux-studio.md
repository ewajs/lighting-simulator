# 0027. Product name: Lux Studio

- **Status:** Accepted
- **Date:** 2026-10-11
- **Supersedes:** [0007](0007-placeholder-package-names.md)

## Context

ADR 0007 used the placeholder scope `@lighting-sim/*` and the element prefix
`lsim-` until there was a product name. Names appear in package imports,
custom element tags, events and CSS tokens, which become public API for
integrators.

## Options

- **Name:** Lumora, Candela, Lux Studio, Iluma
- **Prefix:** `lux-`, `luxstudio-`, `lxs-`

## Decision

The product is **Lux Studio**.

| Thing | Name |
|---|---|
| Packages | `@luxstudio/core`, `@luxstudio/ui` (demo: `@luxstudio/demo`) |
| Custom elements | `lxs-` (e.g. `<lxs-app>`, `<lxs-viewport>`) |
| Events | `lxs-` (e.g. `lxs-pick`, `lxs-locale-change`) |
| CSS tokens and theme attribute | `--lxs-*`, `data-lxs-theme` |
| Scene files | `.lux.json` (changed to `.luxstudio.json` by ADR 0051) |

## Consequences

- The rename happens in the Polish step, code and docs together, before M1.
- `lxs-` is short and unlikely to clash with other libraries on a host page; `lux-` was judged too likely to collide.
- The GitHub repository name (`lighting-simulator`) can stay; it isn't public API.
