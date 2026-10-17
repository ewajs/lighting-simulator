// Lux Studio's core, for the diagrams' data loaders (ADR 0059). Loaders are
// bundled by esbuild and run in Node at build time. Imported by package name,
// esbuild would leave core to Node, which can't load its TypeScript source;
// by path, esbuild bundles it. Nothing here reaches the reader's browser.
export * from '../../../../../packages/core/src/index';
// Not in core's public API, but the plan of a reference room must point where
// the calculation does: the same function, by path.
export { aimDirection } from '../../../../../packages/core/src/aim';
