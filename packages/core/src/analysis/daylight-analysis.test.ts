import { describe, expect, it } from 'vitest';
import { DEFAULT_DAYLIGHT } from '../daylight';
import { catalog, emptyScene, room } from '../test-fixtures';
import type { Daylight, RoomWindow, Scene, Vec3 } from '../types';
import { analyseIlluminance } from './analyse';
import { AnalysisCache } from './cache';
import { DEFAULT_CALCULATION_OPTIONS } from './options';
import type { AnalysisInputs } from './settings';
import { skyFor } from './sky';
import { daylightIlluminance, daylightSources, type DaylightSources } from './window-light';

const inputs: AnalysisInputs = {
  catalog,
  photometry: () => undefined,
  modelFile: () => undefined,
};
// 40° N on an equinox noon: the sun 50° up, due south (+z with north behind the back wall).
const NOON: Daylight = { ...DEFAULT_DAYLIGHT, latitudeDeg: 40 };
const SKYLIGHT: RoomWindow = {
  id: 's',
  surface: 'ceiling',
  position: { x: 0, y: 2.7, z: 0 },
  width: 1,
  height: 1.2,
  glazing: 'clear',
  covering: 'none',
};
const SIDE_WINDOW: RoomWindow = {
  id: 'w',
  surface: 'wall-z+',
  position: { x: 0, y: 1.5, z: 2 },
  width: 1.5,
  height: 1.2,
  glazing: 'clear',
  covering: 'none',
};
const scene = (daylight: Daylight, ...windows: RoomWindow[]): Scene => ({
  ...emptyScene,
  daylight,
  windows,
});

/** Integration cells for the flux check, in m. */
const FLUX_CELL_M = 0.025;

/**
 * Daylight landing on the floor and walls, in lm: illuminance × area over
 * FLUX_CELL_M cells. The ceiling, the skylight's own plane, sees none of it.
 */
function fluxOnRoom(sources: DaylightSources): number {
  const { width: w, depth: d, height: h } = room;
  const faces: { origin: Vec3; u: Vec3; v: Vec3; lu: number; lv: number; normal: Vec3 }[] = [
    { origin: { x: -w / 2, y: 0, z: -d / 2 }, u: X, v: Z, lu: w, lv: d, normal: Y },
    { origin: { x: -w / 2, y: 0, z: -d / 2 }, u: Z, v: Y, lu: d, lv: h, normal: X },
    {
      origin: { x: w / 2, y: 0, z: -d / 2 },
      u: Z,
      v: Y,
      lu: d,
      lv: h,
      normal: { x: -1, y: 0, z: 0 },
    },
    { origin: { x: -w / 2, y: 0, z: -d / 2 }, u: X, v: Y, lu: w, lv: h, normal: Z },
    {
      origin: { x: -w / 2, y: 0, z: d / 2 },
      u: X,
      v: Y,
      lu: w,
      lv: h,
      normal: { x: 0, y: 0, z: -1 },
    },
  ];
  let lumens = 0;
  for (const { origin, u, v, lu, lv, normal } of faces) {
    const [nu, nv] = [Math.round(lu / FLUX_CELL_M), Math.round(lv / FLUX_CELL_M)];
    const cellArea = (lu / nu) * (lv / nv);
    for (let i = 0; i < nu; i++) {
      for (let j = 0; j < nv; j++) {
        const [a, b] = [((i + 0.5) / nu) * lu, ((j + 0.5) / nv) * lv];
        const point = {
          x: origin.x + u.x * a + v.x * b,
          y: origin.y + u.y * a + v.y * b,
          z: origin.z + u.z * a + v.z * b,
        };
        lumens += daylightIlluminance(point, normal, sources, []) * cellArea;
      }
    }
  }
  return lumens;
}
const X = { x: 1, y: 0, z: 0 };
const Y = { x: 0, y: 1, z: 0 };
const Z = { x: 0, y: 0, z: 1 };

describe('daylight flux: what comes through a skylight lands on the room', () => {
  // A horizontal opening sees the whole sky and no ground: the light through
  // it is its transmittance times the sky's horizontal illuminance times its area.
  it('from the overcast sky: τ · Eh · A', () => {
    const sky = skyFor({ ...NOON, sky: 'overcast' })!;
    const sources = daylightSources(scene(NOON, SKYLIGHT), 0.1, sky);
    expect(fluxOnRoom(sources) / (0.8 * sky.horizontalLx * 1.2)).toBeCloseTo(1, 2);
  });

  it('from the clear sky: τ · Eh · A', () => {
    const sky = { ...skyFor({ ...NOON, sky: 'clear' })!, sun: undefined };
    const sources = daylightSources(scene(NOON, SKYLIGHT), 0.1, sky);
    expect(fluxOnRoom(sources) / (0.8 * sky.horizontalLx * 1.2)).toBeCloseTo(1, 3);
  });

  it('from the sun: τ · Edn · cos θ · A, its beam all on the back wall', () => {
    // At 45° towards +z the beam moves 2.7 m back: onto the back wall from
    // 1.1 to 2.3 m up, edges on the integration cells', so the sum is exact.
    const sun = { direction: { x: 0, y: Math.SQRT1_2, z: Math.SQRT1_2 }, normalLx: 90_000 };
    const sky = { luminance: () => 0, horizontalLx: 0, sun };
    const sources = daylightSources(scene(NOON, SKYLIGHT), 0.1, sky);
    expect(fluxOnRoom(sources) / (0.8 * 90_000 * Math.SQRT1_2 * 1.2)).toBeCloseTo(1, 6);
  });
});

describe('daylight in the calculation', () => {
  const workPlane = (s: Scene, options = DEFAULT_CALCULATION_OPTIONS) =>
    analyseIlluminance(s, inputs, undefined, options).surfaces[0]!;

  it('falls off away from a side window, as a daylight factor does', () => {
    const plane = workPlane(scene(NOON, SIDE_WINDOW));
    const along = (z: number) => {
      const k = plane.grid.points.findIndex(
        (p) => Math.abs(p.x) < 0.3 && Math.abs(p.z - z) < Math.sqrt(plane.grid.cellArea) / 2,
      );
      return plane.daylightLx[k]!;
    };
    const [near, far] = [along(1.3), along(-1.3)];
    expect(near).toBeGreaterThan(3 * far);
    expect(far).toBeGreaterThan(0);
    // Totals add up.
    plane.illuminanceLx.forEach((total, k) =>
      expect(total).toBeCloseTo(
        plane.directLx[k]! + plane.daylightLx[k]! + plane.indirectLx[k]!,
        9,
      ),
    );
  });

  it('is none at night, or with daylight left out', () => {
    const night = workPlane(scene({ ...NOON, solarHour: 22 }, SIDE_WINDOW));
    expect(Math.max(...night.daylightLx)).toBe(0);
    const off = workPlane(scene(NOON, SIDE_WINDOW), {
      ...DEFAULT_CALCULATION_OPTIONS,
      daylight: false,
    });
    expect(Math.max(...off.illuminanceLx)).toBe(0);
  });

  it('leaves the points on a window’s glass out of the figures', () => {
    const analysis = analyseIlluminance(scene(NOON, SKYLIGHT), inputs);
    const ceiling = analysis.surfaces.find((s) => s.grid.surface === 'ceiling')!;
    const onGlass = ceiling.grid.points.filter(
      (p, k) => ceiling.covered[k] && Math.abs(p.x) < 0.5 && Math.abs(p.z) < 0.6,
    );
    expect(onGlass.length).toBeGreaterThan(0);
    expect(ceiling.covered.filter(Boolean)).toHaveLength(onGlass.length);
  });
});

describe('light leaving through the windows', () => {
  it('darkens a lit room: a window reflects nothing back', () => {
    const lamp = {
      id: 'l',
      productId: 'test-recessed',
      position: { x: 0, y: 2.7, z: 0 },
      aim: { tiltDeg: 0, panDeg: 0 },
      dimming: 1,
      on: true,
      cct: 3000,
    };
    const night = { ...NOON, solarHour: 22 };
    const closed = { ...scene(night), luminaires: [lamp] };
    const open = { ...closed, windows: [SIDE_WINDOW, SKYLIGHT] };
    const bounced = (s: Scene) =>
      analyseIlluminance(s, inputs).surfaces[0]!.indirectLx.reduce((sum, lx) => sum + lx, 0);
    expect(bounced(open)).toBeLessThan(0.95 * bounced(closed));
  });
});

describe('daylight and the cache', () => {
  it('reuses the daylight while only the luminaires change, and not once the sky does', () => {
    const lit: Scene = {
      ...scene(NOON, SIDE_WINDOW),
      luminaires: [
        {
          id: 'l',
          productId: 'test-recessed',
          position: { x: 0, y: 2.7, z: 0 },
          aim: { tiltDeg: 0, panDeg: 0 },
          dimming: 1,
          on: true,
          cct: 3000,
        },
      ],
    };
    const dimmed = { ...lit, luminaires: [{ ...lit.luminaires[0]!, dimming: 0.5 }] };
    const clear = { ...dimmed, daylight: { ...NOON, sky: 'clear' as const } };
    const cache = new AnalysisCache();
    for (const next of [lit, dimmed, clear]) {
      const cached = analyseIlluminance(next, inputs, undefined, undefined, cache);
      const fresh = analyseIlluminance(next, inputs);
      expect(cached.surfaces[0]!.illuminanceLx).toEqual(fresh.surfaces[0]!.illuminanceLx);
    }
  });
});
