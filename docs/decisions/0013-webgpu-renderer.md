# 0013. WebGPURenderer with WebGL 2 fallback

- **Status:** Accepted
- **Date:** 2026-10-11

## Context

three.js has two renderers. The prototype used `WebGPURenderer` without that choice being discussed.

## Options

- `WebGPURenderer` (from `three/webgpu`), which falls back to WebGL 2 automatically
- `WebGLRenderer`
- Our own abstraction over both

## Decision

Use `WebGPURenderer` from `three/webgpu`. It falls back to a WebGL 2 backend when WebGPU is unavailable.

## Consequences

- `IESSpotLight` and TSL node materials are only available here, and we need them for IES profiles and the false-colour shader.
- The API is younger and changes more between three.js releases, so pin the three.js version and upgrade on purpose.
- Some three.js features that only exist in WebGL (e.g. `PCFSoftShadowMap`) are not available. Use the WebGPU equivalents.
- No renderer abstraction of our own (see the simplicity standards in CLAUDE.md).
