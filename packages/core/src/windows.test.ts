import { describe, expect, it } from 'vitest';
import { itemRules } from './item-rules';
import { resizeRoom } from './room';
import { Simulator } from './simulator';
import { catalog, emptyScene, room } from './test-fixtures';
import type { RoomWindow } from './types';
import {
  addWindow,
  constrainWindow,
  copyWindow,
  MIN_WINDOW_SIDE_M,
  updateWindow,
  WINDOW_MARGIN_M,
  windowAt,
  windowRect,
} from './windows';

// DEFAULT_ROOM is 5 × 4 × 2.7 m: x ∈ [−2.5, 2.5], z ∈ [−2, 2].
const window = (patch: Partial<RoomWindow> = {}): RoomWindow => ({
  id: 'w',
  surface: 'wall-z-',
  position: { x: 0, y: 1.5, z: -2 },
  width: 1.2,
  height: 1.2,
  glazing: 'clear',
  covering: 'none',
  ...patch,
});

describe('addWindow', () => {
  it('puts a window on the back wall, centred, its sill at 0.9 m', () => {
    const [added] = addWindow(emptyScene, 'window', 'w').windows;
    expect(added).toMatchObject({ surface: 'wall-z-', width: 1.2, height: 1.2 });
    expect(added!.position).toEqual({ x: 0, y: 0.9 + 0.6, z: -2 });
  });

  it('puts a skylight in the ceiling, centred', () => {
    const [skylight] = addWindow(emptyScene, 'skylight', 's').windows;
    expect(skylight!.position).toEqual({ x: 0, y: 2.7, z: 0 });
  });

  it('takes another wall, and puts the window on its plane', () => {
    const [side] = addWindow(emptyScene, 'window', 'w', { surface: 'wall-x+' }).windows;
    expect(side!.position.x).toBe(2.5);
    expect(side!.position.z).toBe(0);
  });
});

describe('windowAt', () => {
  it('puts a wall window on the wall nearest the drop, across from it, at its sill', () => {
    const scene = addWindow(
      emptyScene,
      'window',
      'w',
      windowAt('window', { x: 2.2, z: 0.5 }, room),
    );
    expect(scene.windows[0]).toMatchObject({
      surface: 'wall-x+',
      position: { x: 2.5, y: 0.9 + 0.6, z: 0.5 },
    });
    // From outside the room, the wall it was dropped beyond.
    expect(windowAt('tall-window', { x: 0, z: 9 }, room).surface).toBe('wall-z+');
  });

  it('puts a skylight overhead', () => {
    expect(windowAt('skylight', { x: 1, z: -1 }, room)).toEqual({
      surface: 'ceiling',
      position: { x: 1, y: 2.7, z: -1 },
    });
  });
});

describe('constrainWindow', () => {
  it('keeps the whole window a margin inside its wall', () => {
    const moved = constrainWindow(window({ position: { x: 9, y: 9, z: 0 } }), room);
    expect(moved.position.x).toBeCloseTo(2.5 - WINDOW_MARGIN_M - 0.6, 12);
    expect(moved.position.y).toBeCloseTo(2.7 - WINDOW_MARGIN_M - 0.6, 12);
    // Back onto the wall's plane, whatever z it was given.
    expect(moved.position.z).toBe(-2);
  });

  it('shrinks a window bigger than its wall, and stops at the smallest side', () => {
    const big = constrainWindow(window({ width: 9, height: 9 }), room);
    expect(big.width).toBeCloseTo(5 - 2 * WINDOW_MARGIN_M, 12);
    expect(big.height).toBeCloseTo(2.7 - 2 * WINDOW_MARGIN_M, 12);
    expect(constrainWindow(window({ width: 0.01 }), room).width).toBe(MIN_WINDOW_SIDE_M);
  });

  it('keeps a skylight inside the ceiling, along x and z', () => {
    const sky = constrainWindow(
      window({ surface: 'ceiling', position: { x: -9, y: 0, z: 9 }, width: 1, height: 1 }),
      room,
    );
    expect(sky.position).toEqual({
      x: -2.5 + WINDOW_MARGIN_M + 0.5,
      y: 2.7,
      z: 2 - WINDOW_MARGIN_M - 0.5,
    });
  });
});

describe('windowRect', () => {
  it('runs along the wall and up it, facing into the room', () => {
    const rect = windowRect(window(), room);
    expect(rect.corner).toEqual({ x: -0.6, y: 0.9, z: -2 });
    expect([rect.u, rect.v, rect.normal]).toEqual([
      { x: 1, y: 0, z: 0 },
      { x: 0, y: 1, z: 0 },
      { x: 0, y: 0, z: 1 },
    ]);
  });

  it('faces down from the ceiling, its height running along z', () => {
    const rect = windowRect(
      window({ surface: 'ceiling', position: { x: 1, y: 2.7, z: 0 }, height: 0.8 }),
      room,
    );
    expect(rect.corner).toEqual({ x: 0.4, y: 2.7, z: -0.4 });
    expect(rect.normal).toEqual({ x: 0, y: -1, z: 0 });
  });
});

describe('editing windows', () => {
  it('moves a window onto another surface when its surface changes', () => {
    const scene = updateWindow({ ...emptyScene, windows: [window()] }, 'w', { surface: 'wall-x-' });
    expect(scene.windows[0]!.position.x).toBe(-2.5);
  });

  it('copies a window beside its source, along its wall', () => {
    const copy = copyWindow(window(), 'w2', room);
    expect(copy.position).toEqual({ x: 1.4, y: 1.5, z: -2 });
  });

  it('keeps windows on their walls as the room resizes', () => {
    const scene = {
      ...emptyScene,
      windows: [window({ surface: 'wall-x+', position: { x: 2.5, y: 1.5, z: 0 } })],
    };
    const wider = resizeRoom(scene, { width: 7 }, catalog);
    expect(wider.windows[0]!.position.x).toBe(3.5);
  });

  it('slides along its own surface, and goes through the Simulator’s undo', () => {
    const sim = new Simulator({ catalog });
    const id = sim.addWindow('window', { surface: 'wall-x-' });
    const rules = itemRules(sim, 'window');
    expect(rules.axes(id, sim.scene.windows[0]!.position)).toEqual(['z', 'y']);
    rules.move(id, { x: 0, y: 1.2, z: 1 }, {});
    expect(sim.scene.windows[0]!.position).toEqual({ x: -2.5, y: 1.2, z: 1 });
    sim.duplicate([id]);
    expect(sim.scene.windows).toHaveLength(2);
    sim.remove([id]);
    expect(sim.scene.windows).toHaveLength(1);
    sim.undo();
    sim.undo();
    expect(sim.scene.windows).toHaveLength(1);
    expect(sim.scene.windows[0]!.id).toBe(id);
  });
});
