import { describe, expect, it } from 'vitest';
import { DEFAULT_ROOM } from '../room';
import { product } from '../test-fixtures';
import {
  BASE_EXPOSURE,
  candela,
  indirectIlluminance,
  isSpot,
  kelvinToRgb,
  toneMappingExposure,
  viewPose,
  WIDE_BEAM_DEG,
} from './lighting';

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

describe('kelvinToRgb', () => {
  it('is warm at 2700 K', () => {
    // Helland fit at t = 27: g = (99.4708·ln 27 − 161.1196)/255, b = (138.5177·ln 17 − 305.0448)/255.
    const { r, g, b } = kelvinToRgb(2700);
    expect(r).toBe(1);
    expect(g).toBeCloseTo(0.6538, 4);
    expect(b).toBeCloseTo(0.3428, 4);
  });

  it('is white at 6600 K', () => {
    // At t = 66 red and blue are 255 by definition; green = 99.4708·ln 66 − 161.1196 = 255.6, clamped to 255.
    expect(kelvinToRgb(6600)).toEqual({ r: 1, g: 1, b: 1 });
  });

  it('is bluish above 6600 K', () => {
    const { r, b } = kelvinToRgb(10000);
    expect(b).toBe(1);
    expect(r).toBeLessThan(1);
  });
});

describe('indirectIlluminance', () => {
  it('matches the integrating-sphere formula for the default room', () => {
    // A = 2·20 + 48.6 = 88.6 m², ρ̄ = (20·1.15 + 48.6·0.8)/88.6 = 0.69842.
    // E = 1000·0.69842 / (88.6·0.30158) = 26.14 lx.
    expect(indirectIlluminance(1000, DEFAULT_ROOM)).toBeCloseTo(26.14, 2);
  });

  it('is zero without light', () => {
    expect(indirectIlluminance(0, DEFAULT_ROOM)).toBe(0);
  });
});

describe('toneMappingExposure', () => {
  it('doubles per EV stop', () => {
    expect(toneMappingExposure(0)).toBe(BASE_EXPOSURE);
    expect(toneMappingExposure(1)).toBe(BASE_EXPOSURE * 2);
    expect(toneMappingExposure(-2)).toBe(BASE_EXPOSURE / 4);
  });
});

describe('viewPose', () => {
  it('looks straight down for the top view', () => {
    const { position, target } = viewPose('top', DEFAULT_ROOM);
    expect(position.x).toBe(0);
    expect(position.y).toBeGreaterThan(DEFAULT_ROOM.height);
    expect(target).toEqual({ x: 0, y: 0, z: 0 });
  });

  it('places the front and side cameras outside the room', () => {
    expect(viewPose('front', DEFAULT_ROOM).position.z).toBeGreaterThan(DEFAULT_ROOM.depth / 2);
    expect(viewPose('side', DEFAULT_ROOM).position.x).toBeGreaterThan(DEFAULT_ROOM.width / 2);
  });
});
