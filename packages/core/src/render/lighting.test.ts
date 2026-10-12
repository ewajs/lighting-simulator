import { describe, expect, it } from 'vitest';
import { DEFAULT_ROOM } from '../room';
import { product } from '../test-fixtures';
import {
  BASE_EXPOSURE,
  candela,
  indirectIlluminance,
  isSpot,
  kelvinToRgb,
  lightingProduct,
  typeCAngles,
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

describe('lightingProduct', () => {
  it('keeps the catalog values without photometry', () => {
    const catalogProduct = product('recessed');
    expect(lightingProduct(catalogProduct, undefined)).toBe(catalogProduct);
  });

  it('takes flux and beam angle from the photometry', () => {
    // 100 cd at nadir falling linearly to 0 at 90°: 200π − 400 lm, 50 % at 45° → 90° beam.
    const photometry = {
      verticalDeg: [0, 90],
      horizontalDeg: [0],
      candela: [[100, 0]],
      power: 10,
      keywords: {},
    };
    const lit = lightingProduct(product('recessed', { flux: 5000, beamDeg: 10 }), photometry);
    expect(lit.flux).toBeCloseTo(200 * Math.PI - 400, 9);
    expect(lit.beamDeg).toBeCloseTo(90, 9);
    expect(lit.mount).toBe('recessed');
  });
});

describe('typeCAngles', () => {
  it('maps the luminaire frame to Type C angles', () => {
    const cases: [{ x: number; y: number; z: number }, number, number][] = [
      [{ x: 0, y: -1, z: 0 }, 0, 0], // straight down the aim
      [{ x: 0, y: 1, z: 0 }, 180, 0], // straight up
      [{ x: 0, y: 0, z: 1 }, 90, 0], // forward is C0
      [{ x: 1, y: 0, z: 0 }, 90, 90], // anticlockwise from above
      [{ x: 0, y: 0, z: -1 }, 90, 180],
      [{ x: -1, y: 0, z: 0 }, 90, 270],
      [{ x: 0, y: -1, z: 1 }, 45, 0], // 45° down, forward; length doesn't matter
    ];
    for (const [direction, verticalDeg, horizontalDeg] of cases) {
      const angles = typeCAngles(direction);
      expect(angles.verticalDeg).toBeCloseTo(verticalDeg, 9);
      expect(angles.horizontalDeg).toBeCloseTo(horizontalDeg, 9);
    }
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
  const distance = (pose: ReturnType<typeof viewPose>) =>
    Math.hypot(
      pose.position.x - pose.target.x,
      pose.position.y - pose.target.y,
      pose.position.z - pose.target.z,
    );

  it('fits the room’s bounding sphere in the vertical field of view on wide viewports', () => {
    // r = ½·√(5² + 4² + 2.7²) = 3.4746 m. At aspect 1.6 the 40° vertical fov is the narrower one:
    // d = 3.4746 / sin 20° × 1.05 = 10.667 m.
    expect(distance(viewPose('perspective', DEFAULT_ROOM, 1.6, 40))).toBeCloseTo(10.667, 2);
  });

  it('backs off on narrow viewports, where the horizontal fov is narrower', () => {
    // Aspect 0.5: hfov = 2·atan(tan 20° × 0.5) = 20.6°, so d = 3.4746 / sin 10.3° × 1.05 = 20.376 m.
    expect(distance(viewPose('perspective', DEFAULT_ROOM, 0.5, 40))).toBeCloseTo(20.376, 2);
  });

  it('aims at the room centre and looks down from above for the top view', () => {
    const { position, target } = viewPose('top', DEFAULT_ROOM, 1.6, 40);
    expect(target).toEqual({ x: 0, y: DEFAULT_ROOM.height / 2, z: 0 });
    expect(position.x).toBe(0);
    expect(position.y).toBeGreaterThan(DEFAULT_ROOM.height);
  });

  it('places the front and side cameras outside the room', () => {
    expect(viewPose('front', DEFAULT_ROOM, 1.6, 40).position.z).toBeGreaterThan(
      DEFAULT_ROOM.depth / 2,
    );
    expect(viewPose('side', DEFAULT_ROOM, 1.6, 40).position.x).toBeGreaterThan(
      DEFAULT_ROOM.width / 2,
    );
  });
});
