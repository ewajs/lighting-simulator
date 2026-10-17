// What the analysis worker is asked and answers (ADR 0064), as plain data, and
// the calculation it runs: kept apart from the worker itself so it can be
// tested without one.
// The analysis entry, not the main one: the worker needs no rendering code.
import {
  analyseIlluminance,
  snapshotInputs,
  type AnalysisCache,
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
  | {
      readonly id: number;
      readonly analysis: IlluminanceAnalysis;
      readonly ms: number;
      /** Whether the room's form factors were reused from the calculation before (ADR 0065). */
      readonly roomReused: boolean;
    }
  | { readonly id: number; readonly error: string };

/**
 * Runs a request: what the worker does with each message. The `cache` it
 * keeps between requests makes a change to the light alone several times
 * faster (ADR 0065).
 */
export function runAnalysis(
  request: AnalysisRequest,
  now: () => number,
  cache?: AnalysisCache,
): AnalysisResponse {
  const start = now();
  const hits = cache?.stats.hits ?? 0;
  try {
    const analysis = analyseIlluminance(
      request.scene,
      snapshotInputs(request.snapshot),
      request.settings,
      request.options,
      cache,
    );
    const roomReused = (cache?.stats.hits ?? 0) > hits;
    return { id: request.id, analysis, ms: now() - start, roomReused };
  } catch (error) {
    return { id: request.id, error: error instanceof Error ? error.message : String(error) };
  }
}
