// Data for the Concepts pages on the work plane, uniformity and maintenance
// (ADR 0059): computed by Lux Studio's own core with the demo's real
// downlight, when the manual is built: direct and bounced light (ADR 0060).
import { defineLoader } from 'vitepress';
import {
  analyseIlluminance,
  DEFAULT_ANALYSIS_SETTINGS,
  illuminanceAt,
  maxGridSpacing,
  sceneLight,
  parseIes,
  type AnalysisInputs,
  type Luminaire,
  type Photometry,
  type Product,
  type Room,
} from './core';
import { iesText } from './files';
import type { XY } from './light.data';

/** An illuminance map of a room's work plane, and its EN 12464-1 figures. */
export interface RoomMap {
  /** Where the downlights are: x and z in m, the room's centre at 0. */
  readonly luminaires: readonly XY[];
  /** Lux on a fine grid for drawing: rows from z = −depth/2, columns from x = −width/2. */
  readonly values: readonly (readonly number[])[];
  readonly stepM: number;
  /** From the standard's grid, inside the border, as Lux Studio reports them. */
  readonly averageLx: number;
  readonly minLx: number;
  readonly maxLx: number;
  readonly uniformity: number;
}

/** Everything the room pages draw. */
export interface RoomsData {
  readonly room: { readonly widthM: number; readonly depthM: number; readonly heightM: number };
  readonly workPlaneM: number;
  readonly borderM: number;
  /** The work plane's grid points (x, z), at the standard's spacing. */
  readonly gridPoints: readonly XY[];
  readonly gridSpacingM: number;
  /** The standard's largest spacing for a longer side of d metres: d, p. */
  readonly spacingRule: readonly XY[];
  /** Four downlights spread out, then the same four bunched in the middle. */
  readonly spread: RoomMap;
  readonly bunched: RoomMap;
  /** The spread room's average as installed, then maintained (MF 0.8). */
  readonly newAverageLx: number;
  readonly maintainedAverageLx: number;
}

declare const data: RoomsData;
export { data };

const ROOM: Room = {
  width: 5,
  depth: 4,
  height: 2.7,
  surfaces: {
    floor: { color: '#808080', reflectance: 0.3 },
    walls: { color: '#f0f0f0', reflectance: 0.7 },
    ceiling: { color: '#f8f8f8', reflectance: 0.8 },
  },
};
/** Fine enough for a smooth map. */
const MAP_STEP_M = 0.1;
const AS_INSTALLED = { ...DEFAULT_ANALYSIS_SETTINGS, maintenanceFactor: 1 };

export default defineLoader({
  load(): RoomsData {
    const photometry = parseIes(iesText('downlight'));
    const empty = analyseIlluminance(
      { room: ROOM, luminaires: [], furniture: [] },
      inputs(photometry),
    );
    const grid = empty.surfaces[0]!.grid;
    const spread = roomMap(photometry, [
      [-1.25, -1],
      [1.25, -1],
      [-1.25, 1],
      [1.25, 1],
    ]);
    const bunched = roomMap(photometry, [
      [-0.4, -0.4],
      [0.4, -0.4],
      [-0.4, 0.4],
      [0.4, 0.4],
    ]);
    const scene = { room: ROOM, luminaires: downlights(spread.luminaires), furniture: [] };
    const maintained = analyseIlluminance(scene, inputs(photometry), DEFAULT_ANALYSIS_SETTINGS);
    const spacingRule: XY[] = [];
    for (let d = 1; d <= 30; d += 0.5) spacingRule.push([d, maxGridSpacing(d)]);
    return {
      room: { widthM: ROOM.width, depthM: ROOM.depth, heightM: ROOM.height },
      workPlaneM: DEFAULT_ANALYSIS_SETTINGS.workPlaneHeightM,
      borderM: DEFAULT_ANALYSIS_SETTINGS.borderM,
      gridPoints: grid.points.map(({ x, z }) => [x, z]),
      gridSpacingM: Math.sqrt(grid.cellArea),
      spacingRule,
      spread,
      bunched,
      newAverageLx: spread.averageLx,
      maintainedAverageLx: maintained.surfaces[0]!.stats!.averageLx,
    };
  },
});

function inputs(photometry: Photometry): AnalysisInputs {
  const product: Product = {
    id: 'downlight',
    mount: 'recessed',
    power: 15.8,
    flux: 1153,
    cct: 3000,
    beamDeg: 62,
  };
  return {
    catalog: { get: () => product },
    photometry: () => photometry,
    modelFile: () => undefined,
  };
}

function downlights(at: readonly XY[]): Luminaire[] {
  return at.map(([x, z], i) => ({
    id: `l${i}`,
    productId: 'downlight',
    position: { x, y: ROOM.height, z },
    aim: { tiltDeg: 0, panDeg: 0 },
    dimming: 1,
    on: true,
    cct: 3000,
  }));
}

function roomMap(photometry: Photometry, at: XY[]): RoomMap {
  const scene = { room: ROOM, luminaires: downlights(at), furniture: [] };
  const stats = analyseIlluminance(scene, inputs(photometry), AS_INSTALLED).surfaces[0]!.stats!;
  const light = sceneLight(scene, inputs(photometry), AS_INSTALLED);
  const values: number[][] = [];
  for (let z = -ROOM.depth / 2 + MAP_STEP_M / 2; z < ROOM.depth / 2; z += MAP_STEP_M) {
    const row: number[] = [];
    for (let x = -ROOM.width / 2 + MAP_STEP_M / 2; x < ROOM.width / 2; x += MAP_STEP_M) {
      const point = { x, y: DEFAULT_ANALYSIS_SETTINGS.workPlaneHeightM, z };
      row.push(illuminanceAt(light, point, { x: 0, y: 1, z: 0 }).totalLx);
    }
    values.push(row);
  }
  return {
    luminaires: at,
    values,
    stepM: MAP_STEP_M,
    averageLx: stats.averageLx,
    minLx: stats.minLx,
    maxLx: stats.maxLx,
    uniformity: stats.uniformity,
  };
}
