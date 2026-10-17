// The illuminance on a room's calculation surfaces (ADR 0057, 0060): direct
// light from the luminaires, with furniture's shadows, plus the light the room
// reflects, on EN 12464-1 grids, maintained.

import type { Scene } from '../types';
import { roomGrids, type CalcGrid } from './calc-grid';
import { DEFAULT_CALCULATION_OPTIONS, type CalculationOptions } from './options';
import { bounceGeometryKey, type AnalysisCache } from './cache';
import { directIlluminance } from './direct';
import { indirectFromViews, pointViews } from './radiosity';
import { sceneLight, type SceneLight } from './scene-light';
import { boxVisibility } from './visibility';
import { DEFAULT_ANALYSIS_SETTINGS, type AnalysisInputs, type AnalysisSettings } from './settings';
import { illuminanceStats, type IlluminanceStats } from './stats';

/** One surface's grid and the illuminance at each of its points, in lx, in the grid's order. */
export interface SurfaceResult {
  readonly grid: CalcGrid;
  /** Direct plus indirect: what a light meter would read. */
  readonly illuminanceLx: readonly number[];
  readonly directLx: readonly number[];
  readonly indirectLx: readonly number[];
  /** The total's figures; undefined when the grid has no points, e.g. a border wider than the room. */
  readonly stats: IlluminanceStats | undefined;
}

/** The result of an illuminance calculation. */
export interface IlluminanceAnalysis {
  readonly settings: AnalysisSettings;
  readonly options: CalculationOptions;
  /** The work plane first, then the floor, ceiling and walls. */
  readonly surfaces: readonly SurfaceResult[];
  /** Luminaires lit by an estimate, for want of an IES file: their figures are rough. */
  readonly estimatedLuminaires: readonly string[];
  /** Luminaires left out because the catalog doesn't know their product. */
  readonly unknownLuminaires: readonly string[];
  /** How the bounced light was solved: over how many patches, in how many iterations. */
  readonly indirect: { readonly patches: number; readonly iterations: number };
}

/**
 * The illuminance on the work plane and every room surface, direct and
 * bounced, in maintained lux. With a `cache` held between calls, a room
 * calculated before reuses its form factors and grid views (ADR 0065): a
 * change to the light alone is several times faster.
 *
 * @throws RangeError if the settings don't fit the room.
 */
export function analyseIlluminance(
  scene: Scene,
  inputs: AnalysisInputs,
  settings: AnalysisSettings = DEFAULT_ANALYSIS_SETTINGS,
  options: CalculationOptions = DEFAULT_CALCULATION_OPTIONS,
  cache?: AnalysisCache,
): IlluminanceAnalysis {
  const light = sceneLight(scene, inputs, settings, options, cache);
  return analyseSceneLight(scene, light, settings, options, cache);
}

/**
 * `analyseIlluminance` from a scene's light already prepared by `sceneLight`
 * with the same settings and options: for a caller that keeps the light, e.g.
 * to read it at other points afterwards (ADR 0067).
 */
export function analyseSceneLight(
  scene: Scene,
  light: SceneLight,
  settings: AnalysisSettings = DEFAULT_ANALYSIS_SETTINGS,
  options: CalculationOptions = DEFAULT_CALCULATION_OPTIONS,
  cache?: AnalysisCache,
): IlluminanceAnalysis {
  const grids = roomGrids(scene.room, settings.workPlaneHeightM, settings.borderM);
  const { patches, blockers } = light.indirect;
  const key = bounceGeometryKey(scene.room, blockers, options.patchSizeM);
  const surfaces = grids.map((grid): SurfaceResult => {
    const directLx = grid.points.map((point) =>
      directIlluminance(point, grid.normal, light.direct.sources, light.direct.blockers),
    );
    // What each point sees of each patch is the same while the room is: kept in the cache.
    const compute = () => pointViews(grid.points, grid.normal, patches, boxVisibility(blockers));
    const views = cache ? cache.gridViews(key, grid, compute) : compute();
    const indirectLx = grid.points.map((_, k) => indirectFromViews(views, k, light.indirect));
    const illuminanceLx = directLx.map((direct, k) => direct + indirectLx[k]!);
    return {
      grid,
      illuminanceLx,
      directLx,
      indirectLx,
      stats: illuminanceLx.length > 0 ? illuminanceStats(illuminanceLx) : undefined,
    };
  });
  return {
    settings,
    options,
    surfaces,
    estimatedLuminaires: light.direct.estimatedLuminaires,
    unknownLuminaires: light.direct.unknownLuminaires,
    indirect: { patches: light.indirect.patches.length, iterations: light.indirect.iterations },
  };
}
