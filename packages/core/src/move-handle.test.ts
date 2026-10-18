import { describe, expect, it } from 'vitest';
import { itemRules, luminaireAxes } from './item-rules';
import { AxisDrag, axisOffset, groupAxes, groupCenter } from './move-handle';
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
const piecePosition = (sim: Simulator, id: string) =>
  sim.scene.furniture.find((f) => f.id === id)!.position;

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
  /** The axes the luminaires share, in a scene of just them. */
  const shared = (...luminaires: Luminaire[]) => {
    const sim = new Simulator({ catalog, scene: { room, luminaires, furniture: [], windows: [] } });
    return groupAxes(
      itemRules(sim, 'luminaire'),
      luminaires.map((l) => l.id),
    );
  };

  it('keeps only the axes every luminaire shares', () => {
    const pendant = at('test-pendant', 0, 2, 0);
    const backWall = at('test-wall', 0, 1.8, -2);
    const rightWall = at('test-wall', 2.5, 1.8, 0);
    expect(shared(pendant)).toEqual(['x', 'y', 'z']);
    expect(shared(pendant, backWall)).toEqual(['x', 'y']);
    expect(shared(pendant, at('test-recessed', 1, 2.7, 1))).toEqual(['x', 'z']);
    expect(shared(backWall, rightWall)).toEqual(['y']);
    expect(shared(backWall, rightWall, at('test-floor', 0, 0, 0))).toEqual([]);
  });

  it('has no axes for nothing, or for an unknown product', () => {
    expect(shared()).toEqual([]);
    expect(shared(at('missing', 0, 0, 0))).toEqual([]);
  });

  it('slides floor pieces across the floor, and pictures along their wall and up', () => {
    const sim = new Simulator({ catalog });
    const table = sim.addFurniture('dining-table');
    const chair = sim.addFurniture('chair', { at: { x: 1, z: 1 } });
    const picture = sim.addFurniture('artwork', { at: { x: 2.4, z: 0 } }); // Right wall.
    const rules = itemRules(sim, 'furniture');
    expect(groupAxes(rules, [table, chair])).toEqual(['x', 'z']);
    expect(groupAxes(rules, [picture])).toEqual(['y', 'z']);
    expect(groupAxes(rules, [table, picture])).toEqual(['z']);
  });
});

describe('groupCenter', () => {
  it('averages the points', () => {
    const center = groupCenter([
      { x: 0, y: 2, z: 0 },
      { x: 2, y: 1, z: -1 },
    ]);
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

  it('slides furniture, keeping each footprint inside the room and the group’s shape', () => {
    const sim = new Simulator({ catalog });
    // The chair is 0.46 m wide: its centre can go up to x = 2.27.
    const a = sim.addFurniture('chair', { at: { x: 0, z: 0 } });
    const b = sim.addFurniture('chair', { at: { x: 1.5, z: 1 } });
    // Handle at the chairs' middle height; dragged 3 m right, b can only go 0.77 m.
    const middle = sim.scene.furniture[0]!.size.height / 2;
    const drag = new AxisDrag(sim, [a, b], 'x', towards(0.75, middle));
    drag.moveTo(towards(3.75, middle));
    expect(piecePosition(sim, a).x).toBeCloseTo(0.77, 9);
    expect(piecePosition(sim, b)).toEqual({ x: 2.27, y: 0, z: 1 });
  });

  it('slides a picture up its wall', () => {
    const sim = new Simulator({ catalog });
    const id = sim.addFurniture('artwork'); // Back wall, centre at (0, 1.5, −2).
    const drag = new AxisDrag(sim, [id], 'y', towards(0, 1.5));
    drag.moveTo(towards(0.4, 1.8));
    expect(piecePosition(sim, id)).toEqual({ x: 0, y: 1.8, z: -2 });
  });
});
