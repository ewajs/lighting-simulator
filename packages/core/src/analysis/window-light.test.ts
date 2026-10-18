import { describe, expect, it } from 'vitest';
import { emptyScene } from '../test-fixtures';
import type { RoomWindow, Scene, Vec3 } from '../types';
import type { Blocker } from './occlusion';
import { rectanglePatches } from './patches';
import type { Sky } from './sky';
import { daylightIlluminance, daylightSources, inWindow, withoutOpenings } from './window-light';

// DEFAULT_ROOM is 5 × 4 × 2.7 m. A 1 × 1.2 m skylight in the middle of the ceiling.
const skylight = (patch: Partial<RoomWindow> = {}): RoomWindow => ({
  id: 's',
  surface: 'ceiling',
  position: { x: 0, y: 2.7, z: 0 },
  width: 1,
  height: 1.2,
  glazing: 'clear',
  covering: 'none',
  ...patch,
});
const withWindows = (...windows: RoomWindow[]): Scene => ({ ...emptyScene, windows });
const UP: Vec3 = { x: 0, y: 1, z: 0 };
/** A sky as bright as `luminance` everywhere, and no sun. */
const uniform = (luminance: number): Sky => ({
  luminance: () => luminance,
  horizontalLx: Math.PI * luminance,
  sun: undefined,
});

/**
 * The form factor from a point to a parallel rectangle a × b, the point
 * below one of its corners at distance c (Howell, A Catalog of Radiation
 * Heat Transfer Configuration Factors, B-3).
 */
function cornerFactor(a: number, b: number, c: number): number {
  const [x, y] = [a / c, b / c];
  const sx = Math.sqrt(1 + x * x);
  const sy = Math.sqrt(1 + y * y);
  return ((x / sx) * Math.atan(y / sx) + (y / sy) * Math.atan(x / sy)) / (2 * Math.PI);
}

describe('daylight through a skylight', () => {
  it('matches Howell’s exact form factor under a uniform sky', () => {
    const L = 5000;
    const sources = daylightSources(withWindows(skylight()), 0.05, uniform(L));
    // On the floor, straight below the middle: four corners' worth, 2.7 m down.
    const factor = 4 * cornerFactor(0.5, 0.6, 2.7);
    const lux = daylightIlluminance({ x: 0, y: 0, z: 0 }, UP, sources, []);
    expect(lux / (0.8 * L * Math.PI * factor)).toBeCloseTo(1, 3);
  });

  it('scatters through frosted glass: under a uniform sky, as clear glass of the same transmittance', () => {
    const L = 5000;
    const frosted = daylightSources(
      withWindows(skylight({ glazing: 'frosted' })),
      0.05,
      uniform(L),
    );
    const factor = 4 * cornerFactor(0.5, 0.6, 2.7);
    // Frosted lets 0.7 through.
    const lux = daylightIlluminance({ x: 0, y: 0, z: 0 }, UP, frosted, []);
    expect(lux / (0.7 * L * Math.PI * factor)).toBeCloseTo(1, 2);
  });

  it('lets the sun through as a beam: lit inside its footprint, not beside it', () => {
    const sun = { direction: UP, normalLx: 80_000 };
    const sky: Sky = { luminance: () => 0, horizontalLx: 0, sun };
    const sources = daylightSources(withWindows(skylight()), 0.1, sky);
    // Straight down, the footprint is the skylight's: x within ±0.5.
    expect(daylightIlluminance({ x: 0.4, y: 0, z: 0 }, UP, sources, [])).toBeCloseTo(
      0.8 * 80_000,
      6,
    );
    expect(daylightIlluminance({ x: 0.6, y: 0, z: 0 }, UP, sources, [])).toBe(0);
  });

  it('is shadowed by furniture, and absent with no sky', () => {
    const table: Blocker = {
      centre: { x: 0, y: 0.75, z: 0 },
      half: { x: 2, y: 0.02, z: 2 },
      yawRad: 0,
      reflectance: 0.3,
    };
    const sources = daylightSources(withWindows(skylight()), 0.1, uniform(5000));
    expect(daylightIlluminance({ x: 0, y: 0, z: 0 }, UP, sources, [table])).toBe(0);
    const dark = daylightSources(withWindows(skylight()), 0.1, undefined);
    expect(daylightIlluminance({ x: 0, y: 0, z: 0 }, UP, dark, [])).toBe(0);
  });
});

describe('the openings in the room', () => {
  const sources = daylightSources(withWindows(skylight()), 0.1, undefined);
  const DOWN: Vec3 = { x: 0, y: -1, z: 0 };

  it('tells points on the glass from points on the ceiling beside it', () => {
    expect(inWindow({ x: 0.2, y: 2.7, z: 0.3 }, DOWN, sources.windows)).toBe(true);
    expect(inWindow({ x: 0.7, y: 2.7, z: 0 }, DOWN, sources.windows)).toBe(false);
    // The floor below faces the other way.
    expect(inWindow({ x: 0, y: 0, z: 0 }, UP, sources.windows)).toBe(false);
  });

  it('takes the open share out of a ceiling patch’s reflectance', () => {
    // A 1 × 1 m ceiling patch from x = 0 to 1: half of it is over the skylight (x ≤ 0.5),
    // and all of its z from −0.5 to 0.5 is within the skylight's ±0.6.
    const [patch] = rectanglePatches(
      { x: 0, y: 2.7, z: -0.5 },
      { x: 1, y: 0, z: 0 },
      { x: 0, y: 0, z: 1 },
      1,
      1,
      DOWN,
      0.8,
      1,
    );
    expect(withoutOpenings(patch!, sources.windows).reflectance).toBeCloseTo(0.4, 12);
  });
});
