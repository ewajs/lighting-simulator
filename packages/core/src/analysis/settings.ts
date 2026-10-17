// How an illuminance calculation is set up, and what it needs from the host
// (ADR 0057, 0060).

import type { Catalog, Photometry } from '../types';

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

/**
 * Checks the settings fit a room.
 *
 * @throws RangeError naming what doesn't fit.
 */
export function checkSettings(
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
