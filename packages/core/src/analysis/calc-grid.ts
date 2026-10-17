// Where illuminance is calculated: a grid of points on each surface, spaced
// as EN 12464-1 asks so that minimum and average values are comparable with
// other tools (ADR 0057).

import { add, scale } from '../math';
import type { Room, Vec3 } from '../types';

/**
 * The calculation surfaces: the work plane, then the room's six surfaces.
 * Walls are named by the side of the room they're on: `-x` at x = −width/2,
 * `+z` at z = +depth/2, and so on.
 */
export type CalcSurfaceName =
  'work-plane' | 'floor' | 'ceiling' | 'wall-x-' | 'wall-x+' | 'wall-z-' | 'wall-z+';

/**
 * The rectangle a grid covers: `corner` plus up to `lengthU` along the unit
 * vector `u` and `lengthV` along `v`. Its points run along `u` within a row,
 * rows along `v`.
 */
export interface GridRect {
  readonly corner: Vec3;
  readonly u: Vec3;
  readonly v: Vec3;
  readonly lengthU: number;
  readonly lengthV: number;
}

/** Points to calculate on a flat rectangle, in rows of `columns`, at the centres of equal cells. */
export interface CalcGrid {
  readonly surface: CalcSurfaceName;
  /** The area the cells cover, the border left out: for drawing the results (ADR 0066). */
  readonly rect: GridRect;
  readonly points: readonly Vec3[];
  /** The way the surface faces, into the room: a unit vector. */
  readonly normal: Vec3;
  readonly columns: number;
  readonly rows: number;
  /** Each cell's area, in m². */
  readonly cellArea: number;
}

/** The longest gap allowed between grid points by EN 12464-1, in m. */
const MAX_SPACING_M = 10;

/**
 * The largest spacing between calculation points for a surface whose longer
 * side is `lengthM`: p = 0.2 · 5^log₁₀(d) m, at most 10 m, from EN 12464-1's
 * rules for calculation grids (summarised in Fagerhult's EN 12464-1 guide,
 * fagerhult.com/knowledge/light-planning/en-12464-1). 1 m gives 0.2 m, 10 m
 * gives 1 m.
 */
export function maxGridSpacing(lengthM: number): number {
  return Math.min(MAX_SPACING_M, 0.2 * Math.pow(5, Math.log10(lengthM)));
}

/**
 * A grid over a rectangle: `corner` plus up to `lengthU` along the unit
 * vector `u` and `lengthV` along `v`, shrunk by `borderM` on every side.
 * Points sit at the centres of equal cells, at most `maxGridSpacing` apart
 * along each side (rounded up), so cells stay close to square. None when the
 * border leaves no area.
 */
export function rectangleGrid(
  surface: CalcSurfaceName,
  corner: Vec3,
  u: Vec3,
  v: Vec3,
  lengthU: number,
  lengthV: number,
  normal: Vec3,
  borderM = 0,
): CalcGrid {
  const sizeU = lengthU - 2 * borderM;
  const sizeV = lengthV - 2 * borderM;
  const rect: GridRect = {
    corner: add(corner, add(scale(u, borderM), scale(v, borderM))),
    u,
    v,
    lengthU: Math.max(0, sizeU),
    lengthV: Math.max(0, sizeV),
  };
  if (sizeU <= 0 || sizeV <= 0)
    return { surface, rect, points: [], normal, columns: 0, rows: 0, cellArea: 0 };
  const spacing = maxGridSpacing(Math.max(sizeU, sizeV));
  const columns = Math.ceil(sizeU / spacing);
  const rows = Math.ceil(sizeV / spacing);
  const points: Vec3[] = [];
  for (let row = 0; row < rows; row++) {
    const along = borderM + ((row + 0.5) / rows) * sizeV;
    for (let column = 0; column < columns; column++) {
      const across = borderM + ((column + 0.5) / columns) * sizeU;
      points.push(add(corner, add(scale(u, across), scale(v, along))));
    }
  }
  return {
    surface,
    rect,
    points,
    normal,
    columns,
    rows,
    cellArea: (sizeU / columns) * (sizeV / rows),
  };
}

/**
 * The grids for a room: the work plane at `workPlaneHeightM`, with `borderM`
 * left out along the walls, and the room's six surfaces in full.
 */
export function roomGrids(room: Room, workPlaneHeightM: number, borderM: number): CalcGrid[] {
  const { width, depth, height } = room;
  const [x0, z0] = [-width / 2, -depth / 2];
  const X = { x: 1, y: 0, z: 0 };
  const Y = { x: 0, y: 1, z: 0 };
  const Z = { x: 0, y: 0, z: 1 };
  const flip = (n: Vec3) => scale(n, -1);
  return [
    rectangleGrid(
      'work-plane',
      { x: x0, y: workPlaneHeightM, z: z0 },
      X,
      Z,
      width,
      depth,
      Y,
      borderM,
    ),
    rectangleGrid('floor', { x: x0, y: 0, z: z0 }, X, Z, width, depth, Y),
    rectangleGrid('ceiling', { x: x0, y: height, z: z0 }, X, Z, width, depth, flip(Y)),
    rectangleGrid('wall-x-', { x: x0, y: 0, z: z0 }, Z, Y, depth, height, X),
    rectangleGrid('wall-x+', { x: -x0, y: 0, z: z0 }, Z, Y, depth, height, flip(X)),
    rectangleGrid('wall-z-', { x: x0, y: 0, z: z0 }, X, Y, width, height, Z),
    rectangleGrid('wall-z+', { x: x0, y: 0, z: -z0 }, X, Y, width, height, flip(Z)),
  ];
}
