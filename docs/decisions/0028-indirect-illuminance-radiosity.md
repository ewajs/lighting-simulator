# 0028. Illuminance includes inter-reflections (room radiosity)

- **Status:** Accepted
- **Date:** 2026-10-11

## Context

The analysis milestone (M5) computes illuminance on surfaces and work planes. Direct light alone
under-reports typical interiors by roughly 20–40%, because light reflected
off walls and ceilings is a large share of what reaches the work plane. Users
will compare our numbers with DIALux and Relux.

## Options

- A radiosity solve over the room surfaces (patches, a few bounces)
- Direct only, labelled as such
- Direct plus the uniform integrating-sphere estimate the renderer already uses

## Decision

M5 includes a coarse radiosity solve for the room: surfaces split into
patches, form factors between them, and a few bounces using each surface's
reflectance. It runs in a Web Worker together with the direct calculation.

## Consequences

- Results land much closer to professional tools. They are still not certified calculations (SPEC non-goals).
- Rectangular rooms keep the form factors simple. Furniture (added in M3) blocks direct light through the occlusion rays, but at first the radiosity solve treats it as not blocking light between room surfaces. Polygon rooms and full occlusion need a more general approach later.
- The same solution drives the rendered bounce light at the end of M5, replacing the uniform fill.
- M5 grows by roughly one step.
