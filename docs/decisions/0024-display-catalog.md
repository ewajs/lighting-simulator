# 0024. Display catalog references core product ids

- **Status:** Accepted
- **Date:** 2026-10-11

## Context

The catalog panel needs names, categories and thumbnails. Core's `Product` deliberately holds only simulation data (ADR 0018).

## Options

- A display list whose items reference core product ids
- Display items that embed the whole `Product`
- An async search provider

## Decision

`<lsim-app>` takes a `catalog` property: `{ categories: [{ id, label }], items: [{ productId, name, categoryId, thumbnailUrl? }] }`. Simulation data (power, CCT, flux) is read from the Simulator's core catalog through `productId`.

## Consequences

- Core's catalog stays the single source of simulation data; the host can't make the two disagree on specs.
- Names and labels arrive in the active language; the host replaces the `catalog` property when the locale changes.
- Large server-side catalogs will need an async provider later (a new ADR when a backend arrives).
