// What the analysis worker is asked and answers (ADRs 0064, 0067), as plain
// data, and the service that answers: kept apart from the worker itself so it
// can be tested without one.
// The analysis entry, not the main one: the worker needs no rendering code.
import {
  AnalysisCache,
  analyseSceneLight,
  illuminanceAt,
  sceneLight,
  snapshotInputs,
  type AnalysisSettings,
  type AnalysisSnapshot,
  type CalculationOptions,
  type IlluminanceAnalysis,
  type PointIlluminance,
  type SceneLight,
} from '@luxstudio/core/analysis';
import type { Scene, Vec3 } from '@luxstudio/core';

/** One calculation to run. */
export interface AnalysisRequest {
  readonly type: 'analyse';
  /** Increases with every request, so a late answer to an old one can be told apart. */
  readonly id: number;
  readonly scene: Scene;
  readonly snapshot: AnalysisSnapshot;
  readonly settings: AnalysisSettings;
  readonly options: CalculationOptions;
}

/** The light at one point, from the last calculation: the lux probe. */
export interface ProbeRequest {
  readonly type: 'probe';
  readonly id: number;
  readonly point: Vec3;
  /** The way the surface at the point faces: a unit vector. */
  readonly normal: Vec3;
}

/** The answer to a calculation: the analysis and how long it took, or why it failed. */
export type AnalysisResponse =
  | {
      readonly type: 'analyse';
      readonly id: number;
      readonly analysis: IlluminanceAnalysis;
      readonly ms: number;
      /** Whether the room's form factors were reused from the calculation before (ADR 0065). */
      readonly roomReused: boolean;
    }
  | { readonly type: 'analyse'; readonly id: number; readonly error: string };

/** The answer to a probe: the light there, or nothing before any calculation. */
export interface ProbeResponse {
  readonly type: 'probe';
  readonly id: number;
  readonly illuminance: PointIlluminance | undefined;
}

/**
 * What the worker does with each message: calculates, keeping the room's
 * work for the next calculation (ADR 0065) and the scene's light for probes
 * (ADR 0067).
 */
export class AnalysisService {
  readonly #cache = new AnalysisCache();
  #light: SceneLight | undefined;

  /** Calculates a request, timing it with `now`. */
  analyse(request: AnalysisRequest, now: () => number): AnalysisResponse {
    const start = now();
    const hits = this.#cache.stats.hits;
    try {
      const { scene, settings, options } = request;
      const light = sceneLight(
        scene,
        snapshotInputs(request.snapshot),
        settings,
        options,
        this.#cache,
      );
      const analysis = analyseSceneLight(scene, light, settings, options, this.#cache);
      this.#light = light;
      const roomReused = this.#cache.stats.hits > hits;
      return { type: 'analyse', id: request.id, analysis, ms: now() - start, roomReused };
    } catch (error) {
      return {
        type: 'analyse',
        id: request.id,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /** The light at a point, from the last calculation. */
  probe(request: ProbeRequest): ProbeResponse {
    const light = this.#light;
    return {
      type: 'probe',
      id: request.id,
      illuminance: light && illuminanceAt(light, request.point, request.normal),
    };
  }
}
