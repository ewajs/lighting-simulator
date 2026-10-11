import { describe, expect, it } from 'vitest';
import {
  constrainPosition,
  DEFAULT_SUSPENSION,
  defaultPosition,
  WALL_MOUNT_HEIGHT,
} from './placement';
import { product, room } from './test-fixtures';

describe('defaultPosition', () => {
  it('puts ceiling mounts on the ceiling above the given floor point', () => {
    expect(defaultPosition(product('recessed'), room, { x: 1, z: -1 })).toEqual({
      x: 1,
      y: 2.7,
      z: -1,
    });
    expect(defaultPosition(product('track'), room)).toEqual({ x: 0, y: 2.7, z: 0 });
  });

  it('hangs pendants by their suspension, or the default one', () => {
    expect(defaultPosition(product('pendant', { suspension: 0.7 }), room).y).toBeCloseTo(2.0);
    expect(defaultPosition(product('pendant'), room).y).toBeCloseTo(2.7 - DEFAULT_SUSPENSION);
  });

  it('keeps a pendant longer than the room on the floor', () => {
    expect(defaultPosition(product('pendant', { suspension: 5 }), room).y).toBe(0);
  });

  it('puts floor and table lamps on the floor', () => {
    expect(defaultPosition(product('floor'), room).y).toBe(0);
    expect(defaultPosition(product('table'), room).y).toBe(0);
  });

  it('mounts wall fixtures on the nearest wall at wall height', () => {
    // Centre is 2 m from back and front, 2.5 m from the sides: the tie goes to the back wall.
    expect(defaultPosition(product('wall'), room)).toEqual({ x: 0, y: WALL_MOUNT_HEIGHT, z: -2 });
    // 0.5 m from the right wall (x = 2.5), 2 m from the others.
    expect(defaultPosition(product('wall'), room, { x: 2, z: 0 })).toEqual({
      x: 2.5,
      y: 1.8,
      z: 0,
    });
  });
});

describe('constrainPosition', () => {
  it('clamps points into the room', () => {
    expect(constrainPosition({ x: 9, y: 9, z: -9 }, undefined, room)).toEqual({
      x: 2.5,
      y: 2.7,
      z: -2,
    });
  });

  it('keeps ceiling mounts on the ceiling whatever height is asked', () => {
    expect(constrainPosition({ x: 0, y: 1, z: 0 }, product('recessed'), room).y).toBe(2.7);
  });

  it('lets pendants move vertically within the room', () => {
    expect(constrainPosition({ x: 0, y: 1.5, z: 0 }, product('pendant'), room).y).toBe(1.5);
  });

  it('snaps wall fixtures back onto a wall', () => {
    // 0.3 m from the front wall (z = 2).
    expect(constrainPosition({ x: 0, y: 1.5, z: 1.7 }, product('wall'), room)).toEqual({
      x: 0,
      y: 1.5,
      z: 2,
    });
  });
});
