// The direct illuminance on a room's calculation surfaces (ADR 0057): the
// luminaires as point sources, furniture as shadows, EN 12464-1 grids, and
// a maintenance factor. Inter-reflections come in M5.3.

import { fixtureLayout } from '../fixture-layout';
import { luminaireFrame } from '../luminaire-frame';
import type { Catalog, Photometry, Scene } from '../types';
import { roomGrids, type CalcGrid } from './calc-grid';
import { directIlluminance } from './direct';
import { furnitureBlockers, type Blocker } from './occlusion';
import { distributionOf, luminaireSources, type PointSource } from './sources';
import { illuminanceStats, type IlluminanceStats } from './stats';

/** How a calculation is set up. */
export interface AnalysisSettings {
  /** Height of the work plane above the floor, in m. */
  readonly workPlaneHeightM: number;
  /** The strip along the walls left out of the work plane, in m. */
  readonly borderM: number;
  /**
   * The share of its light an installation keeps by the end of its
   * maintenance cycle, 0–1: lamps age and dim, luminaires and room surfaces
   * gather dirt. Results are maintained values, multiplied by it, as
   * standards set their targets (EN 12464-1, CIE 97).
   */
  readonly maintenanceFactor: number;
}

/**
 * DIALux's defaults for EN 12464-1 work areas: a 0.8 m work plane with a
 * 0.5 m border, and a maintenance factor of 0.8 as their reports commonly show.
 */
export const DEFAULT_ANALYSIS_SETTINGS: AnalysisSettings = {
  workPlaneHeightM: 0.8,
  borderM: 0.5,
  maintenanceFactor: 0.8,
};

/** What a calculation needs besides the scene: the host's data, as the Simulator holds it. */
export interface AnalysisInputs {
  readonly catalog: Catalog;
  /** A product's IES photometry, or undefined if it has none (or it hasn't loaded). */
  readonly photometry: (productId: string) => Photometry | undefined;
  /** A product's model file, for where its light comes from; undefined if it has none. */
  readonly modelFile: (productId: string) => ArrayBuffer | undefined;
}

/** One surface's grid, the illuminance at each point (lx, in the grid's order) and its figures. */
export interface SurfaceResult {
  readonly grid: CalcGrid;
  readonly illuminanceLx: readonly number[];
  /** Undefined when the grid has no points, e.g. a border wider than the room. */
  readonly stats: IlluminanceStats | undefined;
}

/** The result of a direct illuminance calculation. */
export interface DirectAnalysis {
  readonly settings: AnalysisSettings;
  /** The work plane first, then the floor, ceiling and walls. */
  readonly surfaces: readonly SurfaceResult[];
  /** Luminaires lit by an estimate, for want of an IES file: their figures are rough. */
  readonly estimatedLuminaires: readonly string[];
  /** Luminaires left out because the catalog doesn't know their product. */
  readonly unknownLuminaires: readonly string[];
}

/**
 * A scene's light, ready to be read at any point with `directIlluminance`:
 * its luminaires as point sources (maintained, dimmed, split into cells) and
 * its furniture as boxes that cast shadows.
 */
export interface DirectLight {
  readonly sources: readonly PointSource[];
  readonly blockers: readonly Blocker[];
  /** Luminaires lit by an estimate, for want of an IES file: their figures are rough. */
  readonly estimatedLuminaires: readonly string[];
  /** Luminaires left out because the catalog doesn't know their product. */
  readonly unknownLuminaires: readonly string[];
}

/**
 * Prepares a scene's light for `directIlluminance`. Its values are
 * maintained: multiplied by the settings' maintenance factor.
 *
 * @throws RangeError if the settings don't fit the room.
 */
export function directLight(
  scene: Scene,
  inputs: AnalysisInputs,
  settings: AnalysisSettings = DEFAULT_ANALYSIS_SETTINGS,
): DirectLight {
  checkSettings(settings, scene.room.height);
  const estimatedLuminaires: string[] = [];
  const unknownLuminaires: string[] = [];
  const sources: PointSource[] = [];
  for (const luminaire of scene.luminaires) {
    const product = inputs.catalog.get(luminaire.productId);
    if (!product) {
      unknownLuminaires.push(luminaire.id);
      continue;
    }
    const photometry = inputs.photometry(product.id);
    if (!photometry) estimatedLuminaires.push(luminaire.id);
    const layout = fixtureLayout(product, inputs.modelFile(product.id));
    const frame = luminaireFrame(luminaire, product.mount, scene.room, layout);
    const level = luminaire.on ? luminaire.dimming : 0;
    sources.push(
      ...luminaireSources(
        frame,
        distributionOf(product, photometry),
        photometry?.luminousOpening,
        level * settings.maintenanceFactor,
      ),
    );
  }
  const blockers = furnitureBlockers(scene.furniture);
  return { sources, blockers, estimatedLuminaires, unknownLuminaires };
}

/**
 * The direct illuminance on the work plane and every room surface, in
 * maintained lux.
 *
 * @throws RangeError if the settings don't fit the room.
 */
export function analyseDirect(
  scene: Scene,
  inputs: AnalysisInputs,
  settings: AnalysisSettings = DEFAULT_ANALYSIS_SETTINGS,
): DirectAnalysis {
  const { sources, blockers, estimatedLuminaires, unknownLuminaires } = directLight(
    scene,
    inputs,
    settings,
  );
  const grids = roomGrids(scene.room, settings.workPlaneHeightM, settings.borderM);
  const surfaces = grids.map((grid) => {
    const illuminanceLx = grid.points.map((point) =>
      directIlluminance(point, grid.normal, sources, blockers),
    );
    return {
      grid,
      illuminanceLx,
      stats: illuminanceLx.length > 0 ? illuminanceStats(illuminanceLx) : undefined,
    };
  });
  return { settings, surfaces, estimatedLuminaires, unknownLuminaires };
}

function checkSettings(
  { workPlaneHeightM, borderM, maintenanceFactor }: AnalysisSettings,
  roomHeightM: number,
): void {
  if (!(workPlaneHeightM >= 0 && workPlaneHeightM <= roomHeightM)) {
    throw new RangeError(
      `The work plane must be between the floor and the ceiling (0–${roomHeightM} m), got ${workPlaneHeightM} m`,
    );
  }
  if (!(borderM >= 0)) throw new RangeError(`The border can't be negative, got ${borderM} m`);
  if (!(maintenanceFactor > 0 && maintenanceFactor <= 1)) {
    throw new RangeError(
      `The maintenance factor must be above 0 and at most 1, got ${maintenanceFactor}`,
    );
  }
}
