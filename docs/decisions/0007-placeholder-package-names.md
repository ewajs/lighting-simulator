# 0007. Placeholder package names

- **Status:** Superseded by [0027](0027-product-name-lux-studio.md)
- **Date:** 2026-10-11

## Context

There is no product name yet.

## Options

- Neutral placeholder now, brand later
- Keep "lighting-simulator" as final
- Pick a product name now

## Decision

Use the placeholder scope `@lighting-sim/*` (`@lighting-sim/core`, `@lighting-sim/ui`) until a product name is chosen.

## Consequences

- Renaming is cheap until something is published to npm, so rename before the first publish.
- The custom element prefix is decided with the product name.
