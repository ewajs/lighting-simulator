import { describe, expect, it } from 'vitest';
import { DEFAULT_DAYLIGHT, sunPosition } from '../daylight';
import type { Daylight, Vec3 } from '../types';
import { clearRelative, horizontalIntegral, integrateSky, overcastRelative, skyFor } from './sky';

const at = (patch: Partial<Daylight>): Daylight => ({ ...DEFAULT_DAYLIGHT, ...patch });
const UP: Vec3 = { x: 0, y: 1, z: 0 };
const SOUTH_FACING: Vec3 = { x: 0, y: 0, z: 1 };

describe('the CIE overcast sky', () => {
  it('gives 7π/9 times its zenith luminance on a horizontal plane', () => {
    expect(horizontalIntegral(overcastRelative)).toBeCloseTo((7 * Math.PI) / 9, 3);
  });

  it('gives a vertical plane 39.6 % of what it gives a horizontal one, the ground aside', () => {
    // Hopkinson, Petherbridge & Longmore, Daylighting (1966): the CIE sky's vertical-to-horizontal ratio.
    const skyOnly = (d: Vec3) => (d.y > 0 ? overcastRelative(d) : 0);
    const ratio = integrateSky(skyOnly, SOUTH_FACING) / integrateSky(skyOnly, UP);
    expect(ratio).toBeCloseTo(0.396, 3);
  });
});

describe('skyFor', () => {
  it('sets the overcast sky to the IES horizontal illuminance for the sun’s height', () => {
    // At 40° N on an equinox noon the sun is 50° up: Eh = 0.3 + 21 · sin 50° klx.
    const daylight = at({ latitudeDeg: 40 });
    const sky = skyFor(daylight)!;
    const sinSun = Math.sin((sunPosition(daylight).altitudeDeg * Math.PI) / 180);
    expect(sky.horizontalLx).toBeCloseTo((0.3 + 21 * sinSun) * 1000, 6);
    // The sky's own luminance, integrated, gives it back (the ground below is not seen).
    expect(integrateSky(sky.luminance, UP) / sky.horizontalLx).toBeCloseTo(1, 3);
    expect(sky.sun).toBeUndefined();
  });

  it('adds the sun on a clear day: IES direct normal illuminance through the air mass', () => {
    const daylight = at({ sky: 'clear', latitudeDeg: 40 });
    const sky = skyFor(daylight)!;
    const sinSun = Math.sin((sunPosition(daylight).altitudeDeg * Math.PI) / 180);
    // March 21st is day 80: the orbit term is 1 + 0.034 cos(2π · 78 / 365).
    const outside = 127_500 * (1 + 0.034 * Math.cos((2 * Math.PI * 78) / 365));
    expect(sky.sun!.normalLx).toBeCloseTo(outside * Math.exp(-0.21 / sinSun), 6);
    expect(sky.horizontalLx).toBeCloseTo((0.8 + 15.5 * Math.sqrt(sinSun)) * 1000, 6);
  });

  it('lights the ground below the horizon by 20 % of everything on it, diffusely', () => {
    const sky = skyFor(at({ sky: 'clear', latitudeDeg: 40 }))!;
    const onGround = sky.horizontalLx + sky.sun!.normalLx * sky.sun!.direction.y;
    expect(sky.luminance({ x: 0, y: -1, z: 0 })).toBeCloseTo((0.2 * onGround) / Math.PI, 6);
  });

  it('has none at night or with the sun set', () => {
    expect(skyFor(at({ sky: 'night' }))).toBeUndefined();
    expect(skyFor(at({ solarHour: 3 }))).toBeUndefined();
  });
});

describe('the CIE clear sky', () => {
  it('is brightest round the sun and darkest opposite it', () => {
    const toSun = { x: 0, y: Math.SQRT1_2, z: Math.SQRT1_2 };
    const relative = clearRelative(toSun);
    const nearSun = relative({ x: 0, y: 0.75, z: Math.sqrt(1 - 0.75 ** 2) });
    const opposite = relative({ x: 0, y: 0.6, z: -0.8 });
    expect(relative({ x: 0, y: 1, z: 0 })).toBeCloseTo(1, 9);
    expect(nearSun).toBeGreaterThan(5);
    expect(opposite).toBeLessThan(1);
  });
});
