// Daylight settings and where the sun is (ADR 0079). Plain data and pure
// functions: the sun's position from the date, the solar time and the
// latitude, as in Duffie & Beckman, Solar Engineering of Thermal Processes
// (4th ed., 2013), §1.6.

import { wrapDeg } from './math';
import type { Daylight, Scene, SkyKind, Vec3 } from './types';
import { assertFinite, assertInRange } from './validate';

/** Every kind of sky, in the order the UI offers them. */
export const SKY_KINDS: readonly SkyKind[] = ['overcast', 'clear', 'night'];

/**
 * A neutral starting point: an overcast noon at the March equinox, on the
 * equator, north behind the back wall. The library knows no location; hosts
 * give theirs, e.g. with `Simulator.setDaylight` or in their templates.
 */
export const DEFAULT_DAYLIGHT: Daylight = {
  sky: 'overcast',
  solarHour: 12,
  month: 3,
  day: 21,
  latitudeDeg: 0,
  northDeg: 0,
};

/** Days in each month of a 365-day year. */
const MONTH_DAYS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31] as const;
const HOURS_PER_DAY = 24;
/** The sun's hour angle turns 15° per hour (360° in 24 h). */
const DEG_PER_HOUR = 15;
const SOLAR_NOON_HOUR = 12;
const DAYS_PER_YEAR = 365;
const DEG = Math.PI / 180;

/** The changes a host may make to the daylight settings. */
export type DaylightPatch = Partial<Daylight>;

/** Applies `patch` to the scene's daylight; north is kept within ±180°. */
export function updateDaylight(scene: Scene, patch: DaylightPatch): Scene {
  const next = { ...scene.daylight, ...patch };
  const daylight = { ...next, northDeg: wrapDeg(next.northDeg) };
  assertDaylight(daylight);
  return { ...scene, daylight };
}

/** Throws a RangeError naming the field if the daylight settings aren't valid. */
export function assertDaylight(daylight: Daylight): void {
  if (!SKY_KINDS.includes(daylight.sky)) {
    throw new RangeError(`daylight.sky must be one of ${SKY_KINDS.join(', ')}`);
  }
  assertInRange('daylight.solarHour', daylight.solarHour, 0, HOURS_PER_DAY);
  if (!Number.isInteger(daylight.month))
    throw new RangeError('daylight.month must be a whole number');
  assertInRange('daylight.month', daylight.month, 1, 12);
  if (!Number.isInteger(daylight.day)) throw new RangeError('daylight.day must be a whole number');
  assertInRange('daylight.day', daylight.day, 1, MONTH_DAYS[daylight.month - 1]!);
  assertInRange('daylight.latitudeDeg', daylight.latitudeDeg, -90, 90);
  assertFinite('daylight.northDeg', daylight.northDeg);
}

/** The day of the year, 1 on January 1st, in a 365-day year. */
export function dayOfYear(month: number, day: number): number {
  return MONTH_DAYS.slice(0, month - 1).reduce((sum, days) => sum + days, 0) + day;
}

/**
 * The sun's declination on day `n` of the year, in degrees: Spencer's
 * series (1971), within about 0.05° (Duffie & Beckman eq. 1.6.1b).
 */
export function solarDeclinationDeg(n: number): number {
  const b = (2 * Math.PI * (n - 1)) / DAYS_PER_YEAR;
  const rad =
    0.006918 -
    0.399912 * Math.cos(b) +
    0.070257 * Math.sin(b) -
    0.006758 * Math.cos(2 * b) +
    0.000907 * Math.sin(2 * b) -
    0.002697 * Math.cos(3 * b) +
    0.00148 * Math.sin(3 * b);
  return rad / DEG;
}

/** Where the sun is in the sky. */
export interface SunPosition {
  /** Height above the horizon, in degrees; negative when it has set. */
  readonly altitudeDeg: number;
  /** Compass bearing, in degrees clockwise from north: 90 east, 180 south, 270 west. */
  readonly azimuthDeg: number;
}

/**
 * The sun's position for the daylight's date, solar time and latitude
 * (Duffie & Beckman eqs. 1.6.5 and 1.6.6). Overhead, the azimuth is 0.
 */
export function sunPosition({ month, day, solarHour, latitudeDeg }: Daylight): SunPosition {
  const declination = solarDeclinationDeg(dayOfYear(month, day)) * DEG;
  const hourAngle = (solarHour - SOLAR_NOON_HOUR) * DEG_PER_HOUR * DEG;
  const latitude = latitudeDeg * DEG;
  const cosZenith =
    Math.cos(latitude) * Math.cos(declination) * Math.cos(hourAngle) +
    Math.sin(latitude) * Math.sin(declination);
  const zenith = Math.acos(Math.min(Math.max(cosZenith, -1), 1));
  const altitudeDeg = 90 - zenith / DEG;
  const across = Math.sin(zenith) * Math.cos(latitude);
  if (Math.abs(across) < 1e-12) return { altitudeDeg, azimuthDeg: 0 };
  // From south, west positive; morning (negative hour angle) is east of south.
  const cosFromSouth = (Math.cos(zenith) * Math.sin(latitude) - Math.sin(declination)) / across;
  const fromSouth = Math.acos(Math.min(Math.max(cosFromSouth, -1), 1)) / DEG;
  const signed = hourAngle < 0 ? -fromSouth : fromSouth;
  return { altitudeDeg, azimuthDeg: (180 + signed + 360) % 360 };
}

/**
 * A unit vector from the room towards the sun, in room coordinates: y up,
 * turned by the daylight's north. Below the horizon when the sun has set.
 */
export function sunDirection(daylight: Daylight): Vec3 {
  const { altitudeDeg, azimuthDeg } = sunPosition(daylight);
  // Compass bearings turn clockwise from north, as northDeg turns from −z.
  const bearing = (daylight.northDeg + azimuthDeg) * DEG;
  const altitude = altitudeDeg * DEG;
  return {
    x: Math.cos(altitude) * Math.sin(bearing),
    y: Math.sin(altitude),
    z: -Math.cos(altitude) * Math.cos(bearing),
  };
}
