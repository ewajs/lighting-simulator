import { describe, expect, it } from 'vitest';
import type { Ray } from './placement';
import { Simulator } from './simulator';
import { catalog } from './test-fixtures';
import { bearingAround, TurnDrag } from './turn';

/** Straight down onto the point (x, ·, z). */
const downOnto = (x: number, z: number): Ray => ({
  origin: { x, y: 5, z },
  direction: { x: 0, y: -1, z: 0 },
});

const luminaireOf = (sim: Simulator, id: string) => sim.scene.luminaires.find((l) => l.id === id)!;
const pieceOf = (sim: Simulator, id: string) => sim.scene.furniture.find((f) => f.id === id)!;

describe('bearingAround', () => {
  const center = { x: 0, y: 2.7, z: 0 };

  it('reads the pointer around the vertical like pan', () => {
    expect(bearingAround(downOnto(0, 1), center)).toBeCloseTo(0);
    expect(bearingAround(downOnto(1, 0), center)).toBeCloseTo(90);
    expect(bearingAround(downOnto(-1, 0), center)).toBeCloseTo(-90);
  });

  it('is null for rays parallel to the ring or pointing away', () => {
    const level: Ray = { origin: { x: 0, y: 2.7, z: 3 }, direction: { x: 0, y: 0, z: -1 } };
    expect(bearingAround(level, center)).toBeNull();
    const up: Ray = { origin: { x: 0, y: 5, z: 0 }, direction: { x: 0, y: 1, z: 0 } };
    expect(bearingAround(up, center)).toBeNull();
  });
});

describe('TurnDrag: luminaire pan', () => {
  it('turns pan by the pointer’s turn around the luminaire, keeping tilt', () => {
    const sim = new Simulator({ catalog });
    const id = sim.addLuminaire('test-recessed');
    sim.updateLuminaire(id, { aim: { tiltDeg: 30, panDeg: 100 } });
    // Grabbed in front (+z), dragged a quarter turn to the right (+x): +90°, wrapped.
    const drag = new TurnDrag(sim, { kind: 'luminaire', id }, downOnto(0, 1));
    drag.moveTo(downOnto(1, 0));
    expect(luminaireOf(sim, id).aim.tiltDeg).toBe(30);
    expect(luminaireOf(sim, id).aim.panDeg).toBeCloseTo(-170);
  });

  it('turns in 15° steps when snapping', () => {
    const sim = new Simulator({ catalog });
    const id = sim.addLuminaire('test-recessed');
    sim.updateLuminaire(id, { aim: { tiltDeg: 30, panDeg: 100 } });
    // A free quarter turn gives −170°; the nearest step is −165°.
    new TurnDrag(sim, { kind: 'luminaire', id }, downOnto(0, 1)).moveTo(downOnto(1, 0), {
      toleranceM: 0.05,
    });
    expect(luminaireOf(sim, id).aim.panDeg).toBe(-165);
  });
});

describe('TurnDrag: furniture rotation', () => {
  it('turns a piece by the pointer’s turn around it, in 15° steps, as one undo step', () => {
    const sim = new Simulator({ catalog });
    const id = sim.addFurniture('sofa', { at: { x: 1, z: 0 }, rotationDeg: 30 });
    // Grabbed in front of it (+z), dragged a quarter turn to its right (+x).
    const drag = new TurnDrag(sim, { kind: 'furniture', id }, downOnto(1, 1));
    drag.moveTo(downOnto(1.5, 0.5));
    expect(pieceOf(sim, id).rotationDeg).toBeCloseTo(75);
    drag.moveTo(downOnto(2, 0.1), { toleranceM: 0.05 });
    // atan2(1, 0.1) ≈ 84.3°, +30° ≈ 114.3°: the nearest step is 120°.
    expect(pieceOf(sim, id).rotationDeg).toBe(120);
    expect(pieceOf(sim, id).position).toEqual({ x: 1, y: 0, z: 0 });
    sim.undo();
    expect(pieceOf(sim, id).rotationDeg).toBe(30);
  });

  it('ignores a piece removed during the drag', () => {
    const sim = new Simulator({ catalog });
    const id = sim.addFurniture('chair');
    const drag = new TurnDrag(sim, { kind: 'furniture', id }, downOnto(0, 1));
    sim.remove([id]);
    const before = sim.scene;
    drag.moveTo(downOnto(1, 0));
    expect(sim.scene).toBe(before);
  });
});
