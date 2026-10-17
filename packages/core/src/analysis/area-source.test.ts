// Splitting a luminous opening into cells, against the exact illuminance of a
// glowing rectangle (ADR 0069): a check that depends on neither Radiance nor
// the room description, only on a textbook formula.
import { describe, expect, it } from 'vitest';
import { luminaireFrame } from '../luminaire-frame';
import { photometry, product, room } from '../test-fixtures';
import type { Vec3 } from '../types';
import { rectangleIlluminance } from './area-source';
import { directIlluminance } from './direct';
import { distributionOf, luminaireSources } from './sources';

const PEAK_CD = 1000;
/** A 60 × 60 cm panel: large enough that its cells matter close to it. */
const SIDE_M = 0.6;
const HEIGHT_M = 2;
const UP: Vec3 = { x: 0, y: 1, z: 0 };

// A Lambertian panel: I(γ) = I₀ cos γ, every degree, nothing upwards.
const GAMMAS = Array.from({ length: 181 }, (_, i) => i);
const panel = photometry(
  GAMMAS,
  [0],
  [GAMMAS.map((g) => (g <= 90 ? PEAK_CD * Math.cos((g * Math.PI) / 180) : 0))],
  { widthM: SIDE_M, lengthM: SIDE_M, heightM: 0, round: false },
);
const frame = luminaireFrame(
  {
    id: 'l',
    productId: 'test-recessed',
    position: { x: 0, y: HEIGHT_M, z: 0 },
    aim: { tiltDeg: 0, panDeg: 0 },
    dimming: 1,
    on: true,
    cct: 3000,
  },
  'recessed',
  room,
  { lightOrigin: { x: 0, y: 0, z: 0 } },
);

/** ours / exact − 1 at `distanceM` below the panel, `offsetM` across from its centre. */
function error(cellM: number, distanceM: number, offsetM = 0): number {
  const sources = luminaireSources(
    frame,
    distributionOf(product('recessed'), panel),
    panel.luminousOpening,
    1,
    cellM,
  );
  const point = { x: offsetM, y: HEIGHT_M - distanceM, z: 0 };
  const ours = directIlluminance(point, UP, sources, []);
  return ours / rectangleIlluminance(PEAK_CD, SIDE_M, SIDE_M, distanceM, offsetM) - 1;
}

describe('rectangleIlluminance: the formula itself', () => {
  it('tends to the inverse-square law far away: E → I₀ / d²', () => {
    // The panel's own size still shows, by about (side / d)² / 3.
    expect(rectangleIlluminance(PEAK_CD, SIDE_M, SIDE_M, 100) / (PEAK_CD / 100 ** 2)).toBeCloseTo(
      1,
      4,
    );
  });

  it('is π · L right against the panel, where it fills the view', () => {
    const luminance = PEAK_CD / SIDE_M ** 2;
    expect(rectangleIlluminance(PEAK_CD, SIDE_M, SIDE_M, 1e-6)).toBeCloseTo(Math.PI * luminance, 2);
  });

  it('halves at an edge of a very large panel, which then fills half the view', () => {
    const big = 1e4;
    const centre = rectangleIlluminance(PEAK_CD, big, big, 1);
    expect(rectangleIlluminance(PEAK_CD, big, big, 1, big / 2) / centre).toBeCloseTo(0.5, 3);
  });
});

describe('a 60 × 60 cm Lambertian panel, split into cells, against the exact value', () => {
  it('as a single point, is far off close to it: why openings are split', () => {
    // Measured: +47 % at 0.5 m below the centre, −11 % 0.6 m across.
    expect(error(Number.POSITIVE_INFINITY, 0.5)).toBeGreaterThan(0.4);
    expect(error(Number.POSITIVE_INFINITY, 0.5, 0.6)).toBeLessThan(-0.1);
  });

  it('with 10 cm cells, is within 1 % from two cells away, below it or beside it', () => {
    // Measured worst: 0.63 % at 0.5 m below the centre.
    for (const [distanceM, offsetM] of [
      [0.2, 0],
      [0.5, 0],
      [1, 0],
      [0.2, 0.3],
      [0.5, 0.6],
      [1, 1],
    ] as const) {
      expect(
        Math.abs(error(0.1, distanceM, offsetM)),
        `${distanceM} m, ${offsetM} across`,
      ).toBeLessThan(0.01);
    }
  });

  it('converges as the cells shrink: each halving cuts the error about four times', () => {
    // Measured at 0.1 m below the centre: −2.25 %, +0.05 %, +0.01 %; at 0.5 m:
    // 0.63 %, 0.15 %, 0.04 %.
    expect(Math.abs(error(0.1, 0.1))).toBeLessThan(0.03);
    expect(Math.abs(error(0.05, 0.1))).toBeLessThan(0.002);
    expect(Math.abs(error(0.025, 0.1))).toBeLessThan(0.001);
    const at = (cellM: number) => Math.abs(error(cellM, 0.5));
    expect(at(0.05)).toBeLessThan(at(0.1) / 3);
    expect(at(0.025)).toBeLessThan(at(0.05) / 3);
  });

  it('closer than a cell, needs smaller cells: 30 % off with 10 cm at 5 cm away', () => {
    expect(error(0.1, 0.05)).toBeLessThan(-0.25);
    expect(Math.abs(error(0.025, 0.05))).toBeLessThan(0.001);
  });
});
