import { describe, expect, it } from 'vitest';
import { addFurniture, updateFurniture } from './furniture';
import { FURNITURE_TYPES } from './furniture-kinds';
import {
  furnitureDimensions,
  groupDimensions,
  luminaireDimensions,
  windowDimensions,
} from './measure';
import { emptyScene, room } from './test-fixtures';
import { addWindow } from './windows';

// DEFAULT_ROOM: x ∈ [−2.5, 2.5], z ∈ [−2, 2], 2.7 m high.
const lengths = (dimensions: { lengthM: number }[]) => dimensions.map((d) => d.lengthM);

describe('luminaireDimensions', () => {
  it('measures ceiling and floor mounts to the nearer side and end walls', () => {
    const recessed = { position: { x: 1.4, y: 2.7, z: -1 }, mount: 'recessed' as const };
    const dimensions = luminaireDimensions(recessed, room, false);
    expect(lengths(dimensions)[0]).toBeCloseTo(1.1); // To x = 2.5.
    expect(lengths(dimensions)[1]).toBeCloseTo(1); // To z = −2.
    expect(dimensions[0]!.to).toEqual({ x: 2.5, y: 2.7, z: -1 });
    expect(dimensions[1]!.to).toEqual({ x: 1.4, y: 2.7, z: -2 });
  });

  it('adds height above the floor for pendants only when asked', () => {
    const pendant = { position: { x: -0.5, y: 2.1, z: 0.5 }, mount: 'pendant' as const };
    expect(luminaireDimensions(pendant, room, false)).toHaveLength(2);
    const withHeight = luminaireDimensions(pendant, room, true);
    expect(lengths(withHeight)).toEqual([2, 1.5, 2.1]);
    expect(withHeight[2]!.to).toEqual({ x: -0.5, y: 0, z: 0.5 });
  });

  it('measures wall fixtures along their wall and down to the floor', () => {
    // On the right wall, 0.5 m in front of the centre: 1.5 m to the front corner.
    const wall = { position: { x: 2.5, y: 1.8, z: 0.5 }, mount: 'wall' as const };
    const dimensions = luminaireDimensions(wall, room, false);
    expect(lengths(dimensions)).toEqual([1.5, 1.8]);
    expect(dimensions[0]!.to).toEqual({ x: 2.5, y: 1.8, z: 2 });
  });

  it('leaves out dimensions of zero length', () => {
    const atWall = { position: { x: 2.5, y: 0, z: 0 }, mount: 'floor' as const };
    expect(lengths(luminaireDimensions(atWall, room, false))).toEqual([2]);
  });
});

describe('groupDimensions', () => {
  it('keeps the shortest dimension towards each wall', () => {
    const row = [
      { position: { x: -1, y: 2.7, z: -1.2 }, mount: 'recessed' as const },
      { position: { x: 1, y: 2.7, z: -1.2 }, mount: 'recessed' as const },
      { position: { x: 2, y: 2.7, z: -1.2 }, mount: 'recessed' as const },
    ];
    // −x: 1.5 from the first; +x: 0.5 from the last; −z: 0.8 (all equal).
    const all = row.flatMap((luminaire) => luminaireDimensions(luminaire, room, false));
    const found = groupDimensions(all).map((d) => [d.to.x, d.lengthM]);
    expect(found).toHaveLength(3);
    expect(found).toContainEqual([-2.5, 1.5]);
    expect(found).toContainEqual([2.5, 0.5]);
    expect(lengths(groupDimensions(all))).toContainEqual(expect.closeTo(0.8));
  });
});

describe('furnitureDimensions', () => {
  /** A dining table (1.6 × 0.9 m) standing at (1, 0.5), turned by `rotationDeg`. */
  const table = (rotationDeg = 0) => {
    const scene = updateFurniture(
      addFurniture(emptyScene, 'dining-table', 'a', { x: 1, z: 0.5 }),
      'a',
      {
        rotationDeg,
      },
    );
    return scene.furniture[0]!;
  };

  it('measures a floor piece from its edges to the nearer walls, along the floor', () => {
    const [toSide, toEnd] = furnitureDimensions(table(), room);
    // Its right edge at x = 1.8, its front edge at z = 0.95.
    expect(toSide?.from).toEqual({ x: 1.8, y: 0, z: 0.5 });
    expect(toSide?.lengthM).toBeCloseTo(0.7);
    expect(toEnd?.from).toEqual({ x: 1, y: 0, z: 0.95 });
    expect(toEnd?.lengthM).toBeCloseTo(1.05);
  });

  it('measures a turned piece from its turned footprint', () => {
    // Turned a quarter, it's 0.9 m across x and 1.6 m along z: its right edge
    // is at x = 1.45, its front edge at z = 1.3.
    expect(lengths(furnitureDimensions(table(90), room))).toEqual([
      expect.closeTo(1.05),
      expect.closeTo(0.7),
    ]);
  });

  it('measures a picture along its wall to the nearer corner, and its bottom edge to the floor', () => {
    const { width, height } = FURNITURE_TYPES.artwork.size;
    const picture = addFurniture(emptyScene, 'artwork', 'p', { x: 0.5, z: -1.9 }).furniture[0]!;
    // On the back wall at x = 0.5, centre 1.5 m up.
    expect(lengths(furnitureDimensions(picture, room))).toEqual([
      expect.closeTo(2 - width / 2),
      expect.closeTo(1.5 - height / 2),
    ]);
  });
});

describe('windowDimensions', () => {
  it('measures a wall window from its side to the nearer corner, and its sill', () => {
    // On the back wall, 1.2 m wide, its centre at x = 1: the right edge is 1.6 m from x = 0.
    const [window] = addWindow(emptyScene, 'window', 'w', {
      position: { x: 1, y: 1.5, z: -2 },
    }).windows;
    const [along, sill] = windowDimensions(window!, room);
    expect(along!.from).toEqual({ x: 1.6, y: 1.5, z: -2 });
    expect(along!.lengthM).toBeCloseTo(2.5 - 1.6, 12);
    expect(sill!.lengthM).toBeCloseTo(0.9, 12);
  });

  it('measures a skylight to the nearer side and back or front walls', () => {
    const [skylight] = addWindow(emptyScene, 'skylight', 's', {
      position: { x: -1, y: 2.7, z: 0.5 },
      height: 1.1,
    }).windows;
    const lengths = windowDimensions(skylight!, room).map((d) => d.lengthM);
    // 0.9 m wide along x, 1.1 m deep along z.
    expect(lengths[0]).toBeCloseTo(2.5 - 1 - 0.45, 12);
    expect(lengths[1]).toBeCloseTo(2 - 0.5 - 0.55, 12);
    expect(lengths).toHaveLength(2);
  });
});
