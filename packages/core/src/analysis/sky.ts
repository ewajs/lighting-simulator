// The sky outside the windows (ADR 0080): how bright it is in every
// direction, the ground below the horizon, and the sun. The luminance
// distributions are CIE's:
//
// - overcast (Moon & Spencer, CIE standard overcast sky):
//     L(γ) / Lz = (1 + 2 sin γ) / 3
// - clear (CIE 1973 clear sky, Kittler):
//     L(γ, χ) / Lz = f(χ) · φ(γ) / (f(Zs) · φ(90°)),
//     f(x) = 0.91 + 10 e^(−3x) + 0.45 cos² x,  φ(γ) = 1 − e^(−0.32 / sin γ)
//
// where γ is a sky element's altitude, χ its angle from the sun, Zs the
// sun's zenith angle and Lz the zenith's luminance. Their levels follow the IES
// daylight availability model (IES Lighting Handbook, 9th ed., ch. 8): the
// sky's horizontal illuminance Eh = A + B · sin^C αs klx (overcast 0.3, 21,
// 1; clear 0.8, 15.5, 0.5), and on a clear day the sun's direct normal
// illuminance Edn = Ext · e^(−c · m) with Ext = 127.5 klx, c = 0.21 and the
// air mass m = 1 / sin αs. The ground reflects ρg of the light on it,
// diffusely, as Radiance's gensky assumes (0.2).

import { sunDirection, sunPosition, dayOfYear } from '../daylight';
import type { Daylight, Vec3 } from '../types';

/** The sky's light, for a daylight that has any: Night, or the sun set, has none. */
export interface Sky {
  /** Luminance in cd/m² seen looking along `direction` (a unit vector, y up), sky or ground. */
  readonly luminance: (direction: Vec3) => number;
  /** The sky's illuminance on an unobstructed horizontal plane, in lx: not the sun's. */
  readonly horizontalLx: number;
  /** The sun on a clear day: the way to it (a unit vector) and its illuminance on a plane facing it, in lx. */
  readonly sun: { readonly direction: Vec3; readonly normalLx: number } | undefined;
}

/** The ground outside reflects this share of the light on it (Radiance gensky's default). */
export const GROUND_REFLECTANCE = 0.2;
/** IES availability: Eh = A + B · sin^C αs, in klx. */
const IES_SKY = {
  overcast: { a: 0.3, b: 21, c: 1 },
  clear: { a: 0.8, b: 15.5, c: 0.5 },
} as const;
const LX_PER_KLX = 1000;
/** The sun's illuminance outside the atmosphere, at the mean distance, in lx (IES). */
const EXTRATERRESTRIAL_LX = 127_500;
/** How much the Earth's orbit changes it over the year: ±3.4 %. */
const ORBIT_VARIATION = 0.034;
/** The atmosphere's extinction on a clear day (IES). */
const CLEAR_EXTINCTION = 0.21;
const DEG = Math.PI / 180;
/** Altitude bands and azimuth steps the sky is integrated over: 1° by 2°. */
const ALTITUDE_STEPS = 90;
const AZIMUTH_STEPS = 180;

/** The sky for `daylight`, or undefined when there is no daylight: night, or the sun below the horizon. */
export function skyFor(daylight: Daylight): Sky | undefined {
  if (daylight.sky === 'night') return undefined;
  const { altitudeDeg } = sunPosition(daylight);
  if (altitudeDeg <= 0) return undefined;
  const sinSun = Math.sin(altitudeDeg * DEG);
  const toSun = sunDirection(daylight);
  const { a, b, c } = IES_SKY[daylight.sky];
  const horizontalLx = (a + b * sinSun ** c) * LX_PER_KLX;
  const relative = daylight.sky === 'overcast' ? overcastRelative : clearRelative(toSun);
  const zenith = horizontalLx / horizontalIntegral(relative);
  const sun =
    daylight.sky === 'clear'
      ? { direction: toSun, normalLx: sunNormalLx(dayOfYear(daylight.month, daylight.day), sinSun) }
      : undefined;
  const groundLuminance =
    (GROUND_REFLECTANCE * (horizontalLx + (sun ? sun.normalLx * sinSun : 0))) / Math.PI;
  return {
    luminance: (d) => (d.y > 0 ? zenith * relative(d) : groundLuminance),
    horizontalLx,
    sun,
  };
}

/** The sun's direct normal illuminance on a clear day, in lx (IES). */
function sunNormalLx(day: number, sinAltitude: number): number {
  const outside =
    EXTRATERRESTRIAL_LX * (1 + ORBIT_VARIATION * Math.cos((2 * Math.PI * (day - 2)) / 365));
  return outside * Math.exp(-CLEAR_EXTINCTION / sinAltitude);
}

/** The CIE overcast sky's luminance relative to its zenith's, looking along `d` (above the horizon). */
export function overcastRelative(d: Vec3): number {
  return (1 + 2 * d.y) / 3;
}

/** The CIE clear sky's luminance relative to its zenith's, for the sun towards `toSun`. */
export function clearRelative(toSun: Vec3): (d: Vec3) => number {
  const f = (angle: number) => 0.91 + 10 * Math.exp(-3 * angle) + 0.45 * Math.cos(angle) ** 2;
  const phi = (sinAltitude: number) => 1 - Math.exp(-0.32 / sinAltitude);
  const atZenith = f(Math.acos(Math.min(Math.max(toSun.y, -1), 1))) * phi(1);
  return (d) => {
    const cosFromSun = d.x * toSun.x + d.y * toSun.y + d.z * toSun.z;
    const fromSun = Math.acos(Math.min(Math.max(cosFromSun, -1), 1));
    return (f(fromSun) * phi(d.y)) / atZenith;
  };
}

/**
 * ∫ L_rel(d) · cos θ dω over the sky's hemisphere: the horizontal illuminance
 * of a sky whose zenith is 1 cd/m². Midpoint rule, 1° by 2°.
 */
export function horizontalIntegral(relative: (d: Vec3) => number): number {
  return integrateSky(relative, { x: 0, y: 1, z: 0 });
}

/**
 * The illuminance a sky of luminance `luminance` gives a plane facing
 * `normal` (a unit vector), unobstructed: ∫ L(d) · max(0, d · n) dω over the
 * whole sphere, sky and ground. Midpoint rule, 1° by 2°.
 */
export function integrateSky(luminance: (d: Vec3) => number, normal: Vec3): number {
  const dAltitude = Math.PI / (2 * ALTITUDE_STEPS);
  const dAzimuth = (2 * Math.PI) / AZIMUTH_STEPS;
  let sum = 0;
  // Altitudes from −90° to 90°: below the horizon, the ground.
  for (let i = -ALTITUDE_STEPS; i < ALTITUDE_STEPS; i++) {
    const altitude = (i + 0.5) * dAltitude;
    const [cosA, sinA] = [Math.cos(altitude), Math.sin(altitude)];
    for (let j = 0; j < AZIMUTH_STEPS; j++) {
      const azimuth = (j + 0.5) * dAzimuth;
      const d = { x: cosA * Math.sin(azimuth), y: sinA, z: -cosA * Math.cos(azimuth) };
      const cos = d.x * normal.x + d.y * normal.y + d.z * normal.z;
      if (cos <= 0) continue;
      sum += luminance(d) * cos * cosA * dAltitude * dAzimuth;
    }
  }
  return sum;
}
