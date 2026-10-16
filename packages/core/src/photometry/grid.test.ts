import { describe, expect, it } from 'vitest';
import type { Photometry } from '../types';
import { candelaGrid, GRID_HORIZONTAL_STEP_DEG, GRID_VERTICAL_STEP_DEG } from './grid';

/** Downward only: 400 cd at nadir to 0 at 90°; C0 twice as bright as C90 (quadrant symmetric). */
const ASYMMETRIC: Photometry = {
  verticalDeg: [0, 90],
  horizontalDeg: [0, 90],
  candela: [
    [400, 0],
    [200, 0],
  ],
  power: 10,
  luminousOpening: { widthM: 0, lengthM: 0, heightM: 0, round: false },
  keywords: {},
};

function at(grid: ReturnType<typeof candelaGrid>, verticalDeg: number, horizontalDeg: number) {
  const row = verticalDeg / GRID_VERTICAL_STEP_DEG;
  const column = horizontalDeg / GRID_HORIZONTAL_STEP_DEG;
  return grid.values[row * grid.width + column];
}

describe('candelaGrid', () => {
  const grid = candelaGrid(ASYMMETRIC);

  it('covers the whole sphere, wrapping horizontally', () => {
    expect(grid.width).toBe(360);
    expect(grid.height).toBe(361);
    expect(grid.values).toHaveLength(360 * 361);
  });

  it('normalises to the peak intensity', () => {
    expect(grid.peak).toBe(400);
    expect(at(grid, 0, 0)).toBe(1);
  });

  it('samples candelaAt, including mirrored quadrants', () => {
    // C0 at 45°: 400 · 0.5 = 200 cd → 0.5. C90 at 45°: 100 cd → 0.25.
    expect(at(grid, 45, 0)).toBeCloseTo(0.5, 6);
    expect(at(grid, 45, 90)).toBeCloseTo(0.25, 6);
    expect(at(grid, 45, 180)).toBeCloseTo(0.5, 6); // mirrors C0
    expect(at(grid, 45, 270)).toBeCloseTo(0.25, 6); // mirrors C90
    expect(at(grid, 45, 45)).toBeCloseTo(0.375, 6);
  });

  it('is dark outside the measured vertical range', () => {
    expect(at(grid, 135, 0)).toBe(0);
    expect(at(grid, 180, 0)).toBe(0);
  });
});
