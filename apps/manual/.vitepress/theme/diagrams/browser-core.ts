// The few pieces of Lux Studio's core that the interactive diagrams run in the
// reader's browser, so a diagram computes with the same maths as the app
// rather than a copy of it (ADR 0059, "Interactive diagrams").
//
// Only pure modules belong here: plain functions over plain data, importing
// nothing but other pure modules (no three.js, no DOM). They're imported by
// path, one module at a time, never through core's index, which would pull
// in the renderer.
export { maxGridSpacing, rectangleGrid } from '../../../../../packages/core/src/analysis/calc-grid';
export { pointToPolygon } from '../../../../../packages/core/src/analysis/form-factor';
export type { Vec3 } from '../../../../../packages/core/src/types';
