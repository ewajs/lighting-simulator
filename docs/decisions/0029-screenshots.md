# 0029. Screenshots: core capture, cancelable UI event, neutral file name

- **Status:** Accepted
- **Date:** 2026-10-11

## Context

Saving a PNG of the scene is a P0 feature (SPEC §4.5). The UI ships inside
clients' own products, which may want to handle the image themselves (for
example upload it to their backend) and won't want our brand in file names.

## Options

- **Delivery:** download plus a cancelable event / event only / download only
- **Selection outline:** hidden in captures / kept
- **File name:** product-branded / neutral

## Decision

- Core: `Viewport.screenshot({ background? })` returns a PNG `Blob` of the next frame at canvas resolution, without highlight outlines, composited onto `background`.
- UI: the top bar's camera button makes `<lxs-app>` fire a cancelable `lxs-screenshot` event (`{ png, fileName }`). If no listener calls `preventDefault()`, the browser downloads the file.
- The file name is neutral and translated: `escena-YYYY-MM-DD-HHmm.png` in es-AR, `scene-…` in en.

## Consequences

- Works with no host code, and hosts can take over completely.
- Captures show the lighting, not editing aids.
- Only the 3D canvas is captured; the UI overlays are not part of the image.
