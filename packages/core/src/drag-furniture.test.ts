import { describe, expect, it } from 'vitest';
import { ItemDrag } from './drag';
import type { Ray } from './placement';
import { Simulator } from './simulator';
import { catalog } from './test-fixtures';

/** Looking down at 45° towards −z, at the floor point (x, 0, z). */
const downAt = (x: number, z: number): Ray => ({
  origin: { x, y: 2, z: z + 2 },
  direction: { x: 0, y: -1, z: -1 },
});

/** Looking straight at the back wall (z = −2) at (x, y). */
const atBackWall = (x: number, y: number): Ray => ({
  origin: { x, y, z: 0 },
  direction: { x: 0, y: 0, z: -1 },
});

const piece = (sim: Simulator, id: string) => sim.scene.furniture.find((f) => f.id === id)!;

describe('ItemDrag: furniture', () => {
  it('slides over the floor, keeping the offset from where it was grabbed', () => {
    const sim = new Simulator({ catalog });
    const id = sim.addFurniture('chair');
    const drag = new ItemDrag(sim, { kind: 'furniture', id }, [id], downAt(0.2, 0.2));
    drag.moveTo(downAt(1.2, 0.7));
    expect(piece(sim, id).position).toEqual({ x: 1, y: 0, z: 0.5 });
  });

  it('keeps the grabbed point under the pointer, at the height it was grabbed', () => {
    // Grabbed on the table top, 0.75 m up: the drag slides on that plane, not the floor.
    const sim = new Simulator({ catalog });
    const id = sim.addFurniture('dining-table');
    // From a camera at (0, 3, 4) through the point (x, 0.75, z): perspective, like the viewport.
    const camera = { x: 0, y: 3, z: 4 };
    const at = (x: number, z: number): Ray => ({
      origin: camera,
      direction: { x: x - camera.x, y: 0.75 - camera.y, z: z - camera.z },
    });
    const drag = new ItemDrag(sim, { kind: 'furniture', id }, [id], at(0.2, 0.1), 0.75);
    drag.moveTo(at(0.7, 0.4));
    const { x, z } = piece(sim, id).position;
    expect(x).toBeCloseTo(0.5, 9);
    expect(z).toBeCloseTo(0.3, 9);
  });

  it('keeps the piece inside the room', () => {
    // The chair is 0.46 m wide: its centre stays within 2.5 − 0.23 m of the middle.
    const sim = new Simulator({ catalog });
    const id = sim.addFurniture('chair');
    new ItemDrag(sim, { kind: 'furniture', id }, [id], downAt(0, 0)).moveTo(downAt(9, 0));
    expect(piece(sim, id).position.x).toBe(2.27);
  });

  it('records the whole drag as one undo step', () => {
    const sim = new Simulator({ catalog });
    const id = sim.addFurniture('chair');
    const drag = new ItemDrag(sim, { kind: 'furniture', id }, [id], downAt(0, 0));
    drag.moveTo(downAt(0.5, 0));
    drag.moveTo(downAt(1, 0));
    sim.undo();
    expect(piece(sim, id).position).toEqual({ x: 0, y: 0, z: 0 });
    expect(sim.scene.furniture).toHaveLength(1);
  });

  it('moves the rest of the group by the same offset', () => {
    const sim = new Simulator({ catalog });
    const grabbed = sim.addFurniture('chair');
    const table = sim.addFurniture('dining-table', { at: { x: -1, z: 0.5 } });
    const drag = new ItemDrag(
      sim,
      { kind: 'furniture', id: grabbed },
      [grabbed, table],
      downAt(0, 0),
    );
    drag.moveTo(downAt(0.5, -0.3));
    const { x, z } = piece(sim, table).position;
    expect(x).toBeCloseTo(-0.5, 9);
    expect(z).toBeCloseTo(0.2, 9);
  });

  it('snaps to the grid, or lines up with other pieces', () => {
    const sim = new Simulator({ catalog });
    const id = sim.addFurniture('chair');
    sim.addFurniture('plant', { at: { x: 0.62, z: -1 } });
    const drag = new ItemDrag(sim, { kind: 'furniture', id }, [id], downAt(0, 0));
    expect(drag.moveTo(downAt(1.03, 0.47), { toleranceM: 0.01 })).toEqual([]);
    expect(piece(sim, id).position).toEqual({ x: 1, y: 0, z: 0.5 });
    // Within 5 cm of the plant's x: lined up with it.
    const guides = drag.moveTo(downAt(0.6, 0.47), { toleranceM: 0.05 });
    expect(guides).toEqual([{ axis: 'x', value: 0.62 }]);
    expect(piece(sim, id).position.x).toBe(0.62);
  });

  it('slides a picture along its wall and up, snapping along both', () => {
    const sim = new Simulator({ catalog });
    const id = sim.addFurniture('artwork'); // (0, 1.5, −2)
    const drag = new ItemDrag(sim, { kind: 'furniture', id }, [id], atBackWall(0.1, 1.6));
    drag.moveTo(atBackWall(1.1, 1.3));
    expect(piece(sim, id).position).toEqual({ x: 1, y: 1.2, z: -2 });
    drag.moveTo(atBackWall(0.73, 1.07), { toleranceM: 0.01 });
    expect(piece(sim, id).position).toEqual({ x: 0.6, y: 1, z: -2 });
  });

  it('moves a picture onto the wall the pointer reaches', () => {
    const sim = new Simulator({ catalog });
    const id = sim.addFurniture('artwork');
    const drag = new ItemDrag(sim, { kind: 'furniture', id }, [id], atBackWall(0, 1.5));
    drag.moveTo({ origin: { x: 0, y: 1.4, z: 0.5 }, direction: { x: 1, y: 0, z: 0 } });
    expect(piece(sim, id)).toMatchObject({
      position: { x: 2.5, y: 1.4, z: 0.5 },
      rotationDeg: -90,
    });
  });

  it('ignores rays that miss the floor', () => {
    const sim = new Simulator({ catalog });
    const id = sim.addFurniture('chair');
    const drag = new ItemDrag(sim, { kind: 'furniture', id }, [id], downAt(0, 0));
    const before = sim.scene;
    drag.moveTo({ origin: { x: 0, y: 1, z: 0 }, direction: { x: 0, y: 1, z: 0 } });
    expect(sim.scene).toBe(before);
  });
});
