import { describe, expect, it } from 'vitest';
import { snapTurn, snapPosition } from './snap';

const tolerance = { toleranceM: 0.05 };

describe('snapPosition', () => {
  it('snaps the named coordinates to the 10 cm grid and leaves the rest', () => {
    const { position, guides } = snapPosition(
      { x: 1.234, y: 2.666, z: -0.77 },
      ['x', 'z'],
      [],
      tolerance,
    );
    expect(position).toEqual({ x: 1.2, y: 2.666, z: -0.8 });
    expect(guides).toEqual([]);
  });

  it('gives exact decimals', () => {
    expect(snapPosition({ x: 0.31, y: 0, z: 0 }, ['x'], [], tolerance).position.x).toBe(0.3);
  });

  it('aligns with another luminaire within the tolerance, before the grid', () => {
    const other = { x: 1.27, y: 2.7, z: -1 };
    const { position, guides } = snapPosition(
      { x: 1.3, y: 2.7, z: 0.52 },
      ['x', 'z'],
      [other],
      tolerance,
    );
    expect(position.x).toBe(1.27);
    expect(position.z).toBe(0.5); // Nothing to align with in z: grid.
    expect(guides).toEqual([{ axis: 'x', value: 1.27 }]);
  });

  it('aligns with the nearest candidate, including the room centre line', () => {
    const others = [
      { x: 0.04, y: 0, z: 9 },
      { x: 0.02, y: 0, z: 9 },
    ];
    expect(snapPosition({ x: 0.03, y: 0, z: 0 }, ['x'], others, tolerance).position.x).toBe(0.02);
    const { guides } = snapPosition({ x: 2, y: 0, z: -0.03 }, ['z'], [], tolerance);
    expect(guides).toEqual([{ axis: 'z', value: 0 }]);
  });

  it('only snaps height to the grid', () => {
    const other = { x: 9, y: 1.83, z: 9 };
    const { position, guides } = snapPosition({ x: 0, y: 1.84, z: 0 }, ['y'], [other], tolerance);
    expect(position.y).toBe(1.8);
    expect(guides).toEqual([]);
  });
});

describe('snapTurn', () => {
  it('rounds to 15° steps within [−180, 180)', () => {
    expect(snapTurn(22)).toBe(15);
    expect(snapTurn(-97)).toBe(-90);
    expect(snapTurn(178)).toBe(-180);
    expect(snapTurn(-180)).toBe(-180);
  });
});
