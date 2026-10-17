// Furniture hiding bounced light (ADR 0063): the share of a patch a point
// sees past a box, and furniture faces as patches.
import { describe, expect, it } from 'vitest';
import { room } from '../test-fixtures';
import type { Blocker } from './occlusion';
import { boxPatches, rectanglePatches, roomPatches } from './patches';
import { formFactors, solveIndirectLight, UNBLOCKED } from './radiosity';
import { DEFAULT_CALCULATION_OPTIONS } from './options';
import { boxVisibility } from './visibility';

const DOWN = { x: 0, y: -1, z: 0 };
/** A 1 × 1 m ceiling patch over [−0.5, 0.5]², 2 m up, facing down: samples at ±0.25. */
const [ceiling] = rectanglePatches(
  { x: -0.5, y: 2, z: -0.5 },
  { x: 1, y: 0, z: 0 },
  { x: 0, y: 0, z: 1 },
  1,
  1,
  DOWN,
  0.8,
  1,
);
/** A table top at 0.75 m, covering x from −1 to `x1`, z from −1 to 1. */
const top = (x1: number): Blocker => ({
  centre: { x: (x1 - 1) / 2, y: 0.735, z: 0 },
  half: { x: (x1 + 1) / 2, y: 0.015, z: 1 },
  yawRad: 0,
  reflectance: 0.45,
});
const underTable = { x: 0, y: 0, z: 0 };

describe('boxVisibility', () => {
  it('sees everything when there is no furniture', () => {
    expect(boxVisibility([])).toBe(UNBLOCKED);
  });

  it('sees nothing of the ceiling from under a table that covers it all', () => {
    expect(boxVisibility([top(1)])(underTable, ceiling!)).toBe(0);
  });

  it('sees half the ceiling patch past a table that covers half the view', () => {
    // From (0, 0, 0) the rays to the samples at x = −0.25 cross the top at
    // x ≈ −0.09; those to x = +0.25 cross at x ≈ 0.09. A top ending at x = 0
    // blocks the first two of four.
    expect(boxVisibility([top(0)])(underTable, ceiling!)).toBe(0.5);
  });

  it('sees all of it past a table off to one side', () => {
    const aside: Blocker = { ...top(1), centre: { x: 3, y: 0.735, z: 0 } };
    expect(boxVisibility([aside])(underTable, ceiling!)).toBe(1);
  });
});

describe('boxPatches', () => {
  const box: Blocker = {
    centre: { x: 0.3, y: 0.4, z: -0.2 },
    half: { x: 0.6, y: 0.4, z: 0.3 },
    yawRad: 0.4,
    reflectance: 0.5,
  };

  it('covers the top and four sides of a box on the floor, not the face it stands on', () => {
    const area = boxPatches(box, 0.25).reduce((sum, p) => sum + p.area, 0);
    const [w, h, d] = [1.2, 0.8, 0.6];
    expect(area).toBeCloseTo(w * d + 2 * w * h + 2 * d * h, 9);
  });

  it('covers the underside of a raised table top too', () => {
    const area = boxPatches(top(1), 0.25).reduce((sum, p) => sum + p.area, 0);
    const [w, h, d] = [2, 0.03, 2];
    expect(area).toBeCloseTo(2 * w * d + 2 * w * h + 2 * d * h, 9);
  });

  it('faces out, with the box’s reflectance', () => {
    for (const patch of boxPatches(box, 0.25)) {
      const out = {
        x: patch.centre.x - box.centre.x,
        y: patch.centre.y - box.centre.y,
        z: patch.centre.z - box.centre.z,
      };
      expect(
        out.x * patch.normal.x + out.y * patch.normal.y + out.z * patch.normal.z,
      ).toBeGreaterThan(0);
      expect(patch.reflectance).toBe(0.5);
    }
  });
});

describe('bounced light with a box in the room', () => {
  const box: Blocker = {
    centre: { x: 0.3, y: 0.4, z: -0.2 },
    half: { x: 0.6, y: 0.4, z: 0.3 },
    yawRad: 0.4,
    reflectance: 0.5,
  };
  // At the default patch size: per-patch sampling errors grow with the patches.
  const size = DEFAULT_CALCULATION_OPTIONS.patchSizeM;
  const patches = [...roomPatches(room, size), ...boxPatches(box, size)];
  const factors = formFactors(patches, boxVisibility([box]));
  const { count, values } = factors;

  it('keeps reciprocity exact for every pair', () => {
    let worst = 0;
    for (let i = 0; i < count; i++) {
      for (let j = i + 1; j < count; j++) {
        const forward = patches[i]!.area * values[i * count + j]!;
        const back = patches[j]!.area * values[j * count + i]!;
        if (forward > 1e-4) worst = Math.max(worst, Math.abs(forward / back - 1));
      }
    }
    expect(worst).toBeLessThan(1e-12);
  });

  /** Whether a point is inside the box or on its faces, in the box's own frame. */
  const inBox = ({ x, y, z }: { x: number; y: number; z: number }) => {
    const [dx, dz] = [x - box.centre.x, z - box.centre.z];
    const [c, s] = [Math.cos(box.yawRad), Math.sin(box.yawRad)];
    return (
      Math.abs(dx * c - dz * s) <= box.half.x + 1e-9 &&
      Math.abs(y - box.centre.y) <= box.half.y + 1e-9 &&
      Math.abs(dx * s + dz * c) <= box.half.z + 1e-9
    );
  };

  it('has every patch in view see about its whole hemisphere, room and box together', () => {
    // Floor patches partly under the box see less, as they should. The rest
    // see within 1 % on average (measured 0.997), and each within 10 %:
    // visibility is sampled at four points per patch, so the bottom of the
    // box's sides sees the floor patches straddling its edge coarsely
    // (measured worst 8.2 %).
    let weighted = 0;
    let area = 0;
    for (let i = 0; i < count; i++) {
      const patch = patches[i]!;
      const onBox = patch.reflectance === box.reflectance;
      if (!onBox && patch.samples.some(inBox)) continue;
      let row = 0;
      for (let j = 0; j < count; j++) row += values[i * count + j]!;
      expect(Math.abs(row - 1)).toBeLessThan(0.1);
      weighted += row * patches[i]!.area;
      area += patches[i]!.area;
    }
    expect(Math.abs(weighted / area - 1)).toBeLessThan(0.01);
  });

  it('absorbs about what it receives from the luminaires', () => {
    const direct = patches.map(
      ({ centre }) => 100 + 300 * Math.exp(-(centre.x ** 2 + centre.z ** 2)),
    );
    const light = solveIndirectLight(patches, factors, direct, 1e-6, [box]);
    let absorbed = 0;
    let emitted = 0;
    for (let i = 0; i < count; i++) {
      let arriving = direct[i]!;
      for (let j = 0; j < count; j++) arriving += values[i * count + j]! * light.exitance[j]!;
      absorbed += patches[i]!.area * (1 - patches[i]!.reflectance) * arriving;
      emitted += patches[i]!.area * direct[i]!;
    }
    expect(Math.abs(absorbed / emitted - 1)).toBeLessThan(0.02);
  });
});
