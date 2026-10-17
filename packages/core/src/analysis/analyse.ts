// The illuminance on a room's calculation surfaces (ADR 0057, 0060): direct
// light from the luminaires, with furniture's shadows, plus the light the room
// reflects, on EN 12464-1 grids, maintained.

import type { Scene } from '../types';
import { roomGrids, type CalcGrid } from './calc-grid';
import { DEFAULT_CALCULATION_OPTIONS, type CalculationOptions } from './options';
import { illuminanceAt, sceneLight } from './scene-light';
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
 * bounced, in maintained lux.
 *
 * @throws RangeError if the settings don't fit the room.
 */
export function analyseIlluminance(
  scene: Scene,
  inputs: AnalysisInputs,
  settings: AnalysisSettings = DEFAULT_ANALYSIS_SETTINGS,
  options: CalculationOptions = DEFAULT_CALCULATION_OPTIONS,
): IlluminanceAnalysis {
  const light = sceneLight(scene, inputs, settings, options);
  const grids = roomGrids(scene.room, settings.workPlaneHeightM, settings.borderM);
  const surfaces = grids.map((grid): SurfaceResult => {
    const values = grid.points.map((point) => illuminanceAt(light, point, grid.normal));
    const illuminanceLx = values.map((value) => value.totalLx);
    return {
      grid,
      illuminanceLx,
      directLx: values.map((value) => value.directLx),
      indirectLx: values.map((value) => value.indirectLx),
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
