# 0034. Photometry provider: async IES text, cached in core

- **Status:** Accepted
- **Date:** 2026-10-11

## Context

Real products get their light distribution from IES files that live on the
client's backend, reached through download links. Core never fetches
(ADR 0002), the catalog lookup is synchronous (ADR 0018), and a catalog can
hold hundreds of products, most of which are never placed.

## Options

- Where it plugs in: `Simulator` options, or `Viewport` options
- What it returns: the IES text (core parses), or parsed `Photometry` (host parses)
- When it loads: lazily per product, or everything before the simulator starts
- Product data: a `PhotometryProvider` keyed by product id, or a `photometry`
  field on `Product`

## Decision

`SimulatorOptions.photometry` takes a `PhotometryProvider` with one method,
`load(productId): Promise<string | undefined>`, returning the IES file's text.

- **On `Simulator`**, because the renderer, lux analysis (M5) and the UI all
  need the same data, and analysis runs without a renderer.
- **Text, parsed by core**, so every host gets the same validation and error
  messages, hosts need no IES knowledge, and other formats (EULUMDAT) can be
  added in core later. Decoding the bytes stays with the host.
- **Lazy and cached.** `simulator.photometry(productId)` answers synchronously:
  undefined until the file arrives, which the first call requests.
  `simulator.onPhotometry(listener)` reports each arrival. Each product is
  loaded at most once per simulator.
- **Failures fall back.** A rejected load or an invalid file is reported with
  `console.warn` naming the product and is treated as "no photometry": the
  luminaire keeps the generic flux-and-beam light.

## Consequences

- A product with a file first renders with the generic light, then switches
  when its file arrives.
- Products without a file, or hosts without a provider, behave as before.
- Retrying a failed file needs a new `Simulator`; add a retry when a host needs one.
- When a file is present it is the source of truth for flux and beam angle
  (ADR 0033); the catalog's values are still used for totals and display, so
  hosts should keep them consistent with the file.
