import { describe, expect, it } from 'vitest';
import { AxisDrag, axisOffset, groupAxes, groupCenter, luminaireAxes } from './move-handle';
import type { Ray } from './placement';
import { Simulator } from './simulator';
import { catalog, product, room } from './test-fixtures';
import type { Luminaire } from './types';

const at = (productId: string, x: number, y: number, z: number): Luminaire => ({
  id: `${productId}@${x},${y},${z}`,
  productId,
  position: { x, y, z },
  aim: { tiltDeg: 0, panDeg: 0 },
  dimming: 1,
  on: true,
  cct: 3000,
});

const positionOf = (sim: Simulator, id: string) =>
  sim.scene.luminaires.find((l) => l.id === id)!.position;

describe('luminaireAxes', () => {
  const anywhere = { x: 0, y: 0, z: 0 };

  it('slides ceiling and floor mounts across their surface', () => {
    for (const mount of ['recessed', 'track', 'floor', 'table'] as const) {
      expect(luminaireAxes(product(mount), anywhere, room)).toEqual(['x', 'z']);
    }
  });

  it('adds height for pendants', () => {
    expect(luminaireAxes(product('pendant'), anywhere, room)).toEqual(['x', 'y', 'z']);
  });

  it('slides wall fixtures along their wall and up', () => {
    const wall = product('wall');
    expect(luminaireAxes(wall, { x: 0, y: 1.8, z: -2 }, room)).toEqual(['x', 'y']); // Back wall.
    expect(luminaireAxes(wall, { x: 2.5, y: 1.8, z: 0 }, room)).toEqual(['z', 'y']); // Right wall.
  });
});

describe('groupAxes', () => {
  const lookup = (id: string) => catalog.get(id);

  it('keeps only the axes every luminaire shares', () => {
    const pendant = at('test-pendant', 0, 2, 0);
    const backWall = at('test-wall', 0, 1.8, -2);
    const rightWall = at('test-wall', 2.5, 1.8, 0);
    expect(groupAxes([pendant], lookup, room)).toEqual(['x', 'y', 'z']);
    expect(groupAxes([pendant, backWall], lookup, room)).toEqual(['x', 'y']);
    expect(groupAxes([pendant, at('test-recessed', 1, 2.7, 1)], lookup, room)).toEqual(['x', 'z']);
    expect(groupAxes([backWall, rightWall], lookup, room)).toEqual(['y']);
    expect(groupAxes([backWall, rightWall, at('test-floor', 0, 0, 0)], lookup, room)).toEqual([]);
  });

  it('has no axes for nothing, or for an unknown product', () => {
    expect(groupAxes([], lookup, room)).toEqual([]);
    expect(groupAxes([at('missing', 0, 0, 0)], lookup, room)).toEqual([]);
  });
});

describe('groupCenter', () => {
  it('averages the positions', () => {
    const center = groupCenter([at('a', 0, 2, 0), at('b', 2, 1, -1)]);
    expect(center).toEqual({ x: 1, y: 1.5, z: -0.5 });
  });
});

describe('axisOffset', () => {
  const origin = { x: 0, y: 2, z: 0 };

  it('finds the point on the axis closest to the ray', () => {
    // Passes through (1, 2, 0), crossing the x axis line at x = 1.
    const ray: Ray = { origin: { x: 1, y: 5, z: 3 }, direction: { x: 0, y: -1, z: -1 } };
    expect(axisOffset(ray, origin, 'x')).toBeCloseTo(1);
    // Level, passing (1, 5, 0): closest to the vertical line at y = 5, 3 m above the origin.
    const level: Ray = { origin: { x: 1, y: 5, z: 3 }, direction: { x: 0, y: 0, z: -1 } };
    expect(axisOffset(level, origin, 'y')).toBeCloseTo(3);
  });

  it('returns null for rays parallel to the axis or pointing away from it', () => {
    const parallel: Ray = { origin: { x: 0, y: 3, z: 0 }, direction: { x: 1, y: 0, z: 0 } };
    expect(axisOffset(parallel, origin, 'x')).toBeNull();
    const away: Ray = { origin: { x: 1, y: 5, z: 3 }, direction: { x: 0, y: 1, z: 1 } };
    expect(axisOffset(away, origin, 'x')).toBeNull();
  });
});

describe('AxisDrag', () => {
  /** Looking along −z from in front of the room, through the screen point (x, y). */
  const towards = (x: number, y: number): Ray => ({
    origin: { x, y, z: 6 },
    direction: { x: 0, y: 0, z: -1 },
  });

  it('slides along one axis only, as one undo step', () => {
    const sim = new Simulator({ catalog });
    const id = sim.addLuminaire('test-pendant'); // At (0, 2, 0).
    // Grabbed at height 2.1, released at 1.5: 0.6 m down. Sideways pointer motion is ignored.
    const drag = new AxisDrag(sim, [id], 'y', towards(0.3, 2.1));
    drag.moveTo(towards(0.8, 1.6));
    drag.moveTo(towards(0.9, 1.5));
    expect(positionOf(sim, id)).toEqual({ x: 0, y: 1.4, z: 0 });
    sim.undo();
    expect(positionOf(sim, id)).toEqual({ x: 0, y: 2, z: 0 });
  });

  it('moves the group by the same distance, stopping when one reaches a wall', () => {
    const sim = new Simulator({ catalog });
    const a = sim.addLuminaire('test-recessed', { at: { x: 0, z: 0 } });
    const b = sim.addLuminaire('test-recessed', { at: { x: 2, z: 1 } });
    // Centre at x = 1; the handle is dragged 3 m right, but b can only go 0.5 m.
    const drag = new AxisDrag(sim, [a, b], 'x', towards(1, 2));
    drag.moveTo(towards(4, 2));
    expect(positionOf(sim, a)).toEqual({ x: 0.5, y: 2.7, z: 0 });
    expect(positionOf(sim, b)).toEqual({ x: 2.5, y: 2.7, z: 1 });
  });

  it('snaps the group centre to the grid', () => {
    const sim = new Simulator({ catalog });
    const id = sim.addLuminaire('test-pendant'); // At (0, 2, 0).
    const drag = new AxisDrag(sim, [id], 'y', towards(0.3, 2.1));
    drag.moveTo(towards(0.3, 1.63), { toleranceM: 0.05 });
    expect(positionOf(sim, id).y).toBe(1.5);
  });
});
