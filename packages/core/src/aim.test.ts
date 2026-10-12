import { describe, expect, it } from 'vitest';
import {
  AimPointDrag,
  aimAt,
  aimDirection,
  beamHit,
  bearingAround,
  isAimable,
  PanDrag,
  wrapDeg,
} from './aim';
import type { Ray } from './placement';
import { Simulator } from './simulator';
import { catalog, product, room } from './test-fixtures';
import type { Vec3 } from './types';

const expectClose = (actual: Vec3, expected: Vec3) => {
  expect(actual.x).toBeCloseTo(expected.x);
  expect(actual.y).toBeCloseTo(expected.y);
  expect(actual.z).toBeCloseTo(expected.z);
};

/** Straight down onto the point (x, ·, z). */
const downOnto = (x: number, z: number): Ray => ({
  origin: { x, y: 5, z },
  direction: { x: 0, y: -1, z: 0 },
});

const luminaireOf = (sim: Simulator, id: string) => sim.scene.luminaires.find((l) => l.id === id)!;

describe('isAimable', () => {
  it('applies to recessed and track heads only', () => {
    expect(isAimable(product('recessed'))).toBe(true);
    expect(isAimable(product('track'))).toBe(true);
    expect(isAimable(product('pendant'))).toBe(false);
    expect(isAimable(product('wall'))).toBe(false);
  });
});

describe('aimDirection', () => {
  it('points down, tilts towards +z, then pans around the vertical', () => {
    expectClose(aimDirection({ tiltDeg: 0, panDeg: 0 }), { x: 0, y: -1, z: 0 });
    expectClose(aimDirection({ tiltDeg: 90, panDeg: 0 }), { x: 0, y: 0, z: 1 });
    expectClose(aimDirection({ tiltDeg: 90, panDeg: 90 }), { x: 1, y: 0, z: 0 });
    const h = Math.SQRT1_2;
    expectClose(aimDirection({ tiltDeg: 45, panDeg: -90 }), { x: -h, y: -h, z: 0 });
  });
});

describe('beamHit', () => {
  it('lands on the floor straight below at zero tilt', () => {
    expectClose(beamHit({ x: 1, y: 2.7, z: -1 }, { tiltDeg: 0, panDeg: 0 }, room), {
      x: 1,
      y: 0,
      z: -1,
    });
  });

  it('lands on the first wall the beam reaches', () => {
    // The starter scene's spot: 1.5 m to the left wall at 45°, so 1.5 m lower.
    const spot = { x: -1, y: 2.7, z: 0.8 };
    expectClose(beamHit(spot, { tiltDeg: 45, panDeg: -90 }, room), { x: -2.5, y: 1.2, z: 0.8 });
    // Level, towards the front wall 2 m away.
    expectClose(beamHit({ x: 0, y: 2.7, z: 0 }, { tiltDeg: 90, panDeg: 0 }, room), {
      x: 0,
      y: 2.7,
      z: 2,
    });
  });
});

describe('aimAt', () => {
  const ceiling = { x: -1, y: 2.7, z: 0.8 };

  it('inverts beamHit', () => {
    const aim = aimAt(ceiling, { x: -2.5, y: 1.2, z: 0.8 }, 0);
    expect(aim.tiltDeg).toBeCloseTo(45);
    expect(aim.panDeg).toBeCloseTo(-90);
  });

  it('keeps the current pan for a target straight below', () => {
    expect(aimAt(ceiling, { x: -1, y: 0, z: 0.8 }, 30)).toEqual({ tiltDeg: 0, panDeg: 30 });
  });

  it('stops at level for targets above the luminaire', () => {
    expect(aimAt({ x: 0, y: 2, z: 0 }, { x: 0, y: 2.7, z: 1 }, 0).tiltDeg).toBe(90);
  });
});

describe('wrapDeg', () => {
  it('wraps into [−180, 180)', () => {
    expect(wrapDeg(190)).toBe(-170);
    expect(wrapDeg(-190)).toBe(170);
    expect(wrapDeg(180)).toBe(-180);
    expect(wrapDeg(45)).toBe(45);
  });
});

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

describe('AimPointDrag', () => {
  it('aims at where the ray meets the room, as one undo step', () => {
    const sim = new Simulator({ catalog });
    const id = sim.addLuminaire('test-recessed'); // At (0, 2.7, 0).
    const drag = new AimPointDrag(sim, id);
    drag.moveTo(downOnto(1, 0));
    drag.moveTo(downOnto(2, 0));
    // 2 m across and 2.7 m down.
    expect(luminaireOf(sim, id).aim.tiltDeg).toBeCloseTo(Math.atan2(2, 2.7) / (Math.PI / 180));
    expect(luminaireOf(sim, id).aim.panDeg).toBeCloseTo(90);
    sim.undo();
    expect(luminaireOf(sim, id).aim).toEqual({ tiltDeg: 0, panDeg: 0 });
  });

  it('ignores rays that miss the room', () => {
    const sim = new Simulator({ catalog });
    const id = sim.addLuminaire('test-recessed');
    const before = sim.scene;
    new AimPointDrag(sim, id).moveTo(downOnto(9, 0));
    expect(sim.scene).toBe(before);
  });
});

describe('PanDrag', () => {
  it('turns pan by the pointer’s turn around the luminaire, keeping tilt', () => {
    const sim = new Simulator({ catalog });
    const id = sim.addLuminaire('test-recessed');
    sim.updateLuminaire(id, { aim: { tiltDeg: 30, panDeg: 100 } });
    // Grabbed in front (+z), dragged a quarter turn to the right (+x): +90°, wrapped.
    const drag = new PanDrag(sim, id, downOnto(0, 1));
    drag.moveTo(downOnto(1, 0));
    expect(luminaireOf(sim, id).aim.tiltDeg).toBe(30);
    expect(luminaireOf(sim, id).aim.panDeg).toBeCloseTo(-170);
  });
});
