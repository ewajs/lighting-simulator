import { describe, expect, it } from 'vitest';
import { room } from '../test-fixtures';
import { maxGridSpacing, rectangleGrid, roomGrids } from './calc-grid';

/**
 * EN 12464-1's grid table as Fagerhult's guide restates it: the longer side
 * d, a rounded maximum spacing, and the fewest points along that side.
 */
const EN_12464_TABLE = [
  { d: 1, p: 0.2, points: 5 },
  { d: 2, p: 0.3, points: 6 },
  { d: 5, p: 0.6, points: 8 },
  { d: 10, p: 1, points: 10 },
  { d: 25, p: 2, points: 12 },
  { d: 50, p: 3, points: 17 },
  { d: 100, p: 5, points: 20 },
];

describe('maxGridSpacing', () => {
  it('is 0.2 · 5^log₁₀(d): exactly 0.2, 1 and 5 m at 1, 10 and 100 m', () => {
    expect(maxGridSpacing(1)).toBeCloseTo(0.2, 12);
    expect(maxGridSpacing(10)).toBeCloseTo(1, 12);
    expect(maxGridSpacing(100)).toBeCloseTo(5, 12);
  });

  it('is within 10 % of the standard’s rounded table values', () => {
    for (const { d, p } of EN_12464_TABLE) {
      expect(Math.abs(maxGridSpacing(d) - p) / p).toBeLessThan(0.1);
    }
  });

  it('never exceeds 10 m', () => {
    expect(maxGridSpacing(10_000)).toBe(10);
  });
});

describe('rectangleGrid', () => {
  const X = { x: 1, y: 0, z: 0 };
  const Z = { x: 0, y: 0, z: 1 };
  const UP = { x: 0, y: 1, z: 0 };

  it('has at least the standard’s fewest points along its longer side', () => {
    for (const { d, points } of EN_12464_TABLE) {
      const grid = rectangleGrid('floor', { x: 0, y: 0, z: 0 }, X, Z, d, d / 2, UP);
      expect(grid.columns).toBeGreaterThanOrEqual(points);
    }
  });

  it('puts points at cell centres no further apart than the maximum spacing', () => {
    // 5 × 4 m: p = 0.2 · 5^log₁₀ 5 = 0.6164 m; ceil(5 / 0.6164) = 9, ceil(4 / 0.6164) = 7.
    const grid = rectangleGrid('floor', { x: -2.5, y: 0, z: -2 }, X, Z, 5, 4, UP);
    expect([grid.columns, grid.rows]).toEqual([9, 7]);
    expect(grid.points).toHaveLength(63);
    expect(grid.points[0]!.x).toBeCloseTo(-2.5 + 5 / 18, 12);
    expect(grid.points[0]!.z).toBeCloseTo(-2 + 4 / 14, 12);
    expect(grid.cellArea).toBeCloseTo(20 / 63, 12);
    expect(5 / 9).toBeLessThanOrEqual(maxGridSpacing(5));
  });

  it('leaves out the border, and is empty when the border leaves no area', () => {
    const grid = rectangleGrid('work-plane', { x: -2.5, y: 0.8, z: -2 }, X, Z, 5, 4, UP, 0.5);
    const xs = grid.points.map((point) => point.x);
    expect(Math.min(...xs)).toBeGreaterThan(-2);
    expect(Math.max(...xs)).toBeLessThan(2);
    expect(grid.cellArea * grid.points.length).toBeCloseTo(4 * 3, 12);
    expect(rectangleGrid('work-plane', { x: 0, y: 0, z: 0 }, X, Z, 1, 1, UP, 0.5).points).toEqual(
      [],
    );
  });
});

describe('roomGrids', () => {
  const grids = roomGrids(room, 0.8, 0.5);

  it('covers the work plane and all six room surfaces, facing into the room', () => {
    expect(grids.map((grid) => grid.surface)).toEqual([
      'work-plane',
      'floor',
      'ceiling',
      'wall-x-',
      'wall-x+',
      'wall-z-',
      'wall-z+',
    ]);
    for (const grid of grids) {
      for (const point of grid.points) {
        // One step along the normal stays inside the room.
        const inside = {
          x: point.x + grid.normal.x * 0.01,
          y: point.y + grid.normal.y * 0.01,
          z: point.z + grid.normal.z * 0.01,
        };
        expect(Math.abs(inside.x)).toBeLessThan(room.width / 2);
        expect(Math.abs(inside.z)).toBeLessThan(room.depth / 2);
        expect(inside.y).toBeGreaterThan(0);
        expect(inside.y).toBeLessThan(room.height);
      }
    }
  });

  it('covers each room surface’s whole area', () => {
    const area = (name: string) => {
      const grid = grids.find((g) => g.surface === name)!;
      return grid.cellArea * grid.points.length;
    };
    expect(area('floor')).toBeCloseTo(20, 9);
    expect(area('ceiling')).toBeCloseTo(20, 9);
    expect(area('wall-x-')).toBeCloseTo(4 * 2.7, 9);
    expect(area('wall-z+')).toBeCloseTo(5 * 2.7, 9);
    expect(grids[0]!.points.every((point) => point.y === 0.8)).toBe(true);
  });
});

describe('the rectangle a grid covers', () => {
  it('is the surface less the border, with its points at the centres of its cells', () => {
    const [workPlane] = roomGrids(room, 0.8, 0.5);
    const { corner, lengthU, lengthV } = workPlane!.rect;
    expect(corner).toEqual({ x: -room.width / 2 + 0.5, y: 0.8, z: -room.depth / 2 + 0.5 });
    expect([lengthU, lengthV]).toEqual([room.width - 1, room.depth - 1]);
    const first = workPlane!.points[0]!;
    expect(first.x - corner.x).toBeCloseTo(lengthU / workPlane!.columns / 2, 12);
    expect(first.z - corner.z).toBeCloseTo(lengthV / workPlane!.rows / 2, 12);
  });
});
