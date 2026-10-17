// How much of a surface a point sees: the form factor from a small area at a
// point to a flat polygon, the share of the light leaving that small area (or
// arriving at it from a uniformly bright polygon) that the polygon accounts
// for (ADR 0060). Lambert's exact contour integral for a small area and a
// polygon (see Cohen & Wallace, "Radiosity and Realistic Image Synthesis",
// 1993, on form factors):
//
//   F = 1/(2π) · Σ_k β_k · n · (r_k × r_k+1) / |r_k × r_k+1|
//
// over the polygon's edges, where r_k runs from the point to vertex k, β_k is
// the angle between r_k and r_k+1, and n is the point's unit normal. It holds
// for a polygon wholly in front of the point, so the polygon is first clipped
// to the point's front half-space.

import type { Vec3 } from '../types';

/** Closer than this to the point's plane, in m, a vertex counts as in it, so in nothing's way. */
const PLANE_EPSILON_M = 1e-9;

/**
 * The form factor from a point facing `normal` (a unit vector) to a flat,
 * convex polygon: 0 to 1, the share of a full hemisphere's view, weighted by
 * the cosine, that the polygon fills. 0 for a polygon wholly behind the point
 * or in its plane.
 */
export function pointToPolygon(point: Vec3, normal: Vec3, vertices: readonly Vec3[]): number {
  const visible = clipToFront(vertices, point, normal);
  const n = visible.length;
  if (n < 3) return 0;
  // Written with plain numbers: this runs millions of times per calculation
  // (measured: most of its time, before; `npm run bench -w packages/core`).
  let sum = 0;
  for (let k = 0; k < n; k++) {
    const p = visible[k]!;
    const q = visible[(k + 1) % n]!;
    const ax = p.x - point.x;
    const ay = p.y - point.y;
    const az = p.z - point.z;
    const bx = q.x - point.x;
    const by = q.y - point.y;
    const bz = q.z - point.z;
    // a × b, its length (the sine's), and a · b (the cosine's).
    const cx = ay * bz - az * by;
    const cy = az * bx - ax * bz;
    const cz = ax * by - ay * bx;
    const sine = Math.sqrt(cx * cx + cy * cy + cz * cz);
    if (sine === 0) continue; // The edge points straight at the point: it adds nothing.
    const angle = Math.atan2(sine, ax * bx + ay * by + az * bz);
    sum += (angle * (normal.x * cx + normal.y * cy + normal.z * cz)) / sine;
  }
  // The sign only says which way round the vertices go.
  return Math.abs(sum) / (2 * Math.PI);
}

/**
 * The part of a convex polygon in front of the plane through `point` facing
 * `normal` (Sutherland–Hodgman clipping against one plane).
 */
export function clipToFront(vertices: readonly Vec3[], point: Vec3, normal: Vec3): Vec3[] {
  const height = (v: Vec3) =>
    (v.x - point.x) * normal.x + (v.y - point.y) * normal.y + (v.z - point.z) * normal.z;
  const inFront = (h: number) => h > PLANE_EPSILON_M;
  if (vertices.every((v) => inFront(height(v)))) return vertices as Vec3[];
  const clipped: Vec3[] = [];
  for (let k = 0; k < vertices.length; k++) {
    const a = vertices[k]!;
    const b = vertices[(k + 1) % vertices.length]!;
    const ha = height(a);
    const hb = height(b);
    if (inFront(ha)) clipped.push(a);
    if (inFront(ha) !== inFront(hb)) {
      const t = ha / (ha - hb);
      clipped.push({
        x: a.x + (b.x - a.x) * t,
        y: a.y + (b.y - a.y) * t,
        z: a.z + (b.z - a.z) * t,
      });
    }
  }
  return clipped;
}
