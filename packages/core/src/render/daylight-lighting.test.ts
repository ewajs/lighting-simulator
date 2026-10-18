import { describe, expect, it } from 'vitest';
import { integrateSky, skyFor } from '../analysis/sky';
import { DEFAULT_DAYLIGHT } from '../daylight';
import { emptyScene, room } from '../test-fixtures';
import type { Daylight, RoomWindow, Scene } from '../types';
import {
  ADAPTATION_LUX,
  daylightExposureScale,
  daylightLighting,
  sunKelvin,
} from './daylight-lighting';

// 40° S, 10:00 at the equinox: the sun in the north-east, north behind the back wall.
const MORNING: Daylight = { ...DEFAULT_DAYLIGHT, sky: 'clear', latitudeDeg: -40, solarHour: 10 };
const BACK: RoomWindow = {
  id: 'w',
  surface: 'wall-z-',
  position: { x: 0, y: 1.5, z: -2 },
  width: 1.2,
  height: 1.2,
  glazing: 'clear',
  covering: 'none',
};
const scene = (daylight: Daylight, ...windows: RoomWindow[]): Scene => ({
  ...emptyScene,
  daylight,
  windows,
});

describe('daylightLighting', () => {
  it('brings nothing in at night, or without windows', () => {
    expect(daylightLighting(scene({ ...MORNING, sky: 'night' }, BACK))).toMatchObject({
      sun: undefined,
      windows: [],
      fluxLm: 0,
    });
    expect(daylightLighting(scene(MORNING)).fluxLm).toBe(0);
  });

  it('lets the sun through a clear window facing it, with a glow of the sky as bright as through the glass', () => {
    const lighting = daylightLighting(scene(MORNING, BACK));
    const sky = skyFor(MORNING)!;
    expect(lighting.sun!.lux).toBeCloseTo(0.8 * sky.sun!.normalLx, 6);
    const [glow] = lighting.windows;
    // Outward is −z; a Lambertian panel of luminance τ · E / π, 1.44 m².
    const outside = integrateSky(sky.luminance, { x: 0, y: 0, z: -1 });
    expect(glow!.candela).toBeCloseTo(((0.8 * outside) / Math.PI) * 1.44, 6);
    expect(glow!.position.z).toBeGreaterThan(-2);
    // The room's daylight: the sky's and the sun's through the glass.
    const sunLx = sky.sun!.normalLx * Math.max(0, -sky.sun!.direction.z);
    expect(lighting.fluxLm).toBeCloseTo(0.8 * (outside + sunLx) * 1.44, 6);
  });

  it('takes the sun into the glow of a scattering window, with no beam', () => {
    const lighting = daylightLighting(scene(MORNING, { ...BACK, glazing: 'frosted' }));
    expect(lighting.sun).toBeUndefined();
    const clear = daylightLighting(scene(MORNING, BACK));
    // Frosted lets 0.7 through to clear's 0.8, but the sun's in its glow.
    expect(lighting.windows[0]!.candela).toBeGreaterThan(clear.windows[0]!.candela);
  });
});

describe('the sun’s colour', () => {
  it('is warm at the horizon and white from 40° up', () => {
    expect(sunKelvin(0)).toBe(2000);
    expect(sunKelvin(20)).toBe(3750);
    expect(sunKelvin(60)).toBe(5500);
  });
});

describe('daylightExposureScale', () => {
  it('keeps the exposure for little daylight, and lowers it as the room gets brighter', () => {
    expect(daylightExposureScale(0, room)).toBe(1);
    expect(daylightExposureScale(100, room)).toBe(1);
    const bright = daylightExposureScale(100_000, room);
    expect(bright).toBeLessThan(1);
    // Ten times the light, a tenth of the exposure, once above ADAPTATION_LUX.
    expect(daylightExposureScale(1_000_000, room) / bright).toBeCloseTo(0.1, 9);
    expect(ADAPTATION_LUX).toBe(300);
  });
});
