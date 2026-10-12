# 0035. Sample IES files from real manufacturers

- **Status:** Accepted
- **Date:** 2026-10-11
- **Supersedes:** [0014](0014-sample-ies-sources.md)

## Context

The demo has to convince prospects that Lux Studio works with real fixtures
and arbitrary IES files. ADR 0014 limited the demo to three.js's example IES
files to avoid unclear licences and brand names. Those files are few, mostly
symmetric, and not recognisably real products.

## Options

- three.js example files only (ADR 0014)
- Real manufacturer files committed to the demo
- Real files fetched from the manufacturers at runtime or build time

## Decision

The demo ships five unmodified IES files downloaded from manufacturers' public
websites, chosen to cover the photometric cases: a rotationally symmetric
downlight, a narrow track spot, a direct/indirect linear pendant, an
asymmetric wall washer and an up/down wall light. They live in
`apps/demo/public/ies/`, with `SOURCES.md` listing manufacturer, URL and
download date, and the demo's `PhotometryProvider` fetches them by URL, the
way an integration fetches from its backend's download links.

The three.js example files are dropped: the real files cover more cases.

## Consequences

- Licences: none of the manufacturers' sites has terms specific to
  photometric data; all reserve their rights. The owner accepted this for the
  demo. If a manufacturer objects, the file is replaced.
- Brand names appear only inside the files in `apps/demo` and in
  `SOURCES.md`. The UI shows neutral product names, and `packages/` stays
  client-agnostic (ADR 0002).
- Fetching at runtime from the manufacturers was rejected: CORS and dead
  links would break the demo, and the files would be published anyway.
- Unit tests in core keep using hand-made files.
- In production each client uploads its own files to its backend.
