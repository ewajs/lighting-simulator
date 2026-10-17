import { describe, expect, it } from 'vitest';
import { luminaireFrame } from '../luminaire-frame';
import { candela } from '../photometry/estimate';
import { isotropic, product, room } from '../test-fixtures';
import type { LuminousOpening } from '../types';
import { DEFAULT_CALCULATION_OPTIONS } from './options';
import { distributionOf, intensityAt, luminaireSources } from './sources';

const frame = luminaireFrame(
  {
    id: 'l',
    productId: 'test-recessed',
    position: { x: 0, y: 2.7, z: 0 },
    aim: { tiltDeg: 0, panDeg: 0 },
    dimming: 1,
    on: true,
    cct: 3000,
  },
  'recessed',
  room,
  { lightOrigin: { x: 0, y: 0, z: 0 } },
);
const opening = (widthM: number, lengthM: number, round = false): LuminousOpening => ({
  widthM,
  lengthM,
  heightM: 0,
  round,
});
const distribution = distributionOf(product('recessed'), isotropic(100));

describe('luminaireSources', () => {
  it('is one point at the photometric centre for a point opening', () => {
    const sources = luminaireSources(frame, distribution, opening(0, 0), 1);
    expect(sources).toHaveLength(1);
    expect(sources[0]!.position).toEqual({ x: 0, y: 2.7, z: 0 });
    expect(sources[0]!.scale).toBe(1);
  });

  it('is none when the luminaire is off or dimmed to 0', () => {
    expect(luminaireSources(frame, distribution, opening(1, 1), 0)).toEqual([]);
  });

  it('splits a 1.22 m × 5.4 cm linear opening into 13 cells along its length', () => {
    // ceil(1.22 / 0.1) = 13 along z, ceil(0.054 / 0.1) = 1 across x.
    const sources = luminaireSources(frame, distribution, opening(0.054, 1.22), 0.8);
    expect(sources).toHaveLength(13);
    const zs = sources.map((source) => source.position.z);
    expect(Math.min(...zs)).toBeCloseTo(-0.61 + 1.22 / 26, 12);
    expect(Math.max(...zs)).toBeCloseTo(0.61 - 1.22 / 26, 12);
    for (const source of sources) expect(source.position.x).toBe(0);
    // The shares add back up to the level.
    expect(sources.reduce((sum, source) => sum + source.scale, 0)).toBeCloseTo(0.8, 12);
  });

  it('keeps the cells inside a round opening: a 15.24 cm disk gives a 2 × 2 grid, all inside', () => {
    const sources = luminaireSources(frame, distribution, opening(0.1524, 0.1524, true), 1);
    expect(sources).toHaveLength(4);
    // Cell centres at ±0.0381 m: 0.0539 m from the centre, inside the 0.0762 m radius.
    expect(sources[0]!.scale).toBe(0.25);
  });

  it('drops the corner cells of a larger round opening', () => {
    // 0.5 m disk: a 5 × 5 grid of 10 cm cells, whose four corner centres
    // (±0.2, ±0.2) are 0.283 m out, beyond the 0.25 m radius.
    expect(luminaireSources(frame, distribution, opening(0.5, 0.5, true), 1)).toHaveLength(21);
    expect(luminaireSources(frame, distribution, opening(0.5, 0.5), 1)).toHaveLength(25);
  });

  it('splits a tall opening in height too: a 23 × 13 × 51 cm box becomes 3 × 2 × 6 cells', () => {
    // A sconce's glowing box (Visa Colonnade). Without height layers, points
    // close to it read up to 60 % off Radiance's (ADR 0058).
    const box = { widthM: 0.235, lengthM: 0.131, heightM: 0.509, round: false };
    const sources = luminaireSources(frame, distribution, box, 1);
    expect(sources).toHaveLength(36);
    const heights = [...new Set(sources.map((source) => source.position.y.toFixed(6)))].map(Number);
    expect(heights).toHaveLength(6);
    // Layers centred on the photometric centre (2.7 m), 0.509 / 6 m apart.
    expect(Math.min(...heights)).toBeCloseTo(2.7 - 0.509 / 2 + 0.509 / 12, 6);
    expect(Math.max(...heights)).toBeCloseTo(2.7 + 0.509 / 2 - 0.509 / 12, 6);
  });

  it('keeps every cell no larger than the options’ sourceCellM', () => {
    const sources = luminaireSources(frame, distribution, opening(0.35, 0.21), 1);
    // ceil(0.35 / 0.1) = 4 across, ceil(0.21 / 0.1) = 3 along.
    expect(sources).toHaveLength(12);
    expect(0.35 / 4).toBeLessThanOrEqual(DEFAULT_CALCULATION_OPTIONS.sourceCellM);
  });
});

describe('distributionOf', () => {
  it('uses the IES file when there is one', () => {
    const file = isotropic(100);
    expect(distributionOf(product('recessed'), file)).toEqual({ kind: 'ies', photometry: file });
  });

  it('spreads a spot’s flux evenly over its beam, as the renderer estimates it', () => {
    const spot = product('recessed', { beamDeg: 36 });
    const estimated = distributionOf(spot, undefined);
    expect(estimated).toEqual({ kind: 'estimated', candela: candela(spot), halfAngleDeg: 18 });
    expect(intensityAt(estimated, 17.9, 0)).toBe(candela(spot));
    expect(intensityAt(estimated, 18.1, 0)).toBe(0);
  });

  it('spreads a wide product’s flux over the whole sphere: Φ / 4π', () => {
    const wide = product('floor', { beamDeg: 160, flux: 800 });
    const estimated = distributionOf(wide, undefined);
    expect(intensityAt(estimated, 170, 0)).toBeCloseTo(800 / (4 * Math.PI), 12);
  });
});
