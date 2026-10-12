import { describe, expect, it } from 'vitest';
import type { Photometry } from '../types';
import { beamAngleDeg, candelaAt, horizontalSymmetry, totalFlux } from './distribution';

function photometry(
  verticalDeg: number[],
  horizontalDeg: number[],
  candela: number[][],
): Photometry {
  return { verticalDeg, horizontalDeg, candela, power: 10, keywords: {} };
}

/** 100 cd in every direction. */
const ISOTROPIC = photometry([0, 90, 180], [0], [[100, 100, 100]]);
/** Downward only, falling linearly from 100 cd at nadir to 0 at 90°. */
const LINEAR_DOWN = photometry([0, 90], [0], [[100, 0]]);

describe('horizontalSymmetry', () => {
  it('recognises each LM-63 Type C layout', () => {
    expect(horizontalSymmetry([0])).toBe('rotational');
    expect(horizontalSymmetry([0, 45, 90])).toBe('quadrant');
    expect(horizontalSymmetry([0, 90, 180])).toBe('bilateral');
    expect(horizontalSymmetry([90, 180, 270])).toBe('bilateral-90');
    expect(horizontalSymmetry([0, 90, 180, 270, 360])).toBe('none');
    expect(horizontalSymmetry([0, 120, 240])).toBe('none');
  });

  it('rejects ranges LM-63 doesn’t define', () => {
    expect(horizontalSymmetry([0, 45])).toBeUndefined();
    expect(horizontalSymmetry([10, 180])).toBeUndefined();
    expect(horizontalSymmetry([])).toBeUndefined();
  });
});

describe('candelaAt', () => {
  it('returns the table values at measured angles', () => {
    expect(candelaAt(ISOTROPIC, 0, 0)).toBe(100);
    expect(candelaAt(ISOTROPIC, 180, 0)).toBe(100);
    expect(candelaAt(LINEAR_DOWN, 0, 0)).toBe(100);
  });

  it('interpolates linearly between vertical angles', () => {
    // 100 · (1 − 30/90) = 66.67 cd, at any horizontal angle.
    expect(candelaAt(LINEAR_DOWN, 30, 0)).toBeCloseTo(66.667, 3);
    expect(candelaAt(LINEAR_DOWN, 30, 217)).toBeCloseTo(66.667, 3);
  });

  it('is 0 outside the measured vertical range', () => {
    expect(candelaAt(LINEAR_DOWN, 120, 0)).toBe(0);
    const uplight = photometry([90, 180], [0], [[50, 100]]);
    expect(candelaAt(uplight, 45, 0)).toBe(0);
    expect(candelaAt(uplight, 135, 0)).toBe(75);
  });

  it('mirrors a quadrant-symmetric file into all four quadrants', () => {
    const quadrant = photometry(
      [0, 90],
      [0, 90],
      [
        [100, 0],
        [300, 0],
      ],
    );
    expect(candelaAt(quadrant, 0, 45)).toBe(200);
    expect(candelaAt(quadrant, 0, 180)).toBe(100); // mirrors 0°
    expect(candelaAt(quadrant, 0, 270)).toBe(300); // mirrors 90°
    expect(candelaAt(quadrant, 0, 315)).toBe(200); // mirrors 45°
    expect(candelaAt(quadrant, 0, -45)).toBe(200);
    // Bilinear: halfway in both directions → (100 + 300)/2 · 1/2 = 100 cd.
    expect(candelaAt(quadrant, 45, 45)).toBe(100);
  });

  it('mirrors a 0–180° file across the 0°–180° plane', () => {
    const bilateral = photometry(
      [0, 90],
      [0, 90, 180],
      [
        [100, 0],
        [200, 0],
        [400, 0],
      ],
    );
    expect(candelaAt(bilateral, 0, 270)).toBe(200);
    expect(candelaAt(bilateral, 0, 225)).toBe(300); // mirrors 135°
  });

  it('mirrors a legacy 90–270° file across the 90°–270° plane', () => {
    const legacy = photometry(
      [0, 90],
      [90, 180, 270],
      [
        [100, 0],
        [200, 0],
        [400, 0],
      ],
    );
    expect(candelaAt(legacy, 0, 0)).toBe(200); // mirrors 180°
    expect(candelaAt(legacy, 0, 45)).toBe(150); // mirrors 135°
    expect(candelaAt(legacy, 0, 315)).toBe(300); // mirrors 225°
  });

  it('wraps an unsymmetric file that stops short of 360°', () => {
    const full = photometry(
      [0, 90],
      [0, 90, 180, 270],
      [
        [100, 0],
        [200, 0],
        [300, 0],
        [400, 0],
      ],
    );
    expect(candelaAt(full, 0, 270)).toBe(400);
    expect(candelaAt(full, 0, 315)).toBe(250); // halfway from 400 back to 100
    expect(candelaAt(full, 0, 360)).toBe(100);
  });
});

describe('totalFlux', () => {
  it('integrates an isotropic source to 4π · I', () => {
    // 4π · 100 = 1256.64 lm.
    expect(totalFlux(ISOTROPIC)).toBeCloseTo(400 * Math.PI, 9);
  });

  it('integrates a linear fall-off exactly', () => {
    // 2π ∫₀^{π/2} 100 (1 − 2θ/π) sin θ dθ = 2π · 100 (1 − 2/π) = 200π − 400 = 228.32 lm.
    expect(totalFlux(LINEAR_DOWN)).toBeCloseTo(200 * Math.PI - 400, 9);
  });

  it('averages the rows of a quadrant-symmetric file', () => {
    // Rows of 100 and 300 cd each cover half the circle → 200 cd average → 4π · 200.
    const quadrant = photometry(
      [0, 180],
      [0, 90],
      [
        [100, 100],
        [300, 300],
      ],
    );
    expect(totalFlux(quadrant)).toBeCloseTo(800 * Math.PI, 9);
  });

  it('includes the wrap-around arc of an unsymmetric file', () => {
    // Four rows, each covering 90° of the circle → 250 cd average → 4π · 250.
    const full = photometry(
      [0, 180],
      [0, 90, 180, 270],
      [
        [100, 100],
        [200, 200],
        [300, 300],
        [400, 400],
      ],
    );
    expect(totalFlux(full)).toBeCloseTo(1000 * Math.PI, 9);
  });
});

describe('beamAngleDeg', () => {
  it('finds the 50 % points of a spot', () => {
    // 500 cd lies between 800 cd at 10° and 400 cd at 20°: 10 + 300/400 · 10 = 17.5° → 35°.
    const spot = photometry([0, 10, 20, 30, 90], [0], [[1000, 800, 400, 0, 0]]);
    expect(beamAngleDeg(spot)).toBeCloseTo(35, 9);
  });

  it('measures a batwing outward from its off-axis peak', () => {
    // Peak 100 cd at 30°; 50 cd lies between 30° and 60°: 30 + 50/60 · 30 = 55° → 110°.
    const batwing = photometry([0, 30, 60, 90], [0], [[60, 100, 40, 0]]);
    expect(beamAngleDeg(batwing)).toBeCloseTo(110, 9);
  });

  it('measures an uplight around the zenith', () => {
    // 50 % of 100 cd at 135°, 45° from the zenith → 90°.
    const uplight = photometry([90, 180], [0], [[0, 100]]);
    expect(beamAngleDeg(uplight)).toBeCloseTo(90, 9);
  });

  it('gives the full spread when intensity never halves', () => {
    expect(beamAngleDeg(ISOTROPIC)).toBe(360);
    expect(beamAngleDeg(LINEAR_DOWN)).toBeCloseTo(90, 9);
  });
});
