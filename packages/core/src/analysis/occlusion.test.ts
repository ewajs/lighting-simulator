import { describe, expect, it } from 'vitest';
import { TOP_THICKNESS } from '../render/furniture/style';
import type { Furniture, FurnitureKind } from '../types';
import {
  coveredByFurniture,
  FURNITURE_BLOCKING,
  furnitureBlockers,
  segmentBlocked,
  TABLE_TOP_M,
} from './occlusion';

const piece = (kind: FurnitureKind, extra: Partial<Furniture> = {}): Furniture => ({
  id: kind,
  kind,
  position: { x: 0, y: 0, z: 0 },
  rotationDeg: 0,
  size: { width: 2, depth: 1, height: 0.8 },
  finish: { main: 'oak', accent: 'oak' },
  ...extra,
});

describe('furnitureBlockers', () => {
  it('blocks with the whole of a solid piece', () => {
    const [sofa] = furnitureBlockers([piece('sofa')]);
    expect(sofa).toEqual({
      centre: { x: 0, y: 0.4, z: 0 },
      half: { x: 1, y: 0.4, z: 0.5 },
      yawRad: 0,
      reflectance: 0.45,
    });
  });

  it('blocks with only a table’s top, as thick as the renderer draws it', () => {
    expect(TABLE_TOP_M).toBe(TOP_THICKNESS);
    const [table] = furnitureBlockers([
      piece('dining-table', { size: { width: 1.6, depth: 0.9, height: 0.75 } }),
    ]);
    expect(table!.centre.y).toBeCloseTo(0.75 - TABLE_TOP_M / 2, 12);
    expect(table!.half.y).toBeCloseTo(TABLE_TOP_M / 2, 12);
  });

  it('leaves out chairs, plants and pictures', () => {
    const open: FurnitureKind[] = ['chair', 'office-chair', 'plant', 'artwork'];
    for (const kind of open) expect(FURNITURE_BLOCKING[kind]).toBe('none');
    expect(furnitureBlockers(open.map((kind) => piece(kind)))).toEqual([]);
  });
});

describe('segmentBlocked', () => {
  const sofa = furnitureBlockers([piece('sofa')]);

  it('is blocked through a piece, and clear past it', () => {
    expect(segmentBlocked({ x: 0, y: 0, z: 2 }, { x: 0, y: 0.5, z: -2 }, sofa)).toBe(true);
    expect(segmentBlocked({ x: 0, y: 1, z: 2 }, { x: 0, y: 1, z: -2 }, sofa)).toBe(false);
    expect(segmentBlocked({ x: 1.2, y: 0.4, z: 2 }, { x: 1.2, y: 0.4, z: -2 }, sofa)).toBe(false);
  });

  it('is blocked for the floor under a piece, lit from above', () => {
    expect(segmentBlocked({ x: 0.5, y: 0, z: 0 }, { x: 0.5, y: 2.7, z: 0 }, sofa)).toBe(true);
  });

  it('is clear for a point on a piece’s top, lit from above', () => {
    expect(segmentBlocked({ x: 0.5, y: 0.8, z: 0 }, { x: 0.5, y: 2.7, z: 0 }, sofa)).toBe(false);
  });

  it('turns the box with the piece', () => {
    // 2 m wide along x at rest; turned 90°, it spans z from −1 to 1 and x from −0.5 to 0.5.
    const turned = furnitureBlockers([piece('sofa', { rotationDeg: 90 })]);
    expect(segmentBlocked({ x: 0, y: 2.7, z: 0.9 }, { x: 0, y: 0, z: 0.9 }, turned)).toBe(true);
    expect(segmentBlocked({ x: 0.9, y: 2.7, z: 0 }, { x: 0.9, y: 0, z: 0 }, turned)).toBe(false);
  });

  it('lets light between a table’s legs, under its top', () => {
    const table = furnitureBlockers([
      piece('dining-table', { size: { width: 1.6, depth: 0.9, height: 0.75 } }),
    ]);
    // Sideways, below the top: clear. From above, through the top: blocked.
    expect(segmentBlocked({ x: -3, y: 0.3, z: 0 }, { x: 3, y: 0.3, z: 0 }, table)).toBe(false);
    expect(segmentBlocked({ x: 0, y: 0, z: 0 }, { x: 0, y: 2.7, z: 0 }, table)).toBe(true);
  });
});

describe('coveredByFurniture', () => {
  // A 2 × 1 m sofa, 0.8 m high, at the origin, and the same turned a quarter.
  const sofa = furnitureBlockers([piece('sofa')]);
  const turned = furnitureBlockers([piece('sofa', { rotationDeg: 90 })]);
  const UP = { x: 0, y: 1, z: 0 };

  it('covers a point inside the piece, and the floor under it', () => {
    expect(coveredByFurniture({ x: 0.5, y: 0.4, z: 0.2 }, UP, sofa)).toBe(true);
    expect(coveredByFurniture({ x: 0.9, y: 0, z: 0.4 }, UP, sofa)).toBe(true);
  });

  it('covers a wall with a piece standing a few centimetres in front of it', () => {
    // A wall at z = −0.53, facing +z: the sofa's back is 3 cm away, then 6 cm.
    const toward = { x: 0, y: 0, z: 1 };
    expect(coveredByFurniture({ x: 0, y: 0.4, z: -0.53 }, toward, sofa)).toBe(true);
    expect(coveredByFurniture({ x: 0, y: 0.4, z: -0.56 }, toward, sofa)).toBe(false);
  });

  it('leaves out the floor beside the piece, and a point on its top', () => {
    expect(coveredByFurniture({ x: 1.02, y: 0, z: 0 }, UP, sofa)).toBe(false);
    expect(coveredByFurniture({ x: 0, y: 0.8, z: 0 }, UP, sofa)).toBe(false);
  });

  it('follows the piece when it turns', () => {
    // Turned a quarter, the sofa runs along z: 0.9 m out along x is beside it.
    expect(coveredByFurniture({ x: 0, y: 0, z: 0.9 }, UP, turned)).toBe(true);
    expect(coveredByFurniture({ x: 0.9, y: 0, z: 0 }, UP, turned)).toBe(false);
  });

  it('covers nothing under a table: its top is far above the floor', () => {
    const table = furnitureBlockers([
      piece('dining-table', { size: { width: 1.6, depth: 0.9, height: 0.75 } }),
    ]);
    expect(coveredByFurniture({ x: 0, y: 0, z: 0 }, UP, table)).toBe(false);
  });
});
