# 0028. Illuminance includes inter-reflections (room radiosity)

- **Status:** Accepted
- **Date:** 2026-10-11

## Context

M2 computes illuminance on surfaces and work planes. Direct light alone
under-reports typical interiors by roughly 20–40%, because light reflected
off walls and ceilings is a large share of what reaches the work plane. Users
will compare our numbers with DIALux and Relux.

## Options

- A radiosity solve over the room surfaces (patches, a few bounces)
- Direct only, labelled as such
- Direct plus the uniform integrating-sphere estimate the renderer already uses

## Decision

M2 includes a coarse radiosity solve for the room: surfaces split into
patches, form factors between them, and a few bounces using each surface's
reflectance. It runs in a Web Worker together with the direct calculation.

## Consequences

- Results land much closer to professional tools. They are still not certified calculations (SPEC non-goals).
- Rectangular rooms keep the form factors simple. Polygon rooms and furniture will need a more general approach later.
- M3 can reuse the radiosity solution to drive the rendered bounce light, replacing the uniform fill.
- M2 grows by roughly one step.
