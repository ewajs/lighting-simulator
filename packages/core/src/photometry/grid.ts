// Resamples a light distribution onto a regular angle grid, the layout the
// renderer uploads as a texture. All symmetry handling happens here, through
// candelaAt, so the shader only does a plain bilinear lookup. See ADR 0036.

import type { Photometry } from '../types';
import { candelaAt } from './distribution';

/** Vertical resolution, fine enough for spots down to a few degrees. */
export const GRID_VERTICAL_STEP_DEG = 0.5;
/** Horizontal resolution. Asymmetry changes slowly around the circle. */
export const GRID_HORIZONTAL_STEP_DEG = 1;

/** Rows from 0° (nadir) to 180° (zenith) inclusive. */
const GRID_HEIGHT = 180 / GRID_VERTICAL_STEP_DEG + 1;
/** Columns from 0° up to, not including, 360°: the texture wraps around. */
const GRID_WIDTH = 360 / GRID_HORIZONTAL_STEP_DEG;

/** Intensity sampled on a regular grid, relative to the peak. */
export interface CandelaGrid {
  /** Row-major, one row per vertical angle, values 0–1 relative to `peak`. */
  readonly values: Float32Array;
  /** Columns: horizontal angles `i · GRID_HORIZONTAL_STEP_DEG`. */
  readonly width: number;
  /** Rows: vertical angles `j · GRID_VERTICAL_STEP_DEG`. */
  readonly height: number;
  /** Highest intensity on the grid, in cd. */
  readonly peak: number;
}

/** Samples `candelaAt` over the whole sphere and normalises to the peak. */
export function candelaGrid(photometry: Photometry): CandelaGrid {
  const values = new Float32Array(GRID_WIDTH * GRID_HEIGHT);
  let peak = 0;
  for (let row = 0; row < GRID_HEIGHT; row++) {
    for (let column = 0; column < GRID_WIDTH; column++) {
      const value = candelaAt(
        photometry,
        row * GRID_VERTICAL_STEP_DEG,
        column * GRID_HORIZONTAL_STEP_DEG,
      );
      values[row * GRID_WIDTH + column] = value;
      peak = Math.max(peak, value);
    }
  }
  if (peak > 0) for (let i = 0; i < values.length; i++) values[i]! /= peak;
  return { values, width: GRID_WIDTH, height: GRID_HEIGHT, peak };
}
