// The illuminance calculation on its own (ADR 0064): what a Web Worker
// imports, without the rendering the main entry brings with it.
export { analyseIlluminance } from './analyse';
export type { IlluminanceAnalysis, SurfaceResult } from './analyse';
export { snapshotInputs } from './snapshot';
export type { AnalysisSnapshot } from './snapshot';
export type { AnalysisSettings } from './settings';
export type { CalculationOptions } from './options';
