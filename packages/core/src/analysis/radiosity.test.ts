// The bounced-light solve against the laws it must obey in a closed room:
// reciprocity, every patch seeing exactly its hemisphere, the integrating
// sphere's average, and absorbed light equal to emitted light.
import { describe, expect, it } from 'vitest';
import { room } from '../test-fixtures';
import type { Room } from '../types';
import { roomPatches, type Patch } from './patches';
import {
  formFactors,
  indirectFromViews,
  indirectIlluminanceAt,
  pointViews,
  solveIndirectLight,
} from './radiosity';

const TOLERANCE = 1e-6;

/** The default room with every surface reflecting `rho`. */
const uniformRoom = (rho: number): Room => ({
  ...room,
  surfaces: {
    floor: { color: '#808080', reflectance: rho },
    walls: { color: '#808080', reflectance: rho },
    ceiling: { color: '#808080', reflectance: rho },
  },
});

/** Some uneven direct light: bright under a light near one corner, dim elsewhere. */
const unevenDirect = (patches: readonly Patch[]) =>
  patches.map(({ centre }) => 50 + 400 * Math.exp(-((centre.x - 1) ** 2 + (centre.z + 0.5) ** 2)));

describe('formFactors', () => {
  const patches = roomPatches(room, 0.5);
  const { count, values } = formFactors(patches);

  it('obeys reciprocity, A_i F_ij = A_j F_ji, for every pair', () => {
    let worst = 0;
    for (let i = 0; i < count; i++) {
      for (let j = i + 1; j < count; j++) {
        const forward = patches[i]!.area * values[i * count + j]!;
        const back = patches[j]!.area * values[j * count + i]!;
        if (forward > 1e-4) worst = Math.max(worst, Math.abs(forward / back - 1));
      }
    }
    // Exact by construction: derived for distant pairs, shared for close ones.
    expect(worst).toBeLessThan(1e-12);
  });

  it('has every patch see all of its hemisphere: each row adds up to about 1', () => {
    for (let i = 0; i < count; i++) {
      let row = 0;
      for (let j = 0; j < count; j++) row += values[i * count + j]!;
      expect(Math.abs(row - 1)).toBeLessThan(0.01);
    }
  });

  it('gives patches on one surface nothing of each other', () => {
    // The first patches are the floor's.
    expect(values[0 * count + 1]).toBe(0);
  });
});

describe('solveIndirectLight', () => {
  it('meets the integrating sphere: Σ A·M = ρ Φ / (1 − ρ) with one reflectance everywhere', () => {
    // Each patch reflects ρ of all it gets, and all it reflects lands on other
    // patches, so the total reflected flux is the geometric series ρΦ + ρ²Φ + …
    const rho = 0.6;
    const patches = roomPatches(uniformRoom(rho), 0.5);
    const direct = unevenDirect(patches);
    const light = solveIndirectLight(patches, formFactors(patches), direct, TOLERANCE);
    const directFlux = patches.reduce((sum, patch, i) => sum + patch.area * direct[i]!, 0);
    const reflectedFlux = patches.reduce(
      (sum, patch, i) => sum + patch.area * light.exitance[i]!,
      0,
    );
    expect(reflectedFlux / ((rho * directFlux) / (1 - rho))).toBeCloseTo(1, 2);
  });

  it('absorbs exactly what it receives from the luminaires, whatever the reflectances', () => {
    // A dark floor, mid walls, a white ceiling: what isn't reflected is absorbed.
    const mixed: Room = {
      ...room,
      surfaces: {
        floor: { color: '#404040', reflectance: 0.2 },
        walls: { color: '#a0a0a0', reflectance: 0.6 },
        ceiling: { color: '#f0f0f0', reflectance: 0.85 },
      },
    };
    const patches = roomPatches(mixed, 0.5);
    const factors = formFactors(patches);
    const direct = unevenDirect(patches);
    const light = solveIndirectLight(patches, factors, direct, TOLERANCE);
    let absorbed = 0;
    let emitted = 0;
    for (let i = 0; i < patches.length; i++) {
      // Light arriving: direct plus what every other patch sends here.
      let arriving = direct[i]!;
      for (let j = 0; j < patches.length; j++)
        arriving += factors.values[i * patches.length + j]! * light.exitance[j]!;
      absorbed += patches[i]!.area * (1 - patches[i]!.reflectance) * arriving;
      emitted += patches[i]!.area * direct[i]!;
    }
    expect(absorbed / emitted).toBeCloseTo(1, 2);
  });

  it('reflects nothing from a black room, and twice as much from twice the light', () => {
    const black = roomPatches(uniformRoom(0), 0.5);
    const none = solveIndirectLight(black, formFactors(black), unevenDirect(black), TOLERANCE);
    expect(Math.max(...none.exitance)).toBe(0);

    const grey = roomPatches(uniformRoom(0.5), 0.5);
    const factors = formFactors(grey);
    const once = solveIndirectLight(grey, factors, unevenDirect(grey), TOLERANCE);
    const twice = solveIndirectLight(
      grey,
      factors,
      unevenDirect(grey).map((e) => 2 * e),
      TOLERANCE,
    );
    for (let i = 0; i < grey.length; i++) {
      expect(twice.exitance[i]! / once.exitance[i]!).toBeCloseTo(2, 6);
    }
  });

  it('converges in tens of iterations', () => {
    const patches = roomPatches(uniformRoom(0.85), 0.5);
    const light = solveIndirectLight(patches, formFactors(patches), unevenDirect(patches), 1e-4);
    expect(light.iterations).toBeLessThan(100);
  });
});

describe('indirectIlluminanceAt', () => {
  it('gives a floor point what the room sends it: the integrating sphere’s value in a uniform room', () => {
    // With direct light the same everywhere, every patch reflects the same M
    // and every point receives M (its hemisphere sees only patches): the sphere's
    // E_indirect = ρ E_direct / (1 − ρ).
    const rho = 0.5;
    const patches = roomPatches(uniformRoom(rho), 0.5);
    const direct = patches.map(() => 100);
    const light = solveIndirectLight(patches, formFactors(patches), direct, TOLERANCE);
    const onFloor = indirectIlluminanceAt({ x: 0.3, y: 0, z: -0.4 }, { x: 0, y: 1, z: 0 }, light);
    expect(onFloor / ((rho * 100) / (1 - rho))).toBeCloseTo(1, 2);
    // And a work-plane point, which sees walls only above it: still M.
    const onDesk = indirectIlluminanceAt({ x: -1, y: 0.8, z: 0.5 }, { x: 0, y: 1, z: 0 }, light);
    expect(onDesk / ((rho * 100) / (1 - rho))).toBeCloseTo(1, 2);
  });
});

describe('pointViews', () => {
  it('weighs each patch as indirectIlluminanceAt does: the same light at every point', () => {
    const patches = roomPatches(uniformRoom(0.6), 0.5);
    const light = solveIndirectLight(
      patches,
      formFactors(patches),
      unevenDirect(patches),
      TOLERANCE,
    );
    const up = { x: 0, y: 1, z: 0 };
    const points = [
      { x: -2, y: 0.8, z: -1.5 },
      { x: 0.3, y: 0.8, z: 0.2 },
      { x: 2.4, y: 0, z: 1.9 },
    ];
    const views = pointViews(points, up, patches);
    points.forEach((point, k) => {
      expect(indirectFromViews(views, k, light)).toBeCloseTo(
        indirectIlluminanceAt(point, up, light),
        9,
      );
    });
  });
});
