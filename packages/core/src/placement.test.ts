import { describe, expect, it } from 'vitest';
import {
  constrainPosition,
  DEFAULT_SUSPENSION,
  defaultPosition,
  mountSurfaceHit,
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

describe('mountSurfaceHit', () => {
  // Looking down at 45° from above the front of the room.
  const downward = { origin: { x: 1, y: 4.7, z: 3 }, direction: { x: 0, y: -1, z: -1 } };
  const anywhere = { x: 0, y: 2, z: 0 };

  it('slides ceiling mounts on the ceiling', () => {
    // 2 m down to the 2.7 m ceiling, so 2 m back.
    expect(mountSurfaceHit(downward, product('recessed'), anywhere, room)).toEqual({
      x: 1,
      y: 2.7,
      z: 1,
    });
    expect(mountSurfaceHit(downward, product('track'), anywhere, room)?.y).toBe(2.7);
  });

  it('slides floor and table lamps on the floor', () => {
    const hit = mountSurfaceHit(downward, product('floor'), anywhere, room);
    expect(hit?.x).toBe(1);
    expect(hit?.y).toBe(0);
    expect(hit?.z).toBeCloseTo(-1.7);
    expect(mountSurfaceHit(downward, product('table'), anywhere, room)?.y).toBe(0);
  });

  it('slides pendants at their current height', () => {
    const hit = mountSurfaceHit(downward, product('pendant'), { x: 0, y: 2, z: 0 }, room);
    expect(hit?.y).toBe(2);
    expect(hit?.z).toBeCloseTo(0.3); // 2.7 m down, so 2.7 m back from z = 3.
  });

  it('misses when the ray points away from the surface', () => {
    const upward = { origin: { x: 0, y: 1, z: 3 }, direction: { x: 0, y: 1, z: -1 } };
    expect(mountSurfaceHit(upward, product('floor'), anywhere, room)).toBeNull();
    const level = { origin: { x: 0, y: 1, z: 3 }, direction: { x: 0, y: 0, z: -1 } };
    expect(mountSurfaceHit(level, product('recessed'), anywhere, room)).toBeNull();
  });

  it('follows the ray over the walls, skipping the near wall seen from outside', () => {
    // From outside, in front: passes through the front wall's back face to the back wall.
    const throughFront = { origin: { x: 0.5, y: 1.5, z: 6 }, direction: { x: 0, y: 0, z: -1 } };
    expect(mountSurfaceHit(throughFront, product('wall'), anywhere, room)).toEqual({
      x: 0.5,
      y: 1.5,
      z: -2,
    });
    // From the centre towards the right wall (x = 2.5): reaches it 0.5 m forward, before the front wall.
    const sideways = { origin: { x: 0, y: 1.5, z: 0 }, direction: { x: 1, y: 0, z: 0.2 } };
    expect(mountSurfaceHit(sideways, product('wall'), anywhere, room)).toEqual({
      x: 2.5,
      y: 1.5,
      z: 0.5,
    });
  });

  it('keeps a wall fixture on its own wall when the camera has cut that wall away', () => {
    // From outside the right wall (x = 2.5), looking left and down at a fixture on it.
    const fromOutside = { origin: { x: 6, y: 3, z: 1 }, direction: { x: -1, y: -0.2, z: 0 } };
    const onRightWall = { x: 2.5, y: 1.8, z: 0 };
    const hit = mountSurfaceHit(fromOutside, product('wall'), onRightWall, room);
    expect(hit?.x).toBe(2.5);
    expect(hit?.y).toBeCloseTo(2.3); // 3.5 m along x: 3 − 0.2 · 3.5.
    expect(hit?.z).toBe(1);
    // A fixture on the back wall ignores the right wall from outside and gets the left one,
    // 8.5 m along x at 3 − 0.2 · 8.5 = 1.3 m.
    const onBackWall = { x: 0, y: 1.8, z: -2 };
    expect(mountSurfaceHit(fromOutside, product('wall'), onBackWall, room)?.x).toBe(-2.5);
  });

  it('moves wall fixtures above the floor point when the ray meets no wall', () => {
    // Hits the floor at (1, 0, 0); the back wall plane only below the floor.
    const atFloor = { origin: { x: 1, y: 4, z: 4 }, direction: { x: 0, y: -1, z: -1 } };
    const wall = product('wall');
    const hit = mountSurfaceHit(atFloor, wall, { x: 0, y: 1.8, z: -2 }, room);
    expect(hit).toEqual({ x: 1, y: 1.8, z: 0 });
    // The nearest wall to (1, 0) is the right one, 1.5 m away.
    expect(constrainPosition(hit!, wall, room)).toEqual({ x: 2.5, y: 1.8, z: 0 });
  });

  it('misses wall fixtures when the ray goes over the walls and away from the floor', () => {
    const overTheTop = { origin: { x: 0, y: 1.5, z: 0 }, direction: { x: 0, y: 1, z: -0.1 } };
    expect(mountSurfaceHit(overTheTop, product('wall'), anywhere, room)).toBeNull();
  });
});
