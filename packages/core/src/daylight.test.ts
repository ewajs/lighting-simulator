import { describe, expect, it } from 'vitest';
import {
  DEFAULT_DAYLIGHT,
  dayOfYear,
  solarDeclinationDeg,
  sunDirection,
  sunPosition,
  updateDaylight,
} from './daylight';
import { Simulator } from './simulator';
import { catalog, emptyScene } from './test-fixtures';
import type { Daylight } from './types';

const at = (patch: Partial<Daylight>): Daylight => ({ ...DEFAULT_DAYLIGHT, ...patch });
/** Within half a degree: Spencer's declination differs from the textbook's Cooper by up to ~0.4°. */
const HALF_DEG = 0.5;
const near = (actual: number, expected: number) =>
  expect(Math.abs(actual - expected)).toBeLessThan(HALF_DEG);

describe('the date', () => {
  it('counts days from January 1st', () => {
    expect(dayOfYear(1, 1)).toBe(1);
    expect(dayOfYear(2, 13)).toBe(44);
    expect(dayOfYear(12, 31)).toBe(365);
  });

  it('gives the declination at the solstices and equinoxes', () => {
    near(solarDeclinationDeg(dayOfYear(6, 21)), 23.44);
    near(solarDeclinationDeg(dayOfYear(12, 21)), -23.44);
    near(solarDeclinationDeg(dayOfYear(3, 21)), 0);
    near(solarDeclinationDeg(dayOfYear(9, 23)), 0);
  });
});

describe('sunPosition', () => {
  // Duffie & Beckman, Example 1.6.1: latitude 43° N. Azimuths there are from
  // south, west positive: −40.0° is a bearing of 140°, 112.0° one of 292°.
  it('matches the textbook at 9:30 on February 13th', () => {
    const sun = sunPosition(at({ latitudeDeg: 43, month: 2, day: 13, solarHour: 9.5 }));
    near(sun.altitudeDeg, 90 - 66.5);
    near(sun.azimuthDeg, 140);
  });

  it('matches the textbook at 18:30 on July 1st', () => {
    const sun = sunPosition(at({ latitudeDeg: 43, month: 7, day: 1, solarHour: 18.5 }));
    near(sun.altitudeDeg, 90 - 79.6);
    near(sun.azimuthDeg, 292);
  });

  it('stands 90° less the latitude at an equinox noon, due north in the south', () => {
    const buenosAires = sunPosition(at({ latitudeDeg: -34.6, solarHour: 12 }));
    near(buenosAires.altitudeDeg, 90 - 34.6);
    // Due north: 0°, or a hair under 360°.
    expect(Math.min(buenosAires.azimuthDeg, 360 - buenosAires.azimuthDeg)).toBeCloseTo(0, 4);
    const north = sunPosition(at({ latitudeDeg: 40, solarHour: 12 }));
    expect(north.azimuthDeg).toBeCloseTo(180, 4);
  });

  it('is symmetric about noon, rising in the east', () => {
    const morning = sunPosition(at({ latitudeDeg: -34.6, month: 12, day: 21, solarHour: 9 }));
    const afternoon = sunPosition(at({ latitudeDeg: -34.6, month: 12, day: 21, solarHour: 15 }));
    expect(afternoon.altitudeDeg).toBeCloseTo(morning.altitudeDeg, 9);
    expect(afternoon.azimuthDeg).toBeCloseTo(360 - morning.azimuthDeg, 9);
    expect(morning.azimuthDeg).toBeGreaterThan(0);
    expect(morning.azimuthDeg).toBeLessThan(180);
  });

  it('is below the horizon at midnight', () => {
    expect(sunPosition(at({ solarHour: 0 })).altitudeDeg).toBeLessThan(0);
  });
});

describe('sunDirection', () => {
  it('turns with north: north behind the back wall puts the noon sun in the south above the front', () => {
    // At 40° N on an equinox noon the sun is due south, 50° up.
    const sun = sunDirection(at({ latitudeDeg: 40, solarHour: 12 }));
    expect(sun.x).toBeCloseTo(0, 6);
    expect(sun.y).toBeCloseTo(Math.sin((50 * Math.PI) / 180), 2);
    expect(sun.z).toBeGreaterThan(0);
    // North behind the right wall: south is behind the left one.
    const turned = sunDirection(at({ latitudeDeg: 40, solarHour: 12, northDeg: 90 }));
    expect(turned.x).toBeLessThan(0);
    expect(turned.z).toBeCloseTo(0, 6);
  });
});

describe('updateDaylight', () => {
  it('changes the settings, keeping north within ±180°, and rejects impossible dates', () => {
    const scene = updateDaylight(emptyScene, { sky: 'clear', northDeg: 270 });
    expect(scene.daylight).toMatchObject({ sky: 'clear', northDeg: -90 });
    expect(() => updateDaylight(emptyScene, { month: 2, day: 30 })).toThrow(/day/);
    expect(() => updateDaylight(emptyScene, { solarHour: 25 })).toThrow(/solarHour/);
    expect(() => updateDaylight(emptyScene, { latitudeDeg: -91 })).toThrow(/latitude/);
    // Night is a time, not a sky.
    expect(() => updateDaylight(emptyScene, { sky: 'night' as never })).toThrow(/sky/);
  });
});

describe('Simulator.setDaylight', () => {
  it('changes the daylight in one undo step, and resizing the room keeps it', () => {
    const sim = new Simulator({ catalog });
    sim.setDaylight({ sky: 'clear', latitudeDeg: -34.6 });
    sim.setRoomSize({ width: 6 });
    expect(sim.scene.daylight).toMatchObject({ sky: 'clear', latitudeDeg: -34.6 });
    sim.undo();
    sim.undo();
    expect(sim.scene.daylight).toEqual(DEFAULT_DAYLIGHT);
  });
});
