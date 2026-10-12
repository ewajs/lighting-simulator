import { describe, expect, it } from 'vitest';
import { groupDimensions, luminaireDimensions } from './measure';
import { room } from './test-fixtures';

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
    const found = groupDimensions(row, room, false).map((d) => [d.to.x, d.lengthM]);
    expect(found).toHaveLength(3);
    expect(found).toContainEqual([-2.5, 1.5]);
    expect(found).toContainEqual([2.5, 0.5]);
    expect(lengths(groupDimensions(row, room, false))).toContainEqual(expect.closeTo(0.8));
  });
});
