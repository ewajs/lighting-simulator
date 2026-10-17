// The point-to-polygon form factor against the textbook formula and against
// brute-force integration of its definition, F = ∫ cos θ₁ cos θ₂ / (π r²) dA.
import { describe, expect, it } from 'vitest';
import type { Vec3 } from '../types';
import { clipToFront, pointToPolygon } from './form-factor';

const UP: Vec3 = { x: 0, y: 1, z: 0 };

/** A rectangle at height `h` over [x0, x1] × [z0, z1], facing down. */
const ceilingRect = (x0: number, x1: number, z0: number, z1: number, h: number): Vec3[] => [
  { x: x0, y: h, z: z0 },
  { x: x1, y: h, z: z0 },
  { x: x1, y: h, z: z1 },
  { x: x0, y: h, z: z1 },
];

/**
 * A small area to a parallel rectangle a × b at distance c, with the normal
 * through one of its corners: F = 1/(2π) · [X/√(1+X²) · atan(Y/√(1+X²)) +
 * Y/√(1+Y²) · atan(X/√(1+Y²))], X = a/c, Y = b/c (Howell's catalogue of
 * configuration factors; Siegel & Howell, "Thermal Radiation Heat Transfer").
 */
function parallelCorner(a: number, b: number, c: number): number {
  const [X, Y] = [a / c, b / c];
  const sx = Math.sqrt(1 + X * X);
  const sy = Math.sqrt(1 + Y * Y);
  return ((X / sx) * Math.atan(Y / sx) + (Y / sy) * Math.atan(X / sy)) / (2 * Math.PI);
}

/** The definition, integrated over a planar rectangle by the midpoint rule on a fine grid. */
function integrated(
  point: Vec3,
  normal: Vec3,
  corner: Vec3,
  u: Vec3,
  v: Vec3,
  uLength: number,
  vLength: number,
  surfaceNormal: Vec3,
): number {
  const steps = 400;
  const cell = (uLength / steps) * (vLength / steps);
  let sum = 0;
  for (let i = 0; i < steps; i++) {
    for (let j = 0; j < steps; j++) {
      const a = ((i + 0.5) / steps) * uLength;
      const b = ((j + 0.5) / steps) * vLength;
      const q = {
        x: corner.x + u.x * a + v.x * b,
        y: corner.y + u.y * a + v.y * b,
        z: corner.z + u.z * a + v.z * b,
      };
      const r = { x: q.x - point.x, y: q.y - point.y, z: q.z - point.z };
      const r2 = r.x * r.x + r.y * r.y + r.z * r.z;
      const len = Math.sqrt(r2);
      const cos1 = (normal.x * r.x + normal.y * r.y + normal.z * r.z) / len;
      const cos2 = -(surfaceNormal.x * r.x + surfaceNormal.y * r.y + surfaceNormal.z * r.z) / len;
      if (cos1 > 0 && cos2 > 0) sum += (cos1 * cos2 * cell) / (Math.PI * r2);
    }
  }
  return sum;
}

describe('pointToPolygon', () => {
  it('matches the catalogue formula below a rectangle’s corner: 1 × 2 m, 1.5 m up', () => {
    const f = pointToPolygon({ x: 0, y: 0, z: 0 }, UP, ceilingRect(0, 1, 0, 2, 1.5));
    expect(f).toBeCloseTo(parallelCorner(1, 2, 1.5), 12);
  });

  it('adds up four corner rectangles below a square’s centre', () => {
    // A 2 × 2 m square 1 m up, seen from below its centre: four 1 × 1 corners.
    const f = pointToPolygon({ x: 0, y: 0, z: 0 }, UP, ceilingRect(-1, 1, -1, 1, 1));
    expect(f).toBeCloseTo(4 * parallelCorner(1, 1, 1), 12);
  });

  it('matches brute-force integration for a wall seen from the floor', () => {
    // A wall x = 2, z ∈ [−1, 1], y ∈ [0, 2.5], facing −x, from a floor point at (0.5, 0, 0.3).
    const point = { x: 0.5, y: 0, z: 0.3 };
    const wall = [
      { x: 2, y: 0, z: -1 },
      { x: 2, y: 0, z: 1 },
      { x: 2, y: 2.5, z: 1 },
      { x: 2, y: 2.5, z: -1 },
    ];
    const expected = integrated(
      point,
      UP,
      wall[0]!,
      { x: 0, y: 0, z: 1 },
      { x: 0, y: 1, z: 0 },
      2,
      2.5,
      { x: -1, y: 0, z: 0 },
    );
    expect(pointToPolygon(point, UP, wall) / expected).toBeCloseTo(1, 4);
  });

  it('matches brute-force integration for a tilted view: a wall seen from another wall', () => {
    const point = { x: -1, y: 1.2, z: 0.4 };
    const normal = { x: 1, y: 0, z: 0 };
    const wall = [
      { x: -1.5, y: 0, z: 2 },
      { x: 1.5, y: 0, z: 2 },
      { x: 1.5, y: 2.7, z: 2 },
      { x: -1.5, y: 2.7, z: 2 },
    ];
    const expected = integrated(
      point,
      normal,
      wall[0]!,
      { x: 1, y: 0, z: 0 },
      { x: 0, y: 1, z: 0 },
      3,
      2.7,
      { x: 0, y: 0, z: -1 },
    );
    expect(pointToPolygon(point, normal, wall) / expected).toBeCloseTo(1, 4);
  });

  it('sees exactly the whole hemisphere from inside a closed box: the factors add up to 1', () => {
    // A 5 × 2.7 × 4 m box; a point on the floor sees the ceiling and four walls.
    const [w, h, d] = [5, 2.7, 4];
    const faces: Vec3[][] = [
      ceilingRect(-w / 2, w / 2, -d / 2, d / 2, h),
      [
        { x: -w / 2, y: 0, z: -d / 2 },
        { x: -w / 2, y: 0, z: d / 2 },
        { x: -w / 2, y: h, z: d / 2 },
        { x: -w / 2, y: h, z: -d / 2 },
      ],
      [
        { x: w / 2, y: 0, z: -d / 2 },
        { x: w / 2, y: 0, z: d / 2 },
        { x: w / 2, y: h, z: d / 2 },
        { x: w / 2, y: h, z: -d / 2 },
      ],
      [
        { x: -w / 2, y: 0, z: -d / 2 },
        { x: w / 2, y: 0, z: -d / 2 },
        { x: w / 2, y: h, z: -d / 2 },
        { x: -w / 2, y: h, z: -d / 2 },
      ],
      [
        { x: -w / 2, y: 0, z: d / 2 },
        { x: w / 2, y: 0, z: d / 2 },
        { x: w / 2, y: h, z: d / 2 },
        { x: -w / 2, y: h, z: d / 2 },
      ],
    ];
    const floorPoint = { x: 0.7, y: 0, z: -1.1 };
    const fromFloor = faces.reduce((sum, face) => sum + pointToPolygon(floorPoint, UP, face), 0);
    expect(fromFloor).toBeCloseTo(1, 12);
    // A point on the work plane, 0.8 m up, sees the ceiling and the walls above it.
    const deskPoint = { x: -1.3, y: 0.8, z: 0.9 };
    const fromDesk = faces.reduce((sum, face) => sum + pointToPolygon(deskPoint, UP, face), 0);
    expect(fromDesk).toBeCloseTo(1, 12);
  });

  it('gives nothing for a polygon behind the point or in its plane', () => {
    expect(pointToPolygon({ x: 0, y: 2, z: 0 }, UP, ceilingRect(-1, 1, -1, 1, 1))).toBe(0);
    expect(pointToPolygon({ x: 5, y: 1, z: 0 }, UP, ceilingRect(-1, 1, -1, 1, 1))).toBe(0);
  });
});

describe('clipToFront', () => {
  it('keeps the part of a wall above a desk-height plane', () => {
    const wall = [
      { x: 2, y: 0, z: -1 },
      { x: 2, y: 0, z: 1 },
      { x: 2, y: 2, z: 1 },
      { x: 2, y: 2, z: -1 },
    ];
    const clipped = clipToFront(wall, { x: 0, y: 0.8, z: 0 }, UP);
    expect(clipped).toHaveLength(4);
    expect(Math.min(...clipped.map((v) => v.y))).toBeCloseTo(0.8, 12);
    expect(Math.max(...clipped.map((v) => v.y))).toBe(2);
  });
});
