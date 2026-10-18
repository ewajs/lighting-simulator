import { describe, expect, it } from 'vitest';
import { ItemDrag } from './drag';
import type { Ray } from './placement';
import { Simulator } from './simulator';
import { catalog } from './test-fixtures';

/** Looking down at 45° towards −z, from above the point (x, 2.7, z − 2) of the ceiling. */
const downAt = (x: number, z: number): Ray => ({
  origin: { x, y: 4.7, z: z + 2 },
  direction: { x: 0, y: -1, z: -1 },
});

const positionOf = (sim: Simulator, id: string) =>
  sim.scene.luminaires.find((l) => l.id === id)!.position;

describe('ItemDrag: luminaires', () => {
  it('slides along the mount surface, keeping the offset from where it was grabbed', () => {
    const sim = new Simulator({ catalog });
    const id = sim.addLuminaire('test-recessed'); // At (0, 2.7, 0).
    // Grabbed 0.2 m off its centre in x and z.
    const drag = new ItemDrag(sim, { kind: 'luminaire', id }, [id], downAt(0.2, 0.2));
    drag.moveTo(downAt(1.2, 0.7));
    expect(positionOf(sim, id)).toEqual({ x: 1, y: 2.7, z: 0.5 });
  });

  it('keeps the luminaire inside the room', () => {
    const sim = new Simulator({ catalog });
    const id = sim.addLuminaire('test-recessed');
    new ItemDrag(sim, { kind: 'luminaire', id }, [id], downAt(0, 0)).moveTo(downAt(9, 0));
    expect(positionOf(sim, id).x).toBe(2.5);
  });

  it('records the whole drag as one undo step', () => {
    const sim = new Simulator({ catalog });
    const id = sim.addLuminaire('test-recessed');
    const drag = new ItemDrag(sim, { kind: 'luminaire', id }, [id], downAt(0, 0));
    drag.moveTo(downAt(0.5, 0));
    drag.moveTo(downAt(1, 0));
    sim.undo();
    expect(positionOf(sim, id)).toEqual({ x: 0, y: 2.7, z: 0 });
    expect(sim.scene.luminaires).toHaveLength(1); // The add is a separate step.
  });

  it('moves the rest of the group by the same horizontal offset', () => {
    const sim = new Simulator({ catalog });
    const grabbed = sim.addLuminaire('test-recessed');
    const pendant = sim.addLuminaire('test-pendant', { at: { x: -1, z: 1 } }); // At y = 2.0.
    const wall = sim.addLuminaire('test-wall'); // Back wall, (0, 1.8, −2).
    const drag = new ItemDrag(
      sim,
      { kind: 'luminaire', id: grabbed },
      [grabbed, pendant, wall],
      downAt(0, 0),
    );
    drag.moveTo(downAt(1, 0.5));
    expect(positionOf(sim, pendant)).toEqual({ x: 0, y: 2, z: 1.5 });
    // Stays on its wall: the z offset is undone by the wall snap.
    expect(positionOf(sim, wall)).toEqual({ x: 1, y: 1.8, z: -2 });
  });

  it('ignores rays that miss the surface', () => {
    const sim = new Simulator({ catalog });
    const id = sim.addLuminaire('test-recessed');
    const drag = new ItemDrag(sim, { kind: 'luminaire', id }, [id], downAt(0, 0));
    const before = sim.scene;
    drag.moveTo({ origin: { x: 0, y: 4.7, z: 2 }, direction: { x: 0, y: 1, z: -1 } });
    expect(sim.scene).toBe(before);
  });

  it('skips luminaires removed during the drag', () => {
    const sim = new Simulator({ catalog });
    const grabbed = sim.addLuminaire('test-recessed');
    const other = sim.addLuminaire('test-floor');
    const drag = new ItemDrag(
      sim,
      { kind: 'luminaire', id: grabbed },
      [grabbed, other],
      downAt(0, 0),
    );
    sim.remove([other]);
    expect(() => drag.moveTo(downAt(1, 0))).not.toThrow();
    expect(positionOf(sim, grabbed).x).toBe(1);
  });

  it('rejects unknown luminaires', () => {
    const sim = new Simulator({ catalog });
    expect(() => new ItemDrag(sim, { kind: 'luminaire', id: 'missing' }, [], downAt(0, 0))).toThrow(
      /missing/,
    );
  });

  it('snaps to the grid, or lines up with luminaires outside the group', () => {
    const sim = new Simulator({ catalog });
    const id = sim.addLuminaire('test-recessed');
    const snap = { toleranceM: 0.05 };
    const guides = new ItemDrag(sim, { kind: 'luminaire', id }, [id], downAt(0, 0)).moveTo(
      downAt(1.234, 0.47),
      snap,
    );
    expect(positionOf(sim, id)).toEqual({ x: 1.2, y: 2.7, z: 0.5 });
    expect(guides).toEqual([]);

    const other = sim.addLuminaire('test-floor', { at: { x: 1.27, z: -1.5 } });
    const aligned = new ItemDrag(sim, { kind: 'luminaire', id }, [id], downAt(1.2, 0.5)).moveTo(
      downAt(1.3, 0.5),
      snap,
    );
    expect(positionOf(sim, id).x).toBe(positionOf(sim, other).x);
    expect(aligned).toEqual([{ axis: 'x', value: 1.27 }]);
  });

  it('keeps a pendant’s height when snapping', () => {
    const sim = new Simulator({ catalog });
    const id = sim.addLuminaire('test-pendant');
    sim.updateLuminaire(id, { position: { x: 0, y: 2.03, z: 0 } });
    // Level with the pendant, so the ray meets its plane: grabbed from the side.
    const level = (x: number): Ray => ({
      origin: { x, y: 4.03, z: 2 },
      direction: { x: 0, y: -1, z: -1 },
    });
    new ItemDrag(sim, { kind: 'luminaire', id }, [id], level(0)).moveTo(level(0.52), {
      toleranceM: 0.01,
    });
    expect(positionOf(sim, id)).toEqual({ x: 0.5, y: 2.03, z: 0 });
  });
});

describe('ItemDrag: windows', () => {
  it('slides a window over its own wall, kept inside it, as one undo step', () => {
    const sim = new Simulator({ catalog });
    const id = sim.addWindow('window'); // On the back wall, centred at (0, 1.5, −2).
    const at = (x: number, y: number): Ray => ({
      origin: { x, y, z: 2 },
      direction: { x: 0, y: 0, z: -1 },
    });
    // Grabbed 0.3 m right of its centre.
    const drag = new ItemDrag(sim, { kind: 'window', id }, [id], at(0.3, 1.5));
    drag.moveTo(at(1.3, 1.7));
    expect(sim.scene.windows[0]!.position).toEqual({ x: 1, y: 1.7, z: -2 });
    drag.moveTo(at(9, 1.7));
    expect(sim.scene.windows[0]!.position.x).toBeCloseTo(2.5 - 0.05 - 0.6, 12);
    sim.undo();
    expect(sim.scene.windows[0]!.position).toEqual({ x: 0, y: 1.5, z: -2 });
  });
});
