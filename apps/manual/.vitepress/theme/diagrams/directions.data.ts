// Data for the interactive diagrams of light in one direction (ADR 0059):
// intensity tables computed by Lux Studio's own core from the demo's real IES
// files, when the manual is built. The browser only looks numbers up in them
// (diagrams/interactive.ts), so it never needs core's photometry or three.js.
import { defineLoader } from 'vitepress';
import { candelaAt, parseIes } from './core';
import { iesText } from './files';
import type { XY } from './light.data';

/** Intensity over a regular grid of directions, as `candelaAtDirection` reads it. */
export interface IntensityGrid {
  /** Step between horizontal angles C, from 0° to 360°, in degrees. */
  readonly stepCDeg: number;
  /** Step between vertical angles γ, from 0° to 180°, in degrees. */
  readonly stepGammaDeg: number;
  /** cd: one row per C, one value per γ. */
  readonly candela: readonly (readonly number[])[];
  readonly peakCd: number;
}

/** Everything the direction diagrams draw. */
export interface DirectionsData {
  /** The demo downlight, the same all round: γ from 0° (straight down) to 90°, cd. */
  readonly downlight: readonly XY[];
  /** The demo wall washer, which leans to one side, in every direction. */
  readonly wallWasher: IntensityGrid;
}

declare const data: DirectionsData;
export { data };

/** Fine enough that straight lines between the values follow the file's own interpolation. */
const DOWNLIGHT_STEP_DEG = 1;
const GRID_STEP_C_DEG = 5;
const GRID_STEP_GAMMA_DEG = 2.5;
/** Tenths of a candela: below what the diagrams can show, and it keeps the page small. */
const round = (cd: number) => Math.round(cd * 10) / 10;

export default defineLoader({
  load(): DirectionsData {
    const downlight = parseIes(iesText('downlight'));
    const wallWasher = parseIes(iesText('wallWasher'));
    const profile: XY[] = [];
    for (let gamma = 0; gamma <= 90; gamma += DOWNLIGHT_STEP_DEG)
      profile.push([gamma, round(candelaAt(downlight, gamma, 0))]);
    const candela: number[][] = [];
    for (let c = 0; c <= 360; c += GRID_STEP_C_DEG) {
      const row: number[] = [];
      for (let gamma = 0; gamma <= 180; gamma += GRID_STEP_GAMMA_DEG)
        row.push(round(candelaAt(wallWasher, gamma, c)));
      candela.push(row);
    }
    return {
      downlight: profile,
      wallWasher: {
        stepCDeg: GRID_STEP_C_DEG,
        stepGammaDeg: GRID_STEP_GAMMA_DEG,
        candela,
        peakCd: Math.max(...candela.flat()),
      },
    };
  },
});
