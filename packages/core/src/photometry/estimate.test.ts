import { describe, expect, it } from 'vitest';
import { product } from '../test-fixtures';
import { candela, isSpot, WIDE_BEAM_DEG } from './estimate';

describe('candela', () => {
  it('spreads a spot’s flux over its beam cone', () => {
    // 1000 lm over a 60° beam: Ω = 2π(1 − cos 30°) = 0.84179 sr → 1187.95 cd.
    expect(candela(product('recessed', { flux: 1000, beamDeg: 60 }))).toBeCloseTo(1187.95, 1);
  });

  it('treats wide products as isotropic', () => {
    // 1000 lm / 4π sr = 79.58 cd.
    expect(candela(product('pendant', { flux: 1000, beamDeg: 140 }))).toBeCloseTo(79.58, 2);
  });

  it('switches at WIDE_BEAM_DEG', () => {
    expect(isSpot(product('recessed', { beamDeg: WIDE_BEAM_DEG }))).toBe(true);
    expect(isSpot(product('recessed', { beamDeg: WIDE_BEAM_DEG + 1 }))).toBe(false);
  });
});
