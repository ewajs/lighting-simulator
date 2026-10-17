// A measured surface laid flat (ADR 0062): each point's position on a 2D map
// of the surface, as the room's plan and its walls' elevations draw them.
import type { SurfaceComparison } from './types';

/** A point on a surface's map, in m: u to the right, v down the page. */
export interface MapPoint {
  readonly u: number;
  readonly v: number;
}

/**
 * Where each point of a surface sits on its map. Floors, ceilings and the
 * work plane are seen from above, like the room's plan (x right, z down);
 * walls are seen face on, with height up (so v = −y).
 */
export function mapPoints(surface: SurfaceComparison): MapPoint[] {
  const { normal } = surface;
  return surface.points.map(([x, y, z]) => {
    if (Math.abs(normal.y) > 0.5) return { u: x, v: z };
    if (Math.abs(normal.x) > 0.5) return { u: z, v: -y };
    return { u: x, v: -y };
  });
}

/** The spacing of a regular grid of values: the smallest gap between two of them, or `fallback`. */
export function gridStep(values: readonly number[], fallback = 0.25): number {
  const sorted = [...new Set(values.map((value) => value.toFixed(3)))]
    .map(Number)
    .sort((a, b) => a - b);
  let step = Number.POSITIVE_INFINITY;
  for (let k = 1; k < sorted.length; k++) step = Math.min(step, sorted[k]! - sorted[k - 1]!);
  return Number.isFinite(step) ? step : fallback;
}

/** The area a surface's grid covers, cell edges included, in its map's m. */
export function mapExtent(points: readonly MapPoint[]): {
  u0: number;
  u1: number;
  v0: number;
  v1: number;
  du: number;
  dv: number;
} {
  const du = gridStep(points.map((p) => p.u));
  const dv = gridStep(points.map((p) => p.v));
  const us = points.map((p) => p.u);
  const vs = points.map((p) => p.v);
  return {
    u0: Math.min(...us) - du / 2,
    u1: Math.max(...us) + du / 2,
    v0: Math.min(...vs) - dv / 2,
    v1: Math.max(...vs) + dv / 2,
    du,
    dv,
  };
}
