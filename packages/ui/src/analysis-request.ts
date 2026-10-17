// What the analysis worker is asked and answers (ADR 0064), as plain data, and
// the calculation it runs: kept apart from the worker itself so it can be
// tested without one.
// The analysis entry, not the main one: the worker needs no rendering code.
import {
  analyseIlluminance,
  snapshotInputs,
  type AnalysisSettings,
  type AnalysisSnapshot,
  type CalculationOptions,
  type IlluminanceAnalysis,
} from '@luxstudio/core/analysis';
import type { Scene } from '@luxstudio/core';

/** One calculation to run. */
export interface AnalysisRequest {
  /** Increases with every request, so a late answer to an old one can be told apart. */
  readonly id: number;
  readonly scene: Scene;
  readonly snapshot: AnalysisSnapshot;
  readonly settings: AnalysisSettings;
  readonly options: CalculationOptions;
}

/** The answer: the analysis and how long it took, or why it failed. */
export type AnalysisResponse =
  | { readonly id: number; readonly analysis: IlluminanceAnalysis; readonly ms: number }
  | { readonly id: number; readonly error: string };

/** Runs a request: what the worker does with each message. */
export function runAnalysis(request: AnalysisRequest, now: () => number): AnalysisResponse {
  const start = now();
  try {
    const analysis = analyseIlluminance(
      request.scene,
      snapshotInputs(request.snapshot),
      request.settings,
      request.options,
    );
    return { id: request.id, analysis, ms: now() - start };
  } catch (error) {
    return { id: request.id, error: error instanceof Error ? error.message : String(error) };
  }
}
